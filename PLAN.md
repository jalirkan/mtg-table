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
| M4 | A board that looks like Magic | 3 evenings | **done** — a review pass and a fix pass; of its eight follow-ups M5 closed five, one was not reproduced, two are open |
| M5 | Nothing dead-ends | 3 evenings | **done** — probe decks, two verification passes, all findings closed; exit criterion met by `tools/ten-games.sh` (10/10, zero `UNIMPL`); thirteen follow-ups, none blocking M6 |
| M6 | Comfort | 2 evenings | **done** — New Game without restarting the JVM, phase stops, pass-to, auto-yield, undo, concede, `buttons.focus`; the `sideboard` ask recorded at last; gate grew **9d** and **10g**; two verification passes, all findings closed; **D37–D45**; thirteen follow-ups, none blocking M7 |
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

### M2 follow-ups — four closed by M3, one by M5, two open, one standing (2026-09-11)

M2 is **done**, not perfect. Everything below was carried from the builders' and
the verifiers' own "problems" notes; none of it blocked M3, and each line says
who should pick it up. Nothing here is a known leak — the redaction gate is
closed and tested — they are gaps in *evidence* and two small decisions left
standing. **M3 closed items 1, 5, 6 and 8**, moved the live half of item 2 onto
the M3 follow-ups list below, and left 3, 4 and 7 exactly where they were.

| # | what it was | status after M3 |
|---|---|---|
| 1 | the last `state` before `over` | **closed** — the emitter flushes it; amendment **M11** names the one path that cannot |
| 2 | ask kinds with no engine evidence | **closed by M5, 2026-09-12** — was seven, then six; now nine of eleven are engine recordings and the other two (`options`, `manipulate_list`) are proved unreachable in the jar's bytecode. `sideboard` alone remains, as M5 follow-up 1 |
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
2. **closed by M5 — six of the eleven ask kinds still had no engine evidence**
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
   first move (the probe decks). **CLOSED 2026-09-12**, by four probe decks and
   two bytecode proofs — see M3 follow-up 4 below and §M5.
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
- **The gate is thirteen steps** and step 10 ran **four** fresh ws servers on
  port 8643 (10a `ws-smoke`, 10b `ws-smoke --disconnect-mid-ask`, 10c a whole
  game through `ws-auto-play`, 10d `ws-auto-play --refuse-first-ask`, the only
  thing in the repo that exercises `ReplyPool.cancelAll()` with a game thread
  genuinely parked). Every JVM step is under `GAME_TIMEOUT`. Re-run for the
  documentation pass on 2026-09-11: **exit 0, 163.2 s**
  (`var/check-all-doc-pass.log`; `docs/evidence/m3-ws.md` §14). **It is seven ws
  servers as of 2026-09-12** — M5 follow-up 5 added 10e, M5 added 10f and M6
  added 10g. **The count and the wall time live in one place, CLAUDE.md's
  §"Build and run" gate paragraph**, and this bullet deliberately no longer
  repeats them: two dated numbers in two files is how the repo ended up saying
  "five servers, 3 m 19 s" on the same day as "seven servers, eleven and a
  half minutes".
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
corpus. (3) Step 10 ran four fresh ws servers, each with those four assertions,
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

### M3 follow-ups — eleven, three closed 2026-09-12 (4, 5 and 7), eight open

M3 is **done**, not perfect. Every line below is carried verbatim from the two
builders' and the two verifiers' own "problems" notes, and none of it blocks M4.
**Follow-ups 5 and 7 were closed by a tooling pass on 2026-09-12** — two new gate
sub-steps, no change to `bridge/` and none to `web/` — and both are struck through
below with what closed them (evidence:
[`docs/evidence/m3-followups.md`](docs/evidence/m3-followups.md)).
**Follow-up 4 was closed by M5's probe decks the same day** (evidence:
[`docs/evidence/m5-probes.md`](docs/evidence/m5-probes.md)).
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
   **M5 did not re-take it, and said why** (`m5-board.md` §10): the browser still
   answers a multi-ability card through the `ability_menu` and still never sends
   the `clickAbility` act, so asynchronous asks did not become common and neither
   this nor follow-up 2 changed. The act itself is now proven end to end from a
   script (`check-all.sh` 10f), which is the half that was missing.
4. ~~**Six of the eleven ask kinds still have no engine evidence**~~ — `confirm`,
   `options`, `text`, `assign_amount`, `manipulate_list`, `sideboard`.
   **CLOSED 2026-09-12**, by four probe decks rather than the two this item asked
   for: `confirm`, `text`, `assign_amount` and `choose_entities`-with-a-
   `delayedReveal` are now committed engine recordings; `options` and
   `manipulate_list` are **proved unreachable** in this configuration, in the
   jar's own bytecode (amendments **M22**/**M23**), which is a stronger answer
   than a recording would have been; and `sideboard` alone is still open and is
   now M5 follow-up 1, blocked on M6's multi-game session (**M27**). The probes
   also caught two *answers* that were legal and non-terminating — the class of
   defect an un-evidenced kind hides, and the reason this item was worth the
   evenings. Full table: §M5 above and `docs/evidence/m5-probes.md` §1.
5. ~~**Amendment M11's exception path has never been observed.**~~ **CLOSED
   2026-09-12.** `tools/ws-smoke.mjs --concede-before-input` connects on a retry
   loop *before* `GET /health` says `ok` (the port binds ~1 s earlier), sends
   nothing until `hello_ok` — amendment **M20** drops a pre-session c2s frame in
   silence — and then writes `act: concede` synchronously from inside the
   `hello_ok` handler. Measured margin: `hello_ok` → concede **0–3 ms** against
   `hello_ok` → first engine `input` **~150 ms**, ~50×, and the window was hit **9
   times out of 9** at four seeds. The bridge does exactly what M11 documents:
   `over {winner: null, reason: null, matchOver: true}`, no `state` in front of
   it, `CONCEDE BEFORE START: ending the session` and `OVER WITHOUT A gameOver
   STATE` on stderr, a four-line frame log, and `members fired = 2 of 37`. Wired
   as gate sub-step **10e** (a fifth ws server, under the same `GAME_TIMEOUT`),
   which asserts the stderr line, the guard line, no `"gameOver":{` in the log and
   M20's `0 read before the session existed`. `check-redaction.mjs` is
   deliberately **not** run on that log — see M4 follow-up 8 below.
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
7. ~~**Fixture drift has no gate step, deliberately.**~~ **CLOSED 2026-09-12.**
   `tools/fixture-multiset-diff.mjs` is the order-insensitive shape the follow-up
   asked for: frames with `seq` stripped, compared as a multiset, with
   `--only-dir s2c` to ask the narrower question "did the **emitter's** output
   change?". It is gate sub-step **9b** and it is **advisory on purpose** —
   identical prints `OK`; a difference that vanishes under `--only-dir s2c` prints
   a loud advisory naming the wall-clock cause; a difference that survives it
   prints a loud advisory saying it reaches the emitter. None of the three is an
   exit code (`DRIFT_FATAL=1` makes it one, `SKIP_DRIFT=1` skips the ~31 s
   re-recording). Two of the four gate runs in that pass took the middle branch,
   so the advisory is observed firing rather than asserted. `m3-ws.md` §13.5's
   "Nobody has written it" is now false.
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

**Status: done** — three evenings, built and verified, with eight follow-ups open
below and none of them a defect you can see from the board (evidence:
[`docs/evidence/m4-board.md`](docs/evidence/m4-board.md) — §1–§9 are evenings 1
and 2, §10–§18 evening 3, §19 the status).
**Effort: 3 evenings. Actual: 3.**

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
geometry, the three evenings). The components were written against the
**post-hardening** wire from the start rather than retrofitted onto it: **one**
concealed shape (the
five-key stub) plus a face-down card that is an ordinary `Card` with `name: ""`
and `alt: null` — report 10 §0.0's "three card shapes, not two" was superseded by
amendment P3 the same day — `Card.token`, `Card.alt`, `library.cards`,
`input.focusCard`, and a `card` on every ask option (`docs/protocol.md`
§3.2–§3.4, §4, §5.1).

**What the evidence actually shows** (`docs/evidence/m4-board.md`; two live
bridges against the Forge AI, the replay corpus, and the whole gate green with
these changes in the tree):

- **The layout is report 10 §2.2's, measured in the live page.** At 1600 × 900 the
  columns are rail **264** / table **1160** / rail **128** and the rows
  104 / 132 / **141** / 132 / 104 / 190; at 1280 × 720, **216 / 912 / 112** and
  84 / 104 / **111** / 104 / 84 / 150. Every number is the spec's to the pixel
  **except the middle row** (§2.2 computes 164 / 134 from a board that owns the
  whole viewport; this one sits under a 23 px application bar carrying title,
  seat, socket status and credits). `document.scrollWidth === innerWidth` at both
  sizes: the body never scrolls sideways, and transient banners are absolute
  overlays so they never shorten the board either.
- **The component tree of §1 is real files.** `Board` (grid, seat ordering, the
  land/permanent split, attachment hoisting, combat notes), `PlayerRail` ×2,
  `PhaseStrip`, `ZoneRow`, `HandFan`, `CardTile`, `StackPanel`, `DecisionPanel`,
  `LogDrawer`, `Mana`, `ArrowsOverlay`, `CardZoom`, `HotkeysOverlay`, plus the
  pure `labels.ts`, `resolve.ts`, `arrows.ts`, `rects.ts` and `keys.ts`.
  **`CardTile` is THE card renderer** — every card in every zone, everywhere,
  goes through it (`m4-board.md` §7).
- **Real art, with the text frame underneath it, not beside it** (**D28**):
  `grid` 488×680 WEBP on the board, `thumb` on the stack and in the drawer,
  `display` for the zoom, all derived from the `scryfallId` and hot-linked
  (open question 5's default). `?replay=games/morph.jsonl` — a deck with **no**
  `art.json` entry at all — renders a complete board of generated frames, which
  is report 10's own exit check ("delete `art.json` and reload") without touching
  a generated file.
- **Arrows, and every fact they draw is also text** (**D30**). Three classes
  (target / attack / block), three curvatures, three dash patterns,
  `aria-hidden`, `pointer-events: none`. Seen live: `target:s:11>c:44`,
  `attack:c:44>p:0`, a double block as `block:c:90>c:31` + `block:c:91>c:31`, and
  on the replay board `target:s:76>c:28` **and** `attack:c:65>p:0` on one frame
  with `data-readonly="true"` and **0 of 20** `data-act` affordances enabled.
  `web/test/arrows.test.ts` builds arrows for all **2,473** committed `state`
  frames (35 target, 575 attack, 62 block) and counts **40 frames where a
  `stack[].id` is also a battlefield `Card.id`** — the collision the namespaced
  registry exists for.
- **One keymap table, 16 rows, and `H` renders it from the same table**, so the
  help cannot list a key nothing implements. Eight are live at M4 (`SPACE`,
  `ESC`, `CTRL+Q`, `Z`, `S`, `C`, `L`, `H`/`?`); the other seven flash their chip
  and name their milestone. Two rules that are easy to get wrong are pure
  functions with tests: a focused button keeps `Space` **and nothing else** (M3's
  handler dropped the whole keyboard for a focused button, so clicking a card
  turned `Escape` off), and `Esc`'s precedence is overlay → open `ask` (answer
  `null`, §5.4) → the engine's Cancel button.
- **The hidden-information rules are asserted per frame, not asserted once.**
  `web/test/render.test.tsx` renders **every frame of every fixture twice** —
  once as a replay (`actions` null) and once as a seat — over 12 fixtures and
  7,615 frames, checking that every `data-card-name` in the markup is a name that
  same frame serialised in the clear, that no tile is drawn for a card in an
  opponent's hand, and that the replay board stays read-only. All three have
  negative controls.
- **The phase strip ships read-only** (**D31**), drawing Forge's own documented
  defaults with every dot `disabled` and a tooltip naming the act, the missing
  read field and M6. A live toggle would have had to keep its own state, which is
  the phase-stop logic `CLAUDE.md` §Scope forbids.
- **Tests and gate.** `npm --prefix web test` → **271 `node --test` (267 pass,
  4 skipped) + 41 vitest**, `npm --prefix web run build` → **0 TypeScript
  errors**. The whole gate is green with these changes in the tree: the
  documentation run on 2026-09-12 was **`check-all OK`, exit 0, 211.99 s**
  (`var/verify/m4docs/check-all.log`; `docs/evidence/m4-board.md` §19).

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

**None of that list was rebuilt.** `wedge.ts` is still the stall rule, imported;
`buttons.*.label` is still rendered verbatim (the live game shows `Play`, `Keep`,
`Auto`, `Alpha Strike` and `End Turn` on Forge's own terms); clicks are still
never gated on `selectable`; and `<Board actions={…}/>` is still the whole of the
difference between a replay and a seat.

### M4 follow-ups — five closed by M5, one not reproduced, two open (2026-09-12)

Eight items, from the builders' own "problems" notes and the verifier's findings.
**None was a defect you could see from the board**, and none blocked M5.

| # | what | status |
|---|---|---|
| 1 | `mana-font` drags 3.72 MB of faces into the build | **closed** — the fork was taken; `dist/assets` is 4 files / 1,432,461 B with **one** 187,400 B font (**D32**, `docs/evidence/m5-board.md` §7.1) |
| 2 | report 10 §2.2's middle-row arithmetic is 23 px out | **open** — spec debt, not CSS; do not "fix" the CSS to match the table |
| 3 | `TypeError: set is not iterable`, once | **not reproduced** — hunted again over a full live game and both replay passes; the stale-HMR-module explanation stands and no guard was added |
| 4 | `render.test.tsx`'s "no `useState`, no `useEffect`" paragraph is false | **closed** — rewritten on today's terms |
| 5 | the selectable-outline assertion is order- and name-coupled | **closed** — the id/selectable pair is matched independently of the name and of attribute order |
| 6 | the log drawer is 520 px against a 264 px rail | **closed** — drawer x=12 w=264 against rail x=12 w=264 at 1600×900, 216/216 at 1280×720, measured live |
| 7 | the hand fan's outer tiles leave their grid cell | **closed** — hand row 190 px vs tallest tile 177 px (lowest bottom 882 ≤ 888) at 1600×900, 150 vs 139 (705 ≤ 710) at 1280×720; no horizontal body scroll at either size |
| 8 | `check-redaction.mjs` cannot read a four-line M11 session | **open** — 10e still asserts the stronger property directly instead; widening `preGameOnly` is whoever owns the checker's call |

The detail of each closed row is below, as it was written; the table above is the
status.

1. **`mana-font`'s CSS drags ~3.5 MB of faces nothing fetches into the build.**
   Measured on the M4 documentation gate run: nine font files totalling
   **3.72 MB** in `web/dist/assets/`, of which only the 187.40 kB
   `mana-*.woff2` is ever requested — `mana.woff`, `mana.eot`, `mana.ttf`,
   `mana.svg` (1.9 MB on its own) and four `mplantin.*` are emitted because
   `main.tsx` imports the package's CSS wholesale. (`m4-board.md` §5's "about
   3.2 MB" undercounts by one file, `mana.woff`.) **D29** records why this was
   accepted — a gitignored build directory for a localhost app, against a forked
   `mana.css` that must be re-diffed on every upgrade — and says plainly that it
   becomes worth fixing the moment anything is packaged or served over a network.
2. **Report 10 §2.2's middle-row arithmetic is 23 px out, and the spec is the
   half that is wrong.** The middle row measures **141.42 px** at 1600 × 900 and
   **111.42 px** at 1280 × 720 against §2.2's 164 / 134, because the board sits
   under a 23 px application bar the spec's arithmetic does not know about. Every
   other number in §2.2 is exact. Either §2.2 gains the bar or the bar moves into
   the board's own rows; **do not "fix" the CSS to match a table that assumed a
   different viewport.**
3. **`TypeError: set is not iterable`, once, from a layout effect.** Seen in the
   browser console during the live-play pass, caught by `ErrorBoundary`, with the
   React frame at `commitRoot` — so it came from `rects.ts`'s sweep or a ref
   callback, not from render. The only candidate is `for (const el of set)`
   (`web/src/render/rects.ts:142`), and a stale Vite-HMR module still holding the
   pre-fix one-element-per-key shape (`m4-board.md` §12) would produce exactly
   that message.
   **Reproduce it before changing anything**: an `instanceof Set` guard would hide
   the cause rather than explain it, and the same symptom after a cold load would
   mean something quite different.
4. **`web/test/render.test.tsx`'s own decision paragraph (lines 25–32) is now
   false** — and it is the paragraph that says to revisit it. It reads *"The board
   is a tree of pure function components: no `useState`, no `useEffect`, no refs
   … If the board ever grows an effect, this decision needs revisiting and this
   paragraph is the place it is written down."* Evening 3 grew several (the rect
   registry, the `window` key listener, the concede timer). `renderToStaticMarkup`
   may well still be the right harness — the empty-registry SSR branch is itself a
   negative control — but the paragraph has to say so on today's terms.
5. **The selectable-outline assertion is order- and name-coupled.**
   `render.test.tsx`'s regex requires `data-card-name` to be present *and* to sit
   between `data-card-id` and `data-selectable`, so a **concealed** tile (which
   carries no `data-card-name` by design) is never counted, and reordering the
   attributes in `CardTile` would silently empty the set while the test stayed
   green. Match the id/selectable pair independently of the name and of attribute
   order.
6. **The log drawer is 520 px wide against a 264 px rail.** Report 10 §10 says
   *"left edge, over the rail"*; open, it covers the rail plus ~256 px of the
   1160 px table column. Either the width comes down to the rail or §10 says it
   is a panel over the table.
7. **The hand fan's outer tiles leave their grid cell.** At 1280 × 720 the hand
   row is 150 px (`--ch-hand`) but the outermost tiles are 121 × 159 and their
   bottom edge sits ~5 px below the row. Nothing clips and the body still does not
   scroll; it is a tile that is not inside the box that is supposed to contain it.
8. **`check-redaction.mjs` cannot read a four-line M11 session,** so gate
   sub-step 10e does not run it. The checker treats "no `state` frames at all" as
   a failure, and downgrades its two *"this file proves nothing"* assertions only
   for `preGameOnly = stats.state > 0 && stats.maxTurn === 0` — which a session
   that ends before the first snapshot fails on all three counts. 10e asserts the
   stronger property directly instead (*the only s2c frames are `hello_ok` and
   `over`*, therefore not one card was serialised). Widening `preGameOnly` to
   include "no `state` frames and a four-line session" is a small change for
   whoever owns the checker; it was deliberately not made silently.

**Still open from M3 and unchanged by this milestone:** follow-up 9 — one human
press of the space bar. The browser automation driver delivers `Space` as
`{key: "", code: "", keyCode: 0}`, the same measurement M3 recorded, so the
binding is covered by `web/test/keys.test.ts` (both the `key` and the `code`
spelling) and by the engine buttons being clicked directly, but no finger has
pressed it. Every letter key and `Escape` were driven for real.

**One harness note, not a board defect.** The first live M4 game ended with the
bridge's own `IllegalStateException: the game did not reach 'over'`: thirteen
player turns driven one browser round-trip at a time exceeded `MtgTable`'s 900 s
game timeout and the JVM tore the session down mid-`assign_damage`. Every frame
up to that point rendered and every click was answered. A human plays faster than
one tool call per click; an agent driving the board does not.

## M5 — Nothing dead-ends

**Status: built, verified, and fixed — 2026-09-12.** The probe decks, the board
work and **two** independent verification passes are all in
`docs/evidence/m5-probes.md`, `docs/evidence/m5-board.md` and
`docs/evidence/m5-fixes.md`. Amendments **M22–M27** (the probes) and **M28–M31**
(the first verification's three dead ends) are in `docs/protocol.md`. The second
pass found one major and two minors and no new wire shape: the combat-band strip
was an implicit grid row that collapsed both middle zone rows at 1600 × 900
(`m5-board.md` §11), `useMana` had no end-to-end gate although `check-all.sh`
said it did (now `ten-games.sh` assertion 8), and the picker's reach was
overstated (the census below). All three are `m5-fixes.md` §10.
**Effort: 3 evenings.**

**Commands**

```bash
./scripts/play.sh                  # play it: the bridge, /health, vite, the board
./tools/ten-games.sh               # THE exit criterion, as a command (seeds 1..10)
./tools/ten-games.sh --games 3     # the first three rows, for a quick look
./tools/check-all.sh               # runs ten-games.sh as step 9c; SKIP_TEN=1 skips it
```

The probe runs the exit criterion is built out of, for when one row fails and you
want the session by hand (`--deck2 morph-probe` is load-bearing on all three —
`docs/evidence/m2-console.md` §9.3):

```bash
./bridge/run.sh mtgtable.MtgTable --transport auto --probe --seed 7 \
    --game-id human-search-7 --deck decks/search-probe.dck --deck2 decks/morph-probe.dck
./bridge/run.sh mtgtable.MtgTable --transport auto --probe --mana-lost-prompt --seed 7 \
    --game-id human-amount-7 --deck decks/amount-probe.dck --deck2 decks/morph-probe.dck
./bridge/run.sh mtgtable.MtgTable --transport auto --probe --seed 7 \
    --game-id human-number-7 --deck decks/number-probe.dck --deck2 decks/morph-probe.dck
```

**Deliverable / exit criterion.** Ten consecutive games with **zero `UNIMPL`
lines** and no state where the board is stuck waiting on something the browser
cannot express.

**Met, as a script rather than as a memory.** `tools/ten-games.sh` is that
sentence: ten `--transport auto` games at seeds 1..10, **alternating
`decks/pacho-shield.dck` and the five probe decks** — ten games of one deck would
only prove the engine does not dead-end on the paths that deck reaches — and each
one held to eight assertions: exit 0 and `MTGTABLE OK`; `finished = true`;
`UNIMPL members = none` **and** not one raw `UNIMPL` line in either log; `emit
errors = 0`; exactly one `over`, last; `check-redaction.mjs` over the whole frame
log with no flags; **no more than 150 asks of one kind in one game** (the one
wedge every other assertion is blind to — a `confirm` backstop that latched
produced 2,278 identical asks and a 35 MB log inside one 300 s step); and **the
typed acts a row exists to prove, plus their effect** — seed 4 must send
`useMana` *and* the seat's `manaPool` must be strictly smaller in the `state`
after it than in the `state` before. The run: `10/10 … 268 s`, 165 player turns,
**seven of the eleven ask kinds in one command**, ten `PASS` lines from
`check-redaction.mjs` (`docs/evidence/m5-probes.md` §10). It asserts that
**nothing dead-ends**, not that every kind fires — which kinds a seed raises is a
property of the shuffle, so a missing one prints `ADVISORY:` and is never an exit
code.

**The deliverable as it was written, before any of it existed** — kept verbatim,
because what it got wrong is worth seeing: it treats "a modal for these kinds" as
the job (M4 had already shipped those, and M5's job turned out to be the
opposite), and it asks for arrows M4 had already drawn.

Every `ask` kind gets real UI: mana payment (tap lands plus the engine's own Auto
button, which runs `ComputerUtilMana.payManaCost` inside `InputPayMana`),
targeting from `selectable` min/max, attacker and blocker declaration,
`assign_damage`, and modals for `choose_list` / `choose_entities` / `order` /
`assign_amount`; click-to-open graveyard and exile browsers; SVG targeting arrows
from `stack[].targetCardIds` and `combat.bands`.

**It did start with probe decks, and that was the right order.** Four new decks
(`search-probe`, `amount-probe`, `number-probe`, `sideboard-probe`) and four new
committed fixtures turned four of the six evidence-less kinds into recordings,
and **proved two of the other two unreachable in this configuration rather than
merely un-recorded** (amendments M22/M23). The probes also found the two answers
that were legal and still non-terminating — a `confirm` and a numeric `text` —
which no shape check could ever have seen. The current state of all eleven kinds
is the table in `docs/evidence/m5-probes.md` §1.

**What the evidence shows — all eleven kinds, where each one's evidence lives.**
Nine of eleven are now engine recordings; the other two are **documented
ceilings** rather than gaps, and the proof for both is bytecode in the 2.0.14 jar
rather than a search that came up empty.

| kind | engine evidence | where |
|---|---|---|
| `choose_list` | yes, since M2 | every human-seat fixture (57 in the corpus) |
| `order` | yes, since M2 | `human-auto-42`, `human-scry-7`, … |
| `assign_damage` | yes, since M2 | `human-trample-7` (the deck exists to force it), `human-ability-42` |
| `ability_menu` | yes, since M3 | `human-ability-42.jsonl` — 7 asks and **7 `clickAbility` acts** |
| `choose_entities` + `delayedReveal` | **new, M5** | `human-search-7.jsonl` — `decks/search-probe.dck`, Rampant Growth |
| `assign_amount` | **new, M5** | `human-amount-7.jsonl` — `decks/amount-probe.dck`, Manamorphose; §5.3's **colour-keyed** branch |
| `confirm` | **new, M5**, behind a non-default pref | `human-amount-7.jsonl` + `--mana-lost-prompt` (**M24**) |
| `text` | **new, M5** | `human-number-7.jsonl` — `decks/number-probe.dck`, Volcano Hellion, `getInteger`'s *"Other…"* (**M25**) |
| `options` | **unreachable** | `IGuiGame.showOptionDialog` has **zero** call sites in the jar (**M22**) |
| `manipulate_list` | **unreachable while D13 holds** | one caller, pref-gated on `UI_SELECT_FROM_CARD_DISPLAYS` (**M23**) |
| `sideboard` | **still none** | `--games 2` is necessary and not sufficient (**M27**) — M6 owns it |

**No wire shape changed.** Every body the probes produced already matched
`docs/protocol.md` §5.2 as written, all four new fixtures passed
`check-redaction.mjs` with no flags, and the 2026-09-12 amendments record
*reachability*, not a change of shape. What the probes did change is two
**answers**: a `confirm` answered `false` forever and a numeric `text` answered
`""` forever are both legal and both non-terminating (`m5-probes.md` §9), which
is the defect shape a kind without engine evidence hides and which no shape check
could have caught.

**And the headline is narrower than it sounds, so here is the number.** "The
board-shaped ones stop being a modal" is true and, against this engine and these
decks, reaches **exactly one kind**: over the 15 recordings in
`fixtures/games/` — **108 asks** — `boardPick` accepts **3**, and all three are
`assign_damage`. The `choose_list` branch of the picker is exercised only by the
hand-written `fixtures/synthetic/sample-handwritten.jsonl`, and no live browser
session has produced a card picker yet. That is not a gap in the rule: the only
other card-optioned asks in the corpus are 22 `choose_list` **reveals**
(`min = max = −1`, §5.3) and 7 `choose_entities` that all carry a
`delayedReveal` (§5.3), and both are modals *by design*, while the rest have no
board entity to point at — `ability`, `color`, `other`, `number` options, or no
options at all. `options` would be the last candidate and is unreachable
(**M22**). The full table is `docs/evidence/m5-board.md` §1.1, and
`web/test/picker.test.ts` prints the census on every run so the number moves the
day a card picker appears.

**What the board gained**, against the list "What M4 hands to M5" below wrote:

1. **`useMana`** — a colour the pool actually holds is a `<button>` on your own
   rail, and `W U B R G C` spend it from the keyboard. **The one real dead end,
   closed** (`m5-board.md` §2, and the wire line is quoted there).
2. **Board-shaped asks stop being modals** — `render/picker.ts` decides it,
   purely, and `AskPicker` is the decision panel's half (`m5-board.md` §1;
   the rule and its rejected alternatives are **D33**).
3. **Zone browsers** — a graveyard / exile / command caption and the rail's
   revealed library slice open a panel of full-size `CardTile`s, and
   `input.openZones` opens one *by itself* (`m5-board.md` §3).
4. **The declared combat bands** as a strip, read from `combat.bands` only.
5. **A pending-target arrow** — from the source of the choice to the candidate
   under the pointer, and honestly absent where the source is not on the board
   (`m5-board.md` §5).
6. **`chosen k of min..max`** while a selection is open — printed, never
   enforced, and labelled as clicks sent rather than as a count the engine
   published (`m5-board.md` §6).
7. **Five of the eight M4 follow-ups**, including `mana-font` (**D32**).

All of it through the one `CardTile`, which is now imported by exactly ten files
(CLAUDE.md §"The web client"); the picker marshals nothing — the answer is built
by `AskModal`'s own `answerFromDraft`, so the two surfaces cannot disagree about
what an answer looks like.

### What M4 hands to M5 — what the board can and cannot express

Written 2026-09-12, from the M4 code as it stands. **Two lines of M5's
deliverable paragraph above predate M4 and are already shipped** — do not build
them twice:

- **SVG targeting arrows from `stack[].targetCardIds` and `combat.bands`** are
  done (**D30**): three classes, pure geometry, a namespaced rect registry, and a
  test that builds them for all 2,473 committed `state` frames. What M5 adds is an
  arrow for a *pending* target — the one being chosen out of `selectable` — not
  the resolved ones.
- **Modals for `choose_list` / `choose_entities` / `order` / `assign_amount`**
  have existed since M3, and evening 3 gave `AskModal` a real dialog shell:
  `role="dialog"`, focus moved on open and restored on close, a `Tab` trap, `Esc`
  answers `null` (§5.4), and a `timeoutMs` bar that draws **only when
  `timeoutMs > 0`** — over the socket it is 0 (**D24**), so no bar is drawn, which
  is the honest rendering. M5's job is not "a modal for these kinds"; it is
  "the board-shaped ones stop being a modal".

**The whole vocabulary the board can speak today is five acts plus `answer`:**
`clickCard` (for **any** card — never gated on `selectable`, amendment M8),
`clickPlayer`, `buttonOk`, `buttonCancel`, `concede`, and an `answer` for all
eleven ask kinds.

**Typed acts with no control on the board:**

- **`useMana` — this is the one real dead end, and it goes first.** The console
  seat can spend floating mana (`m W|U|B|R|G|C`); the board has no control for it
  and the mana pool is six read-only pips in the rail. A state in which Forge
  expects floating mana to be spent through `useMana` cannot be resolved from the
  browser at all. Everything else on this list is a missing comfort.
- **`clickAbility`** — the console seat sends it (`a <card> <ab>`,
  `ConsoleTransport.java:534`); **the browser never has**. A multi-ability card
  goes through the asynchronous `ability_menu` instead (**D20**/**D22**), whose
  answer is applied with the same `IGameController.selectAbility` call, so the
  engine path is exercised and the *act* is not.
- **`passPriority`, `undo`, `alphaStrike`, `nextGame`, `setPhaseStop`,
  `setYield`** — all M6 by their own §2.2 rows. Their keys exist (`A`, `CTRL+Z`,
  `E`, `T`, `B`, `CTRL+A`, `Y`, `N`) and flash their milestone rather than doing
  nothing quietly.

**What the board draws but cannot be opened or manipulated:**

- **No zone browsers.** Graveyard and exile are always-visible 45 px strips in the
  middle row; there is no click-to-open browser for either, none for the library's
  revealed slice, and none for a revealed list. `input.openZones` renders as a
  text hint (*"a view hint; it reveals no cards"* — P6 / report 06 §3), which is
  correct, but there is nothing to open.
- **Attackers and blockers** are declared by clicking tiles and pressing the
  engine's button, which is how Forge's inputs genuinely work — but there is no
  band-building gesture, no drag, and no "this blocker on that attacker" beyond
  the clicks the engine asks for.
- **`assign_damage`** is answered in the modal (defender at index 0, §5.3), not on
  the blockers themselves.
- **Targeting** is `selectable` outlines plus clicks. The ask's min/max are
  *printed*, never enforced — Forge judges, and `CLAUDE.md` §Scope is why.

**Whatever M5 adds, it adds through `CardTile`.** One card renderer for every card
in every zone is the renderer's half of hard rule 8 (`docs/evidence/m4-board.md`
§7): a zone browser or a targeting picker that draws its own card component is how
a name for a `hidden: true` id gets back onto the screen, and it is exactly what
`render.test.tsx`'s per-frame name check would *not* catch if the markup stopped
carrying `data-card-name`.

**The six ask kinds without engine evidence — settled, 2026-09-12** (this
supersedes M3 follow-up 4). Written before M5; here is what the probe decks
actually found, row by row, against the amendments they produced:

| kind | before M5 | now |
|---|---|---|
| `choose_entities` + `delayedReveal` | one uncommitted console session | **`fixtures/games/human-search-7.jsonl`** — `decks/search-probe.dck`, Rampant Growth |
| `assign_amount` | none | **`fixtures/games/human-amount-7.jsonl`** — `decks/amount-probe.dck`, Manamorphose; the colour-keyed branch of §5.3 |
| `confirm` | none | **`fixtures/games/human-amount-7.jsonl`** — the same deck plus `--mana-lost-prompt` (**M24**: one reachable call site, `InputPassPriority`, behind `FPref.UI_MANA_LOST_PROMPT`) |
| `text` | none | **`fixtures/games/human-number-7.jsonl`** — `decks/number-probe.dck`, Volcano Hellion, through `getInteger`'s "Other…" (**M25**) |
| `options` | none | **unreachable, and not only for a human seat** — `IGuiGame.showOptionDialog` has **no call site anywhere** in the 2.0.14 jar (**M22**). A documented ceiling, not a gap. |
| `manipulate_list` | none | **unreachable while D13 holds** — one caller, pref-gated on `UI_SELECT_FROM_CARD_DISPLAYS`, confirmed in the jar's bytecode (**M23**). |
| `sideboard` | none | **still none** *(as of M5)*. `--games 2` is necessary and not sufficient: `emitOver` ends the session on game 1's `matchOver:false` (**M27**). `decks/sideboard-probe.dck` and the flag exist; making it fire is M6's `HostedMatch.restartMatch` row. **Closed by M6**: `fixtures/games/human-sideboard-7.jsonl`, asserted by gate step 9d (**M38**). |

So: **four kinds recorded, two proved unreachable, one handed to M6 and closed
there.** `ability_menu` came from the live browser games and `choose_list`,
`order` and `assign_damage` were already in the corpus, which makes **nine of
eleven** evidenced and the two ceilings documented — the count `docs/protocol.md`
§5.2 now prints as a census.

**Two shapes a new panel must not assume away**, the same two M4 was handed: an
`over` with no `gameOver` `state` in front of it (**M11** — now measured, M3
follow-up 5) and a `seq` that can arrive lower than the frame before it after a
`resync` (**M10**).

### M5 follow-ups — thirteen, 2026-09-12

From the two builders' own "problems" notes and the two verification passes.
**None of them stops a game**: the exit criterion is met, ten games run with zero
`UNIMPL`, and the one real dead end M4 named is closed. **Four belong to M6** by
ownership (1, 2, 9, 10); **three are test- or tooling-quality debt** (3, 4, 6);
**two are accepted trades** with the escape hatch measured (5, 8); **two are
facts about what Forge asks or about the browser harness**, not defects (7, 13);
**one is corrected in place today** (12); and **one is carried over from M4**
(11).

**After M6, 2026-09-12:** of the four that belonged to M6, **1 and 2 are
closed** — `sideboard` has an engine recording and the mana-lost prompt is on by
default — and **9 and 10 are not**; both are carried onto the M6 follow-ups list
below (items 4 and 3 there) rather than being closed by proximity. 13 is
unchanged and is M6 follow-up 13.

1. **CLOSED BY M6.** ~~`sideboard` still has no recording, and only M6 can give
   it one.~~ It has one: `fixtures/games/human-sideboard-7.jsonl`, game 2 of a
   `--games 2` match, asserted by gate step **9d**. The paragraph below is why it
   could not happen before amendment M38.
   **`sideboard` still has no recording, and only M6 can give it one.**
   `decks/sideboard-probe.dck` is correct and `MtgTable --games 2` exists; the
   ask cannot fire because the session does not survive game 1's `over` with
   `matchOver: false` — `WireGuiGame.emitOver` counts the `finished` latch down
   and sets `overEmitted`, after which `ask()` returns `null` before emitting
   (**M27**). The wire is right; the session ends too early. M6's
   `HostedMatch.restartMatch` row.
2. **CLOSED BY M6 — the decision was taken, and it is "on".**
   `config.json` carries `"manaLostPrompt": true`, `MtgTable` sets
   `FPref.UI_MANA_LOST_PROMPT` from it **in memory** (never `save()`), and
   `--mana-lost-prompt` / `--no-mana-lost-prompt` override it either way
   (amendment M40). So `confirm` now occurs in ordinary games. The open question
   table's row 9 below is answered by this. The paragraph as written:
   **`confirm` is invisible on stock Forge preferences.**
   `FPref.UI_MANA_LOST_PROMPT` defaults to `"false"`; `--mana-lost-prompt` sets
   it in memory for probe runs only (**M24**). Whether to turn it on for the user
   — it is a genuinely useful warning — is an M6 comfort decision, deliberately
   not taken here.
3. **The default auto-answer policy changed for two kinds, in a shared file.**
   `AutoTransport.answerFor` (mirrored line for line in `tools/ws-auto-play.mjs`)
   now answers a `confirm` with the body's own `defaultYes` instead of `false`,
   and a **numeric** `text` with `null` instead of `""`; from the third identical
   prompt *with no progress in between* the confirm answer alternates, the
   counters clear whenever a `state` changes `turn|phase|activePlayer`, and
   `ASK_REPEAT_CAP = 20` answers and then concedes. No committed fixture contains
   either kind and 9b's multiset diff of `human-auto-42` is unchanged, so nothing
   was re-recorded — but **it is a policy change to a shared file and should be
   read as one**, and the alternating backstop is a heuristic: it guarantees no
   single prompt loops forever, not that the answer it lands on is the one a
   human would have given. `AskSelfTest` (106 checks) and ten-games' 150-asks-of-
   one-kind ceiling are what would notice it regressing.
4. **There is no DOM test environment**, so three of M5's load-bearing
   measurements are pinned by numbers in a document rather than by an assertion:
   the `.table__middle` grid tracks after the band fix, the caption
   hit-testing, and `dist/assets`' font count. `node --test` type-strips and
   vitest runs in the `node` environment (CLAUDE.md §"The web client").
   `web/test/hooks-order.test.ts` is a **source scan** — negative-controlled, and
   it exists because a `useMemo` below `Board`'s early return shipped and the
   whole suite stayed green — but it is not a rules-of-hooks check, and any other
   component with an early return is still unguarded. Adding jsdom is a
   dependency decision nobody has taken.
5. **The combat-band strip is an overlay, and while it is tall it covers the
   graveyard / exile strips behind it** (**D36**). That is a trade, not a free
   fix: at 1600 × 900 the middle is on its 120 px floor and two 62 px strip rows
   already want 128 px. Mitigated and measured — the strip shrink-wraps (453 px
   of a 910 px middle) and sits at `z-index: 55`, **below** the caption buttons'
   60, so the zone browser stays reachable and its tiles clickable. A graveyard
   card Forge makes clickable while bands are on screen must be clicked in the
   browser panel rather than on the strip.
6. **ACCEPTED, and now said where it prints.** 9b prints
   `MULTISET DIFFERS: 2 frame instance(s)` under machine load. Two frame shapes
   drift between runs of the same seed and neither is emitter drift:
   `input {prompt:"Waiting for Forge AI..."}` (ticks of `awaitNextInput()`'s
   250 ms `java.util.Timer` re-push — ×16 against ×14 with vite and a browser on
   the same machine) and a trailing `act {"action":"buttonCancel"}` (whether the
   last priority window of a finished game gets one more press). M6 measured the
   second one directly: re-recording `human-auto-42` gave 45 `buttonCancel`
   against the M3-era fixture's 46, and a later fresh seed-42 run gave 46 again.
   The choice offered here was "teach the diff about it or leave it loud": the
   decision is **leave it loud and say so at the point of failure** —
   `tools/fixture-multiset-diff.mjs` now prints a NOTE naming both shapes and
   telling the reader to check the per-frame listing before believing it.
   Teaching the diff to ignore them was rejected: a filter that hides two frame
   shapes hides them for every future defect that happens to wear one.
7. **The board picker reaches exactly one kind here** — 3 of the 108 asks in
   `fixtures/games/`, all `assign_damage`. The `choose_list` branch is exercised
   only by `fixtures/synthetic/sample-handwritten.jsonl`, so half the picker is
   pinned by a file we wrote. Not a gap in the rule (§1 above says why every
   other card-optioned ask is modal *by* a stated rule), and
   `web/test/picker.test.ts` prints the census every run so the number moves
   visibly the day a live card picker appears.
8. **`assign_amount` is not a picker** even when its targets are entities the
   board draws: §5.3's keys may be colours and the corpus's eleven all are. A
   one-line change to `boardPick` on the day a recording shows entity keys.
9. **STILL OPEN after M6.** **`clickAbility` still never leaves the browser.** It is proven end-to-end
   over the socket (`check-all.sh` 10f, 7 acts) and from `AutoTransport`, but the
   board's own path for a multi-ability card is still the asynchronous
   `ability_menu` (**D20**/**D22**), which reaches the same
   `IGameController.selectAbility`.
10. **STILL OPEN after M6** (`docs/evidence/m6-engine.md` §9 item 3).
    **`input.weak` is still `[]` on the wire** (M4's tile style has no data), and
    `input` still carries no typed *"the engine is collecting mana"* field. The
    second is the protocol row that would let a client offer the mana pips only
    during a payment without matching a button label — **M30** leaves it to M6
    explicitly.
11. **Two M4 follow-ups carry over unchanged**: report 10 §2.2's middle-row
    arithmetic is 23 px out against the built board (spec debt — do not "fix" the
    CSS to match the table), and `check-redaction.mjs` still cannot read a
    four-line M11 session, which is why 10e asserts the stronger property
    directly instead.
12. **`docs/evidence/m5-probes.md` §12 overstates its own un-recorded corners**,
    and the correction is appended there: `reveal: true` is **22** asks across
    five engine fixtures and `maySkip: true` is **2**, so the only corner of an
    otherwise-evidenced kind that no engine recording carries is `order` with
    `sideboardMode: true` — which is the `sideboard` row's neighbour and blocked
    on the same M6 work.
13. **The user still has not pressed the space bar.** Unchanged from M3
    follow-up 9 and **unchanged by M6**: the browser driver delivers `Space` as
    `{key:"", code:"", keyCode:0}`, so the binding is covered by `keys.test.ts`
    and by the buttons being clicked directly, and by nothing else. M6 bound
    Space to `input.buttons.focus` (amendment M39) and everything *around* the
    space bar is measured — `focus` is `"ok"` on 546 of 844 input frames in
    `human-comfort-13` and never `"cancel"`, the focused button carries
    `btn--focus` and is the document's `activeElement`, and `planKey` returns
    null for a focused button so the browser's own activation is not doubled —
    but the key itself is still pressed by nothing but a human.

### What M5 hands to M6

Read [`docs/research/11-engine-comfort-features.md`](docs/research/11-engine-comfort-features.md)
in full first — the corrections under **M6** below are its summary, not a
replacement for it. What follows is only what M5 changed about M6's starting
position.

**Already on the wire, so do not build it twice.**

- **`useMana` is a real control with a real gate.** The pips are buttons, the
  keyboard spends, and `ten-games.sh` assertion 8 asserts both the act *and* its
  effect on the seat's `manaPool`. M6's "auto-pay" is therefore **not** a new
  act: Forge writes `Auto` on `InputPayMana`'s own OK button and M3 already
  renders `buttons.*.label` verbatim, which is why the keymap's `A` row now reads
  *"press SPACE instead: it is the engine's OK button"*. There is no `autoPay`
  act and inventing one is the "board threw the engine's answer away" failure.
- **`clickAbility` works end to end** (`check-all.sh` 10f asserts 7 acts over the
  socket, none unresolvable), so a yield feature that needs to name an ability
  has a proven path.
- **Every M6 key is already a row in the one keymap** — `CTRL+Z`, `E`, `T`, `B`,
  `CTRL+A`, `Y`, `N` — flashing their milestone rather than doing nothing
  quietly. M6 adds acts and a row's `milestone`, never a new branch in the
  handler (`web/src/keys.ts`, CLAUDE.md §"The web client" rule 4).
- **The session header records what shaped a run** (**M31**): `policy: "probe"`
  and `prefs: ["UI_MANA_LOST_PROMPT"]`, optional and omitted when unset. A
  multi-game session has to keep that honest per game.
- **The wedge banner has a seventh clause** (**M28**): an **enabled `Cancel`** is
  by construction not a wedge. M6's yields put an enabled Cancel on screen
  constantly (`InputLockUI` labels it while a yield runs), so that clause is what
  keeps the red banner off an ordinary auto-yield.

**The three things M6 has to do that M5 proved it has to do.**

1. **A session that survives `matchOver: false`** — `HostedMatch.restartMatch`,
   a **new `hello_ok`** so the client drops its card map (§2.1), and the
   `ReplyPool`, the cached ids, the phase-stop map and the frame log all rebuilt
   from `openView`. That single piece of work unlocks the `sideboard` ask
   (follow-up 1), `order` with `sideboardMode: true` (follow-up 12) and the
   `nextGame` act at once.
2. **A typed field for "the engine is collecting mana"** on `input`
   (follow-up 10, **M30**). Without it, a client that wants to offer the pips
   only during a payment has to match an engine button label, which
   `CLAUDE.md` §Scope forbids.
3. **`players[].phaseStops`** (**D31**) — the dots are Forge's documented
   defaults and read-only until the field exists, answered from `WireGuiGame`'s
   own map and never from `FPref` or `YieldController` (the `isRemoteClient()`
   branch is dead code for us).

**And one comfort decision M5 deliberately left to M6 and to the user:**
whether `UI_MANA_LOST_PROMPT` goes on for real games (follow-up 2). If it does,
nothing else has to move — the board already renders a `confirm`, and the
automated seat answers one terminatingly.

## M6 — Comfort

**Status: done, 2026-09-12.** What shipped and what it was measured against are
in [`docs/evidence/m6-engine.md`](docs/evidence/m6-engine.md) (the bridge half)
and [`docs/evidence/m6-board.md`](docs/evidence/m6-board.md) (the browser half);
the wire is `docs/protocol.md` amendments **M32–M40**, promoted out of that
file's §10 and into the live sections. The corrections below were the plan and
they held: five of the features were already on the wire, one was already a
rendered button, and **one piece of work — `HostedMatch.restartMatch` —
unblocked three separate rows at once** (New Game, the `sideboard` ask, and
`order` with `sideboardMode`, of which the first two landed).
**Effort: 2 evenings.**

**Command**

```bash
./scripts/play.sh   # three games back to back, one command typed
```

That command means what it says as of M6, and it did not at first: `play.sh`
now defaults to **`--games 3`** and **`--keep-open`** (override with your own
`--games`, or `--no-keep-open`). Both are load-bearing — without the first the
JVM stops after game 1, and without the second the socket closes the instant the
last `over` lands, which is the moment the board draws its **New Game** row.
The first verification pass found exactly that dead end on this line.

**Deliverable.** New Game without restarting the JVM (`HostedMatch.restartMatch`),
Undo, Concede, phase stops, Pass-To, always-yes/no, keyboard shortcuts mirroring
Forge's own `SHORTCUT_*` keycodes, mana-font pips, error toasts.

**Every one of these is an engine feature rendered, not a client state machine.**

**What the evidence actually shows** (`docs/evidence/m6-engine.md` for the bridge,
`m6-board.md` for the browser, plus the verification pass below):

- **Three games in one JVM, from one command.** `act: newGame {mode}` →
  `nextGameDecision(CONTINUE|NEW)` → `HostedMatch.continueMatch()` /
  `restartMatch()`. **`openView` is the reset hook**: a new `gameId`
  (`<base>-g<n>`), a new `var/games/<gameId>/frames.jsonl` with its own session
  header, and the card / player / ability indexes, the concealed-id set, the
  yield-handle table, the phase-stop map, the `input` struct, the over-latch and
  the `ReplyPool` all rebuilt (**M38**, **D44**). The client is told by the **new
  `hello_ok`**, whose changed `gameId` is what makes the reducer drop its card
  map. Gate step **10g** plays three games over one socket in **85.7 s**, one
  JVM, and exercises both `continueMatch` and `restartMatch`.
- **The five typed acts are gated by their EFFECT, not by a count.**
  `setPhaseStop`, `yieldTo`, `setYield` and `undo` are each asserted by the
  `state` that followed them; `passPriority` is asserted by a count, which is all
  it can be, and the gate step **says so** rather than claiming five effects. The
  push that makes the other four visible
  while the engine is parked is `WireGuiGame.refreshState()`, and it walks the
  view graph only under **D39**'s two-part guard (D22's generation stamp **plus**
  a positive "the engine is parked" predicate), with skips counted and printed.
- **The phase-strip dots are live and the engine really stops.** 24 dots drawn
  from `players[].phaseStops` (**M32**, the `{own, opp}` shape of **D41**), a
  click is `act: setPhaseStop {phase, turn, stop}` (**M33**), and the next
  `state` says what happened. Measured in the browser: after setting the `DRAW` /
  own dot, turn 3 gave this seat priority at ***Your draw step*** — which Forge
  does not do by default.
- **Auto-yield's behaviour is asserted, not merely measured.**
  `decks/yield-probe.dck` (22 Thallids, one mandatory upkeep trigger each) puts
  the same `yieldKey` back on top of the stack every turn, and after
  `yielded:"yes"` the engine raises **zero** `input` frames carrying
  `buttons.ok.enabled` while that key is on top:
  `fixtures/games/human-yield-13.jsonl`, `repeats=4 promptsWhileOnTop=0`, gate
  step **10g** with `--require-yield-repeat`. The handle itself is opaque
  (`"y3"`) and never rendered (**D42**).
- **The `sideboard` ask has an engine recording at last** — game 2 of a
  `--games 2` match, gate step **9d**, `fixtures/games/human-sideboard-7.jsonl`
  — which makes it **nine of the eleven ask kinds** evidenced, the other two
  being the documented ceilings `options` and `manipulate_list`.
- **`input.buttons.focus` is on the wire and Space follows it** (**M39**,
  **D45**): `"ok"` on **546 of 844** `input` frames in `human-comfort-13` and
  never `"cancel"`, the focused button is the document's `activeElement`, and
  `planKey` returns *no* plan for it so the browser's own activation is never
  doubled into a second `buttonOk`.
- **`UI_MANA_LOST_PROMPT` is on by default** (**M40**, **D43**): `config.json`'s
  `"manaLostPrompt": true`, set in memory and never `save()`d, so the floating-mana
  `confirm` now occurs in ordinary games and every session header carries
  `prefs: ["UI_MANA_LOST_PROMPT"]`. The same seed plays the same game (1,587
  lines, one fewer `buttonCancel` — a frame that swings both ways on its own).
- **Undo is the engine's undo and nothing more.** `state.undo {can, depth}` is
  `canUndoLastAction()` / `getUndoStackSize()` (**M35**) — mana abilities only,
  cleared at every phase change — and the board's button promises exactly that.
- **The browser half computes nothing.** A dot draws `players[].phaseStops`, a
  yield line draws `state.yield`, the Undo button draws `state.undo`, a badge
  draws `stack[].yielded`; not one of them remembers anything between frames, and
  D31's **hold-priority toggle is gone** rather than enabled, because Forge has no
  such feature. Every M6 field is optional in `protocol.ts` behind one reader
  apiece, so the fourteen recordings that predate 2026-09-12 still render.
- **The gate grew two steps and about two and a half minutes, and stayed green.**
  Thirteen numbered steps with **five** lettered sub-steps (9b, 9c, **9d**, 10f,
  **10g**) and **seven** ws servers. The count and the wall time live in
  CLAUDE.md §"Build and run" and in one place only — two dated numbers in two
  files is how this repo once said "five servers, 3 m 19 s" and "seven servers,
  eleven and a half minutes" on the same day.

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

### M6 verification pass — one major and seven minors, all closed, 2026-09-12

An independent pass played the board in a browser, re-ran the gate from a deleted
`bridge/out` and read the jar. Its verdict was that M6's features are engine
features rather than client state — four proved behaviourally in a live browser,
the fifth (auto-yield) at the wire and bytecode level — and it found **one
major**, which was M6's own headline flow dead-ending on itself.

1. **[major] New Game had a 30-second fuse that fired with a client connected.**
   `MtgTable`'s two post-`over` waits were a flat wall clock that ran whether or
   not anybody was attached, so the board's **New Game** row — which appears at
   `over` — had half a minute to live, and `./scripts/play.sh` defaults to
   `--games 3`. **Fixed** by applying the rule the ask timeout already uses
   (**D24**, CLAUDE.md §"The socket's own two rules"): `MtgTable.awaitNextGame`
   waits with **no deadline while a `WsTransport` reports a connected client**,
   falls back to 30 s while none is, and returns at once when a client that
   *was* connected leaves — so no scripted client in the gate pays for it.
   `WsTransport.keepOpen(long)` is deleted. Decision **D40**. Measured: a client
   silent for **40,046 ms** after game 1's `over` still got game 2, 39 ms after
   the act. The board's half: `NewGameRow` disables both buttons and says why
   when the socket is not `open` (`Board`'s new `connected` prop).
2. **[minor] `web/src/protocol.ts` numbered the M6 rows `M1..M8`,** which are
   real amendment ids meaning something else. **Renumbered** to `M32..M41`.
3. **[minor] Amendment `M34` said `playerId` is null for two of the three yield
   kinds.** It is the yielding seat for all three; only `phase` is null.
   **Corrected**, matching §3.1 and the emitter.
4. **[minor] `hello_ok.gameNumber` / `.gameCount` were read by the client and
   written by nobody.** **Fixed by emitting them** — amendment **M41** — because
   the client's fallback (its own count of `hello_ok`s) restarts at 1 on a page
   reload and can never say *of 3*. `gameLabel()` still falls back for the
   recordings that predate it, and now says nothing at all for a one-game match.
5. **[minor] `scripts/play.sh`'s banner still said "Space press the engine's OK
   button",** which M6 itself retired, and listed none of M6's keys.
   **Rewritten**: the focused button, plus `E`/`T`/`B`, `P`, `CTRL+Z`, `Y`/`N`
   and `H`.
6. **[minor] Two dated statements disagreed about the gate.** PLAN's M3 bullet
   said five ws servers and 3 m 19 s; CLAUDE.md said seven and eleven and a half
   minutes. **The count and the wall time now live in CLAUDE.md only.**
7. **[minor] `tools/check-redaction.mjs` relaxed the hidden-information gate in
   two places for M6** and the verifier asked for a second signature on one of
   them. Added: **`reveal: true` on any `ask` kind other than `choose_list` is a
   failure**, so a flag the emitter writes cannot switch amendment P12's
   option-card audit off for a kind nobody argued for. Negative control
   `fixtures/negative/redaction/a7-reveal-flag-on-the-wrong-ask-kind.jsonl`.
8. **[minor] Auto-yield's BEHAVIOUR was measured, never asserted** — no run
   anywhere had shown the engine skipping a prompt because of `setYield`, and
   the committed proof set its yield on a creature *spell*, which the engine's
   ability-scoped store can never consult. **Both closed.**
   `decks/yield-probe.dck` (18 Forest + 22 **Thallid**, one mandatory upkeep
   trigger each) puts the same `yieldKey` back on top of the stack every turn;
   gate step **10g** plays it with `--require-yield-repeat`; and the rule is now
   an assertion on every deck — after `yielded:"yes"`, **zero** `input` frames
   with `buttons.ok.enabled` while that key is `stack[stack.length-1]`.
   `fixtures/games/human-yield-13.jsonl` is the recording:
   `repeats=4 promptsWhileOnTop=0`. `human-comfort-13` is re-recorded and its
   yield is on a triggered ability; `docs/evidence/m6-engine.md` §4's line
   references were redone against it.

### M6 follow-ups — thirteen, 2026-09-12

From the two builders' own "problems" notes, the verification pass and the fix
pass. **None of them stops a game or blocks M7**: the milestone's command plays
three games back to back in a browser, every M6 control is an engine feature
rendered, and the gate is green. Four are gaps in *evidence* (1, 2, 5, 13), two
are protocol rows nobody has needed yet (3, 9), two are a test that does not
exist yet or a reading that wants a second pair of eyes (7, 8), three are
deliberate non-changes named here so they stay decisions rather than becoming
oversights (10, 11, 12), and two are carried forward unchanged (4, 6).

1. **`order` with `sideboardMode: true` is still unrecorded** (M5 follow-up 12's
   last corner). `sideboard` itself now has a recording; the *reorder* the same
   between-games hook can raise needs a deck whose main/sideboard swap forces
   one, and `decks/sideboard-probe.dck` does not.
2. **Only the `endOfTurn` yield has an engine recording.** `marker` and `stack`
   are on the wire, in the synthetic fixture and driven from the board (`T`,
   `B`, the stack's own controls), but no committed recording carries one —
   pressing `T` in a browser session and copying that log under `fixtures/` is
   the whole of the work (`docs/evidence/m6-engine.md` §9.2).
3. **`input.weak[]` is still `[]` and `input` still carries no typed
   `payingMana`** (M5 follow-up 10, amendment **M30**) — so the mana pips stay
   live whenever the pool is non-empty, and the "Auto would tap this" outline is
   not drawn on the tile. **Do not** solve either by matching a button label.
4. **`clickAbility` still never leaves the browser** (M5 follow-up 9, unchanged).
   It is proven end to end from a script (gate 10f) and the board's own path for
   a multi-ability card is still the asynchronous `ability_menu` (**D20**/**D22**),
   which reaches the same `IGameController.selectAbility`.
5. **`newGame` is absent from the frame log.** The act is applied before the log
   for the next game exists, so a reader of `var/games/` alone sees only the
   stderr line and the next game's header; a client log has the act
   (`docs/evidence/m6-engine.md` §2.3).
6. **The undo race is Forge's own and is caught, not fixed.** `undo` can arrive
   after the engine has already cleared its own stack; the bridge answers with a
   correction rather than a rejection (§4.3, §4.7). Nothing here can make Forge's
   undo stack transactional.
7. **D40's fix is not in the gate.** Proving "a connected client waits as long as
   it likes" costs ~40 s of wall clock, so `ws-auto-play --new-game-delay-ms`
   defaults to 0 and `tools/check-all.sh` does not pass it: the major is
   evidenced by a manual socket run (40,046 ms of silence, game 2 39 ms after the
   act) and by the browser, and **a regression would not turn the gate red**.
   Adding it is an eighth ws server and about a minute.
8. **`tools/check-redaction.mjs`'s two M6 relaxations want a second human
   reader.** An `ask` may now justify the `state` **immediately** before it (and
   nothing further back), and a `reveal: true` `choose_list` is its own delayed
   reveal. Both are negative-controlled in `fixtures/negative/redaction/`, and
   the verification pass narrowed the second (the flag on any other kind is now a
   failure, control `a7-…`) — but this file is the last automated thing between
   an emitter regression and shipping the opponent's hand, and both edits were
   made by the agent that needed them. Re-read `preAskReveals` and the
   `reveal === true` branch before trusting them.
9. **Three protocol rows are still specified and not emitted**:
   `state.autoPassNoActions`, `attachedToPlayerId` and `input.selectable.playerIds`
   (protocol §10). Nothing on the board needs them today.
10. **No AI profile picker and no yield settings, deliberately.** The profile
    picker is report 11 §9 and stays on the deferred list (it is one string
    passed as `profileOverride`, and the no-override branch **saves** a pref);
    `YIELD_*` prefs, yield suggestions and `DeclineScope` are out of scope by
    report 11 §12 and nothing in the bridge reads or writes them.
11. **Phase stops are reseeded for every game** (**D38**), which Forge's desktop
    does not do: a stop set in game 1 must be set again in game 2. The decision
    and its rejected alternative are written down; this line exists so the
    comfort cost is on the follow-up list rather than only in the rationale.
12. **`useMana` still has no post-act snapshot push**, so the mana pool is one
    frame stale after it and the board marks the pips *provisional* (M5's
    mechanism, extended). The four M6 acts got `refreshState()`; `useMana` did
    not, because Forge's own flush usually follows it — measure before widening
    D39's guarded hop to a fifth caller.
13. **The user still has not pressed the space bar** (M3 follow-up 9, M5
    follow-up 13, unchanged by M6). Everything *around* it is measured —
    `buttons.focus`, the focus ring, `planKey` declining to double the
    activation — and the browser driver still delivers `Space` as
    `{key:"", code:"", keyCode:0}`.
14. **The gate never enters amendment M42's branch.** `RESYNC BEFORE THE FIRST
   INPUT` appears in none of check-all's ws-server logs, because the /health poll
   sleeps a second between tries and no gate client connects inside the ~130 ms
   pre-input window. The branch is proven only by the forced-race harness under
   `var/` (gitignored; `docs/evidence/m6-engine.md` §11). Close it with a fast
   /health poll on one of the seven ws servers asserting that line and no `input`
   before the engine's first push.
15. **`comfortNotYet()`'s retry path in `tools/ws-auto-play.mjs` has no automated
   test** — it is unreachable against a fixed bridge. Extract the comfort
   bookkeeping into an importable module and unit-test it under `node --test`.
16. **`WsTransport` caches `lastState` and does not clear it on `hello_ok`**, so a
   client connecting between a new game's handshake and its first snapshot could
   be re-delivered the previous game's final `state` (possibly one carrying
   `gameOver`). Unmeasured; the reducer's per-game reset (M38) partly masks it.
   Clear it the way `lastInput` is now cleared, and decide whether a connect
   before the first snapshot should send `hello_ok` alone.

### What M6 hands to M7

Written 2026-09-12, from the tree as it stands. M7 is a **second renderer over
the same frame stream** (`docs/ideas/arena-mode.md`, `docs/research/09-arena-tier1-plan.md`),
so what matters is what that stream now carries and what it does not promise.

**The animation vocabulary is already on the wire, and it has a shape.**
`state.events` (protocol §3.6) was added in M1 *for* M7 and M6 did not touch it:
every `state` carries the engine events that snapshot already reflects, in engine
order, **ids only**. Across the eighteen committed recordings —
**15,866 frames, 3,677 `state` frames, 3,291 of them carrying at least one
event** — there are **19,184 events in 21 kinds**:

| | |
|---|---|
| the bulk | `stats` 8,232 · `phase` 4,049 · `tap` 1,949 · `zone` 1,881 |
| the film | `cast` 412 · `resolved` 412 · `unstacked` 412 · `turn` 318 · `attackers` 317 · `combat_end` 300 · `land` 258 · `damage` 236 · `life` 113 · `blockers` 109 |
| the long tail | `counters` 55 · `shuffle` 54 · `attach` 28 · `outcome` 18 · `scry` 17 · `mulligan` 9 · `sacrificed` 5 |

That distribution is the schedule: six kinds carry the cinematic, four are
bookkeeping a renderer will want to *suppress*, and the tail is one animation
each. A kind that never fires here cannot be tuned here either.

**M6 gives the arena its first multi-game corpus, and it is one command away.**
One `frames.jsonl` **per game** (**M38**, **D44**), each with its own session
header, its own `gameId` and its own `hello_ok`, so `./scripts/play.sh` — three
games back to back — writes **three replayable files in one sitting**. Copy them
under `fixtures/` (the only tree the dev server mounts) and each one scrubs on
its own; a three-game arena reel is three loads, not one stream with three games
in it. Nothing multi-game is *committed*: `fixtures/games/` is 18 files and every
one of them is a single game — though one, `human-sideboard-7.jsonl`
(`gameId: sideboard-7-g2`), is **game 2** of a `--games 2` match and is therefore
what a second game's header and its opening `hello_ok` actually look like.

**Five things a second renderer must not assume away** — four are old and one is
M6's:

- **An `over` can arrive with no `gameOver` `state` in front of it** (**M11**).
- **`seq` is not an ordering primitive.** A `resync` re-delivers cached frames
  verbatim, so a client log's series is neither contiguous nor monotonic
  (**M10**/**M17**); the reducer's order is arrival order.
- **Events carry ids only, and an id that does not resolve is correct** — it is a
  card the viewer may not see (§3.6 rule 1). The one string, `cast.text`, is
  gated and swept by `Snap.stackText`; an arena that captions an animation must
  use *that* string and never rebuild one from a name it has cached.
- **A `hello_ok` mid-stream invalidates every cached id** (**M38**, invariant 10)
  — the arena's own scene graph is a card map by another name, so it drops on a
  changed `gameId` exactly as the reducer does.
- **Every M6 field is optional.** Fourteen committed recordings predate
  2026-09-12; `protocol.ts`'s five readers are where "absent" is turned into
  "this recording is older", and a new renderer reads *them*, not the raw field.

**And the renderer's half of hard rule 8 does not come for free in 3D.** On the
board it is mechanical — `CardTile` is the one card renderer, imported by exactly
ten files, and `render.test.tsx` checks every `data-card-name` in the markup
against what that frame serialised in the clear. A Three.js scene draws no such
markup, so **M7 owes an equivalent assertion before it draws its first textured
plane**: the per-frame check that nothing on screen names a card this frame
concealed. `drawnEntities()` in `web/src/render/picker.ts` is the other file that
has to learn about a new surface that mounts cards (**D33**).

## M7 — Arena mode: the game as a cinematic

**Status: not started. M6 has landed, so it is next** — what the frame stream now
carries, and the five things a second renderer must not assume away, are in
*"What M6 hands to M7"* above.
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

## Deferred — out of scope for M0–M6

Not cancelled, not scheduled. **M6 has landed**, so these are now revisitable
rather than blocked; nothing below is scheduled by that, and each still needs a
decision of its own before it becomes work.

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
| 9 | **New, M5.** Should Forge's floating-mana warning (`FPref.UI_MANA_LOST_PROMPT`, a `confirm` before you pass priority with mana that would be lost) be on in real games? It is off in stock Forge; `--mana-lost-prompt` turns it on in memory for probe runs, and it is the only way the `confirm` ask kind is reachable at all. | **ANSWERED BY M6: ON.** `config.json` `"manaLostPrompt": true`, set in memory only (never `save()`), overridable with `--mana-lost-prompt` / `--no-mana-lost-prompt` (amendment M40). `confirm` therefore occurs in ordinary games; nothing else moved. Raise it again if the prompt turns out to be a nuisance. |
