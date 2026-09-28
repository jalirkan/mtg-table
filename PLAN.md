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
| M7 | Arena mode: the game as a cinematic | open-ended (Tier 1: 6 evenings) | **Tier 1 done** — a second renderer over the same frame stream: a 3D table, cards as textured planes, all 25 event kinds cued, a choreographed camera, the seat playable in 3D; two verification passes, all fourteen findings closed; **D47–D52**; twelve follow-ups, none blocking Tier 2. **Tier 2 slice 1 (T0–T7) built, verified and committed** (`4f84613`): figures at every creature, auras as poses, lands as terrain, mana motes, the stack as spell forms with tethers and strikes, silhouette busts, bloom on by default; one verification pass, passed; **D53–D63**; nineteen follow-ups. **Tier 2 slice 2 (T8 and the camera views) built, verified twice, fixed twice and committed** (`5891444`): hero and scientist bodies of their own, the UAL's `hit` and `die` retargeted onto the one humanoid rig, a verified and reproducible `figures.glb`, a death that is seen, five camera views with spectator mode and an auto director; **D64–D74**; six of slice 1's follow-ups closed, ten of its own opened. **Tier 2 slice 3 (T9–T12, per-card identity) built, verified twice, fixed twice and committed** (`0368a90`): every deck card reads as itself through data — `traits.json` and a shared kit of eighteen procedural, instanced props — the Air Force a swarm, the Agents a squad, the giant ant giant, the Helicarrier a carrier overhead, T11's beats drawn on the body, T12's attachment looks; **D75–D89**; one of slice 1's and two of slice 2's follow-ups closed, fourteen of its own opened. **Tier 2 slice 4 (T13, proportioned bodies in painted costumes, T14) built, verified once and documented**, not committed (branch `tier2-slice4`): every humanoid a CC0 *Universal Base Characters* person on the animation library's own rig, painted by a costume palette, still one program; a full duelist per seat — the director and the villain — with gestures as cue params; **D95–D101**; nineteen follow-ups. **Tier 2 is complete (T0–T14)**; likeness — Tier 3, personal-only — is the open question (question 14) |
| — | Match setup: the AI's own deck and its Forge profile *(a deferred item, brought forward)* | 1 day | **built, reviewed, fixed, documented and committed** on branch `match-setup`, rebased onto `main`'s `23e26b3` (2026-09-27) with a second fix commit, then onto the workshop's `bf0392b` the same day with the verifier's four findings fixed — `decks/doom-legion.dck`, 40 blue-black Marvel villains for the AI; `--ai-deck` / `--ai-profile` on the bridge and `scripts/play.sh`, `config.json`'s `match` block read by `play.sh` alone; `hello_ok.match` (amendment **M44**) naming the AI's deck but never listing it; the board's rails print both decks and the profile; gate rows 11–14 of `ten-games.sh` and step **9e**; **D105–D108**; one review pass, all nine findings closed; ten follow-ups, three of them (2, 8, 9) closed by the rebase and its fix commit; the ask path's push order recorded open as slice 4's follow-up 13(d) |

**Off the milestone plan, 2026-09-27: the card library and the card browser**
(**D90–D94**) — brought forward from the deferred list on the user's request, as
dev-server **tools** rather than a milestone: a local SQLite + FTS5 index of every
card under `tools/card-library/`, an image cache, and a `#cards` browser. Built,
reviewed twice and fixed, **not committed** (worktree
`/home/justin-a/code/mtg-table-t2g`, branch `card-library`). Nothing on the wire
or in `bridge/` moved, and the board gained one link (`▦ cards`, beside the arena
toggle) and nothing else. *The card library and the card browser*, just above
*Deferred*, has the status, the commands and the follow-ups.

**Off the milestone plan, 2026-09-27: engine and sets** (**D109–D112**) — the
user's Reality Fracture pre-release pool, and the question of which Forge plays
it. **The engine stays Forge 2.0.14**, by the user's own rule: *"Let's not break
anything to force in the latest cards."* The set arrives the day an official
Forge release ships it; until then the pool is prepared (`decks/fra-rw-aggro.dck`,
a draft opponent, a per-card deck audit, the saved bridge port as a patch) and
nothing about how the game runs has changed. **Committed on branch
`engine-upgrade`**, rebased onto `main`'s `a092d3a` (2026-09-27, after slice 4,
the workshop and match setup) and gated there; not on `main`. *Engine and sets*,
just above *Deferred*, has the rule, the measurements, the checklist for the day
and the follow-ups.

**Also off the plan, 2026-09-27: a hardening pass** (**D113–D115**, amendments
**M45–M46**) — seven small defects from the follow-up lists, each fixed at its
cause and each with a test or gate assertion that fails without the fix: gate
step 6 no longer flakes or exits 141 under load, an instant `newGame` can no
longer end the next game, an engine crash fails the run, the T-pose flash, the
seat plates in `visibleShare`, the catalog drift check in the gate (12b), and the
`@gltf-transform/cli` pin. Rebased onto match setup the same day and onto
engine and sets on 2026-09-28, with the
engine-crash check in the gate (12c) and the arena's seat plate held to four
one-line rows inside the top band. Its first verification round found step 6
comparing no stack, `priority` or mid-game combat, and every attack and block cue
jumping at both ends; both are fixed. *The 2026-09-27 hardening pass*, just above
*Deferred*, has the table, the two rebases, the round and what is left open.

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

**After M7, 2026-09-13: none of them is closed, and none was expected to be.**
M7 added a second *renderer* and touched no Java — `bridge/` is byte-identical to
M6 — so every item below stands exactly as written. The one M7 change that
touches this list's subject matter is a **document** fix: `docs/protocol.md`'s
counter-type rows were wrong from M1 (amendment **M43**, **D46**), and the bridge
is deliberately not changing. See *"M6 follow-ups closed by M7"* under §M7 below.

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
    report 11 §12 and nothing in the bridge reads or writes them. *(The profile
    half came forward on 2026-09-27 as **match setup** — `--ai-profile`, always
    a non-empty `profileOverride` through `Bootstrap.createAiPlayer`, lint-held;
    protocol amendment **M44**, **D105**–**D108**, `docs/evidence/match-setup.md`.
    The yield half is unchanged.)*
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

**Status: Tier 1 done** — six evenings E1–E6 of
[`docs/research/09-arena-tier1-plan.md`](docs/research/09-arena-tier1-plan.md)
§11, then two independent verification passes (eight findings, then six; all
fourteen closed, each with a test that goes red without the fix). Evidence:
[`docs/evidence/m7-arena.md`](docs/evidence/m7-arena.md). **Nothing is
committed** — the work is the `m7` branch in a worktree, per CLAUDE.md.
**Effort: Tier 1 was 6 evenings + 2 verification passes. Tier 2 is complete in
four slices — T0–T7, T8 and the camera views, T9–T12, then the bodies, T13 and
T14 — each built and verified; see *M7 Tier 2* below.**

**Command**

```bash
npm --prefix web run dev:arena            # a recorded AI-vs-AI game as a cinematic
./scripts/play.sh --arena                 # a LIVE game, played in the arena
```

`dev:arena` is `vite --open "/?replay=games/g1.jsonl#arena"`. **Another fixture
is a URL edit, not a positional argument** (`?replay=games/g3.jsonl#arena`) —
`vite` takes no positional file, so the command line M6 wrote here was never
runnable. `./scripts/play.sh --arena` appends `#arena` to the URL it already
prints and changes nothing else: same bridge, same socket, same `--games 3`
default. **`V` switches renderer mid-game**, over the same socket, without
dropping a frame.

**Deliverable, delivered.** A second renderer for the same frame stream, in
Three.js via react-three-fiber inside the existing Vite app, under
`web/src/arena/`. It shares `reduce.ts`, `protocol.ts`, the transports, the art
index, the keymap and M5's `<AskModal>` with the 2D board, and it imports no
transport of its own (`web/test/liveness.test.ts` asserts that from the source).
The board is a 3D table, every card is a textured plane, `state.events` play as
animations, the camera is choreographed, and the seat is playable: a click is
`act: clickCard` sent verbatim, the prompt and the two buttons are the engine's
own strings, and every question is answered in the same modal component the
board uses.

**What the evidence shows.**

- **Chunk sizes** (`npm --prefix web run build`, 682 modules, 0 TypeScript
  errors). The 2D entry chunk went **83.99 → 85.62 kB gzip** across the whole
  milestone: **+1.63 kB**, and not one byte of it is `three` — it is `useView`,
  the view toggle, the `Suspense` boundary, two keymap rows, the `?arena=off` /
  `?dpr=` parses and the arena's CSS. The arena itself is **996.38 kB / 274.30 kB
  gzip in a lazy chunk** (`lazy(() => import('./arena/Arena.tsx'))`), fetched on
  the first `#arena` and never before; `dist/index.html` carries no
  `modulepreload` for it.
- **Cue coverage.** All **25** of `protocol.ts`'s `EVENT_KINDS` have a default
  cue, and the table is exhaustive *by type* (`defaults.ts` is a
  `Record<EventKind, CueSpec>`, so a new kind on the wire will not compile until
  it has one). Over the eighteen committed recordings, printed by
  `replay-cues.test.ts` on every run: **3,679 `state` frames · 3,293 non-empty
  batches · 19,208 events**, of which **1,156 resolve to a per-card cue** (40
  distinct entries from `cues.json`'s 28 cards) and **1,007 to an archetype**;
  **16,083 event targets resolve and 483 do not — and an unresolvable target is
  correct**, it is a card the viewer may not see (§3.6 rule 1). **0 effects over
  the §9.3 cap.** After every one of the 3,293 batches the offset map is
  **empty**, which is the mechanical form of the one property the whole design
  rests on (**D50**).
- **Performance — and the fps number is the honest part.** The scene is **40 draw
  calls, 80 triangles, 1 geometry** in a production build, against §9.1's budget
  of ≤120 / ≤2,000 / ≤12, and the frame *body* (tick, offset write, effect bind,
  camera, `gl.render`) measured **p50 0.1 ms / p95 0.2 ms / max 0.5 ms** over 200
  frames of a live game. The renderer is **fill-rate** bound, so the control that
  matters is resolution, and `arena/perf.ts`'s `DprGovernor` steps it on a
  48-frame window of frame intervals. `tools/arena-bench.mjs` (headless Chromium,
  SwiftShader, the production build over `vite preview`) is §9.4's measurement:
  **default, no pin — p50 8.6 ms, p95 13.8–15.5 ms, ladder settling on render
  dpr 0.75, which passes §9.4's p95 ≤ 20 ms gate**; pinned `?dpr=1` is p95
  22.4–23.6 ms and **fails** it. Two caveats are load-bearing and are not
  rounded off: **SwiftShader is a software rasteriser and an explicit lower
  bound** — no measurement on the user's own GPU or iGPU is possible in this
  sandbox — and the **`max ≤ 50 ms` half still fails on a cold table** (1–3
  frames in the first ~40, at every resolution including pinned ones), which is
  the first GPU upload of a card's Scryfall texture and is a hitch when a card
  first appears rather than a frame rate. **No frame-*rate* figure from the
  Claude browser pane is real**: `requestAnimationFrame` fires 0 times there, so
  drei's `<Stats>` reads `0 FPS` and every mid-cue screenshot in the evidence was
  taken by advancing the cue queue's virtual clock by hand.
- **Tests.** `npm --prefix web test` is **534 `node --test` + 79 vitest (5
  files)** standalone, up from 456 + 75 at M6, and **544 / 536 pass / 0 fail /
  8 skipped** inside `check-all.sh` (where `MTGTABLE_WS_LOGS` names the logs step
  10 just produced). The arena's suites are `layout.test.ts`,
  `colour.test.ts`, `replay-cues.test.ts`, `cues-exhaustive.test.ts`,
  `camera.test.ts`, `liveness.test.ts`, `perf.test.ts` and `arena-hud.test.tsx`;
  all but the last run under `node --test` with no DOM, because `cues/`,
  `camera.ts`, `layout.ts` and `colour.ts` import neither three nor React.
  `tools/check-all.sh`'s web step runs every one of them.

**Hard rule, and it held.** The arena is a *renderer*. It never decides anything;
it plays back what the engine said. Rules stay in Forge. The three mechanical
halves of that: no file under `web/src/arena/` imports a transport or a rules
predicate (`liveness.test.ts`), a click is never gated on `selectable`
(`HitProxy` has no such prop to gate on), and every concealed card in every frame
of every committed recording is placed as a **back** before anything asks for a
face (`layout.test.ts`'s corpus sweep — the assertion *"What M6 hands to M7"*
asked for above).

### M6 follow-ups closed by M7 — none, and that is the expected answer

M7 added a renderer and touched no Java: `bridge/` is byte-identical to M6 and
all sixteen M6 follow-ups are open exactly as written. What M7 *did* close, and
what it found, belongs on other lists:

- **The hooks-order half of M5 follow-up 4 is closed.**
  `web/test/hooks-order.test.ts` was a scan of `Board.tsx`'s one early return;
  it now walks **every `.tsx` under `web/src/render/` and `web/src/arena/` — 27
  files, 65 components** — finds each component's own early returns by tracking
  braces through blanked strings and comments, and flags any `use*(` below one.
  Negative-controlled at both ends. The rest of that follow-up (there is still no
  DOM test environment) is unchanged.
- **The assertion *"What M6 hands to M7"* owed is delivered**, in the form a 3D
  scene allows: `layout.test.ts` asserts `isHidden(card) ⇒ placement.back` for
  **84,418 placements across 3,679 frames**, and `CardPlane` branches on
  `placement.back` before it reads `art.json` at all. It is a check on the
  *placement*, upstream of the texture, because a canvas has no `data-card-name`
  for `render.test.tsx` to scan — see M7 follow-up 9.
- **`docs/protocol.md` §3.1, §3.2 and §3.6 were wrong about counter types since
  M1** (amendment **M43**, decision **D46**): the wire carries Forge's *display*
  name (`+1/+1`, `Spore`) and there is no `P1P1` anywhere in `fixtures/`. The
  doc is corrected; the bridge is not changing. The arena found it because its
  selector grammar was written from the doc and matched nothing.
- **The space bar is still unpressed by a human** (M3 follow-up 9 → M5 13 → M6
  13). E6's live arena game did activate the engine's focused button with SPACE
  three times through the browser pane's key driver
  (`docs/evidence/m7-arena.md` §4), which is more than any previous milestone
  managed — but the standing item is a *person* pressing it, and that has still
  not happened.

### M7 follow-ups — twelve, 2026-09-13

From the four builders' own "problems" notes and the two verification passes.
**None of them stops a game or blocks Tier 2**: the milestone's two commands both
work, the seat is playable end to end in 3D, the gate is green. Three are
measurement limits of this sandbox (1, 2, 3), two are deliberate non-changes
named here so they stay decisions (7, 8), two are dev-loop conveniences that were
specified and not built (4, 5), and the rest are small debts with a stated cost.

1. **`max ≤ 50 ms` fails on a cold table, and the cause is measured.** 1–3 frames
   over 50 ms in the first ~40 after a scrub (max 63.6–80.7 ms), at *every*
   resolution including a pinned `?dpr=0.75` with the governor and every canvas
   resize out of the picture — so it is not the ladder. It is the first GPU
   upload of each card's Scryfall texture, and the bench prints how many outliers
   coincided with the texture count going up. **Pre-warming the textures a scrub
   is about to reveal would remove it; nothing does that today.**
2. **Every performance number in this milestone is from SwiftShader**, a software
   rasteriser and an explicit lower bound — a fair proxy for draw-call and CPU
   work, one to two orders of magnitude off for fill rate, which is what this
   scene is bound by. The measurement report 09 §9.4 also asks for (the actual
   iGPU, `DRI_PRIME=1`) is impossible here: no display, and headless Chromium has
   no path to that device. **"Passes the gate" means "passes it on a CPU
   rasteriser at 1920 × 993."**
3. **The dpr governor cannot climb back on a vsync-locked display.** A browser
   pinned to 60 Hz reports 16.7 ms whether the GPU had 2 ms of work or 16, so
   there is no headroom to read out of frame intervals. It therefore sits where
   it is — right for the common case, since it never declined, and a stale low
   resolution only for a machine that was slow earlier in the same session. A
   reload starts at the ceiling; `?dpr=` pins it outright.
4. **§10.7's `?cue=<id>` loop route is not built.** What exists is the dev handle
   (`window.__mtgArena`, `import.meta.env.DEV`-only): pause the queue, advance
   its virtual clock by hand, look. That is strictly more general — it works on a
   real frame of a real recording — and it is what every mid-cue photograph in
   the evidence was taken with, but a route that loops one cue on a dummy card
   against a neutral table would still be nicer for tuning. It is a
   `queue.enqueueBatch` away.
5. **§7.1's `?cues=<url>` override is a documented refusal, not an omission.**
   Loading a cue file over the network is a `fetch`, and §2.1 rule 1 says the
   arena never calls one. Written down in `Arena.tsx` and in the README rather
   than left implied.
6. **`<AdaptiveDpr />` is mounted and dormant.** It acts on
   `performance.current`, which only moves when something calls `regress()`, and
   the only candidate is drei's `<OrbitControls regress>` — a prop we do not
   pass. It is harmless and the plan asks for it, but its trap is real and is
   written next to it: it writes `current × viewport.initialDpr`, the resolution
   the canvas *started* at, so turning `regress` on would undo a governor
   decision on every mouse-up. **Turn one on and the other off.**
7. **`drawnEntities()` in `web/src/render/picker.ts` was deliberately not
   extended** (**D33**). The arena answers **every** ask in the modal; a shared
   `drawnEntities` would be wrong for one of the two renderers, and wrong in the
   direction hard rule 8 cares about. The file says so at the top, including what
   it would take to change.
8. **`COUNTER_LABELS` in `web/src/render/labels.ts` is keyed by the enum-constant
   spelling** (`P1P1`, `M1M1`), so on the **2D board** `counterLabel('+1/+1')`
   falls through to its default: correct text, generic class, no `mana-font`
   glyph. Found while fixing the protocol doc (**D46**) and deliberately left —
   it is a board rendering change with its own evidence to gather.
9. **There is no canvas equivalent of `render.test.tsx`'s `data-card-name`
   sweep.** The arena's half of hard rule 8 is asserted one step upstream, on
   `Placement.back` (above), plus `arena-hud.test.tsx` over the DOM layer. A
   check on what is actually *on the quads* would need to read back a rendered
   texture, which needs a GPU and a DOM. Know which assertion you have.
10. **`tools/arena-bench.mjs` is not in `check-all.sh`**, and should not be
    without a decision: it wants a built `dist`, a `vite preview` server and a
    headless Chromium, and it takes tens of seconds per configuration. A
    performance regression therefore does **not** turn the gate red.
11. **The frozen React-18 3D line prints one deprecation warning at runtime** —
    `THREE.Clock: This module has been deprecated. Please use THREE.Timer
    instead.`, once per `<Canvas>` mount, from fiber 8.18.0's loop against three
    0.186.0. The loop runs, so §1.2's trip-wire has not fired (**D48**), but it is
    the first visible crack in a line with no maintenance branch.
12. **A second JVM started at the same `--seed` truncates the first's frame log.**
    `var/games/human-ws-42/frames.jsonl` was left beginning with NUL bytes when
    `play.sh` was started twice at seed 42 and the second process opened the
    per-`gameId` log path before dying on the port bind. A pre-existing property
    of that path, triggered by a mistake rather than by the arena; the file is
    under `var/` and gitignored, and no redaction check is claimed on it.

### What Tier 1 hands to Tier 2 — avatars and creature manifestations

Tier 2 is [`docs/ideas/arena-mode.md`](docs/ideas/arena-mode.md)'s second tier:
*"a small library of stylised generic models keyed by creature type and colour
with idle / attack / hit / die animations… two duelist avatars stand at either
end; creatures appear as holograms between them."* When this was written it was
**not scheduled**, and the honest summary was that Tier 1 built the *routing* it
needs and none of the *assets*. (It has since been scheduled and its first slice
built: *M7 Tier 2* below. The hand-over is kept as written, because it is what
slice 1 was built against.)

**What already supports it, unchanged:**

- **The archetype key is the Tier 2 model key.** `cues/archetype.ts` already maps
  a `Card` to `creature/W`, `land/*`, `equipment/*`, `instant/*` from fields the
  protocol ships (the first recognised word of `types`, plus `colour.ts`'s parse
  of `manaCost`), with a documented fallback for a hidden card (it archetypes as
  the colourless wildcard and takes the defaults, because we are not allowed to
  know what it is). *"About eight archetypes cover the deck"* is the same eight
  keys the cue ladder already resolves through, and a mesh library keyed by them
  needs no new classification code and no new protocol field.
- **The cue file is already the place a per-card override goes.**
  `cues/cues.json` is one validated data file (**D51**): `archetypes` and `cards`
  maps, values naming a cue in `registry.ts` plus `ms` and `params`, `_`-prefixed
  keys as comments, closed key sets so an unknown field is an error, and a
  validator that drops a bad *entry* and never the file. A Tier 2 entry is a new
  cue id in the registry and a row in this file; the ladder (per-card → archetype
  → §6 default) needs no change to reach it.
- **The offset model is already what an animated mesh wants.** `finalTransform =
  layout(state) ⊕ offsets[id]` (**D50**): `layout.ts` owns the resting pose,
  including `presence` (a hover and a bob folded *into* the pose — the Helicarrier
  and the Aerial Doombot already float), and a cue only ever contributes a
  transient that starts and ends at identity. A creature manifestation is another
  thing anchored to a placement; skip, scrub, `resync` and a new `gameId` stay one
  call (`flushAndSnap()`) whatever is anchored there.
- **The scene already has one `useFrame`, one geometry and a fixed effect pool.**
  `CueRunner.tsx` is the only frame loop (begin frame → tick → write offsets →
  bind effects), `effects.ts` is a fixed pool of 26 meshes, and the hot path
  allocates nothing — checked field-for-field by `cues-exhaustive.test.ts`, not
  claimed in a comment. A model library plugs into the same loop; it must keep
  the same two properties, and §9.1's budget (≤120 draw calls) is where the
  headroom is: Tier 1 uses 40.
- **The camera is a separate, pure module.** `camera.ts` has no three and no
  React: orbit coordinates, §3.5's clamps, a framing solver, the projection, and
  a `CameraDirector` with one lane, priority preemption, dwell caps and a bounded
  shake. A Tier 2 shot is a request on that lane, not a second camera.
- **The corpus is the test input.** `replay-cues.test.ts` runs every committed
  recording through the real reducer and the real queue against a `NullStage` —
  no GPU, no DOM — and prints the per-kind and per-card census every run. A Tier 2
  cue that never fires will say so there on the day it is added.

**What Tier 2 must bring, and the two things it must not assume:**

- Assets: rigged meshes, an animation set per archetype, two duelist avatars, and
  a licence story for every one of them. **Nothing derived from card art may be
  committed** (Marvel art is licensed to Wizards; NOTICE §2 and the Fan Content
  Policy) — the same rule the Scryfall images already live under.
- Lights and materials. Tier 1 has **no lights at all** (every material is unlit,
  which is why 40 draw calls buy a whole table); a lit, shaded model library is a
  different renderer budget and should be measured before it is designed.
- **It must not learn anything the engine did not say.** Two Tier 1 findings are
  the standing examples, both written up in the evidence: §3.6's `counters` event
  carries no *source*, so "Coulson gave this counter" is not on the wire and a
  badge keyed to Coulson can never fire; and the engine never says which card
  caused another card's tap, so Quake's ring is centred on **her own** tap.
  Inventing either link is rules logic in a renderer.

---

## M7 Tier 2 — the manifestation stage (slice 1: T0–T7; slice 2: T8 and the camera views; slice 3: T9–T12, per-card identity; slice 4: T13, proportioned bodies in costumes, T14)

**Status: Tier 2 is complete.** Every evening of report 13 §11, T0–T14, is
delivered across four slices, each verified and documented: slices 1–3 are
committed on `main` (`4f84613`, `5891444`, `0368a90`), and slice 4 is built,
verified once and documented but **not committed** (branch `tier2-slice4`).
What remains is follow-ups, none of which stops a game (each slice's list
below), a play-test of slice 4, and one question that only the user can settle:
whether **likeness** — Tier 3, which would be personal-only — is part of the end
goal at all (*Tier 2 is complete — what is left* at the end of this section, and
question 14).

**Slice 2 (2026-09-27) is further below** — *Slice 2 — T8*, its own follow-ups,
and *What slice 2 hands to T9–T14* — **and slice 3 (2026-09-27) below that** —
*Slice 3 — T9–T12*, its follow-ups, and *What slice 3 hands to T13–T14* — **and
slice 4 (2026-09-27) below that** — *Slice 4 — T13, proportioned bodies in
painted costumes, and T14*, the earlier follow-ups it closed, its own follow-ups,
and *Tier 2 is complete — what is left*. **The user played several games on slice 1
before slice 2 was built and reported nothing major** ("this seems to be on
track"), so nothing in slice 1 was redesigned; that play-test is the one slice
1's hand-over asked for before T8, and it did not flag the live combat budget
(follow-up 1, question 12).

**Status: slice 1 built and verified — T0 to T7 of
[`docs/research/13-arena-tier2-plan.md`](docs/research/13-arena-tier2-plan.md)
§11, then one independent verification pass (verdict: passed; ten findings, all
minor).** Evidence:
[`docs/evidence/m7-tier2.md`](docs/evidence/m7-tier2.md), in three parts (T0–T2,
T3–T4, T5–T7) plus a status section. **The user committed it on `main` as
`4f84613`**; it was built on branch `tier2-slice1` in the worktree
`/home/justin-a/code/mtg-table-t2`, and slice 2 branches from that commit.
The user's nine Tier 2 decisions are recorded as **D53–D62**, and the builders'
own as **D56, D57, D59, D60, D63**. The spec is report 13; the asset landscape it
rests on is [`docs/research/12-arena-tier2-assets.md`](docs/research/12-arena-tier2-assets.md).

*Tier 2 in one sentence:* every creature on the battlefield now has a figure
standing at its card, auras sit on the figure they enchant, lands are terrain,
tapping a land sends mana to its controller's side, and a spell on the stack is a
form at its caster's side with a tether to what it targets — **and all of it is a
pure function of the snapshot except the transitions**, which are cues that decay
exactly like Tier 1's (**D56**).

**Command**

```bash
npm --prefix web run dev:arena                 # the replay cinematic, now with Tier 2
#   /?replay=games/g1.jsonl#arena, scrubbed to transport index 316-376, is the
#   crowded table (>= 10 modelled figures) every T7 number was measured on
./scripts/play.sh --arena                      # a live game in 3D, with Tier 2
#   ?bloom=0 / ?bloom=1 sets where bloom starts; the cue strip carries the checkbox
node tools/build-figures.mjs --src var/assets/figures   # rebuild figures.glb + models.json
npm --prefix web run build && npm --prefix web run preview -- --port 5182 &
node tools/arena-bench.mjs --index 316 --gpu gl --settle 4000   # the bench frame, on the real GPU
node tools/arena-bench.mjs --index 316 --settle 4000            # ... and under SwiftShader
#   --bloom / --no-bloom, --reduced-motion, --dpr 1, --settle 600 (cold); NOT in check-all
```

A fresh checkout with no `web/public/models/figures.glb` plays the whole film:
every creature draws its stand disc, the console says so once, and nothing errors
(evidence §4.3). Rebuilding the file needs the CC0 sources under
`var/assets/figures/` exactly as downloaded — **four since slice 2** (the
Universal Animation Library joined the three) — and `tools/assets-manifest.json`
has their download URLs, byte counts and sha256s. **Since slice 2 nothing is
unzipped by hand**: the build verifies every archive against the manifest,
refuses one that differs, reads the members it needs out of the verified zips,
and records the output's own bytes and sha256 in `models.json`
(`--verify-only` checks the sources and stops; **D67**).

### The evenings

T0–T7 are slice 1; **T8 and the camera views are slice 2** (the camera views are
not one of report 13 §11's evenings — the user asked for them with T8, and they
are the row below it); **T9–T12 and per-card identity are slice 3** (identity is
not one of the evenings either — it is the answer to the user's verdict on slice
2, *"everything still looks very generic"*); **T13, the bodies and costumes, and
T14 are slice 4** (the bodies are not an evening either — they are the answer to
the verdict on slice 3, *"the avatars are still pretty generic"*, and they are the
row before T13, because the duelists stand in them).

| | deliverable | status | what proves it |
|---|---|---|---|
| **T0** | the spike and the go/no-go | **passed with room** — the named billboard fallback was not needed | 12 cloned figures = **12 draw calls, 1 material, 1 geometry, 1 program**, frame body p50 0.30 / p95 0.50 ms; 21 figures = 21 calls, p95 0.60 ms (SwiftShader; `web/t0-spike.html`) |
| **T1** | the pose layer, no assets | **done** | `figures.test.ts` + `figure-pose.test.ts` over all 3,679 board frames: 26 distinct creatures resolved, 11,901 poses, max 21 in a frame, **1,138 face-down instances all anonymous**; one instanced disc per creature |
| **T2** | the loader and the first models | **done — three archetypes, not one** | `figures.glb`, 126,404 bytes, CC0: agent (Kenney), drone and insect (Quaternius, via Poly Pizza); `g1.jsonl`@355 = 12 figures, 11 models, 59 draw calls, one figure program used 11 times; the missing-file fallback proved by removing the file |
| **T3** | the clip lane | **done** | `stage.clips` empty after all 3,293 batches; every `mixer.update` is a literal `0` (negative-controlled); 23 of 57 cues drive a clip; the per-card alias works end to end (the Doombot's `jet`) |
| **T4** | lands as terrain, and the mana motes | **done** | 29,389 tile-instances, a tile and its card never disagree about tapped; 20 lands of one kind = **1** draw call, `g1`'s 17 = **3**; motes in flight photographed; the casting anchor |
| **T5** | one aura, properly, and the default halo | **done** | all 985 attachment frames show their aura; Quantum Reduction holds its host at 0.45× through a skip; every other attachment draws the halo |
| **T6** | the stack | **done** | 389 stack frames, 417 forms, max depth 4; the ghosted creature spell *is* the figure that lands; 44 tethers; **41 aimed strikes** from one frame of look-behind (**D63**); the combat freeze spares the spell; the fizzle shown with a synthetic event (the corpus has none) |
| **T7** | measure and tune | **done** | busts; the width clamp; the bench on SwiftShader **and on the GTX 1080**; bloom's default decided by measurement; a live game on port 8660 |
| **T8** | the rest of the humanoids | **done (slice 2)** — plus two things T8 found: the death, and slice 1's drone | hero `character-female-b` and scientist `character-male-e` on the agent's one 7-joint rig (**D73**); the Universal Animation Library retargeted offline and judged clip by clip — its `hit` and `die` kept, the rest of the pack's own clips better (**D68**); `figures.glb` 143,920 B, five models, 9,759 triangles, **no texture**, two builds byte-identical, every source verified by the build (**D67**); the width clamp strict for every archetype, 7,331 neighbouring pairs, worst overlap 0.000 (**D65**); the back row on its own card, 216 → 0 stand points inside another card (**D66**); **a creature that dies is seen dying**, all 17 corpus deaths drawn without a gap from the snapshot to the end of the death cue (**D64**) |
| **cam** | camera views | **done (slice 2)** | five views on keys `1`–`5` (table, shoulder, opponent's shoulder, side-on, low), each the camera's home; the three that keep the seat's hand and ranks on screen usable live, the other two spectator-only (**D69**); spectator mode `O`, on by itself in a replay and when a live game ends; the auto director `6`/`0`, pure, 596 cuts over all 19 recordings at two paces with no shot under 2.4 s and no cooldown violation (**D70**); rule 5 at a live seat only, `change` only under the user's hand, the choice kept in `localStorage` (**D71**); three keymap rows, `inert` on the board (**D74**) |
| **T9** | drone and insect | **done (slice 3)** | the Doombot with a red laser eye, a red visor band round its head, twin thrusters and a lit exhaust that flares with its jet (**D83**'s `visor`); Ant-Man's Air Force as **five procedural bees in a turning ring**, one instanced draw call, its insect rig kept hidden at the centre for the clip lane (**D88**); the Giant-Sized Flying Ant **0.867 tall against 0.490** because it flies side-on, with a crouching rider baked from the hero body — no exemption from the strict clamp (**D76**) |
| **T10** | the vehicle | **done (slice 3), with no asset** | a procedural carrier silhouette (hull, flight deck with runway lights, island, four rotor pods; 456 triangles, one draw call) for every Vehicle through the `subtype:vehicle` trait rung, **crewed or not** (599 uncrewed poses in the corpus); yours at `SILHOUETTE_ALTITUDE` 2.05 over your rank, the opponent's lower, a fifth smaller, over the centre line and clear of the HUD's keep-out band; table-view cover of any figure **0.000** over 5,103 pairs (**D77**, **D85**); the manifest's `_deferred.carrier` closed |
| **T11** | per-card beats | **done (slice 3)** | the `figure` anchor puts a beat ON the body and follows it through a lunge, a hover, a shrink and a death; every cue param closed and ranged (`PARAM_SPECS`, 15 negative controls); shapes (badge, shield, reticle, web, circuit, star, hex) and a travelling particle cloud; suppression rule 7; the pool 38 → 45 with `MAX_LIVE_EFFECTS` unmoved (**D79**); an attacker turns to face its defender for the length of its attack (**D82**); Quake keyed off her trigger's resolution, never a paired tap (**D89**); four quiet beats made to read (**D87**); the census prints fired and aimed per beat every run |
| **T12** | the remaining attachments | **done (slice 3)** | Super Suit's armour shell, the Spy Kit's glints, Robotics Mastery's circuits — per-name rows in `figures.json`, **944 shrink · 409 shell · 362 glints · 315 circuit** over the corpus, nothing of this deck on the halo; Web Up **measured first** (no exile card is ever linked to anything) and drawn as a cocoon over its own card; Strategic Intervention's ops console as a 3D station in its own rank slot rather than a DOM widget (**D80**); an attachment lies under its host so a click on the host hits the host, 765 of 765 (**D86**) |
| **id** | per-card identity | **done (slice 3)** | `figures/traits.json`, validated like `cues.json`, and a closed kit of **eighteen** shared, procedural, instanced prop kinds plus three derived ones — **one draw call per kind on the table, never per figure** (**D75**); every deck card's props rasterised through the table camera on **both** seats, standing and kneeling, ≥ 48 px each with the real `figures.glb` and the real prop field (**D83**); the Agents three heads side by side (**D84**); `g1`@355 **78 draw calls, 27,906 triangles, 12 programs** with bloom off, against ≤ 90 and ≤ 30,000; idle still **0 frames in 5 s** |
| **body** | proportioned people in painted costumes | **done (slice 4)** | every humanoid card in a Quaternius *Universal Base Characters* body (CC0, badge recorded on the day) on the animation library's own 65-joint rig, every clip the library's retargeted by world-space delta, no face-plant, the tapped kneel composed, the head ×1.3 (**D95**); 1,400 triangles a body, the drone 1,900 and the bee 1,700, `figures.glb` **373,236 B**, two builds byte-identical (**D96**); a costume slot per vertex and a palette per figure, still one program and no texture — Peggy a blue jacket over a white shirt under a red hat (**D97**); the chibis kept as a `body: chibi` fallback, props fitted per body family, Agent 13's pistol in her hand (**D98**) |
| **T13** | duelists | **done (slice 4)** | one full figure per seat instead of a flat bust — the director (yours) and the villain (the opponent's), 1.6× a creature, props baked into one mesh, one draw call each and no new program (**D99**); yours beside your hand, the opponent's at the table's right beside its creature rank because the far end is under the chrome from every seat-safe view (**D100**); a raised hand on a cast, a red flinch on damage, a raised arm or a kneel at the end, as a `gesture` param on the existing cues (**D101**); `g1`@355 **79 / 27,416 / 12** with both duelists; the busts kept as the fallback, standing where the duelists stand |
| **T14** | verification pass | **done (slice 4)** | slice 1 one pass, slice 2 two, slice 3 two, **slice 4 one — passed, eleven minor findings**, all carried as slice 4's follow-ups below — plus a documentation pass per slice (**D95–D101** are slice 4's) |

### What the evidence shows

- **The corpus resolves, and says how.** `figures.test.ts` prints the figure
  census every run: by frame-instance, the disc 5,120 (the probe decks' beasts,
  the face-down creatures, the Helicarrier), agent 4,272, drone 1,431, insect
  1,078 — and it names the four declared rungs that never fire, so an entry that
  is decorative says so on the day it is added. Hard rule 8's new shape is
  asserted rather than trusted: a face-down creature is always the anonymous
  disc, and a redacted permanent gets no figure at all.
- **The scene, at T7's bench frame** (`g1.jsonl` index 316, 11 figures, 17
  tiles, 2 busts, 1920 × 993): **64–66 draw calls** against report 13 §8.2's
  ≤ 90, **21,305–24,351 triangles** against ≤ 30,000, **11 programs** with bloom
  off and **25** with it on, against ≤ 14 — the one budget line that is over, paid
  once at mount (Tier 2 follow-up 5).
- **Frame times** — `tools/arena-bench.mjs`, production build, `vite preview`,
  headless Chromium, `--disable-gpu-vsync --disable-frame-rate-limit`:

  | rasteriser | configuration | render dpr | p95 | max | verdict |
  |---|---|---:|---:|---:|---|
  | SwiftShader | warm, bloom off (×4) | 0.6 | **16.2–17.2 ms** | 33.7–35.9 ms | **passes** T7's gate |
  | SwiftShader | cold (`--settle 600`), bloom off (×2) | 0.6 | 17.6 / 30.8 ms | 78.2 / 65.0 ms | fails on max (M7 follow-up 1's first-upload hitch, plus the governor settling) |
  | SwiftShader | warm, reduced motion (×2) | 0.6 | 17.1–17.2 ms | 34.4–34.7 ms | passes |
  | SwiftShader | warm, pinned `?dpr=1` | 1.0 | 29.1 ms | 43.5 ms | fails, as Tier 1 did |
  | SwiftShader | warm, **bloom on** | 0.6 | **82.3 ms** | 102.1 ms | fails by 4× |
  | **GTX 1080** | warm, bloom off (×3) | 1.0 | **0.4 ms** | 17.7–17.8 ms | passes |
  | **GTX 1080** | warm, bloom on, after priming (×4) | 1.0 | **1.1 ms** | 18.1–19.3 ms | passes |
  | **GTX 1080** | cold, bloom on, after priming | 1.0 | 1.0 ms | 18.2 ms | passes |

  **Read the caveats with the numbers.** SwiftShader is a software rasteriser and
  an explicit lower bound, and on it Tier 2's 66 draw calls push the governor
  down to its **floor** (0.6), where Tier 1's 40 settled at 0.75. The GTX 1080
  numbers are **headless Chromium reaching this machine's GPU through
  ANGLE-on-GL** (`--gpu gl`, which T7 found works) — not a headed browser on the
  user's desktop compositor, and not the integrated GPU report 13 §8 was sized
  for, which is still unmeasured. The live game on the GTX 1080 (bloom on, five
  figures, vsync-locked) ran at **60 fps, rAF p95 16.8 ms**, with 0.2 ms p50 /
  0.3 ms p95 of frame work. The verification pass re-measured the GTX 1080 with
  bloom on at p95 0.7–0.8 ms, max ~18 ms, warm and cold.
- **Bloom is ON by default (D61)**, because user decision 6's condition — "within
  budget on this machine" — holds on the GTX 1080: +0.7 ms at p95, and the one
  long frame per run disappeared once `EffectPool.prime()` moved a lazy shader
  compile to mount. On a machine that cannot afford it the DPR governor now has a
  **rung below its floor** that turns bloom off: under SwiftShader that takes
  ~40 frames over 50 ms first, and a 15-second sample containing the switch reads
  p95 32.4 ms because the ladder then oscillates between 0.6 and 0.75. The
  checkbox in the cue strip and `?bloom=0` are the manual escape.
- **Idle is still zero.** `frameloop='demand'` holds with figures on the table:
  0 renders in 5 s on `human-comfort-13` @1262, bloom on and off (verification
  pass). Breathing runs only while a cue is already running (**D58**).
- **The 2D board did not move.** Entry chunk **85.72 kB gzip** (Tier 1: 85.62;
  still no `three` in it); the arena chunk 315.13 kB gzip (Tier 1: 274.30); the
  bloom composer is its own lazy `Post` chunk, 16.54 kB gzip, fetched only when
  bloom is first on. `render.test.tsx` still renders every frame of every fixture
  twice.
- **Tests.** `npm --prefix web test` is **610 `node --test` + 79 vitest**
  standalone (Tier 1: 534 + 79); the new suites are `figures`, `figure-pose`,
  `clips`, `tiles`, `attach` and `stack`, and `liveness.test.ts` grew from 8
  clauses to 19 — among them the zero-delta mixer, the lazy bloom pass as the
  only post pass, the pose layers bound only from `CueRunner`, and "no arena
  module names a CDN".
  **`./tools/check-all.sh` was run once during the documentation pass
  (`WSPORT=8661`): exit 0 in 727 s (12 min 7 s)** — 9b's re-recording of
  `human-auto-42` multiset-identical, 9c's ten games 10/10 in 269 s, all seven ws
  servers, every fixture and fresh recording through `check-redaction.mjs`, and
  the web step at **620 `node --test` (612 pass / 0 fail / 8 skipped) + 79
  vitest**. It ran concurrently with edits to documentation files only, none of
  which any step reads. Log: `var/check-all-t2-docs.log` in the worktree.
- **The live seat.** A whole game on port 8660, seed 7, driven by real CDP mouse
  events on the card's own hit proxy: a two-tone water tile, Quantum Reduction
  on the stack with its tether, the AI's insect shrunk to 0.268 tall, Agent 13 as
  a ghost at the casting anchor becoming the same object on the battlefield, her
  `pistolDraw` alias as her attacking stance, the live combat freeze, a live
  `block` clip, a concede. The frame log passes `check-redaction.mjs`, and
  `~/.forge/decks` hashed the same before and after.

### Deviations from report 13, each argued in the evidence

Three archetypes rather than one at T2, and three tile kinds rather than five
(**D59**). The disc is drawn under every creature, not only as the fallback
(**D55**). `ClipRequest` lives in `figures/clips.ts` and carries a `key`
(**D57**). A `tap` cue carries its card's controller, read off the snapshot
(**D60**). `mote` is a seventh `Effect` kind with its own cap (**D60**). The spell
form arrived in T4 because the motes needed somewhere to land. `land.tap` /
`land.untap` replace `fx.ripple` on the five land entries of `cues.json`. The
strike reads the previous frame (**D63**), and the fizzle's fall added
`casting.ground` to `AnchorRef` and `arc` to `Effect`. The busts are one draw call
with a `vigour` term (**D62**). Quantum Reduction's shrink is on `attach:on`
through `params.hostClip` / `params.collapse`, because `queue.ts`'s rule 5 drops a
`cast` whose card lands in the same batch, which is how the AI plays. `resolved.*`
defaults are 480 / 460 ms, up from 320, so the strike can travel. Shell, circuit,
glints and cocoon still draw as the halo (T12). **The benchmark frame is not
report 13's**: `human-sideboard-7`'s 21-creature frame is all probe-deck beasts on
the disc — the busiest board in the corpus has no models in it — so T7 measured
`g1.jsonl` at 316, the first of 61 consecutive frames with ≥ 10 modelled figures.
**`docs/protocol.md` needs no amendment**: Tier 2 changed nothing on the wire,
`bridge/` is untouched, and no fixture was re-recorded.

### The verification pass — passed, ten minor findings

An independent verifier re-ran the evidence and found nothing blocking. Two of its
ten findings are **closed by the documentation pass**: the docs lagged the code
(CLAUDE.md still said the effect pool was 26 meshes — it is 38 — quoted M7's test
counts and had no Tier 2 conventions, and DECISIONS.md had no entry for the
changes that contradict earlier documents; now **D53–D63** and CLAUDE.md's Tier 2
section), and NOTICE did not list the two bloom packages bundled into the `Post`
chunk (now §6). The other eight are follow-ups 2, 3, 4, 5, 7, 8, 9 and 10 below.

### Tier 2 follow-ups — nineteen from slice 1, 2026-09-27; six closed by slice 2, one by slice 3, one by slice 4, one (17) by the hardening pass

From the builders' own "problems" notes and the verification pass. **None of them
stops a game, and the gate is green.** **Slice 2 closed 2, 3, 8, 9, 11 and 18**
(struck through below, each with what closed it) and added a second cause to 1;
**slice 3 closed 15** (Web Up measured before its cocoon was built); **slice 4
closed 10** (the duelists, and the busts with them, stand out from under the
chrome) and made 17 weightier; the other eleven are open, and slice 2's, slice
3's and slice 4's own lists follow their sections. Three are properties of the wire or of
Tier 1's queue policy that a renderer must not paper over (1, 2, 13), four are
measurement limits or caveats (4, 6, 12, 14), and the rest are small debts with
a stated cost.

1. **In the human's own combat the transient clips mostly do not play live.**
   Forge hands the human priority with each combat batch, so the 250 ms
   awaiting-human budget applies, the batch would need compressing below
   `MIN_COMPRESSION` (0.25), and a snapped cue is applied at `t = 1`, where clip
   weight is 0. The attack lunge and the damage hit were therefore **not
   observed live** (the block clip and the summons were); both were photographed
   in replay, where the budget is 2.5 s. The land's *rise* could not be
   photographed live for the same reason. Loosening this — exempting the clip lane
   from `MIN_COMPRESSION`, or an attackers batch keeping a ~400 ms floor while the
   human is awaited — is a **Tier 1 policy change**, and it wants the play-test
   (report 13 §13 question 7), not a guess. **A second cause, found and fixed by
   slice 2's second verification pass (D72):** the cue clock added the whole idle
   gap of a parked loop to the next batch's first frame (the verifier measured
   live AI-turn batches jumping 734–1000 ms), so after any pause a batch could be
   consumed by its first tick whatever its budget. The budget cause above is
   unchanged and still open, and now measured live: after the D72 fix, 17 of a
   live game's 44 batches still finished on their first tick with the clock
   advanced 0 ms — which can only be zero-duration cues, the 250 ms budget
   compressed below `MIN_COMPRESSION`. The user's play-test of slice 1 did not
   flag it (question 12).
2. ~~**The `die` clip never plays anywhere**~~ — **closed by slice 2 (D64)**: a
   creature that dies is drawn as a departing body from the snapshot it dies in
   until its own death cue ends, the fate decided by the queue
   (`CueQueue.deathPending`), stepped out of the rank that closed up. The first
   version (drawn only while the `die` request was on the stage) blinked on every
   death; the verification fix and `clips.test.ts`'s corpus timeline are in
   `docs/evidence/m7-tier2-slice2.md`. The original text, for the record:
   **The `die` clip never plays anywhere** (**D56**). The snapshot carrying a
   creature's `zone → graveyard` event already shows it in the graveyard, so it
   has no figure; in a full 1× replay of `g1` the verification pass saw 69
   `die` requests reach `stage.clips` and no rig ever show a death clip. Not a
   renderer bug, and not to be worked around: a figure that outlives its frame
   would be the renderer remembering something the engine did not say. `die`
   stays in `CLIP_FOR` so that the day the wire says "dying" one frame earlier it
   plays.
3. ~~**A wrapped rank's second-row figures stand inside the first row's cards.**~~
   **Closed by slice 2 (D66)**: a back-row figure stands on its own card (216 stand
   points inside another card → 0), and its disc is drawn in a second pass after
   the cards (the verification pass found five discs a seat hidden under their own
   back-row cards). Originally:
   `standPointOf`'s row falloff is report 13 §3.1's own formula, and the
   verification pass found it still lands row-1 figures on row-0 cards. Measured
   during the documentation pass: only `human-sideboard-7` ever has ten or more
   creatures on one seat (22 frames, at most 11), and its creatures are discs, so
   no model has yet stood in the wrong place in a recording.
4. **Bloom's default rests on one headless measurement.** It is the GTX 1080
   through ANGLE-on-GL in headless Chromium — not a headed desktop browser, not an
   iGPU. With the default on, the SwiftShader bench **fails** until the governor
   switches bloom off (~40 slow frames). M7 follow-up 2 is answered for this GPU
   and still open for an integrated one; the check is a real browser on the
   user's desktop with `?stats=1&glinfo=1`, bloom on and off. **Slice 2 is under
   the same caveat**: every browser number it has — the views, the director, the
   deaths, the loop — is headless Chromium on the GTX 1080.
5. **The program budget is exceeded under bloom**: 25 programs (22 after the
   governor turns it off) against report 13 §8.2's ≤ 14; bloom off is 11. Draw
   calls and triangles are inside budget. Either the budget line is amended to
   exclude the composer's own passes, or bloom's variants are reduced.
6. **With bloom on, `gl.info.render` counts only the composer's last pass**
   (`calls: 1`), so every draw-call number above was read with bloom off. A bench
   that reports draw calls must say which.
7. **The idle cost of a table with a bobber on it rose** (**D58**). Tier 1's
   `presence` bob (the Doombot, the Helicarrier, Wasp) keeps the loop at `always`
   while such a card is on the table — from `g1` frame 176 onward in that replay —
   and since Tier 2 every pose layer is bound on each of those frames. A table
   without one still renders nothing while idle. **Slice 3 declined to add a
   fourth**: the giant ant's "wing hum" was built as a `presence` bob and taken
   out after measuring `human-comfort-13`@1262 go from 0 to 300 frames in 5 s of
   idle for a vibration of about a pixel; its flight is `traits.json`'s
   `idle: hover`, which moves only while frames are drawn.
8. ~~**The "no CDN" liveness clause is a hostname denylist**~~ — **closed by
   slice 2's verification fix**: the clause is now an allow-list over every string
   literal under `web/src/arena/` that carries a URL scheme (only the Scryfall
   credit link is allowed, with its reason), plus provenance-only keys in the
   arena's JSON, with the negative controls — `'https://example.com/figures.glb'`
   among them — in the test itself. Originally: **the clause was a hostname denylist** (**D54**): the
   verification pass pointed the loader's fallback at `https://example.com/…` in a
   scratch copy and the clause stayed green. The robust form is "no string
   literal with a URL scheme anywhere under `web/src/arena/`", negative-controlled
   the same way.
9. ~~**`tools/build-figures.mjs` never verifies a source's sha256**~~ — **closed
   by slice 2 (D67)**: the build checks every source's bytes and sha256 against the
   manifest before building, records the built file's own in `models.json`, and
   `figures.test.ts` fails when the committed `figures.glb` is not that file (the
   check lives there rather than in a separate `tools/check-models.mjs`).
   Originally: **`tools/build-figures.mjs` never verified a source's sha256** against
   `tools/assets-manifest.json` (it prints them when a file is missing), and
   **nothing checks the built file's own hash**. The documentation pass recorded
   it — 126,404 bytes, sha256 `c870a53330cf…5c5658fa` (NOTICE §7, **D54**) — so the
   next rebuild can be compared by hand; making the build assert both is the code
   half, and report 13 §9.2's `tools/check-models.mjs` is where it was meant to
   live.
10. ~~**The busts sit badly at 1600 × 1000**~~ — **closed by slice 4 (D100)**:
    the busts are T13's fallback now, and they stand where the duelists stand —
    yours 0.4 outboard and 0.4 back from your HUD anchor, clear of a seven-card
    hand in every seat-safe view; the opponent's at the table's right beside its
    creature rank, ≥ 90% visible on a 1600 × 1000 window, because the far end of
    the table is under the chrome from every seat-safe view (0% visible from the
    table view). The residue — `visibleShare` models the chrome band but not the
    player plates — is slice 4's follow-up 3. Originally: **the busts sat badly
    at 1600 × 1000**: the opponent's is mostly hidden under
    the top-left decision panel and cue strip, and the viewer's takes the
    bottom-left corner (**D62**). **Measured by slice 2's second fix pass**, as the
    share of the opponent's bust quad where `elementFromPoint` is not the canvas:
    **37–38% at 1600 × 1000, 33% at 1280 × 720, 89% at 1024 × 700** — unchanged by
    folding the camera switcher into the cue strip's row, because what covers it
    is the decision strip, the cue strip and the credit line. The anchor is
    **T13**'s to move.
11. ~~**The drone overlaps its neighbours**~~ — **closed by slice 2 (D65)**: the
    drone was mismeasured, not too wide (1.66× wider than tall, not 2.97×); the
    clamp is strict for every archetype and the worst overlap over 7,331 pairs is
    0.000. Originally: **the drone overlapped its neighbours** by up to 0.634 units — every
    overlapping pair in the corpus has a drone in it. It is mostly wingspan and
    the width clamp's floor keeps it from vanishing; a narrower drone is **T9**'s.
12. **The fizzle is evidenced only by a synthetic event**: 0 of the corpus's 412
    resolutions fizzled.
13. **Engine order puts `attach` before `resolved`** in an Aura's batch, so the
    Aura snaps on and *then* the bolt flies. The planner never sorts; reported,
    not reordered (**D63**).
14. **The SwiftShader cold start** is still max 65–78 ms: the first GPU upload of
    a card face plus the governor settling inside a 600 ms window (M7 follow-up 1,
    unchanged). The GTX 1080's cold run has no hitch.
15. ~~**Web Up's cocoon is measurable now and unmeasured.**~~ — **closed by
    slice 3 (D80)**: measured over the whole committed corpus before anything was
    built (`human-comfort-13` plays Web Up, cast at 1034 and resolving at 1044) —
    **no card in any exile zone ever carries an `attachedToId`**, and Web Up's own
    is `null` in every frame, which `attach.test.ts` now asserts. So the wire never
    relates Web Up to what it exiled: the cocoon hangs over **Web Up's own card**
    as a station, and the wrap is a cue on its own `cast` and `resolved`, aimed by
    the stack. (The local `human-ws-7` recording this item named was not the one
    read.) Originally: **Web Up's cocoon was measurable and unmeasured.** The live game played
    Web Up (the AI cast it on our Quantum Reduction), so report 13 §4.5's
    "measure before building" recording exists — `var/games/human-ws-7/frames.jsonl`,
    **local and gitignored** — and nobody has read it for `attachedToId` on the
    exiled card. T12's first step.
16. **The minified chunks carry no licence banners** — measured during the
    documentation pass: the entry, Arena and Post chunks contain no `Copyright` and
    no `@license` comment, so NOTICE §6's M7 claim that the bundler preserved them
    was wrong. NOTICE now says so and is where the notices live; a `web/dist/` that
    leaves this machine must carry NOTICE with it, or the build must be told to
    keep legal comments. Pre-existing since M7; found now.
17. ~~**`@gltf-transform/cli` floats on a caret (`^4.5.0`)**~~ — **closed by the
    hardening pass (2026-09-27)**: `web/package.json` pins the CLI at `4.5.0` and,
    through `overrides`, its nested meshoptimizer at `1.2.0` and the three
    `@gltf-transform` libraries the build imports at `4.5.0` (slice 4 follow-up 9;
    *The 2026-09-27 hardening pass*, below). While it was open: every Tier 2
    runtime dependency is exact. A minor release could change the bytes of
    `figures.glb`; pin it if the built file is committed. Since slice 2 such a
    change can no longer pass silently — `figures.test.ts` fails when the file on
    disk is not the one `models.json` records — but the pin is still open.
    **Weightier since slice 4 (D96)**: the build now also imports the
    meshoptimizer nested UNDER the CLI (1.2.0) to decimate the bodies, so the
    caret decides the simplifier's version as well as the writer's.
18. ~~**`tools/build-figures.mjs`'s comment gives the wrong reason**~~ — **closed
    by slice 2**: width is now measured on the skinned mesh along the axis that
    becomes x after the facing turn, and the comment says so. Originally: **the
    comment gave the wrong reason for measuring
    `max(x, z)`** ("a figure turns to face the other seat" — a π turn keeps x along
    x). The number is right for all three models. Left for the file's owner.
19. **`web/t0-spike.html` is kept** as T0's go/no-go page. It is not reachable
    from the app and never reaches `dist/` (`vite build`'s only input is
    `index.html`); keep it or delete it, but decide.

### Slice 2 — T8 (the humanoids, the retarget, the death) and the camera views, 2026-09-27

**Status: built in two tracks, verified twice, fixed twice, and documented** — in
the worktree `/home/justin-a/code/mtg-table-t2b`, branch `tier2-slice2`,
**nothing committed** — since **committed by the user on `main` as `5891444`**,
which slice 3 branches from. The first verification pass found one major (every death
blinked) and six minors; the second found one major and three minors, the major a
**Tier 1** defect (the cue clock played an idle gap as film). All eleven are fixed
— the bust-coverage minor only partly (follow-up 10 above). Evidence:
[`docs/evidence/m7-tier2-slice2.md`](docs/evidence/m7-tier2-slice2.md) — the
camera track, the figure track, both fix passes and a status section. Decisions
**D64–D74**. **`docs/protocol.md` needs no amendment**: nothing on the wire moved,
`bridge/` is untouched, no fixture was re-recorded, and no npm dependency was
added (the build runs the three already installed, in Node, for the retarget).

**Command**

```bash
./scripts/play.sh --arena                  # live: 1 table · 2 shoulder · 5 low
npm --prefix web run dev:arena             # a replay: all five views, 6/0 the director,
#                                            O spectator (on by itself in a replay)
#   g1.jsonl scrubbed to 322-348 is the evidence's director sequence (two combats);
#   g2.jsonl at 200 has all three humanoid bodies on the table at once;
#   human-auto-7.jsonl stepped 794 -> 795 after a pause is two deaths (D64, D72)
node tools/build-figures.mjs --verify-only # the four sources against the manifest
node tools/build-figures.mjs               # figures.glb (143,920 B) + models.json
node tools/build-figures.mjs --clip-source experiment --no-manifest \
     --out var/assets/figures/build/figures-ual.glb   # every clip retargeted (+24 kB)
```

**What it built**

- **Three humanoid bodies on one rig** (**D73**, **D68**): the agent
  (`character-male-a`), the hero (`character-female-b`, two round buns — the
  outline that reads from every side) and the scientist (`character-male-e`,
  glasses and tie — the one body that reads as a scientist face-on), all on
  Kenney's one 7-joint rig with **one clip set**: the pack's own clips, plus the
  Universal Animation Library's `Hit_Chest` and `Death01` retargeted **offline by
  the build** as `hit` and `die`. The experiment's verdict, from renders: the
  library's recoil and death read on a head-heavy chibi; its idle, punch, landing
  and crouch pitch the head block into a face-plant, and Kenney's hand-made clips
  win every one of those.
- **A library that is verified and reproducible** (**D67**): every source checked
  by bytes and sha256 before a build, zips read by the build itself, no texture,
  the output's own hash in `models.json` and checked by `figures.test.ts`; two
  builds byte-identical at **143,920 B** (five models, 9,759 triangles). The new
  build also found that **slice 1's drone was never whole** (its arms were joined
  onto the eye's skin and drawn floating) and that every width it measured for a
  skinned mesh was wrong.
- **The strict width clamp** (**D65**) and **the back row on its own card**
  (**D66**), closing follow-ups 11 and 3 above.
- **The death is seen** (**D64**, closing follow-up 2): a creature that dies is
  drawn as a departing body from the snapshot it dies in until its own death cue
  ends, its fate decided by the queue (`CueQueue.deathPending`), stepped out of
  the rank that closed up behind it. The first version blinked on every death for
  0.5–1.3 s; after the fix, 0 frames without a body on all three of `g1`'s
  modelled deaths in the browser, and all 17 corpus deaths drawn without a gap by
  `clips.test.ts` at three paces.
- **Five camera views, spectator mode and an auto director** (**D69–D71**,
  **D74**): the views are homes the cue swoops leave from and return to; table,
  shoulder and low keep the seat's hand **and** its own ranks on screen and are
  usable live, the opponent's shoulder and side-on are spectator-only; spectator
  mode is on by itself in a replay and the moment a live game ends; the director
  is pure, cuts on combat, casts, strikes, turns and the outcome, and is held to
  its three numbers over the whole corpus. A switcher in the cue strip's row
  (collapsing to its keys below 1,400 px) does the same by click, and the choice
  persists in this browser.
- **Two Tier 1 defects, found by measuring D64's promise** (**D72**): the cue clock
  added a parked loop's whole idle gap to the next batch's first frame
  (`human-auto-7` 794 → 795 after a 3 s pause: 0 body frames before, 86 of 89
  now, the same as with no pause; live, the first tick of 42 batches that landed
  on an idle queue advanced the clock 0 ms, where the verifier had measured
  734–1,000 ms), and a literal `<Canvas frameloop="demand">` froze a running
  batch on any re-render (11 frames in 3.5 s with six cues queued → 88).

**What the evidence shows**

- **Budgets** (dev build, GTX 1080, bloom off): `g1`@316 — T7's bench frame —
  **60** draw calls and **20,982** triangles; `g1`@355 **65** / **24,406**; `g2`@200,
  all three bodies, **51** / **19,669**; against ≤ 90 and ≤ 30,000. No frame-time
  bench was run by slice 2: nothing it added costs more per frame than slice 1's
  agent did.
- **The 2D board did not move.** Entry chunk **86.23 kB gzip** (slice 1: 85.72 —
  the three keymap rows' text; still no `three` in it, and `camera.ts`'s strings
  appear only in the Arena chunk); Arena chunk **322.48 kB** gzip (slice 1:
  315.13); `Post` unchanged at 16.54.
- **Tests.** `npm --prefix web test` is **655 `node --test` + 79 vitest**
  standalone (slice 1: 610 + 79). `camera.test.ts` grew from 16 tests to 35,
  `keys.test.ts` from 23 to 27, and `liveness.test.ts` gained the camera's purity,
  the one director caller, `localStorage` only inside `try`, the switcher's
  pointer events, the URL allow-list (follow-up 8), the frame-loop allocation scan,
  the layout-effect intake and the loop-mode ref — each with its negative control.
  `./tools/check-all.sh` passed three times on this branch: **731 s** (first fix
  pass, `WSPORT=8662`), **729 s** (second fix pass, `WSPORT=8665`) and **727 s**
  (the documentation pass, `WSPORT=8666`, `var/check-all-t2s2-docs.log`) — each
  exit 0, 9b's re-recording multiset-identical or within its documented noise,
  9c 10/10, all seven ws servers, and the web step at **665 `node --test` (657
  pass / 0 fail / 8 skipped) + 79 vitest**.
- **Behaviour a reviewer should know is deliberate**: `reset()` and `K` now snap
  the camera home; camera cues now play in replays of human games (rule 5 waits
  for a live seat); "Low" is a corner now rather than a crouch, the price of
  keeping the land rank in view.

### Slice 2 follow-ups — ten, 2026-09-27; two closed by slice 3, one partly; one closed by slice 4 for the bodies it drew, one partly

From the builders' and fixers' own "problems" notes and both verification passes.
**None stops a game.** Two are the renderer declining to remember (4, 5), three
are limits of how slice 2 was measured (6, 7, 10), and the rest are small debts
with a stated cost. **Slice 3 closed 2 and 3 and partly answered 10** (struck
through or marked below); **slice 4 closed 1 for the proportioned bodies and
partly answered 6** (marked below).

1. **`shrink` and `block` still borrow `crouch`** — **closed by slice 4 for every
   body a card stands in today (D95)**: on the proportioned bodies each has a
   clip of its own (`block` Sword_Idle, `shrink` Crouch_Idle_Loop, `crouch` the
   composed kneel), and `clips.test.ts` asserts they borrow none. It stays true
   of the chibi fallbacks, which no row asks for. Originally: No CC0 library read has a
   shrink or a cower — the Universal Animation Library's 44 clips were read, and
   its crouch face-plants on the chibi; UAL 2's list has none either (the
   manifest's `_deferred`). `clips.test.ts` pins the borrowing so a new one shows
   up on the day it is added (**D68**).
2. ~~**The scientist is the agent's outline from behind**~~ — **closed by slice
   3 (D75, D83)**: from behind a scientist now reads by what it carries rather than
   by its body — the lab bench at its left hand (both scientists), Bold
   Biochemist's long white lab coat and A.I.M.'s bucket hood — and `traits.test.ts`
   rasterises each through the table camera from the OPPONENT's seat, where the
   figures show their backs: coat 1,912 px, hood 2,345, benches 165–171.
   Originally: **the scientist was the agent's outline from behind** — on the viewer's own
   side the braces and the lab tint tell them apart, not the shape; face-on, the
   glasses read (**D73**).
3. ~~**The Giant-Sized Flying Ant is not giant.**~~ — **closed by slice 3
   (D76)**, and with neither a wider slot nor an exemption: it flies side-on
   (`traits.json`'s `turn` 90), so the clamp measures its body's length rather than
   its wingspan, and at `scale: 1.35` it stands **0.867** tall against any other
   insect's 0.490, inside the same 0.720 slot, with a rider on its back.
   Originally: **the Giant-Sized Flying Ant was not giant.** Its `scale: 1.35` clamps to the
   same 0.49 as any insect under the strict clamp (**D65**), as it already did
   under slice 1's floor. A giant needs a wider slot — a `layout.ts` question —
   not an exemption, which D65 rejected. **T9**'s.
4. **The dying body steps out in the frame the rank closes.** `departureStand`
   puts it one `DEPARTURE_STEP` (0.85) into its combat lane in the same frame its
   neighbours snap together; there is no slide, because the only clock outside a
   cue is the cue clock — the same snap Tier 1's cards make, but visible.
5. **A death flushed before its first frame has no body**: 2 of the corpus's 17
   at the replay's 1× pace (§5.2's cap flushes the batch on arrival), 0 when
   drained. Deliberate — a snapped clip on a living figure is the same — but a
   very busy live batch can still skip the fall.
6. **No live death has been seen, and the retargeted `hit` was not photographed
   in the arena.** The second fix pass's live check used a scripted autopilot that
   never got a creature of ours onto the battlefield; deaths are evidenced by
   stepping replays in headless Chromium and by the corpus test. The `hit` was
   judged from lab renders (`clips-compare.png`) and clip-state readings; only the
   retargeted `die` was photographed in the arena. The photographs themselves are
   in `var/shots-t8/` and the session scratchpad — local, not committed. —
   **Partly answered by slice 4**: the retargeted `hit` (Hit_Chest, now on the
   proportioned rig) was photographed in the arena as the director's flinch
   (`g1` 358 → 359, `var/shots-t2d4/ev/flinch-cu-sheet.png`), and every clip of
   both bodies was rendered at four phases in the lab. No live death has been
   seen yet.
7. **The in-browser checks are not repeatable from the repo.** The loop-mode
   guard (**D72**) and the intake-order guard (**D64**) are source scans, because
   node and vitest have no WebGL; the behaviour behind them was measured only by
   scratch CDP drivers that are not in `tools/`. `tools/arena-bench.mjs` is the
   pattern if they are ever worth keeping.
8. **The views' trade, and a flash nobody sees.** To keep the land rank above the
   hand, the shoulder moved from polar 66° to 55° and low from 74° to 59°; the
   Plains' near third is still behind the hand in both (41 of 96 and 34 of 86
   raycast samples on the card), and clearing the whole card would put both views
   back near the table's (polar ≈ 50°). Separately, the board's inert-key flash is
   invisible on a recording with no `input` frame (**D74**'s known cost — a
   `DecisionPanel` change, pre-existing).
9. **A spectator's swoop is a close-up.** With no hand band to keep, the
   lethal-damage cue's jolt becomes a real push-in for a spectator (clamped at
   0.45× the rest distance). It reads well in `g1`; if it is too much, the fix is a
   `cues.json` parameter, not the director.
10. **Nobody has play-tested slice 2.** The user's games were on slice 1; the
    views, the director and the deaths have been seen only by headless Chromium on
    the GTX 1080 (follow-up 4's caveat). The first play-test of slice 2 is the
    input T9–T12 should be ordered by. — **Partly answered before slice 3**: the
    user played slice 2 (committed as `5891444`) and the verdict was about
    identity — *"everything still looks very generic"*, with a screenshot of Wasp
    as a full-size gold chibi standing on her card — which is what slice 3 was
    ordered around. The three questions this item asked (the deaths, the views'
    trade in follow-up 8, and the live combat in slice 1 follow-up 1) were not
    reported on either way, so they stay open.

### What slice 2 hands to T9–T14

*Kept as written; slice 3 built T9–T12 from it, and* **What slice 3 hands to
T13–T14** *below is the current table.* Report 13 §11's second table, updated for both slices. **Before T9, play three
games in the arena** — `./scripts/play.sh --arena` — once from the shoulder and
once from low, and write down, in the moment, what reads wrong: the deaths, the
views' trade (slice 2 follow-up 8) and the live combat (follow-up 1) are the
three questions it answers.

| | deliverable | what slices 1 and 2 already did | what is left |
|---|---|---|---|
| **T8** | the rest of the humanoids | **done (slice 2)**: hero and scientist bodies of their own on the agent's rig (**D73**), the retarget experiment run and decided (**D68**), and the death seen (**D64**) | slice 2 follow-ups 1 and 2 (the `crouch` borrowings; the scientist from behind) |
| **T9** | drone and insect | both archetypes; **the drone rebuilt whole and measured correctly, so no narrower drone is needed** (**D65**); the Giant-Sized Flying Ant at `scale: 1.35`; the Doombot's attack aliases `jet` | `Ant-Man's Air Force` as a small swarm of the insect (`figures.json` deliberately has no `swarm` key until something reads it); the Doombot's eye; the insect's missing `summon`, the drone's missing `hit` (deliberate absences today); **a giant ant that reads as giant** (slice 2 follow-up 3) |
| **T10** | the vehicle | the Helicarrier keeps its Tier 1 `presence` hover and draws its disc | a CC0 vehicle silhouette overhead — none has been chosen (the manifest's `_deferred.carrier`), and `figures.json` declares no `creature/subtype:vehicle` rung until one exists |
| **T11** | per-card clips, as `params.clip` | Agent 13's `pistolDraw`; Fury's `radioCall` aliased on `channel`; **a CC0 clip library now builds in** — any UAL clip can be retargeted onto the humanoid rig by naming it `ual:<name>` in the manifest, and `--clip-source experiment` is the side-by-side bench | Fury's radio call on his agents beat; the S.H.I.E.L.D. squad stepping forward together; Coulson's badge gesture — **each judged on the chibi the way D68 judged the library**, because most of its clips face-plant; any entry that needs a model used by exactly one card is **Tier 3**, not T11 |
| **T12** | the remaining attachments | Quantum Reduction's shrink; every other aura and equipment draws the default halo (metallic for an Equipment) | Super Suit's shell, Spy Kit's glints, Robotics Mastery's circuits, Web Up's cocoon **after** follow-up 15's measurement, Strategic Intervention's mission-control overlay (a DOM widget in `.arena__layer`, which must carry its own `pointer-events: auto`) |
| **T13** | duelists | **done in T7**: two silhouette busts in one draw call | follow-up 10's placement, now measured at three window sizes (37–89% of the opponent's bust under chrome) — the bust's anchor, not the chrome, is what moves; full avatars stay Tier 2.5, only if the play-test says anyone missed them |
| **T14** | verification pass | slice 1: one pass (passed, ten minors); slice 2: two passes (two majors and nine minors, all fixed) and this documentation pass | the same for T9–T13; the bench on the user's own desktop browser (follow-up 4); and a person watching a live death and the seat views (slice 2 follow-ups 6 and 10) |

**The one line Tier 2 must not cross, restated.** A per-card entry in
`figures.json` may choose a model and alias a clip; it may not introduce a model
used by exactly one card — that is Tier 3, and it is the seam where "a small
library of archetypes" quietly becomes "a model per card" (report 13 §12).

### Slice 3 — T9–T12 (per-card identity, the carrier, the beats, the looks), 2026-09-27

**Status: built in two tracks (identity — T9/T10; cues and attachments —
T11/T12), verified twice, fixed twice, and documented** — in the worktree
`/home/justin-a/code/mtg-table-t2c`, branch `tier2-slice3` (from `5891444`),
**nothing committed**. The first verification pass found three majors and five
minors, the second four majors and five minors; every one has a fix in the tree,
**but the second pass's fixes have not been through a third, independent
verification** — they were checked by the pass that made them (the gate, the new
raster test, photographs) — **and one of its majors is only partly answered by
that pass's own account**: Nick Fury reads as a dark figure in a long black coat,
and his eyepatch at 1× as a dark disc ringed pale (follow-up 10).

It answers the user's verdict on slice 2 — *"everything still looks
very generic"* — with **identity as data**: `figures/traits.json` (size, hover,
tint, props, swarm, silhouette per card and per subtype rung) and a kit of
eighteen shared, procedural, instanced prop kinds (one draw call per kind, never
per figure; the second verification pass added the eighteenth, `visor`); Ant-Man's Air Force as a ring of five bees, the Agents as a squad,
the Giant-Sized Flying Ant giant because it flies side-on, the Helicarrier as a
carrier silhouette overhead; T11's per-card beats drawn ON the body; T12's
attachment looks and the two stations. Evidence:
[`docs/evidence/m7-tier2-slice3.md`](docs/evidence/m7-tier2-slice3.md) — the cue
track, the identity track, the verification fixes and the second verification
pass's fixes. Decisions **D75–D81**, **D82–D87** from the second pass, and
**D88–D89** written up by the documentation pass (the swarm and squad as
instanced members; Quake's resolution). No
asset was added (`figures.glb`, `models.json` and the manifest's sources are
unchanged, and NOTICE §7 gained only a paragraph saying what is built in code),
nothing on the wire moved, `bridge/` is untouched, no fixture was re-recorded and
no npm dependency was added.

**The verification pass** (headless Chromium on the GTX 1080, every deck card
photographed in views 1 and 4, both corpus cinematics played in real time, one
live game) found **three majors and five minors**, all fixed:

- **The two tracks disagreed about which way a figure faces** (major): the effect
  binding's `figure` anchor resolved `fwd` backwards, so the Doombot's exhaust
  streamed out of its face while its flame prop burned behind it, and every
  front-anchored beat landed behind its prop. Now one definition in `layout.ts`
  (`FIGURE_FRONT_Z`, `seatFacingY`, `figurePointInto`), and `facing.test.ts`
  holds every beat to its prop for both seats (**D81**).
- **T12 was not delivered in real games** (major): the three attachment rows were
  never committed to `figures.json`, so Super Suit, the Spy Kit and Robotics
  Mastery drew the plain halo. Committed, with `attach.test.ts` reading the
  committed file (**D80**).
- **Agent 13 and Coulson were not recognisable at table distance** (two majors),
  and Fury, Peggy, Ant-Man and Bold Biochemist only partly (minor). Agent 13 is in
  indigo with a 0.3 silver pistol raised at chest height and a lit muzzle (new
  kind `muzzle`; her muzzle-flash cue lands on it); Coulson is darker navy with a
  0.13 normal-blended gold badge and a white shirt-front and tie (new kind `tie`);
  Peggy wears a red hat (new kind `hat`) and a 1.5× shield turned out; Fury's
  patch and strap are bigger and his coat closes further; Ant-Man's helmet has a
  crest and thick lit antennae; Bold Biochemist wears a white lab coat.
- **The ops console and the carrier covered figures from the table view**
  (minor): stations now stand figure-sized in their own rank slot; the carrier
  flies at 2.05 and is 1.5 long. Both are asserted by projecting through the table
  camera (**D77**, **D80**).
- **A dying figure dropped its props; the prop field read reduced motion once;
  Wasp and the ant attacked with the Doombot's eye** (minor): the departing bodies
  are a second input to `PropField.commit`, the field listens for the media
  query's change, and `attack.jet` takes `eye: false` (**D78**, **D79**).
- **The docs were stale** (minor): this section, **D75–D81**, CLAUDE.md's slice-3
  conventions and pool count (45), and the manifest's `_deferred.carrier`.

**Budgets** (bloom off, GTX 1080): `g1`@355 is **77 draw calls, 27,474
triangles, 12 programs** (slice 2: 65 / 24,406 / 11), of which the prop field is
8 kinds and 3,062 triangles — inside report 13 §8.2's ≤ 90 and ≤ 30,000. The
census asserts ≤ 12 prop kinds and ≤ 96 instances in any corpus frame (measured
10 and 19). Entry chunk 86.23 kB gzip (unchanged, no `three`); Arena 346.14 kB,
`Post` 16.54 kB. **The gate**: `rm -rf bridge/out && WSPORT=8666
./tools/check-all.sh` — **731 s, exit 0**, node --test 708 / 700 pass / 0 fail /
8 skipped plus 79 vitest inside it, every one of 9c's ten games, 9d and 10a–10g;
standalone `npm --prefix web test` is **698 + 79**, 0 failures.

**Command**

```bash
./scripts/play.sh --arena                  # live
npm --prefix web run dev:arena             # a replay; `1` table, `4` side-on
#   g1.jsonl @355 — the budget frame; @316 — your carrier over your rank, the opponent's over the centre line
#   g2.jsonl @224 — the ops console in its own slot beside Ant-Man
#   disjoint.jsonl @109 — Coulson's badge; @265 — Fury (`3` shows his back); @179 — Peggy's hat
#   human-comfort-13.jsonl @1279 — the opponent's Agents (three heads) and Coulson's back emblem
#   g2.jsonl @125 — the opponent's Agent 13 from behind; human-auto-7.jsonl @916 — yours
#   g2.jsonl 156 -> 157 and g1.jsonl 231 -> 232 — an attacker turning to face you as it fires
```

**The second verification pass** (headless Chromium on the GTX 1080 again, 4×
zooms of the committed frames, both seats; a live game at seed 11) found **four
majors and five minors**, all fixed — decisions **D82–D87**, evidence in
[`docs/evidence/m7-tier2-slice3.md`](docs/evidence/m7-tier2-slice3.md)'s *Second
verification pass*, stills in `var/shots-t2s3/fx5/` (local, gitignored):

- **The opponent's figures show the table view their backs, and every front prop
  vanished there** (major): Coulson's badge, Agent 13's pistol, Fury's patch, the
  Doombot's eye. The badge kind has a back emblem, the pistol is at her hip out
  beside her body, the new shared `visor` kind is a robot's eye as a band round its
  head, and `traits.test.ts` rasterises every deck card's props through the table
  camera on BOTH seats with the real bodies and the real prop field — ≥ 48 px each,
  one-sided details with a named partner (**D83**, `web/test/prop-raster.ts`).
- **The Agents did not read as a squad** (major): a wedge 0.46 aside and a step
  back, clamped into one slot, in a steel blue of its own; the test requires three
  heads side by side from both seats, and slice 3's formation fails it 8 of 8
  (**D84**).
- **Nick Fury was a grey agent in sunglasses** (major): a slate body in a nearly
  opaque black coat flared wider than his head with slate trim, a black patch with a
  pale rim and a black strap that runs DIAGONALLY (**D83**).
- **Front-anchored attack beats fired away from their target** (major): an attack
  now turns its attacker to face its defender and back (`dRotY`, `Stage.yawTo`),
  whichever way figures rest; `facing.test.ts` runs the real cues on both seats
  (**D82**). Question 13 is still the user's — it now decides only how the table
  looks at rest.
- **The opponent's carrier sat under the HUD** (minor): it flies over the centre
  line, low and a fifth smaller; the chrome is a keep-out band in
  `figure-pose.test.ts` (**D85**).
- **Coulson and Agent 13 only partly readable on your own side** (minor): the
  badge is lower and bigger (0.155, tilted up), the tie runs to the belt, the
  pistol shows its length (**D83**).
- **Four beats did not read** (minor): Peggy's aegis in her shield's blue with red
  and white rings (`rim`, `rim2`), the strike's beam doubled with a star on the
  body, the sweep's bright core, the power-up's card lingering (**D87**).
- **A click on an enchanted creature hit its aura** (minor, a Tier 1 layout
  defect): attachments lie under their hosts; `attach.test.ts` raycasts the real
  proxies (**D86**).
- **The evidence cited scratchpad paths** (minor): the fix pass's stills are now in
  `var/shots-t2s3/fx4/`, this pass's in `var/shots-t2s3/fx5/`, and the evidence
  cites those.

**Budgets after it** (bloom off, GTX 1080): `g1`@355 is **78 draw calls, 27,906
triangles, 12 programs**; sweeps of `g1` 300–376, `g2` 140–225 and
`human-comfort-13` 1100–1316 peak at 78 / 27,906. Idle `human-comfort-13`@1262:
**0 frames in 5 s**. Entry chunk **86.24 kB** gzip (no `three`; +0.01 is the
lazy chunk's hashed file name), Arena 347.70 kB, `Post` 16.54 kB.
`npm --prefix web test`: **704 + 79**, 0 failures. **The gate**: `rm -rf
bridge/out && WSPORT=8665 ./tools/check-all.sh` — **`check-all OK`, exit 0, 729 s**;
node --test 714 / 706 pass / 0 fail / 8 skipped and 79 vitest inside it.

**The documentation pass** changed no code: this section and the evenings table,
the follow-ups below, the Tier 3 note and question 14, **D88** (the swarm and the
squad as instanced members) and **D89** (Quake keyed off her trigger's resolution,
and the tap heuristic declined), README's *Tier 2, slice 3 — every card reads as itself* (with how to
give a card its identity as data), CLAUDE.md's slice-3 conventions,
`docs/ideas/arena-mode.md`'s cue table marked row by row, NOTICE §7's list of
what is generated in code, and a status section at the end of the evidence.

**The gate, once more**: `WSPORT=8666 ./tools/check-all.sh` (without deleting
`bridge/out`) — **`check-all OK`, exit 0, 726 s** (`var/check-all-t2s3-docs.log`):
9b's re-recording multiset-identical (1,587 frames), 9c's ten games in 269 s, 9d
and 10a–10g, `check-redaction` over every fixture and fresh recording, node --test
**714 / 706 pass / 0 fail / 8 skipped** and **79** vitest; entry chunk 86.24 kB
gzip, Arena 347.70 kB, `Post` 16.54 kB — the second fix pass's numbers exactly,
as a pass that changed no code should. Standalone, `npm --prefix web test` is
**704 + 79**, 0 failures.

### Slice 3 follow-ups — fourteen, 2026-09-27 (updated by its second verification pass and its documentation pass; one closed by slice 4, three partly)

From both tracks' "problems" notes, both verification passes and both fix passes'
own admissions. **None stops a game, and the gate is green.** One is the user's
call (1), four are limits of how slice 3 was measured (8, 11, 12, 13), one is
the wire not naming what a beat would aim at (3), and the rest are small debts
with a stated cost. **Slice 4 closed 7's owed rebuild** and partly answered 8, 10
and 11 (marked below); 2 changed shape (the eyepatch joined the one-sided list).

1. **Your figures face you** — measured, not changed: PLAN question 13 below.
   Since the second verification pass an ATTACKER turns to face its defender
   (**D82**), so the question now decides only how the table looks at rest.
2. **Three props sit on one side of a body by nature** — Coulson's shirt and tie
   (front), the Doombot's laser eye (front) and its exhaust (back) — so each shows
   from one seat only, and `traits.test.ts` asks them only half the bar (24 px) on
   their own side while a partner carries the card on the other (**D83**): the
   tie is 37 px at its worst from your seat and 0 from the opponent's, where the
   badge's back emblem carries Coulson (273 px); the laser eye 48 / 0 and the
   exhaust 0 / 43, with the `visor` band (135 / 87) and the thrusters carrying
   the Doombot. A partner list is extended only with a reason. — **Slice 4
   extended it with one** (**D98**): on a proportioned head 12 px tall the
   **eyepatch** cannot show 48 px from both seats without being a mask, so it is
   one-sided now (56 px from the front, 42 from behind), with the coat as its
   partner; the tie reads 32 / 3.
3. **Most beats are unaimed in the corpus, and Wasp's never is** (0 of 10
   recordings): the AI puts her trigger on and takes it off the stack inside one
   snapshot, so the wire never names its target; her shrink beam works on a
   synthetic resolution, and a human game where her trigger waits on the stack
   would show it live. Pym Particles only ever chose its vigilance mode, so its
   grow/shrink branch (`strikeGrew`) is evidenced by `stack.test.ts` and not by a
   game; Quake's fissure is aimed in 4 of 13 resolutions. The census prints fired
   and aimed per beat every run, and `replay-cues.test.ts` asserts that Wasp is
   never aimed, so the day a recording aims one the evidence is told.
4. **At the table view the T12 looks are small**: the shell's rim and the glints
   read, the circuit traces read as a sheen; the shoulder views show them properly.
5. **The carriers**: your carrier over your rank still projects onto the far rank
   from the two over-the-shoulder views (**D77**'s known cost), and since the
   second pass the opponent's — over the centre line, out from under the HUD
   (**D85**) — does the same from views 2 and 5, and where BOTH seats have one at
   overlapping x (mirror games: `g1`@316) the two hulls overlap on screen like a
   formation. A layout rule that separates them in x would be the next step.
6. **Cast cues on a TRIGGER still rise out of the hand** (Tier 1's `cast.rise` on a
   card already on the battlefield); Strategic Intervention's freeze rides it.
7. **The CDP drivers that took every photograph are scratch scripts**, not in
   `tools/` (slice 2 follow-up 7's pattern), and the photographs themselves are
   local and gitignored (`var/shots-t2c3/`, `var/shots-t2s3/`). **Still owed: `node
   tools/build-figures.mjs --verify-only`** (and a rebuild compared byte for byte
   with the committed `figures.glb`) once the user has re-downloaded the four CC0
   sources into `var/assets/figures/` — neither this worktree nor the main
   checkout has them, and fetching them is the user's call. `figures.glb` is
   unchanged since slice 2 (sha256 `c09ac552…a981a3`, which `figures.test.ts`
   checks), and slice 3 added no asset, so nothing it built depends on that run.
   — **The owed run is done (slice 4)**: all four sources were downloaded again
   into the `tier2-slice4` worktree (the three direct links by curl, the
   Animation Library through itch.io's free flow), all four matched their
   manifest bytes and sha256 (`--verify-only`), and a rebuild with slice 3's
   manifest came out **byte-identical** to the committed `figures.glb`
   (143,920 B, `c09ac552…a981a3`) before slice 4 changed anything. **But the
   downloads were made by the builder on the workflow's instruction, not by the
   user** — this item had called fetching them "the user's call" — which is slice
   4's follow-up 12. The CDP drivers are still scratch scripts.
8. **Nobody has play-tested slice 3.** It was seen only by headless Chromium on the
   GTX 1080 and a few scripted live games (seed 11: a land, Peggy cast and declared
   an attacker by canvas clicks). No live game has seen a death, a carrier or a
   T11 beat in the human's own turn — the live combat budget snaps those batches
   (slice 1 follow-up 1, question 12). — **Partly answered before slice 4**: the
   user played slice 3 (committed as `0368a90`) and the verdict was *"the game
   looks generally improved. The avatars are still pretty generic"* — which is
   what slice 4 was ordered around. The death, the carriers and the live beats
   were not reported on either way, so they stay open.
9. **Four attachments in one crowded `g3` board have no clickable strip** (the
   second pass, **D86**): each lies wholly under its host and a wrapped rank's back
   row, and is not drawn either — the click order is the drawing order. A layout
   rule for attachments in a wrapped rank would give them one.
10. **Nick Fury is still the least legible identity** — the user named him ("Nick
    Fury with a coat and eyepatch"), both verification passes flagged him, and the
    second fix pass says so itself: at 1× from the table view he is the darkest
    figure on the table, in a long black coat, but the eyepatch reads as a dark
    disc ringed pale (arguably a monocle), and nobody has judged him on a real
    desktop GPU. A hologram is translucent (core alpha 0.38), which is why the
    body is slate and not black (**D83**); a bigger patch or a lit rim would be
    the next thing to try, judged at 1× in views 1 and 4 on both seats. — **Still
    open after slice 4.** He is a proportioned man all in black now (a costumed
    hologram is more solid: core alpha 0.74, **D97**) in a long black coat re-cut
    for a person, and the patch is a dark oval with a slate edge, one-sided
    (**D98**). But the verification pass read him at 1× on the GTX 1080 as still
    *"a man in a long black coat"* with the eyepatch illegible (slice 4's
    follow-up 6).
11. **The second verification pass's fixes have not been independently
    verified.** **D82–D87** were checked by the pass that made them — the gate
    (729 s, exit 0), the new raster test, `facing.test.ts`, photographs — and by
    this documentation pass's gate run, which proves the tree is green and not
    that the table reads. A third look, by a verifier or by the user (follow-up 8),
    is owed before the slice is called done. — **Partly answered**: the user
    played the committed slice 3 and called it "generally improved", and slice
    4's verifier photographed the whole deck at 1× from both seats with slice 3's
    fixes underneath (its identity finding is slice 4's follow-up 6). No pass has
    re-checked **D82–D87** one by one.
12. **The raster test counts pixels, not contrast** (**D83**'s rejected
    alternative): a prop that clears 48 px in a colour close to its body's passes.
    Legibility was judged from photographs at 1× and 4×, not measured.
13. **No frame-time bench was run on slice 3.** Its budget numbers are
    `gl.info` counts — `g1`@355 **78 draw calls, 27,906 triangles, 12 programs**
    with bloom off, against ≤ 90 and ≤ 30,000, and idle **0 frames in 5 s** — and
    the prop field's frame-loop body is a fixed walk over 192 preallocated
    bindings; `tools/arena-bench.mjs --index 316 --gpu gl` (and under SwiftShader)
    was not re-run, and the draw-call headroom left under the budget line is 12.
    Tier 2 follow-up 4's caveat (headless Chromium on the GTX 1080, never an
    integrated GPU) applies to every number here.
14. **A dying Air Force is not seen dying** (**D88**'s known cost — deliberate in
    the code's own comments, but reported by no pass and never photographed): a ring swarm's
    insect rig is never drawn, so `FigureLayer` collects no departing body for it
    and the prop field binds no bees to a departed ring — it leaves the table with
    its snapshot, the one exception to **D64**. A beat aimed at it (Helicarrier
    Strike at `g3`@116) still lands where it stood. Letting the bees fall and fade
    with the hidden body would close it. (A squad's followers do fall with their
    leader.)

### What slice 3 hands to T13–T14

*Kept as written; slice 4 built T13 and T14 from it (and the bodies, which this
table did not ask for — the user's verdict on slice 3 did), and* **Slice 4**
*below is the current state.* Report 13 §11's table, updated for three slices. **Before T13, play three games in
the arena** — `./scripts/play.sh --arena` — and write down, in the moment, which
cards do NOT read as themselves at the table view (the answer to "everything still
looks very generic" is only as good as that list; follow-ups 2, 4 and 10 are the
suspects), and decide **question 13** by looking at the table rather than at this
page. The deaths, the views and the live combat (slice 2 follow-up 10) are the
same game's other three questions.

| | deliverable | what slices 1–3 already did | what is left |
|---|---|---|---|
| **T9** | drone and insect | **done (slice 3)**: the Doombot's eye, visor, thrusters and exhaust; the Air Force as a swarm of five instanced bees (**D88**); the giant ant side-on with a rider (**D76**) | the insect's missing `summon`, the drone's missing `hit` (deliberate absences) |
| **T10** | the vehicle | **done (slice 3)**: a procedural carrier silhouette, crewed or not (**D77**, **D85**) | follow-up 5 |
| **T11** | per-card beats | **done (slice 3)**: the `figure` anchor, the closed params, the shapes, rule 7 (**D79**); the attacker's turn (**D82**); Quake's resolution (**D89**); four quiet beats (**D87**) | follow-ups 3 and 6 |
| **T12** | the remaining attachments | **done (slice 3)**: shell, glints, circuit, the cocoon and the console (**D80**); a click on the host hits the host (**D86**) | follow-ups 4 and 9 |
| **id** | per-card identity | **done (slice 3)**: `traits.json`, the eighteen-kind prop kit (**D75**), read from both seats as a number (**D83**), the Agents' wedge (**D84**) | follow-ups 2, 10 and 12, and question 13 |
| **T13** | duelists | **done in T7**: two silhouette busts in one draw call | slice 1 follow-up 10's placement (37–89% of the opponent's bust under chrome); full avatars stay Tier 2.5, only if the play-test says anyone missed them |
| **T14** | verification pass | slice 1: one pass (passed, ten minors); slice 2: two passes (two majors and nine minors, all fixed); slice 3: two passes (seven majors and ten minors, each with a fix in the tree) and this documentation pass | a third look at slice 3's second fix pass (follow-up 11); the bench on the user's own desktop browser (Tier 2 follow-up 4, slice 3 follow-up 13); a play-test by the user, and question 13 |

**The one line Tier 2 must not cross, restated for slice 3.** A per-card row in
`traits.json` may choose a size, a hover, a colour and props from the shared kit; a
new kind goes into the kit for every card, and nothing in the kit is a model used
by exactly one card. Slice 3's two baked kinds are the library's own CC0 bodies
frozen in a pose (the rider, the squad followers), and the carrier is an archetype
rung — which is why none of it is Tier 3.

### Slice 4 — T13, proportioned bodies in painted costumes, and T14, 2026-09-27

**Status: built in two tracks (the bodies and the costume; the duelists — T13),
verified once (verdict: passed; eleven findings, all minor, none fixed in code),
and documented** — in the worktree `/home/justin-a/code/mtg-table-t2d`, branch
`tier2-slice4` (from `0368a90`), **nothing committed**. The user committed slice
3 as `0368a90`, played it, and said *"the game looks generally improved. The
avatars are still pretty generic."* Slice 4 took both readings of "avatars". The
creature figures were chibi toys whose only identity was one tint and what they
carried, because the hologram kept geometry only (Peggy could not have a blue
jacket AND a red hat). The two duelists at the table ends were blank silhouettes
by design (**D62**). Evidence:
[`docs/evidence/m7-tier2-slice4.md`](docs/evidence/m7-tier2-slice4.md) — the
duelist track, the bodies track and a status section. Decisions **D95–D101**
(**D90–D94** are `main`'s card-library entries, which landed on `main` first, so
slice 4 starts at D95). **`docs/protocol.md` needs no amendment**: nothing on the
wire moved, `bridge/` is untouched, no fixture was re-recorded and no npm
dependency was added. **One asset was added**: Quaternius's *Universal Base
Characters* [Standard], CC0, its badge recorded verbatim on the download day
(`tools/assets-manifest.json`, NOTICE §7). `figures.glb` was rebuilt (373,236 B).

**`main` moved during verification.** The user fast-forwarded `754f504` (*Card
library and browser*, 43 files) at 19:00, so this branch is one commit behind
`main`. `main`'s commit changed NOTICE, CLAUDE.md, PLAN.md, README.md and
DECISIONS.md, and this documentation pass changed all five here, so **a merge
will conflict in all five** (follow-up 14).

**Rebased onto `754f504`, 2026-09-27.** Slice 4's one commit was replayed on top
of `main`'s card library. NOTICE merged by itself; CLAUDE.md, DECISIONS.md,
PLAN.md and README.md conflicted where both sides wrote at the same place (the
appended sections, the test-count paragraph, the docs tables' rows and the
questions table), and every conflict kept both sides' text. **D90–D94** stay the
card library's and slice 4's **D95–D101** needed no renumbering; the
card-library sections are `main`'s verbatim; the counts are the merged ones —
**one hundred and one** decisions, **817 `node --test` + 91 vitest** standalone
and **827 / 819 pass / 0 fail / 8 skipped** inside the gate. The merged tree's
`check-all.sh` at `WSPORT=8665` failed once at step 10g — the three-game
session's `restartMatch()` game ended 2 ms after its `hello_ok`, with no `state`
(follow-up 13) — and passed on the re-run: **849 s**, exit 0
(`var/check-all-t2s4-rebase-pre2.log`). Follow-up 14 is closed.

**Command**

```bash
./scripts/play.sh --arena                  # live: the director at your left, the villain at the table's right
npm --prefix web run dev:arena             # a replay; `1` table, `2` shoulder, `3`/`4` spectating, `5` low
#   g1.jsonl @355 — the budget frame: eleven figures (seven people in costume) and both duelists (views 1, 2, 3 and 5)
#   g1.jsonl 354 -> 355 — the villain casts (a hand raised toward the table); 369 -> 370 — the director casts
#   g1.jsonl 358 -> 359 — the director takes 2 and flinches red; 372 -> 373 — the end: the villain kneels, the director's arm goes up
#   disjoint.jsonl @242 — Peggy, Coulson (kneeling), Fury and the Biochemist in costume
#   g2.jsonl @181 — A.I.M. in yellow under its hood and Ant-Man in red; human-auto-7.jsonl @916 — Agent 13, pistol in hand
node tools/build-figures.mjs --verify-only # the FIVE sources against the manifest
node tools/build-figures.mjs               # figures.glb (373,236 B) + models.json
```

**What it built**

- **Proportioned people** (**D95**). Every humanoid card stands in a Quaternius
  *Universal Base Characters* body — the man (`agent`, and `scientist` as the same
  node) or the woman (`hero`) — on the Universal Animation Library's own 65-joint
  rig, so every clip is the library's, retargeted by world-space delta, with no
  face-plant. The tapped kneel is composed (the kneeling clip's legs under the
  idle's upright torso), the head is ×1.3, and a hairstyle is grafted on. Every
  clone starts at its idle, which hid a T-pose flash (follow-up 8).
- **1,400 triangles a body** (**D96**), the drone 1,900 and the bee 1,700,
  decimated over the costume slots with the shirt and belt locked.
  `figures.glb` is **373,236 B**, 8,573 triangles and 63 clips, and two builds
  are byte-identical.
- **The costume** (**D97**). A slot per vertex (skin, hair, top, shirt, legs,
  shoes, gloves, belt) and a palette per figure, written at commit. The rim is
  still the card's tint, and it is still one program with no texture.
  `traits.json`'s `costume` merges slot by slot: Peggy wears a blue jacket over a
  white shirt, Coulson a navy suit, Fury black, Quake black with teal, Agent 13
  indigo and blonde, Wasp gold and black, Ant-Man red and silver, A.I.M. yellow
  and the Biochemist a white coat.
- **The chibi as a flag** (**D98**). `body: chibi` stands a card in slices 1–3's
  Kenney body, and no row asks for it. Props are fitted per body family; Agent
  13's pistol is in her hand (`PropAnchor.pose`); the eyepatch joined the
  one-sided details; the Agents' heads test was recalibrated.
- **The duelists** (**D99**–**D101**). One full figure per seat: the director
  (yours) in a navy suit, gold-trimmed coat and badge, and the villain (the
  opponent's) in iron armour, a green cloak and an iron great helm. Each is 1.6×
  a creature, with its props baked into one mesh. Yours stands beside your hand;
  the opponent's stands at the table's right beside its creature rank, because
  the far end of the table is under the chrome from every seat-safe view. They
  face each other. A cast raises a hand, damage flinches red, and the end of the
  game raises the winner's arm and kneels the loser — all as a `gesture` param on
  the existing cues, on reserved clip-lane ids, with suppression rules 5b and 8.
  The stances are a pose, read from `board.gameOver`. The busts are the fallback
  and stand where the duelists stand.
- **One live defect, found and fixed**: a Vite hot update disposed the duelist
  bodies in a passive effect's cleanup after the layout effect had rebuilt them,
  and the busts came back mid-game. Build and disposal are now one layout effect.

**What the evidence shows** (headless Chromium on the GTX 1080 through
ANGLE-on-GL, the dev server, bloom off — not a headed desktop browser):

- **Budgets.** `g1`@355 **79 draw calls, 27,416 triangles, 12 programs** with
  both duelists (slice 3: 78 / 27,906 / 12 with busts). `g1`@316 is 73 / 24,316
  / 12, `disjoint`@242 55 / 13,624 / 12, and with `figures.glb` blocked the
  fallback reads 59 / 3,078 / 10 — all against ≤ 90, ≤ 30,000 and ≤ 14. Idle
  `human-comfort-13`@1262: **0 frames in 5 s**, bloom off and on. The frame loop
  allocates nothing new (liveness, including the costume and duelist clauses).
- **The 2D board did not move.** The entry chunk is **86.23 kB** gzip, still with
  no `three`. The Arena chunk is **359.81 kB** (slice 3: 347.70), and `Post` is
  16.54 kB.
- **Tests.** `npm --prefix web test` is **724 `node --test` + 79 vitest**
  standalone, 0 failures (slice 3: 704 + 79). New: `duelists.test.ts` (9 tests,
  14 negative controls, the corpus census and empty lanes after every batch, and
  the aimed joints against the real rig) and three `camera.test.ts` tests (yours
  never behind your hand, the opponent's visible and out from under the chrome,
  neither in the solver's required set). `liveness.test.ts` gained three clauses
  (a costume written only at commit, and the duelists bound only from the bust
  field with frame-loop bodies that allocate nothing), and `traits.test.ts` reads
  every deck card's costume back off the poses.
- **The census** (`duelists.test.ts`, printed every run): over 3,293 batches, opp
  casts 207 · flinches 22 · loses 2 · wins 16, and you cast 178 · flinch 90 ·
  lose 16 · win 2. Over 3,679 board frames there are 7,298 `ready` stances, 30
  `won` and 30 `lost`. No duelist lane holds a request after any batch.
- **A live game** (port 8660, seed 5, view 2). The director stands clear of a
  seven-card hand. Canvas clicks played two lands and opened Borough Backup's
  `ability_menu`. The villain's cast gesture played live, and a concession left
  the stances right. The frame log passes `check-redaction.mjs`.
- **What the table reads as.** The bodies track judged the table at 1× from views
  1 and 4 as *"a table of small painted miniatures rather than of toys"*, every
  humanoid card a person in a costume. The verifier found the cards' identities
  uneven at 1× (follow-up 6).

**The verification pass** (headless Chromium on the GTX 1080, two live games at
seeds 5 and 11, one gate run that failed at 10b and a re-run that reached the web
step — its per-step logs are under `var/check-all-*.log`) returned **passed, with
eleven minor findings**. None was fixed in code. One — DECISIONS.md not yet
updated — is **closed by this documentation pass** (**D95–D101**), and the other
ten are follow-ups below: the gate's intermittent step-10 failure (13); the duelists'
weak roles and artifacts (5); the plates `visibleShare` does not model (3); the
flinch never seen live (7); uneven card identity (6); the T-pose flash hidden
rather than fixed (8); the build's transitive dependency (9); the downloads (12);
`main` moving (14); and a camera mis-aim seen once (15).

**The documentation pass** changed no code: this section and the evenings table;
the earlier follow-ups marked where slice 4 closed or moved them; **D95–D101**;
README's *Tier 2, slice 4 — people in costumes, and a duelist at each end* (with
how to dress a card and how to change a duelist); CLAUDE.md's slice-4 conventions
and the lines slice 4 made stale; NOTICE §7's paragraph on what slice 4 draws;
`docs/ideas/arena-mode.md`'s status; and a status section at the end of the
evidence.

**The gate**: three runs of `WSPORT=8666 ./tools/check-all.sh` in this
documentation pass, without deleting `bridge/out`, and **none passed**. The
machine's load average was 42–73 during the first two, from other work's gate
runs and headless Chromium GPU processes (none of it this worktree's), and about
30 during the third.

- **Run 1** (19:31:29): **exit 141 after 63 s, at step 6.** The fresh seed-42
  `RecordMatch` had one extra `state` frame against `fixtures/games/g1.jsonl` (a
  second `MAIN1` at seq 340) and played the same game to the same `over`. The
  step's `diff | head` then took a SIGPIPE under `set -euo pipefail`, so the gate
  died with 141 instead of its own message.
- **Run 2** (19:36:37): **exit 141 after 56 s, at step 6 again**, this time one
  extra `COMBAT_DECLARE_ATTACKERS` frame at seq 342.
- **Run 3** (19:49:17): **exit 1 after 622 s, at step 10b.** Steps 1–9d passed:
  step 6's 377 lines were identical, 9b's advisory multiset differed by 7 / 25
  frames, 9c was 10/10 in 347 s, and 9d's sideboard ask passed. 10a passed too.
  10b failed exactly as the verifier's first run had: in the bridge's frame log
  for the drop-and-reconnect smoke, an `input` frame (the mulligan's
  Keep / Mulligan prompt, seq 10) follows `over` (seq 9) in the same millisecond.
  The concede at the mulligan raced the engine's mulligan prompt.

The logs are `var/check-all-t2s4-docs-run1.log`, `-run2.log` and `-run3.log`,
and run 3's frame log is `var/check-all-t2s4-run3-ws-drop-frames.jsonl`. No run
reached steps 11–13 (`check-redaction` over the fixtures, its self-test, the web
build and test). The verifier's re-run reached them on the same code, and this
pass changed no code. Both failure classes are timing in the bridge (follow-up
13): `bridge/` is untouched by Tier 2, and `WireGuiGame.java` last changed in M6.
Standalone, `npm --prefix web test` was **724 + 79**, 0 failures, in both
tracks' runs.

### Earlier follow-ups slice 4 closed or moved

Marked in place above. **Closed**: Tier 2 follow-up 10 (the busts' placement —
**D100**), slice 2 follow-up 1 for every body a card stands in (each clip its own
— **D95**), and slice 3 follow-up 7's owed rebuild (byte-identical, from sources
the builder downloaded). **Partly answered**: slice 2 follow-up 6 (the retargeted
`hit` photographed in the arena), slice 3 follow-ups 8 and 11 (the user's
verdict on slice 3), and 10 (Fury — reworked, and still the least legible).
**Moved**: slice 3 follow-up 2 (the eyepatch joined the one-sided list, **D98**)
and Tier 2 follow-up 17 (the caret now also decides the simplifier, **D96**).

### Slice 4 follow-ups — nineteen, 2026-09-27; 3, 8, 9 and 13(b)/(c) closed by the hardening pass

From both tracks' "problems" notes, the verification pass's eleven findings and
this documentation pass. **None stops a game.** Four are the user's calls (1, 2,
11, 12), four are limits of how slice 4 was measured or seen (4, 7, 15, 18), two
are about the gate and the merge (13, 14), and the rest are debts with a stated
cost.

1. **Were the duelists wanted?** **D62** was user decision 8 — "silhouette busts,
   avatars deferred … only after a play-test says anyone missed them". Slice 4
   superseded it (**D99**) on the workflow's reading of *"the avatars are still
   pretty generic"* as covering the duelists as well as the creatures, and the
   user's words do not say which. The busts are kept: a seat with no valid look in
   `duelists.json` draws its bust, at the duelists' stand point. The user's call,
   after a game.
2. **The opponent's duelist is not at the far end of the table** (**D100**): the
   whole far end is under the chrome from every seat-safe view (0% visible from
   the table view), so it stands at the table's right-hand side beside its
   creature rank. That is not the Yu-Gi-Oh composition `docs/ideas/arena-mode.md`
   describes. Putting it at the far end means moving the chrome band, the table
   view's pose or the table's depth — a camera or layout decision, and the user's.
3. ~~**`visibleShare` models the top chrome band, not the player plates**~~ —
   **closed by the hardening pass (2026-09-27)**: `camera.ts`'s `PLAYER_PLATES`
   and `visibleShareOnCanvas` model both seat plates as keep-outs (held to
   `styles.css` by `camera.test.ts`), and **no duelist number changed**: the
   "y ≈ 180" was a WINDOW coordinate, and in canvas pixels the opponent's plate
   ends at 126.0, inside the 128-px band (*The 2026-09-27 hardening pass*, below).
   **On the rebase onto match setup** the plate had grown a deck line and a
   profile that wrapped its name row — 143 and 162 px down, below the band and
   over the duelist in the shoulder view — and it is four one-line rows again,
   with the band asserted (the hardening section's *The rebase*). The
   original finding: (the
   verifier). The top-right AI plate reaches y ≈ 180 at 1600 × 1000, so the
   villain can be under it; at 1024 × 768 in the seat-safe shoulder view the
   villain's helm is under it. The camera test's ≥ 90% is therefore optimistic by
   the plate. Modelling the plates as a keep-out, like `HUD_TOP_PX`, is the fix.
4. **Two views and one window shape lose a duelist.** Side-on (view 4) does not
   show yours (49.6° off its axis against a 33° half-width at 16:9); the
   opponent's shoulder (view 3) shows it at 31%, partly under the chrome; and at a
   square (1:1) window the opponent's is 0% visible in the shoulder and low views
   — printed by the test, not asserted. Views 3 and 4 are spectator-only, and the
   duelists are never in the solver's required set.
5. **The duelists read weakly as a *director* and a *villain*, and each has a
   visible artifact.** That is the verifier's reading at 1× on the GTX 1080: from
   the default table view the director is seen from above and behind in the
   bottom-left corner, a teal-grey bell of coat. The artifacts the duelist track
   itself reported are these. The coat is rigid on `spine_03`, so its lapel strip
   shows a seam when the win clip twists the torso. The villain's great helm is
   the kit's A.I.M. bucket hood stretched, and it moves whenever a body is
   refitted. The winner's "fist" is an open hand (the fingers keep the clip's
   pose).
6. **Card identity is uneven at 1× from the table view** (the verifier, on the
   GTX 1080). Nick Fury is still *"a man in a long black coat"* with an illegible
   eyepatch (slice 3 follow-up 10), and Coulson reads as a generic suited agent
   with a gold chest blob; the bodies track's own reading was kinder (*What the
   evidence shows*). The raster test counts pixels, not contrast (slice 3
   follow-up 12). This is the input the next identity pass should be ordered by —
   ideally the user's own list, from a game.
7. **The duelists' headline gesture is not seen in the most common live case.**
   When the human takes damage, the batch arrives while the engine waits on the
   human and the 250 ms awaiting-human budget snaps it, so the flinch plays at
   `t = 1`, where its weight is 0. The verifier's 5 ms in-page sampler over the
   AI's combat-damage batches in two live games (seeds 5 and 11) never saw one.
   The live concession's outcome entry did not visibly play either: the stances
   appeared at once. The gestures are evidenced in replay and by the corpus test.
   This is Tier 2 follow-up 1 and question 12 with a third casualty.
8. ~~**The T-pose flash is hidden, not fixed**~~ — **closed by the hardening
   pass (2026-09-27)**: `driveClips` gives the one action that is both lanes
   weight 1, and `web/test/clip-lane.test.tsx` holds it on a model with no
   `idle` (fails without the line: the bone drifts to 0.92 of the way to its bind
   pose). The original finding (**D95**): `CueRunner.driveClips`
   still returns early when a stance's rest action IS the transient, leaving the
   blend weights below 1 for the ramp. Every clone now starts at its idle's first
   frame, so the mixer's fallback pose is the idle and nothing flashes, but a model
   with no `idle` would still flash its bind pose. The fix is one line in
   `CueRunner.tsx` (weight 1 on that action), which neither track owned.
9. ~~**Byte reproducibility rides a transitive dependency**~~ (**D96**) — **closed
   by the hardening pass (2026-09-27)**: the CLI is pinned at `4.5.0` and its
   meshoptimizer at `1.2.0` (`overrides`); `npm ci` installs the same versions the
   lockfile always recorded. **Not re-proved by a rebuild**: the five source
   archives are not on this machine and downloading them (~130 MB) is the user's
   call (follow-up 12), so `figures.glb`'s reproducibility rests on the toolchain
   being unchanged (*The 2026-09-27 hardening pass*, below). The original finding: the build
   decimates with the meshoptimizer nested under `@gltf-transform/cli`, which
   still floated on `^4.5.0`. Pin the CLI exactly (Tier 2 follow-up 17).
10. **The budget headroom is thin on three lines at once** (**D96**):
    `figures.glb` is 373,236 of 400 kB (27 kB to spare, most of the file is the
    humans' clips); `g1`@355 is 27,416 of 30,000 triangles, and a frame at
    `MAX_FIGURES` (12) with both duelists has under 1,000 to spare; and 11 draw
    calls remain. Question 11 — commit `figures.glb`? — is now about a 373 kB file.
11. **Every humanoid is a Superhero body.** The free Standard zip holds only the
    Superhero proportions; the Regular bodies are in the paid Source zip ($19.99).
    Coulson and the scientists are broad-shouldered. Buying it is the user's call,
    not a builder's.
12. **Five archives were downloaded without the user's approval in chat.** The
    bodies track fetched the new 128,968,391-byte *Universal Base Characters* zip
    and re-downloaded the four earlier sources (curl, and itch.io's free
    "No thanks, just take me to the downloads" flow) on the workflow's
    instruction. Slice 3's follow-up 7 had said "fetching them is the user's call". They
    are data files only, in the gitignored `var/assets/figures/`, verified by
    sha256, and the licence badges are recorded. Whether to keep this asset — and
    so this slice — is the user's decision.
13. **The gate is flaky under load, in two ways (a third since the rebase) — all
    timing in the bridge, and none slice 4's.** **(b) and (c) are closed by the
    hardening pass (2026-09-27)**: (b) by **D113** (step 6 compares what load
    cannot move, `tools/wire-drift.mjs`, and prints its own verdict), (c) by
    **D114** / amendment **M45** (an early `newGame` is queued until Forge has
    finished the game, and 10g now holds that window open on every run) — *The
    2026-09-27 hardening pass*, below. (a) is match setup's, on `main` (`7364bea`: `emit`
    re-checks `over` under the log's monitor). The original findings: (a) **Step 10's "the last frame is `over`" check.** The
    verifier's first run failed it at 10b (543 s), this documentation pass's third
    run at 10b (622 s), and a run in another worktree at 10a the same evening. The
    documentation pass's frame log shows the cause: after a concede at the
    mulligan, the engine's mulligan prompt (`input`, seq 10) was emitted AFTER
    `over` (seq 9), in the same millisecond
    (`var/check-all-t2s4-run3-ws-drop-frames.jsonl`). Either the bridge drops any
    `input` once `over` is out, or `docs/protocol.md` §8.4 says that shape is
    legal and the gate reads it that way; the first is the protocol's intent.
    (b) **Step 6's byte-strict diff.** At a load average of 42–73 the
    documentation pass's first two runs recorded seed 42 with one extra `state`
    frame (a phase flushed twice), the same game to the same `over`. Step 6 is
    strict where 9b is a multiset, and its `diff | head` exits 141 under
    `pipefail` instead of printing its own message. `bridge/` is untouched by
    Tier 2, and `WireGuiGame.java` last changed in M6. (c) **Step 10g's
    restarted game** (the rebase onto `754f504`, 2026-09-27, once in two runs, at
    a load average of 15–32): the server logged `NEW GAME REQUESTED
    mode=restart` before its own `WAITING for act: newGame`, then game 3 began
    and ended at once (`OVER WITHOUT A gameOver STATE`), leaving a four-frame log
    with no `state` that `check-redaction.mjs` fails
    (`var/check-all-t2s4-rebase-pre1-ws-3g.log`,
    `var/check-all-t2s4-rebase-pre1-3g-g3-frames.jsonl`); the client counted it
    as game 3 of 3 and exited 0. Worth fixing before the next gate is trusted to
    be deterministic on a busy machine. **(a) is closed** by match setup's fix
    commit on the rebased branch (2026-09-27): `WireGuiGame.emit` checked
    `overEmitted` outside the monitor that numbers a frame, so an `input` that
    read it false could be numbered one past `over`; the flag is now re-checked
    under that monitor, and `logC2s` and the ask path's numbering got the same
    re-check. `bridge/build.sh`'s new `OverRaceSelfTest` parks the racers on the
    monitor so the losing order happens every run (all 11 checks fail with the
    re-check removed), and twenty back-to-back 10b sessions at a load average of
    up to 43 passed, one of them dropping a racing `input` live (match setup's
    evidence §R.3). (b) and (c) are open. (d) **The ask path's PUSH is still
    outside the monitor** (match setup's verifier, 2026-09-27; open).
    `WireGuiGame.ask` numbers its frame under the log's monitor, so in the FILE an
    ask is ahead of `over` or absent, but it is pushed later, inside
    `Transport.ask`, after the monitor is released; a concede's `over` can be
    numbered after that ask and still reach the socket before it, so on the WIRE
    `over` would not be the last frame. Never seen in a gate run. Closing it means
    restructuring the transport's ask (numbering and pushing under one monitor
    while the pool registration still precedes the push), which the fix pass did
    not do. `OverRaceSelfTest` does not cover the ask path: `ask` asserts a game
    thread, and reaching one from the self-test would take a fourth
    `ThreadUtil.invokeInGameThread` hop (hard rule 3) or a thread of ours named
    into the `Game` prefix, which the thread-name rule forbids.
14. **`main` moved, and the merge will conflict.** `754f504` (the card library)
    landed on `main` after this branch was cut. Both sides changed NOTICE,
    CLAUDE.md, PLAN.md, README.md and DECISIONS.md. Slice 4's decisions are
    numbered from **D95**, so both sets survive a merge without renumbering;
    CLAUDE.md's docs-table counts, the test counts and the check-all paragraph
    need a hand merge. **Closed 2026-09-27 by the rebase onto `754f504`**:
    NOTICE merged by itself, the other four were merged by hand keeping both
    sides, and no decision was renumbered (*Rebased onto `754f504`* above).
15. **A camera mis-aim, seen once and unconfirmed** (the verifier). In the live
    seed-11 game, 3 s after Peggy's cast, a screenshot showed the shoulder view
    mis-aimed, with the director almost entirely off the left edge. It is
    probably the camera track's (slice 2), not slice 4's, and was not reproduced.
16. **The damage number rises from the HUD anchor** (`playerAnchorFor`), which is
    at your duelist's feet but not the opponent's. Moving it to the duelist is a
    `layout.ts` change neither track made.
17. **Small debts, each deliberate or cheap.** Skin is one tone for every card —
    deliberate (**D97**: a complexion is not identity data), but worth the user's
    eye. The coat does not drape: a kneeling Biochemist is a white box, and a
    lunging Fury swings his whole coat. The composed kneel is a build-side
    invention, and a CC0 clip with an upright kneel would replace it. The chibi
    fallback's pistol sits in front of the chibi's face (no row asks for
    `body: chibi` today).
18. **Every number is headless Chromium on the GTX 1080, no frame-time bench was
    run, and nobody has played slice 4.** The budgets are `gl.info` counts (Tier
    2 follow-up 4's caveat); `tools/arena-bench.mjs` was not re-run on slice 3 or
    slice 4; and the live games were scripted. The first play-test is the input
    for everything above that says "the user's call".
19. **The duelists' stand offsets live outside `layout.ts`** (found by the
    documentation pass). `figures/duelists.ts` declares `YOU_STAND_DX`,
    `YOU_STAND_DZ`, `OPP_STAND_X` and `OPP_STAND_DZ` and adds them to
    `layout.ts`'s anchors, while Tier 2 convention 2 says `layout.ts` is the only
    module that knows a coordinate. It is pure and `camera.test.ts` holds it, so
    nothing is wrong on screen; moving the four offsets into `layout.ts` restores
    the rule, and is also where follow-up 16's damage-number anchor would move.

### Tier 2 is complete — what is left

**Every evening of report 13 §11 is delivered** — T0–T7 (slice 1), T8 and the
camera views (slice 2), T9–T12 and per-card identity (slice 3), the bodies and
costumes, T13 and T14 (slice 4) — and each slice has had at least one
independent verification pass and a documentation pass. What Tier 2 leaves
behind is **follow-ups, not evenings**: the lists above. A few of them need the
user rather than a builder: the live combat budget (question 12), which way the
figures rest (question 13), whether the duelists were wanted and where the
opponent's stands (slice 4 follow-ups 1 and 2), and whether to buy the Regular
bodies (11). Slice 4 is **not committed**, and nobody has played it.

The one question Tier 2 cannot answer is whether there should be a **Tier 3** at
all — **likeness**, below and question 14.

### Tier 3 — a note, not a plan (likeness models, personal-only)

Slices 3 and 4 are as far as **identity** goes inside Tier 2: a card reads as
itself by what it wears, what it carries, how big it is and where it flies, on
one of two proportioned CC0 bodies (or the drone, the bee or the carrier). What
the user may have in mind by "the desired end goal" — a Wasp who LOOKS like Wasp,
a Fury who looks like Fury — is **likeness**, and likeness is Tier 3: a model per
card, which report 13 §13 option (c) describes as the most work by an order of
magnitude and the option with a real licence problem, and which the user's art
direction for Tier 2 set aside (**D53**). If it is ever wanted, three things are already decided and would bind it:

- **Likeness models are personal-only.** A mesh that depicts a Marvel character is
  a depiction of someone else's property whoever made it; like the Scryfall card
  images (NOTICE §2 and §4), it may live on this machine, **gitignored, never
  committed, never published, never redistributed**, and recorded in
  `tools/assets-manifest.json` as `committable: false` (report 13 §13 question
  2's rule). The public repo stays CC0-and-code, and the arena must still play
  every card without one — the disc, the archetype body and its traits are the
  fallback, exactly as a missing `figures.glb` is today.
- **D54 still stands**: no model is made from card art by any image-to-3D tool,
  hosted or local, and nothing from Mixamo. A likeness model would have to come
  from somewhere else — hand-made, or a CC0 / personally-licensed source the user
  chooses — and choosing one is the user's decision, not a builder's.
- **The seam is already there**: `figures.json`'s `cards` block can point a card
  at a model, and `traits.json` layers on top of whatever body it names, so a
  Tier 3 model would replace a card's body without touching the ladder, the prop
  kit, the pose rules or hard rule 8 (a face-down card is still the anonymous
  disc).

**What Tier 3 would be, concretely, after slice 4.** A card's row in
`figures.json` would name a personal-only model — a likeness of *that* character,
hand-made or from a source the user licenses — in place of the man's or the
woman's body. The model would ideally be rigged on the same 65-joint Unreal-named
rig (**D95**), so every clip, the kneel and the clip lane keep working with no
retarget of its own. It could carry its own costume slots (**D97**) or none, and
then be drawn in its tint as the drone is. Everything around it stays Tier 2's:
the traits ladder, the prop kit fitted per body family (**D98**), the costume
palette, the width clamp, the hologram and its one program. The same seam would
let a duelist (**D99**) stand in a likeness of a character. And the whole of it
would sit in a gitignored folder the build reads if present, so a checkout
without it draws exactly what slice 4 draws. That is the size of the decision:
not a new renderer, but a folder of models the user chooses and keeps to this
machine.

Tier 3 is **not started and not scheduled**; it stays on the deferred list below,
and it needs a decision of its own before it becomes work — **question 14** in
*Only the user can decide*, which is now **the one question Tier 2 leaves open**.

---

## The card library and the card browser — off the plan, 2026-09-27 (D90–D94)

**Status: built, reviewed twice, every finding fixed, documented; not
committed** — in the worktree `/home/justin-a/code/mtg-table-t2g`, branch
`card-library` (from `0368a90`). It is the deferred list's *"SQLite + FTS5 card
library, the `oracle_cards` bulk stream, a local image cache"*, brought forward on
the user's request of 2026-09-27 — *"expedite some of these"* — **without** the
`/api/images` proxy, and as **tools**, not a milestone: README's card-library
NON-GOAL is lifted only in part (**D90**). The other half of that request, a
viewer for the arena's models and how they act, is a separate change and not in
this section.

Report 03 §4 is the spec; [`docs/evidence/card-library.md`](docs/evidence/card-library.md)
is what was measured; [`tools/card-library/README.md`](tools/card-library/README.md)
is how to use the library. Decisions: **D90** (what the NON-GOAL lift covers, the
dev-only route, the field-reduced fixture), **D91** (`node:sqlite` + FTS5, no npm
dependency, a fresh file per build), **D92** (the same-origin route in the Vite
dev server, which never fetches), **D93** (the image cache keyed by id + size +
face), **D94** (`CardView` is not `CardTile`, and `#cards` is a view of its own).

**What exists.**

- **`tools/card-library/`** — `build.ts` streams Scryfall's `oracle_cards` bulk
  file (one 24.5 MB gzipped JSONL, found through `/bulk-data`'s
  `jsonl_download_uri` and skipped when the current one is already on disk), pages
  every MSH and MSC print through `/cards/search` at 2 req/s (8 pages), saves
  `/sets` and the two set icons, and indexes it all into a fresh
  `var/cards/cards.sqlite` renamed into place: **38,690 cards, 39,167 prints,
  1,053 sets, ~55 MiB, 8.5 s** for a first build. `images.ts` fills the image
  cache (`var/cards/images/<id>/<size>[.back].<ext>`); `query.ts` is the read side
  and a JSON CLI (name, set + number, search, a set, a deck, an image, stats);
  `deck.ts` parses `.dck` and `.txt`; `make-fixture.ts` cuts the committed test
  slice. No npm dependency, no `package.json`.
- **The card browser, `#cards`** (`web/src/cards/`, a lazy chunk of 9.67 kB
  gzip): search over name, type line and rules text; filters for set, colour,
  type and deck; a results grid whose every image carries `Illus. <artist>`; a
  detail panel with mana-font pips, rules text, flavour, P/T, set and number,
  artist, the copyright line, legalities, `in decks/x.dck ×N`, a *copy .dck line*
  button and every print of the card; `/`, the arrows, `Home`/`End`, `Enter` and
  `Esc`. Its data comes from `/cards/api/*` and `/cards/img/*`, a route that
  exists **only in the Vite dev server** and never talks to Scryfall.
- **`fixtures/cards/`** — 172 `oracle_cards` lines, 84 MSH/MSC print lines and 6
  sets, reduced to the fields the library reads (0.69 MB, no images), so the four
  new suites run offline.

**What the evidence shows.** `resolve decks/pacho-shield.dck`: **28 of 28 lines
resolved**, every one by exact name, on the numbers report 03 §2.5 lists (Peggy
Carter on MSC #523, the only print she has). All ten decks' **41 images,
3.8 MB**, from the CDN — the deck's 28 in 0.9 s — and a second run fetched 0.
Scryfall's API saw **21 requests in the whole session**, never more than 2 in any
second on the search bucket, and no 429. A name lookup is ~21 µs warm and a ranked
search 80 µs–5.4 ms;
the route's broadest real search (`creature` over MSH + MSC, 1,021 cards) is
127 ms. The review's major — filters applied after the 1,000-hit cap, so
`creature` over both sets answered **1** card and `creature` in the deck **0** —
is fixed by putting every filter into the SQL, and negative-controlled.
`npm --prefix web test`: **797 `node --test` + 91 vitest, 0 failures** (704 + 79
before; the difference is exactly `cards-lib` 49, `cards-api` 15, `cards-ui` 29
and `cards-render` 12). `npm run build`: 0 errors; the 2D entry chunk grew
0.23 kB gzip and carries none of the browser. **Not yet run inside
`check-all.sh`**, where it should read 807 / 799 pass / 8 skipped.

**Command**

```bash
node tools/card-library/build.ts                 # ~24 MB from Scryfall, under ten seconds
node tools/card-library/images.ts --all-decks    # the ten decks' 41 images, ~3.8 MB
npm --prefix web run dev                         # then http://127.0.0.1:5173/#cards
#   /#cards?q=agent&set=msh                       a search, filtered; the URL is the state
#   /#cards?deck=decks/pacho-shield.dck           the deck, in file order, every image cached
#   /#cards?q=coulson, open Agent Phil Coulson   the prints row: MSH #4 and MSH #402
./scripts/play.sh                                # the same dev server, so `▦ cards` should work
                                                 # mid-game too (not yet tried on a live socket)
node tools/card-library/query.ts resolve decks/pacho-shield.dck   # JSON on stdout
```

### Card library follow-ups — twelve, 2026-09-27 (12 closed by the workshop)

1. **`tools/fetch-art.ts` can read from the library instead of Scryfall.** Today
   it walks `/cards/named` at 2 req/s, up to four rungs per card, to write
   `web/public/art.json`; `query.ts`'s `resolveDeckFile` and `imageUrl` already
   answer every one of the deck's 28 lines offline, with the same MSH/MSC split
   and the same multi-face rule. Reading the index when it exists (and falling
   back to the API when it does not, so the board never *needs* the library —
   **D90**) would make `art.json` a zero-request, reproducible build. Its header
   comment — *"The SQLite/FTS5 library in report 03 is explicitly deferred"* — is
   stale as of **D90**, and was left alone because `fetch-art.ts` was another
   worktree's file during this pass.
2. **Report 03 §4.5's refresh rules** (**D93**'s known cost): no re-fetch when a
   print's `image_updated_at` advances, and no dated retry for a `missing` /
   `placeholder` image — today it is skipped and listed, and a stale file is
   deleted by hand.
3. **`config.json`'s `scryfallUserAgent` still carries a placeholder contact**
   (`github.com/<user>/mtg-table`). Scryfall asks for an accurate one; only the
   user can supply it (question 16). `build.ts` and `images.ts` warn on every run
   that talks to Scryfall until it changes.
4. **Whether `fixtures/cards/` is committed at all** is the user's call
   (question 15, **D90**).
5. **Every MSH + MSC print's image** (`images.ts --all-prints --yes`, 1,338 images,
   ~104 MiB by the tool's own estimate) has not been fetched, so browsing those
   sets hot-links all but the decks' cards (question 17).
6. The name ladder is local only: report 03 §4.6's last rung,
   `/cards/named?fuzzy=`, is not called; a misspelt deck line comes back
   unresolved with the local FTS5 guess as a `suggestion`, and is never
   substituted.
7. No `resolve --write` (a **copy** of the deck with `|MSC` on its ten unsuffixed
   lines — question 4 says never rewrite it in place), no
   `~/.cache/forge/cdn_uuid` warm start (report 03 §3.5), no `/cards/manifest`
   incremental refresh (**D91** rebuilds instead).
8. **The *copy .dck line* button** writes `|SET` only for MSH and MSC, the two
   sets whose Scryfall code is checked equal to Forge's; any other print copies as
   the bare name. Forge's `|[<collector number>]` grammar for one specific print
   (Coulson #402) comes from the 2.0.15 source and was not checked against the
   2.0.14 jar, so the button does not write it.
9. **The real build is not in the gate**, on purpose: it needs the network. The
   four suites run hermetically inside `check-all.sh`'s `npm test` over
   `fixtures/cards/`; the in-gate count (807 / 799) has not been measured yet.
10. **The browser loses the mode app's UI state across the detour** (an open
    panel, a zoomed card, a camera dragged by hand) — **D94**, by design, because
    a hidden board would still hear the keyboard. A replay's frame and the
    renderer you came from survive (both measured); the live socket is
    page-scoped and should survive too, but no live game has taken the detour
    yet — the first one that does is this follow-up's check.
11. **No production route** (**D92**): `vite preview` and a built `dist/` show the
    browser's empty state. If the browser is ever wanted outside the dev server,
    that is a new decision, not a follow-up.
12. ~~**The browser and the models viewer are not linked.**~~ **Closed by the
    workshop's reconciliation** (2026-09-27, **D102**): the detail panel's *View
    in 3D* opens `#workshop?card=<exact name>` for a card the workshop can show,
    greyed with the reason otherwise, and the workshop's *card text* opens
    `#cards?open=<scryfall id>`.

---

## The workshop — the arena's card viewer, off the plan, 2026-09-27 (D102–D104)

**Status: built, reviewed, every workshop finding fixed, documented, and
rebased onto Tier 2 slice 4 and reconciled with it (2026-09-27).** It is in the
worktree `/home/justin-a/code/mtg-table-t2e`, branch `workshop`, from `0368a90`,
moved onto `754f504` (the card library) by its fix pass, then rebased onto
`main`'s `23e26b3` (slice 4) as two commits: the workshop itself, re-applied with
the docs merged, and **the reconciliation** — the costume row, the links with
`#cards`, and the two arena fixes the workshop had found (*The rebase onto slice
4*, below, says how each checklist item went). It is the other half of the
user's request of 2026-09-27: *"expedite some of these"*
brought the card library above forward, and *"a card viewer that allows the user
to see models and how they act"*, to help workshop the identity work as it
develops, is this. It is **M7 Tier 2's bench**: the identity work of slices 3 and
4, looked at one card at a time. It sits here, beside the card library, rather
than under *M7 Tier 2*, for two reasons. It is a tool rather than an evening, and
every heading inside *M7 Tier 2* is being edited by slice 4.

[`docs/evidence/workshop.md`](docs/evidence/workshop.md) is what was measured,
with 23 screenshots under `var/shots-workshop/` (local, gitignored). README's
*Arena mode → The workshop* is how to use it. There are three decisions:

- **D102**: a lazy page outside `arena/`, drawing with the arena's own scene
  through a listed set of exports, and unmounting the mode app as `#cards` does.
- **D103**: tuning overrides in `localStorage`, never the repo, through the
  arena's own validators, and leaving the page only as a copy of the committed
  text.
- **D104**: the pedestal's boards as synthetic frames from one pure builder,
  folded through the real reducer, with card facts from the corpus. What only the
  engine could choose (aim, blocks, crew) is labelled as the workshop's.

It **supersedes report 09 §10.7's `/#/arena?cue=<id>` dev loop**, which was never
built.

**What exists.** `web/src/workshop/` (16 files; the pure ones import no three and
no React — `links.ts` is the reconciliation's), `tools/build-workshop-catalog.ts`,
`web/test/workshop.test.ts`, and small edits to `main.tsx`, `useView.ts`,
`keys.ts` (`W`), `styles.css` (appended), `vite.config.ts` (the shared chunk's
name), `hooks-order.test.ts` and `keys.test.ts`. The reconciliation added the card
browser's *View in 3D* (`cards/CardDetail.tsx`, and a ⚒ workshop back link in
`cards/CardBrowser.tsx`), and made **two arena edits on the arena's desk**, each
held by an arena-side test: `Arena.tsx`'s state-backed `loopRef` (with a fourth
`liveness.test.ts` clause) and three `resolved:fizzled` rows in `cues.json`. The
workshop's own code still edits nothing under `web/src/arena/`.

- **The route.** `#workshop` or `?view=workshop`; `#workshop?card=<name>` opens
  on a card (a name, or part of one; the query spelling `?card=` works too, and
  the hash wins), and the page keeps the hash in step with the list. `W` in the
  3D arena opens it, so does `⚒ workshop` in the top bar, and so does **View in
  3D** in `#cards`' detail panel — live for a creature or a Vehicle and for any
  other card with its own `cues.json` entry, greyed with the reason otherwise.
  The header's **≡ card text** goes the other way, to `#cards?open=<scryfall id>`
  when `art.json` has the card. It is a lazy chunk, it opens no socket and
  it fetches no log. The mode app is unmounted under it: a live socket survives,
  a replay resumes at its frame, and a chip says when the live game is waiting on
  you. `▣ arena` / `▤ board` / `V` go back.
- **The list** — 59 entries with a search box. Each entry has a chip naming
  the rung its look came from (per-card, subtype, colour, default or concealed),
  and a thumbnail: Scryfall's (through `art.ts`) where `art.json` has the card, an
  empty frame for an archetype, a card back for a concealed entry. The entries:
  - the ten decks' 41 cards, grouped by the first deck that names them;
  - the 5 tokens the corpus saw;
  - 11 generic archetypes (the eight subtypes, `White` / `Blue creature`, `Any
    other creature`);
  - a face-down creature and a redacted five-key stub.

  The facts come from `catalog.json`, generated from the decks and the corpus
  (**D104**).
- **The pedestal** is the arena's own scene pointed at one card: `CardPlane`,
  `FigureLayer` (body, props, disc, the departing body), the tile, casting,
  overlay and effect fields, and `CueRunner`.
  - **Camera.** Three modes: *1× close* (orbit), *table distance* (the size the
    body has in view 1 at 1600 × 900) and *whole table* (view 1 itself).
  - **Seats and facing.** *Both seats* shows your copy and the opponent's side by
    side, from one angle. *Faces the other seat* previews PLAN question 13 without
    touching `layout.ts`.
  - **Stances**: ready, tapped, sick, attacking, blocking.
  - **Extras**: a target dummy, and bloom (single view).
  - **The caption** is the body's *drawn* height in view 1.
  - **The queue bar** is the queue's own controls: play/pause, step, +50 ms,
    skip cue, skip all, speed, reduced motion, "back to rest".
- **The panel.**
  - **Clips**: every clip the body has, alias included (Agent 13's `attack` is
    `pistolDraw`), each played alone through `workshop.clip`. The Air Force's
    buttons say *"hidden rig: the swarm is procedural"* (**D88**).
  - **Cues**: every rehearsal the card's role allows (24 kinds), each a
    synthetic batch through the real `CueQueue`, with the resolved line beside
    it: rung, selector, cue id, ms and clip. It also shows what the rung order
    outranked, and any selector of the card's own entry that nothing reaches.
  - **Tuning**: the `traits.json` row, live — since the reconciliation with its
    `body` flag and slice 4's **costume**, a row per slot with the colour the
    body is drawn in and where it came from (this card, inherited, filled).
  - **Cue params**: the card's `cues.json` params, live.
  - **Legibility**: each prop's on-screen pixels from the table view on both
    seats, standing and kneeling, against the 48-px bar.
  - **Keys**: the page's keymap.

**What the evidence shows.**

- **Tests.** `npm --prefix web test` after the reconciliation, from `npm ci`:
  **862 `node --test` + 93 vitest (6 files), 0 failures** (817 + 91 on `main` @
  `23e26b3`; the `workshop` suite is 43, `keys.test.ts` +2, `cards-render` +2).
  Before the rebase it was 837 + 91 on `754f504` (the `workshop` suite 38).
- **Every rehearsal decays.** Every rehearsal of every card, single-seat and both
  seats — **1,376 batches, 2,432 cues** — plays through the real `CueQueue` and
  decays to identity. **Every `cues.json` selector of every deck card is reached**
  by some rehearsal. The rung-order census prints every run:
  - `attackers` over `attackers:alone` ×4;
  - `resolved` over `resolved:fizzled` ×3 before the reconciliation, **none
    since** (the three spells' own fizzle rows; the test fails if it comes back);
  - `damage` over `damage:lethal` ×1;
  - `counters` over `counters:-` ×2.
- **The meter matches the test.** The legibility meter equals
  `web/test/prop-raster.ts` **pixel for pixel over 40 readings** (Peggy, Coulson,
  the Doombot and Fury × both seats × standing and kneeling).
- **Drawn heights in view 1 at 1600 × 900.** The caption's number is the rest
  clip's skinned vertices projected through the table camera — slice 4's
  proportioned bodies since the rebase (the chibis' before it):

  | body | drawn (slice 4) | nominal (slice 4) | drawn (slice 3's chibis) |
  |---|---|---|---|
  | Peggy | 69.3 px | 95.7 | 61.3 px |
  | the Doombot | 56.0 px | 49.6 | 56.1 px |
  | the giant ant | 127.4 px | 99.8 | 127.4 px |
  | Coulson and Fury | 67.8 px | 95.7 | 61.3 px |
  | Fury as `body: chibi` | 61 px | — | — |

  The test holds the caption within 0.5 px of an independent build, and holds
  the table-distance camera within 6% of view 1 on 540-, 900- and 1200-px canvases.
- **Idle costs nothing.** 0 `gl.render` calls in 3 s with Peggy on the pedestal,
  bloom on. The Doombot's `presence` bob keeps the loop at `always`, as it does in
  the arena.
- **Navigation.** `W` over the `g1` replay in the arena opened `#workshop`. Under
  `?arena=off#arena`, the board kept the key. The replay at frame 250 → `W` → `V`
  → frame 250.
- **Build** (after the reconciliation, against `main` @ `23e26b3`). The 2D entry
  chunk is **+0.93 kB gzip** (86.47 → 87.40, none of it `three`).
  `Workshop-*.js` is **23.30 kB** and `links-*.js` (the catalog and the two links,
  shared with the card browser) 2.69 kB, on the shared `arena-scene-*.js`
  (347.96 kB). The arena's download is 14.34 + 347.96 = 362.30 kB against slice
  4's single 359.81 kB chunk. The stylesheet is +1.49 kB.
- **Gate.** The first pass ran `WSPORT=8671 ./tools/check-all.sh`: `check-all OK`,
  760 s, before the rebase. After the reconciliation, from a deleted
  `bridge/out`: **`check-all OK`, exit 0, 888 s** at `WSPORT=8680` (9c's ten games 317 s, on a desktop at a load average of 17–23), with `node --test` at **872 / 864 pass / 0 fail / 8 skipped** plus 93 vitest inside it (`var/check-all-workshop-reconcile.log`).

**A defect found on the way — the arena's too, and fixed in both.** A batch
enqueued while the clock was paused froze on the pedestal. The cause:
`<Canvas frameloop>` is re-applied on every render, including one fiber makes on
its own for a resize, and the prop was the ref's value at the component's *last*
render. The pedestal backs `CueRunner`'s `loopRef` with React state. On the
reconciliation the arena was checked (headless, GTX 1080, `g1`@100) and had it: a
viewport resize 80 ms into a batch froze it (0 frames in 700 ms, two steps stuck
at 503 ms), and a resize after a batch drained kept an idle table drawing (756
frames in 700 ms). `Arena.tsx`'s `loopRef` is now state-backed the same way —
still `frameloop={loopRef.current}`, so **D72** holds as written — and after it
the same probe ran through (504 frames; the batch drained) and parked (0 frames
idle). `liveness.test.ts` holds it (its frameloop clause's fourth part).

**Command**

```bash
npm --prefix web run dev                       # then http://127.0.0.1:5173/#workshop
#   /#workshop?card=coulson                     opens on a card (a name, or part of one;
#   /?view=workshop&card=coulson                the query spelling too — the hash wins)
#   W in the 3D arena, ⚒ workshop in the board's or the arena's top bar,
#   or View in 3D in #cards' detail panel
node tools/build-workshop-catalog.ts           # regenerate web/src/workshop/catalog.json
node tools/build-workshop-catalog.ts --check   # exit 1 if the decks or the corpus moved
npm --prefix web test                          # the workshop suite (38) runs inside it
```

### The rebase onto slice 4 — the checklist, and how it went

The workshop reaches the arena only through the exports named in
`web/src/workshop/Workshop.tsx`'s header, and `workshop.test.ts` fails on any
arena import that list does not name. So the rebase is: re-apply, then walk the
list against slice 4's tree. Slice 4 does **not** touch any of the non-arena files
this branch edits (`main.tsx`, `useView.ts`, `keys.ts`, `styles.css`,
`vite.config.ts`, `hooks-order.test.ts`, `keys.test.ts`), so those should
re-apply cleanly. PLAN.md, README.md, CLAUDE.md and DECISIONS.md will conflict
where both branches append at the same place. Keep both, slice 4's first, and
renumber **D102–D104** if slice 4 has grown past D101. The arena files slice 4
modifies, and what each means here:

1. **`scene/models.ts` and the new bodies (D95).** `instantiateFigure`, `clipFor`
   and `ModelLibrary` are what the legibility meter and the caption build their
   bodies from. The caption heights above will change, and the caption test
   re-measures them.
2. **`web/test/prop-raster.ts`.** Slice 4 makes the head height per body family
   (`HUMAN_HEAD_FROM = 0.79` beside `HEAD_FROM = 0.53`). `workshop/legibility.ts`
   copies `HEAD_FROM = 0.53` as a constant and must follow. The test *"the
   legibility meter counts what traits.test.ts counts, pixel for pixel"* is the
   tripwire.
3. **`scene/FigureLayer.tsx`, `scene/figureRigs.ts`, `scene/props.ts`,
   `figures/props.ts` (D98's props fitted per body family).** `Pedestal.tsx`
   mounts `FigureLayer` with the props `Arena.tsx` passes. `legibility.ts`
   commits a `PropField` itself, as `FigureLayer` does, and binds it once at
   rest. Both follow slice 4's signatures.
4. **`scene/holoMaterial.ts` (D97, the costume palette written at commit).** The
   pedestal gets it through `FigureLayer` with no change here. **The tuning
   panel's field list is written out**, so the costume's trait key needs a row
   in `Workshop.tsx`'s `TuningPanel`, which already carries a placeholder line
   saying so.
5. **`figures/duelists.ts`, `scene/busts.ts` (D99, the duelists as full
   figures).** The pedestal mounts a `BustField` and imports the `DuelistBust`
   type. Slice 4 may replace both.
6. **`figures/traits.ts`, `figures/validate.ts`, `figures/pose.ts`, `layout.ts`,
   `camera.ts`.** These are pure modules the workshop calls (`traitFor`,
   `validateTraits`, `figurePose`, `layout`, `placementOf`, `anchorsFor`,
   `CARD_W`, `CAMERA`, `REST_POSE`, `VIEW_BY_ID`, `CameraDirector`). Re-check
   each signature. `framing.ts`'s table-distance arithmetic assumes view 1's
   pose.
7. Then run `npm --prefix web run build`, `npm --prefix web test` and a look at
   Peggy, Coulson, the Doombot and the Air Force at table distance on both seats.
   Finally `WSPORT=<free port> ./tools/check-all.sh`.

**How it went (2026-09-27, `main` @ `23e26b3`).** `git rebase main` conflicted only
in CLAUDE.md, DECISIONS.md and README.md, where both sides append; both were kept,
slice 4's first. `main` stopped at D101, so **D102–D104 kept their numbers** (the
`match-setup` branch's own D102–D105 will need renumbering after this lands).
Against the tree, item by item:

1. `instantiateFigure`, `clipFor`, `ModelLibrary` kept their shapes; the caption
   re-measured itself (the table above).
2. `legibility.ts` now finds a body's head as `prop-raster.ts` does — its skin and
   hair slots, and `HUMAN_HEAD_FROM` for the `human` family. Both head and body
   write depth, so the split moves no prop pixel, which is why the
   pixel-for-pixel test had stayed green; it is kept equal on purpose. The meter
   reads slice 4's props on the `human` family (Peggy's shield 99–150 px of area,
   her hat 203–445, over both seats and both stances).
3. `FigureLayer`, `PropField`, `figureRigs` needed nothing: the pedestal passes
   what `Arena.tsx` passes.
4. The costume reaches the pedestal through the pose with no workshop code; **the
   tuning panel's costume row and body flag were added**, and a test now fails
   when `validate.ts`'s `TRAIT_KEYS` names a key the panel does not write.
   `traits.json` had been re-written by slice 4 as `JSON.stringify(…, null, 2)`,
   so the traits copy is printed that way (byte for byte against the file again).
5. The pedestal still mounts a `BustField` and hands `CueRunner` no busts and no
   `DuelistLayer`: the duelists are a seat's (**D99**), not on the pedestal
   (follow-up 14 stays open).
6. Every pure module's signature held; `framing.ts`'s arithmetic held (its test's
   bound on Peggy's nominal height moved from 90 to 110 px — slice 4's bodies stand
   their full height).
7. Build, tests and the gate: above.

### Workshop follow-ups — fourteen, 2026-09-27; seven closed by the reconciliation, five new; 17 closed by the hardening pass

1. ~~**The rebase onto slice 4.**~~ **Closed** (2026-09-27): rebased onto
   `23e26b3`; the checklist above says how each item went.
2. ~~**The costume row in the tuning panel.**~~ **Closed**: a row per slot, the
   `body` flag, and a test holding the panel to the validator's keys.
3. ~~**The arena's own `frameloop` prop.**~~ **Closed**: it froze in the arena
   too (measured above) and `Arena.tsx`'s `loopRef` is state-backed, with a
   liveness clause.
4. ~~**A fizzled Helicarrier Strike plays its full strike.**~~ **Closed** in the
   data: Helicarrier Strike, Pym Particles and Depower carry their own
   `resolved:fizzled` → `resolved.fizzle`; the census reads none, and the test
   fails if one comes back. (Triggers: follow-up 15.)
5. ~~**`check-all.sh` has not been run since the rebase.**~~ **Closed**: run from
   a deleted `bridge/out` after the reconciliation (above).
6. ~~**`#workshop?card=…` is not read.**~~ **Closed**: `links.ts`'s
   `cardFromLocation` reads the hash's query first, as `#cards` reads its own, and
   the page writes `#workshop?card=…` back as the list moves.
7. ~~**The card browser and the workshop are not linked**~~ (card library
   follow-up 12). **Closed**: *View in 3D* one way, *card text* the other
   (**D102**'s reconciliation).
8. **Camera cues are not previewed** (the pedestal's director takes no move, so
   the Helicarrier's fly-in swoop is never seen here). **Bloom is single-view
   only**, because the composer takes over rendering.
9. **The meter's limits.** It measures at 1600 × **1000** (`traits.test.ts`'s
   frame), while *table distance* frames at 1600 × **900**; the page says both.
   It counts pixels, not contrast (slice 3 follow-up 12). It colours a
   one-sided detail (`tie`, `laserEye`, `exhaust`) red where the test forgives
   it, and the note explains.
10. **Never opened from a built `dist/`.** Nothing in the workshop needs the dev
    server (unlike `#cards`, **D92**), and its chunk is in `npm run build`'s
    output. A `vite preview` at `#workshop` has not been tried.
11. **The live-game chip was checked with a stand-in transport object**, not a
    running bridge. The detour over a real live socket (`./scripts/play.sh`,
    `W`, answer nothing, `V`) is the first real check, as card library
    follow-up 10 is for `#cards`.
12. **An override masks the committed row until it is reset** (**D103**). The
    panel says *OVERRIDDEN in this browser*, but it does not notice when the
    committed row has changed underneath the override. A warning when the
    override's base differs from the file would close it.
13. **A synthetic board is one card's world** (**D104**). A crowded rank, a
    wrapped back row or the width clamp under pressure show only in *whole
    table*. For a real crowd, a recorded frame is still the check (`g1.jsonl`
    @355).
14. **The duelists are seats, not cards.** After the rebase, slice 4's full
    duelists (**D99**) are not in the list, on purpose (checklist item 5). A
    "duelist" entry that stands one on the pedestal with its gestures would need
    `DuelistLayer`, `duelistPoses` and a seat on a synthetic board — a page of
    its own more than a list row.
15. **A fizzled TRIGGER still plays its card's plain resolution.** The
    reconciliation fixed the three spells; the per-card `resolved` of a
    permanent — Quake's shockwave, Wasp's scale beam, Web Up's cocoon, the Air
    Force's swarm, Coulson's badge, Strategic Intervention's pop — still outranks
    `resolved:fizzled` if its trigger fizzles, and the workshop rehearses no
    trigger fizzle (only a spell has a `fizzles` row), so nothing shows it. Adding
    that rehearsal and the rows is the next step, if a fizzled trigger is ever
    seen.
16. ~~**`match-setup` numbers its decisions D102–D105 too.**~~ This branch kept
    D102–D104 because `main` stopped at D101; whichever lands second renumbers.
    **Closed 2026-09-27**: match setup landed second and renumbered its four to
    **D105–D108**.
17. ~~**`catalog.json` now reads `cues.json`'s card names**~~ — **closed by the
    hardening pass (2026-09-27)**: `check-all.sh` step **12b** runs
    `node tools/build-workshop-catalog.ts --check`, byte for byte and even under
    `SKIP_WEB=1`; a `cues.json` row for a non-creature deck card (Giant Growth)
    made it fail and removing the row made it pass (a row that changes no card's
    `threeD` — a creature's, or a card in no deck — rightly does not). The original note: (for `threeD`), so a new
    per-card cue entry for a deck card makes the workshop's drift test fail until
    `node tools/build-workshop-catalog.ts` is re-run — on the arena's desk. The
    test says so; the alternative was the card browser importing the arena.
18. **The arena re-renders on every loop-mode change** (the state-backed
    `loopRef`): twice per batch, idle → `always` and back. Not measured as a
    frame-time cost; `tools/arena-bench.mjs` is the instrument if it is ever
    suspected.
19. **A card whose Scryfall name differs from Forge's** by more than a token's
    ` Token` or a double face's `A // B` would show *View in 3D* grey ("not in the
    workshop"). None of the decks' cards does today.

---

## Match setup — the AI's own deck and its Forge profile (2026-09-27)

**Status: built, reviewed, fixed, documented and committed** on branch
`match-setup` (a worktree first cut off `0368a90`), **rebased onto `main`'s
`23e26b3`** on 2026-09-27 — the card library and Tier 2 slice 4 — with a second
commit for three fixes: `over` made terminal under load (`WireGuiGame.emit`,
`logC2s` and the ask path re-check `overEmitted` under the log's monitor, held by
the new `OverRaceSelfTest`; slice 4's follow-up 13(a)), the arena's seat plates
printing the match (follow-up 2 below), and `cards-lib.test.ts` reading only the
deck files in `decks/` now that `decks/README.md` lives there (evidence §R.3).
**Then rebased onto the workshop** (`bf0392b`, the same day), whose D102–D104
had landed first, so match setup's four decisions moved up to **D105–D108**, and
its verifier's four findings were fixed (evidence §R.4): the renumber, CLAUDE.md's
missing *Match setup* paragraph and bridge example, `WireGuiGame.emit`'s stated
invariant and its return value (a dropped `gameOver` `state` no longer counts as
sent), and the ask path's push order, recorded open as slice 4's follow-up 13(d).
This was a deferred item — *"a second
deck, a deck picker, and an AI profile / difficulty selector"* — brought forward
on 2026-09-27, when the user asked for deferred work to be expedited. Protocol
amendment **M44**; decisions **D105–D108**; `docs/evidence/match-setup.md` is
what was measured (§D the deck, §B the bridge and the gate, §P what the profiles
change, §R the review); `decks/README.md` is the new deck and report 08 §8 its
card-by-card fidelity. One review pass found one major and eight minors, and all
nine are closed (evidence §R).

```bash
./scripts/play.sh                               # your deck vs decks/doom-legion.dck, Default, three games
./scripts/play.sh --ai-profile Reckless         # or --mirror, --ai-deck <path>, --deck <path>
./tools/ten-games.sh --seed 13                  # the gate's row: you vs the villains, Reckless
```

What it is:

- **A second real deck.** `decks/doom-legion.dck`, *Doom Legion (Marvel Super
  Heroes villains)*: 40 blue-black cards from MSH (33) and MSC (7), 17 creatures
  and every one a Villain. 27 of 27 cards faithful in Forge 2.0.14, none
  unsupported, Limited-legal, art for all 27. Two cards were cut in testing —
  Kang Prime, whose library reveal fails the redaction gate, and Trickster's
  Stratagem, which the Forge AI never casts — and after the swaps 38 of 38 games
  were clean and **all 20 nonland cards were cast by the AI** (**D108**).
- **The bridge seats the AI with its own deck and profile.** `--ai-deck` (an
  alias of `--deck2`) and `--ai-profile <Default|Cautious|Reckless|Experimental>`,
  validated against `forge-home/res/ai/*.ai` before `FModel.initialize`. Every AI
  seat in every process goes through `Bootstrap.createAiPlayer`, always with a
  non-empty `profileOverride`, because the empty one reaches a branch of
  `GamePlayerUtil` that **saves the preferences file** (a negative control made
  it write one). `tools/lint-bridge.sh` allows the Forge call in `Bootstrap.java`
  alone (**D107**).
- **On the wire:** `hello_ok.match` — each seat's deck by name, the AI's profile
  and the match length. The AI's deck is **its name and card count, never its
  path or list** (**D105**); `tools/check-redaction.mjs` holds the exact key
  sets, negative-controlled by four committed `fixtures/negative/redaction/m44-*`
  files.
- **On the board:** each seat's rail names its deck, and the AI's rail its
  profile, from `seatMatchOf()`, the one reader (`web/test/reduce-match.test.ts`);
  since the rebase's fix commit the arena's seat plates do the same, from the
  same reader.
- **`scripts/play.sh`** takes `--deck`, `--ai-deck`, `--ai-profile` and
  `--mirror`, with defaults in `config.json`'s new `match` block — which **only
  `play.sh` reads**, so the gate never plays what a player last chose (**D106**).
- **Tools:** `tools/check-deck.mjs` (is every card of a `.dck` really in the
  engine — static, engine and Scryfall passes, negative-controlled);
  `tools/fetch-art.ts` now fetches art for every `decks/*.dck`;
  `tools/first-divergence.mjs` reads a same-seed pair of games by its first
  differing choice; `tools/villain-deck.sh` names the gate's villain deck once.
- **The gate:** `tools/ten-games.sh` rows **11–14** play your deck against the
  villains once under each profile, and `check-all.sh` gained **9e** (one
  Reckless game, and a bogus profile refused before the engine boots). Both read
  the profile back **from the in-game AI** and fingerprint every Forge
  preferences file before and after. They prove the profile reaches the engine,
  not that it changes the play. Five more games cost about two minutes; the gate
  ran green from a deleted `bridge/out` in 874 s, then 1,141 s (the fix pass) and
  1,143 s (the documentation pass, evidence §R.2) — the last two on a desktop
  running other gates at once — and, rebased onto `23e26b3` with the second fix
  commit, in 1,106 s and 970 s (evidence §R.3), and rebased onto the workshop's
  `bf0392b` with the verifier's four findings fixed, in 897 s (evidence §R.4).

**What a profile is not.** There is still no difficulty setting. Each profile is
121 heuristic values; against the automated seat Cautious and Reckless were not
measurably different in same-seed pairs, and against a seat that leaves
untapped blockers the first difference was a trade Reckless took and Cautious
declined in 6 of 10 pairs (evidence §P). Question 8 below says the same.

### Match setup follow-ups — ten, 2026-09-27 (the tenth found on the rebase onto `bf0392b`)

1. **Identity rows for the villain deck, after the arena branches merge.** This
   branch did not touch `web/src/arena/` while Tier 2's slice 4 and the workshop
   were being built there. Only Aerial Doombot and Thriving Isle, which are in
   Pacho's deck too, have rows; the rest — 13 creature names, the Doombot and
   Villain tokens, the Frozen in Ice aura, five other noncreature spells and
   four new lands — stand on the subtype and archetype rungs (report 08 §8.2).
   Owed: rows in `web/src/arena/figures/traits.json`, `figures.json` and
   `cues/cues.json`, judged the way slice 3 judged Pacho's deck (from both
   seats, at 1×).
2. ~~**The arena's HUD does not print the match.**~~ **Closed by the rebase's
   fix commit** (2026-09-27): each plate in `web/src/arena/DecisionLayer.tsx`
   reads `seatMatchOf(state.hello, player.id)` — the deck on a line of its own,
   ellipsised to one line with the whole name in its tooltip, and the profile
   beside the AI's tag, `AI (Reckless)`. `arena-hud.test.tsx` renders it from the
   synthetic sample (and no line for a pre-M44 recording), and a new
   `liveness.test.ts` clause holds the plates to that one reader and to never
   comparing a deck name or a profile (evidence §R.3). **Moved onto the life row by the
   hardening pass's rebase** (2026-09-27): the deck line of its own and the
   profile in the name row's tags took the opponent's plate below the top band
   and over the opponent's duelist; the plate is four one-line rows now, and the
   same reader and the same two facts are on it (*The 2026-09-27 hardening
   pass*, follow-up 5).
3. **A deck and profile picker in the browser** — on the deferred list below.
4. **Dark Deed** was cast once by the AI in 38 games; it holds the card. If a
   later census shows it never leaving the hand, it is the next swap (**D108**).
5. **Paths no recording has reached:** Kang the Conqueror's power-up — an
   **extra turn**, two `turn` events in a row for one player, which nothing in the
   repo has ever drawn on the phase strip or in the arena — Castle Doom's Doombot
   ability, and the seat targeting Pharaoh Rama-Tut into its ward 2. A probe deck
   is the way to reach the extra turn on purpose.
6. **The redaction gate and `DigUntil`'s reveal.** Kang Prime was cut because
   A3 cannot tell a real reveal of the opponent's library from a leak. Whether A3
   should admit `GameAction.reveal`'s window is a question for report 06 and
   `check-redaction.mjs`, with the five frames of evidence §D.3 as test data.
   Until then, rule 4 of **D108** keeps every such card out of an AI deck.
7. **The rest of report 11 §9 is not exposed:** the simulating AI
   (`AIOption.USE_HYBRID_SIMULATION` / `USE_FULL_SIMULATION`),
   `FPref.MATCH_AI_TIMEOUT`, and Forge's two "Random" profile entries. Each needs
   a decision of its own (**D107**).
8. ~~**CLAUDE.md does not describe match setup yet**~~ — **closed by the
   rebase onto `main`'s `23e26b3`** (2026-09-27): step 9e, ten-games' rows
   11–14, the lint rule, the new flags and the decisions are in CLAUDE.md, applied
   from the fix pass's prepared patch; the test counts and the gate's time
   followed once they were measured on the rebased tree. **Only in part**, as the
   verifier of the second rebase found: the patch's second and third hunks had
   lost the bridge example and the *Match setup* paragraph after the `play.sh`
   block. Both are in since the rebase onto `bf0392b` (evidence §R.4).
9. ~~**Decision numbers at merge.**~~ **Closed by the same rebase**: `main`
   landed D90–D94 and slice 4's D95–D101 first, as predicted, so this branch's
   four kept D102–D105 then. **Reopened and closed again by the rebase onto
   `bf0392b`**: the workshop landed on `main` with its own D102–D104 first, so
   these four are now **D105–D108** everywhere they are cited, and DECISIONS.md
   runs D1–D108 with no gap and no duplicate.
10. **The workshop has no facts for the villains** (found on the rebase onto
    `bf0392b`). The workshop's `catalog.json` takes a card's type line, cost and
    P/T only from face-up sightings in the committed `fixtures/games/`
    recordings, and none of them plays `decks/doom-legion.dck`, so 24 of its 27
    names are listed as *never face up* (only Aerial Doombot, Thriving Isle and
    Island have been seen, in other decks' games) and the pedestal can show none
    of its creatures. Follow-up 1's identity rows would be judged there, so
    committing one Doom Legion recording (a `--transport auto` game at a fixed
    seed, through `check-redaction.mjs`) and re-running
    `node tools/build-workshop-catalog.ts` comes first. The catalog itself was
    regenerated for the new deck file on the rebase, as the workshop's drift test
    requires (evidence §R.4).

---

## Engine and sets — Forge 2.0.14 stays; Reality Fracture waits for an official release (2026-09-27, D109–D112)

**Status: preparation only; committed on its branch, not on `main`** —
worktree `/home/justin-a/code/mtg-table-t2h`, branch `engine-upgrade` (cut from
`754f504`, rebased onto `main`'s `a092d3a` on 2026-09-27: Tier 2 slice 4, the
workshop and match setup underneath it).
**Nothing about how the game runs changed**: `bridge/`, `config.json`,
`tools/check-forge.sh`, `tools/make-forge-home.sh`, `forge-home/custom-cards/`,
`docs/protocol.md` and `fixtures/` are identical to `main`, and
`var/forge/custom/cards/` still holds only D14's `a_i_m_scientists.txt`.
[`docs/research/14-engine-upgrade.md`](docs/research/14-engine-upgrade.md) is the
decision and the plan for the day;
[`docs/evidence/engine-upgrade.md`](docs/evidence/engine-upgrade.md) is what was
measured; report 08 §9 is the deck card by card. Decisions: **D109** (wait for an
official release), **D110** (the engine pin), **D111** (no hand-written card
scripts), **D112** (the draft FRA opponent).

The user played a Reality Fracture pre-release (Scryfall `fra`, released
2026-10-02; Forge edition `FRA`) and wants to play that pool against the AI here,
and to watch AI-vs-AI games with it. Forge 2.0.14, the engine we run, predates the
set: its `Reality Fracture.txt` lists 43 of the set's 461 entries.

### The standing rule

In the user's words, stated after this work had begun and overriding it: *"Let's
not break anything to force in the latest cards. I'm sure things will be available
through official channels soon enough, so no need to create unnecessary friction
and work for ourselves."* It is the rule for every new set, not only this one:

1. **Official releases only** (**D109**, **D110**). The engine is an asset of a
   tagged Card-Forge/forge release. Forge's rolling `daily-snapshots` build may be
   *measured* — in the session scratchpad or a throwaway home under `var/`,
   through `FORGE_JAR=` — but it is never named in `config.json`, never the target
   of a merged bridge change and never the engine of a committed recording.
2. **No development snapshot, early or otherwise.** A bridge port to a newer
   Forge waits as a patch file until an official release is adopted.
3. **No hand-scripted cards** (**D111**), and no overlay of a newer Forge's own
   scripts. A card the pinned engine lacks is absent until a release ships it;
   `forge-home/custom-cards/` keeps exactly D14's one file.
4. **No committed fixture re-recorded as a side effect.** An engine switch and a
   re-record are separate commits and separate decisions (report 14 §5.4).
5. **`~/forge` is never touched** — before, during or after a switch. A release
   is unpacked under `var/forge-engine/<version>/`, and the old engine is the
   rollback.

### What was measured

Two spikes (an overlay of the daily build's card scripts onto 2.0.14; the bridge
ported to the daily build), judged in report 14; the three deck audits were re-run
by the judge and reproduced exactly.

| engine | the user's 50 copies (40 main + 10 sideboard): ok / missing / broken | games |
|---|---|---|
| **Forge 2.0.14, as it runs** | **19 / 31 / 0** — the 17 basics, Woodwork Prodigy, Austere Command | not playable: Forge drops a missing card from the library silently |
| 2.0.14 + the daily's 249 FRA scripts as a user overlay | 47 / 0 / **3** — No Admittance (main), Hexhaven Battalion and Way of the Pyromancer (sideboard) use `ApiType.Empower`, which 2.0.14 does not have | the exact deck: **0 turns** at seeds 7, 8 and 9 (a card that cannot be built crashes zone preparation, sideboard included). Without the three: games finish, with 17 swallowed AI `NullPointerException`s in 10 games on the new haste statics |
| the daily `2.0.15-SNAPSHOT-09.27` (never adopted) | **50 / 0 / 0**, every card Forge's own script | 29 games, 0 exceptions, every frame log PASSes redaction; Forge has no AI logic for `Empower` |

Three findings beyond the cards:

- **Nothing in the deck is unscripted upstream.** "Three of the deck's cards are
  missing from the daily" was a lookup by file name: 249 of the set's scripts live
  under `upcoming/`, and 22 prepared cards' files carry both faces' names. No
  card needs writing by anyone but Forge.
- **The seam moved less than feared.** `IGuiGame`'s abstract set went from 37 to
  28 with no member added, and `IGameController.passPriority()` is gone. The port
  is two files (`WireGuiGame`, `RecordMatch`), +18 / −59 lines of code, and
  compiles only against the daily (5 errors on 2.0.14).
- **The daily changes more than cards.** It exposed a latent race in the bridge's
  M6 next-game lifecycle (a game born dead in 2 of 6 three-game sessions; 0 of 5
  on 2.0.14), and it orders `stats.cardIds` differently, which fails gate step 6
  on any machine and would force a re-record of `g1`. Same games otherwise: the
  same 1,651 events in `g1`, the same ten-games turn counts.

### What is prepared — read by nothing at runtime

| file | what it is |
|---|---|
| `decks/fra-rw-aggro.dck`, `decks/fra-rw-aggro.txt` | **the user's pool**: 40 main and 10 sideboard, checked line by line against the user's own list (`/mnt/e/jalir/Projects/Magic/fra-pool-red-white-aggro.md`, read-only). Every card `\|FRA` except Austere Command, `\|SPG` — the set's Special Guests reprint; `\|FRA` falls back silently to another printing. The `.txt` says in its header that the deck does not play on 2.0.14 |
| `docs/drafts/decks/fra-gb-leftovers.dck`, `docs/drafts/README.md` | **the draft AI opponent** (**D112**): the green-black "leftovers" deck the same notes propose, its 22 named cards plus 18 basics. Outside `decks/` on purpose, until the user accepts it |
| `tools/audit-deck.mjs`, `tools/audit-deck/AuditDeck.java` | per card of a `.dck`, on any jar: **ok**, **missing** or **broken**. Read-only (a throwaway Forge home under `var/audit-deck/`); needs `bridge/out`; negative-controlled (175 of 175 ok on `pacho-shield` and three probe decks) |
| `tools/javap-seam-diff.sh` | the 99 Forge classes `bridge/src` links (95 before match setup), `javap`-diffed between two jars; reproduces spike B's diff line for line. Read-only |
| `docs/research/patches/bridge-forge-2.0.15-snapshot-09.27.patch` | **the port, not applied**: the daily's identity (version, bytes, sha256) and the seam diff in its header. `git apply --check` passes; one-way |
| `docs/research/patches/javap-2.0.14-vs-2.0.15-snapshot-09.27.txt` | the seam the port answers to — the baseline a release's seam is diffed against |
| report 14, its evidence, report 08 §9 | the decision, the measurements, the deck card by card |

```bash
node tools/audit-deck.mjs decks/fra-rw-aggro.dck     # today: 19 ok, 31 missing, 0 broken, exit 1 -- correct
node tools/audit-deck.mjs decks/pacho-shield.dck decks/morph-probe.dck \
    decks/yield-probe.dck decks/sideboard-probe.dck    # the control: 175 ok, exit 0
./tools/javap-seam-diff.sh "$FORGE_JAR" <other.jar>   # read-only; under a second
```

**The gate with all of it present** is green on the unchanged engine: exit 0 in
727 s at `WSPORT=8678` (the preparation pass), and exit 0 in **729 s** at
`WSPORT=8676` (the documentation pass that wrote this section, `bridge/out` kept,
`var/check-all-engine-docs.log`): step 6 identical to `g1` (377 lines), 9c 10/10,
10g three games each played through (816, 1,118 and 1,830 frame-log lines, no
`OVER WITHOUT A gameOver STATE`), and step 13's `node --test` 807 / 799 pass /
0 fail / 8 skipped with vitest 91 / 91.

**Rebased onto `main`'s `a092d3a`** (2026-09-28; slice 4, the workshop and match
setup underneath, with the workshop's `catalog.json` regenerated for the FRA deck)
the gate is green again, from a deleted `bridge/out`: **exit 0 in 906 s** at
`WSPORT=8695` (`var/check-all-engine-upgrade.log`) — step 6 identical to `g1`
(377 lines), 9c 14/14 in 373 s, 10g's three games 816, 1,120 and 1,840
frame-log lines with no `OVER WITHOUT A gameOver STATE`, 9b's advisory the usual
three timing frames, and step 13's `node --test` 880 / 872 pass / 0 fail / 8
skipped with vitest 94 / 94 (870 + 94 standalone, the same as `main`: this branch
adds no test). The saved bridge port was refreshed onto `a092d3a`'s bridge (the
same changed lines; it applies, compiles against the snapshot with no warning,
passes the build's four self-tests there, and still fails on 2.0.14 with the same
five errors), and the seam baseline regenerated (99 classes).

### On the day an official release ships Reality Fracture — the checklist

Report 14 §0 is the list, with every command. In short: each step is its own
reviewable change, the user commits, any failure **stops the switch**, and
rollback is reverting `config.json` and the patch.

**Before the day, on `main`:** follow-up 1 (the next-game race) must land before
any engine moves; follow-ups 2 and 3 (the gate) should.

1. **Is it the day?** A new tag on Card-Forge/forge's releases that is not
   `daily-snapshots`, whose `res/editions/Reality Fracture.txt` lists the full set
   (461 entries in the daily), and that loads it outside `upcoming/` — a release
   build skips that directory.
2. **Get it, pinned.** `tools/forge-engine.json` written by hand from the real
   release page; `tools/get-forge.sh` verifies bytes and sha256 into
   `var/forge-engine/<version>/` (both new on the day, **question 21**).
   `sha1sum` the `~/forge` jar and `~/.forge/decks/constructed/` first.
3. `FORGE_JAR=<release jar> ./tools/check-forge.sh`.
4. **Audit before any code changes:** both FRA decks (expect 90 ok) and the MSH +
   probe decks (expect 175 ok) against the release jar.
5. **Diff the seam** against the saved one: apply the patch if the release moved
   the way the daily did; re-port by the same method if it moved further; no
   patch if it did not move. `MtgTable`'s `of 37` becomes `of 28`.
6. **Point the repo at it:** a relative `forgeJar` plus `forgeJarSha256` and
   `forgeVersion` in `config.json`, `tools/config.sh` and `check-forge.sh` taught
   to resolve and assert them (new on the day); `make-forge-home.sh`;
   `bridge/build.sh`.
7. **The gate.** If the release behaves like the daily, step 6 fails on the
   `stats.cardIds` order and on nothing else; every other step passes. Re-recording
   `g1` (probably `g2` / `g3`) is a separate decision (**question 21**).
8. **Play**: the user's deck against the draft opponent (AI vs AI, recorded and
   checked by `check-redaction.mjs`), then a human seat — cast No Admittance first,
   the first Empower spell a human will have cast through the bridge. Read
   `player turns`, not just `MTGTABLE OK` (follow-up 4).
9. **Record it:** a DECISIONS entry for the switch, and D14's follow-up — retire
   the A.I.M. Scientists overlay (the daily's own script already dropped
   `K:Trample`) and with it `ALLOW_CUSTOM_CARDS_IN_DECKS_CONFORMANCE`, once the
   release's script is confirmed.

### Engine and sets follow-ups — fourteen, 2026-09-27

**Found while measuring, engine-independent, latent on 2.0.14 today.** None is
fixed here; each is its own small change on `main`.

1. **The M6 next-game race — a blocker for any engine switch.** Game N's late
   `finishGame` can land after game N+1's `openView` has reset `overEmitted`
   (`WireGuiGame.java:877`; `:816` before match setup), so game N+1 is born dead
   (`OVER WITHOUT A gameOver STATE`, a six-line frame log). 2 of 6 three-game
   sessions on the daily, 0 of 5 on 2.0.14 — but `main` has since seen it on
   2.0.14 under load: CLAUDE.md records slice 4's first gate run after its
   rebase onto the card library failing at step 10g when the `restartMatch()`
   game sent `over` 2 ms after its `hello_ok` with no `state` (a four-frame log),
   the same signature. Match setup's
   `7364bea` made `over` terminal under load; it did not touch this reset. The
   evidence gives two fixes — defer `nextGameDecision` until this
   game's `finishGame`, or key `finishGame` to a per-game generation — and
   choosing one is a DECISIONS entry (**question 19**).
2. **Gate step 6 dies without its message.** `diff … | head -20` under
   `set -o pipefail` (`tools/check-all.sh:246`, `:155`; `:231` and `:140` before
   match setup) exits 141 on a diff longer than 20 lines, and `set -e` ends the
   gate before "FAILED at step 6" prints.
   Step 6 is also load-sensitive on 2.0.14 itself (the forwarder's 500 ms flush
   moves frame boundaries).
3. **Step 10g does not assert that each game was played.** It printed "OK: three
   games" over a game that died at birth; only `web/test/ws-log.test.ts` caught it,
   at step 13.
4. **`MtgTable` prints `MTGTABLE OK` and exits 0 on a 0-turn game** (a card crash
   at game start). Still true at `a092d3a`: match setup's `MtgTable`, now on
   `main`, checks only that the game reached `over`.
5. **`check-redaction.mjs` A10 raises a false alarm** when a counter-unless-pay
   prompt against the seat names a counterspell that is already public on the
   stack: `lastZoneOf` is filled from `players[].zones` and never from
   `stackCards`. Advisory (the file still PASSes); fix it with a negative control
   before FRA's counterspells make it routine.

**For the day, or after it.**

6. **Arena identity for the FRA creatures.** The main deck has 14 creature names
   (16 cards), the sideboard adds Ghalta, and the draft opponent thirteen more;
   `figures.json`, `traits.json` and `cues.json` are keyed by card name and know
   none of them. Of the fourteen, only Mabel, Valley Hero and Thalia, the Survivor
   (Soldiers) meet an existing subtype rung, and the colour rungs cover W and U
   only, so the red creatures stand as `creature/*`. Rows are art direction for
   after the release (card names verbatim from the wire, M7 Tier 2 convention 1),
   on slice 4's bodies (on `main` since `23e26b3`). Lands and Medic's Kitesail
   (Equipment) already fall to existing rungs. Since the rebase the workshop lists
   every card of `decks/fra-rw-aggro.dck` (its catalog reads every `decks/*.dck`),
   all 28 names with no corpus facts — `catalog.json`'s `missing`, `threeD: null` —
   the state 24 of Doom Legion's 27 names are in (match setup's follow-up 10).
7. **Card art and the card library.** *Half closed by the rebase:* since match
   setup `tools/fetch-art.ts` reads every `decks/*.dck`, and on `a092d3a` it
   resolved all 28 of `fra-rw-aggro.dck`'s names on Scryfall (27 in `fra`,
   Austere Command in `spg`; 91 entries across the twelve decks, 0 misses). The
   draft opponent is outside `decks/`, so its art waits until it is accepted (or
   `--deck` names it). `tools/card-library/` still indexes MSH and MSC only, so the
   dev card browser lists `fra-rw-aggro.dck` with its cards unresolved; a `fra`
   sync closes that.
8. **Prepare on the board.** Pyre Rhymer, Woodwork Prodigy and Whiplash Wordsmith
   have a castable spell face. 2.0.15's `CardView.hasPreparedSpell()` and a
   face-up card's spell face are not on the wire — hard rule 8 keeps
   `getAlternateState` inside the face-down `alt` block. The game plays; the board
   cannot say "prepared". A protocol amendment plus a hard-rule-8 review, never a
   port detail.
9. **`input.openZones`' `{hand}` hint does not arrive on 2.0.15** (the
   `tempShowZones` path is gone; the wire shape is unchanged). Deriving it again
   from `Snap`'s per-id zones would be a new decision.
10. **D14's retirement** (checklist step 9), once the release's A.I.M. Scientists
    is confirmed correct.
11. **Forge's to close, ours to re-check:** Forge has no AI logic for `Empower`
    (on the daily the AI cast No Admittance once in 11 recorded games and 0 times
    in 152 others), and Pyre Rhymer's Molten Tide text reads "additonal".

**At merge.**

12. **Two deck audits.** Match setup's `tools/check-deck.mjs` (a static pass,
    `Smoke`, and a Scryfall diff) and this branch's `tools/audit-deck.mjs`
    (per-card build checks on any jar) overlap: fold them, or give each one job.
    Both are hand tools; neither is in the gate. On `a092d3a` `check-deck.mjs
    decks/fra-rw-aggro.dck` **fails, by design** (**D109**): 17 of the main deck's
    20 names (22 of its 40 cards) have no script in 2.0.14, `Smoke`'s audit names
    the same 17 as dropped silently, the basics' `|FRA` is not in 2.0.14's
    `Reality Fracture.txt`, and Limited conformance rejects the deck — so
    `check-deck.mjs decks/*.dck` exits 1 until the release, and its header and
    `decks/README.md` say so (`var/check-deck-fra.log`).
13. **`decks/README.md` against the card library's test.** *Closed by the
    rebase.* Match setup added the README and changed the test to read only `.dck`
    and `.txt` (`7364bea`), so `fra-rw-aggro.txt` — a deck list under a `#`
    header — is parsed with nothing skipped and the README is not. This branch's
    two deck files are now rows in that README's table, with a section of their
    own.
14. **Numbers.** *Closed by the rebase onto `a092d3a`.* Match setup kept report
    08 §8 (its villains deck) and the FRA deck is **§9**; slice 4, the workshop and
    match setup landed as D95–D108, so **D109–D112 kept their numbers**; `main`'s
    open questions stop at 17, so 18–22 stand. The one collision it foresaw, the
    `hardening` branch also numbering from D109, was settled as DECISIONS.md's
    italic note above D109 said it would be: `hardening` landed second and
    renumbered its own D113–D115.

---

## The 2026-09-27 hardening pass — the small-defect backlog

**Status: done, verified once, fixed, and rebased onto `main`'s `aead79d`
(engine and sets)** on branch `hardening`. Built on `bf0392b` (the workshop's
tree) while match setup was open, rebased onto it with both sides' behaviour kept
(*The rebase*, below), then through its first verification round and a second
rebase (*Verification round 1*, below). Seven defects from the follow-up lists
above, each fixed at its cause, each with a test or gate assertion that fails
without the fix, and each negative control actually run.
`docs/evidence/hardening.md` is what was measured. **D113–D115** are its
decisions, numbered after the engine and sets' D109–D112: they were written as
D109–D111 and renumbered on the second rebase, as DECISIONS.md's note above D109
asks of whichever lands second. Protocol amendments **M45** and **M46**,
numbered after M44.

| # | Defect | Fix | Proved by |
|---|---|---|---|
| 1 | Gate step 6 exited 141 with no message under load, and failed a byte-strict diff on an identical game (slice 4 follow-up 13(b)) | **D113**. `tools/wire-drift.mjs` compares the non-state frames, the event stream, the phase walk, the final board, **every board cut at a turn, phase or outcome event** and **the stack on every id-set both files caught** (the last two since verification round 1: the first four compared no stack, `priority` or mid-game combat), prints its own verdict and exits 0 or 1. `STRICT_G1=1` is the old byte diff. 9b's multiset was measured and rejected: it fails the same loaded runs | seed 42 re-recorded with the JVM pinned to one core shared with 2/4/8 busy loops. 383/387/395 lines against 377: strict fails, the multiset fails, all six questions hold. `tools/wire-drift-selftest.mjs` (in step 6) has 18 cases: 5 re-partitions accepted, 12 drifts rejected, 5 of them (the stack reversed, a stack key renamed, `priority` nulled, a combat key renamed, no stack) accepted by the first version |
| 2 | 10g's restarted game ended at once (13(c)) | **D114** / **M45**. The cause was not a wait armed late. It was game n's late `finishGame()`, queued on the EDT by `FControlGameEventHandler` after `GameEventGameFinished`, landing on game n+1 once an instant `newGame` had restarted first. An early `newGame` is now queued and released from game n's own `GameEventGameFinished` | `MTGTABLE_HOLD_GAME_END_MS` holds the window open. With the queue disabled, game 2 ended at once (`OVER WITHOUT A gameOver STATE`) and `ws-auto-play` exited **8**, its new check. Fixed, both acts queue and release and all three games play in full. 10g runs held (2000 ms) and asserts it |
| 3 | `MtgTable` exited 0 when the engine crashed before turn 1 | **D115** / **M46**. `EngineCrash`, a default uncaught handler that chains, and a game-loop death ends the game (error `notice` + null `over`). The process exits 1 with the cause. `RecordMatch` closes its log the same way | `tools/check-engine-crash.sh` (gate step **12c** since the rebase, ~8 s): a scratch Forge home with a Depower that uses the 2.0.15 ApiType `Empower`. Pre-fix: MtgTable exit 0 after 65 s, RecordMatch's log stopped at `hello_ok` (9 assertions fail). Fixed: exit 1 in 4 s and 3 s, both logs end in `over` |
| 4 | The T-pose flash hidden, not fixed (slice 4 follow-up 8) | the stance holds on an action of its own, on the clip's `restTwin` (`FigureRig.restActions`, since verification round 1; first it was weight 1 on the shared action, which jumped at both ends of every attack and block cue) | `web/test/clip-lane.test.tsx`: a one-bone model with no `idle` (y 0.92/0.52/0.24/0.68/0.96 on `main`, not 0.2), and a stance → cue → stance walk with no jump (a 0.44 jump with weight 1). Measured on the shipped models: the largest joint jump at an attack cue's ends on the proportioned bodies, 0.61–0.66 body heights on `main`, 0.41–0.46 with weight 1, 0.03–0.05 now |
| 5 | `visibleShare` ignored the player plates (slice 4 follow-up 3) | `camera.ts`: `PLAYER_PLATES`, `underRect`, `visibleShareOnCanvas` (pure) | `camera.test.ts` recomputes every duelist share with both plates, and holds the rectangles to `styles.css`. Negative control: the plate alone hides exactly the 24 samples under it. **No view × aspect changed**: the opponent's plate ends at canvas y 126.0, inside `HUD_TOP_PX`. **On the rebase:** the plate is four one-line rows (a long `--ai-name` ellipsised, match setup's deck and profile on the life row), and the band is asserted; match setup's own plate fails the duelist threshold in 4 cells and is the negative control |
| 6 | `catalog.json` drift reached the gate only through a web test (workshop follow-up 17) | step **12b**: `build-workshop-catalog.ts --check` | mutation: a `cues.json` row for a non-creature deck card (Giant Growth) fails it, removing the row passes it |
| 7 | `@gltf-transform/cli` on a caret (slice 4 follow-up 9, Tier 2 follow-up 17) | exact `4.5.0`, and `overrides` for its meshoptimizer 1.2.0 and the three libraries | `npm ci`, then `npm ls`: every version is the one the lockfile recorded. **The rebuild itself was not run** (below) |

**Commands**

```bash
./tools/check-engine-crash.sh                                   # item 3's self-check, ~8 s, gate step 12c
node tools/wire-drift.mjs [--strict] fixtures/games/g1.jsonl var/check-all-record.jsonl
node tools/wire-drift-selftest.mjs                              # step 6 runs it
STRICT_G1=1 ./tools/check-all.sh                                # step 6 byte for byte, as before D113
MTGTABLE_HOLD_GAME_END_MS=2000 ./bridge/run.sh mtgtable.MtgTable --transport ws ...   # 10g's held window
node tools/build-workshop-catalog.ts --check                    # step 12b
```

### 2026-09-27 hardening follow-ups — seven; 2, 5 and 6 closed on the rebase, 4 by verification round 1

1. **`figures.glb` was not rebuilt.** The pin makes the toolchain exact. Whether
   `node tools/build-figures.mjs` still reproduces 373,236 bytes needs the five
   CC0 archives in `var/assets/figures/`. None of them is on this machine, and
   downloading ~130 MB is the user's call (slice 4 follow-up 12).
2. ~~**`tools/check-engine-crash.sh` is not in the gate.**~~ — **closed on the
   rebase (2026-09-27)**, as decided on review: it is step **12c**, after 12b, and
   the gate requires all twenty of its assertions (about 8 s; it needs no
   `node_modules`, so it runs under `SKIP_WEB=1` and `SKIP_TEN=1`).
3. **An exception that kills a `Game-n` thread other than the game loop is
   only printed** (`THREAD DIED (not the game loop)`). If one ever strands a
   game, it still ends by timeout as before.
4. ~~**Item 4 has a visible side:** when the stance's clip and the cue's clip are
   the same action, the cue's own fade no longer shows.~~ — **closed by
   verification round 1 (2026-09-28)**, and it was wider than it said. Every
   model has an `idle`, so the weight-1 line prevented no T-pose on a shipped
   model. What it changed was every attack and block cue on every figure: it
   jumped from the stance's held frame (45% into `attack`, 60% into `block`) to
   the clip's first frame and back, 0.41–0.46 body heights in one frame on the
   proportioned bodies' attack (`main`'s blend toward idle frame 0 jumped 0.61–0.66).
   The fix is two actions: the stance holds on the clip's `restTwin`, a second
   action map built at commit, so the cue crossfades off the held pose and back
   (0.03–0.05; evidence §9.2, with the table for every model).
5. ~~**A long `--ai-name`, or a counters row,** would wrap the opponent's plate
   below the band.~~ — **closed on the rebase (2026-09-27)**, as decided on
   review (ellipsise the name) and for a reason the rebase found: match setup's plate
   was already below the band on every live game — its deck on a line of its
   own (101.4 px, ending 143.0) and its profile in the name row's tags, which
   wrapped the row on the AI's own turn (120.1 px, ending 161.7), both measured
   in Chromium — and in the shoulder view at 745 px, 16:10, it left 60% and 44%
   of the opponent's duelist visible against the test's 70%. The plate is now
   four one-line rows: the name ellipsised (whole in its `title`), the
   opponent's name row unwrappable, and the deck, the profile and any player
   counters on the life row. `camera.test.ts` asserts it ends inside the band
   (126.0 px, measured 125.95 with a 77-character name, a counter pair, poison
   and the `Experimental` profile) and fails without any of its seven one-line
   rules; the old plates are its negative controls. `arena-hud.test.tsx` holds
   the markup to four rows (six with match setup's plate).
6. ~~**The rebase onto `main` (`a092d3a`, match setup).**~~ — **done
   (2026-09-27)**; *The rebase*, below.
7. **Step 6 checks the stack's ORDER on one id-set.** Question 6 compares
   `stack` and `stackCards` on every id-set both recordings caught, but order
   only means something with two or more items. g1 has one such id-set, the
   three-item stack in turn 14's declare-attackers step. Every loaded
   re-recording caught it, but a load heavy enough to cut that frame
   differently would leave order unchecked for that run (the verdict would
   still be honest: it prints how many id-sets it compared). A second
   committed seed with more responses on the stack would widen it; that is a
   new fixture, so it is the user's call.

### The rebase onto match setup (`a092d3a`, 2026-09-27)

`WireGuiGame.java`, `MtgTable.java`, `RecordMatch.java` and
`tools/ws-auto-play.mjs` merged without a textual conflict, and were read for a
semantic one. **Both sides' post-`over` behaviour is kept**: match setup's
re-check of `overEmitted` under the log's monitor in `emit`, `logC2s` and the
ask path (once it is set only `over` is emitted; `emit` returns whether the
frame went out, and `gameOverStateEmitted` is set only when it did) sits beside
this pass's queued `newGame` (released from the game's own
`GameEventGameFinished`), the 10g hold, and the crash path — whose error
`notice` is emitted before `emitOver` sets the flag, so it is never one of the
dropped frames. The conflicts were all prose plus `check-all.sh`'s usage lines
and `docs/protocol.md`'s amendment list (M45–M46 above M44, newest first). No
decision was renumbered then (`main` stopped at D108; the second rebase, below,
renumbered them D113–D115). `web/src/workshop/catalog.json`
was already current: match setup regenerated it for `decks/doom-legion.dck`, and
this branch changes no deck and no `cues.json` row. Three things changed on the
rebase itself: step **12c**, the plate (follow-up 5 above), and `RecordMatch`'s
`emitOver` javadoc, which the crash method had separated from its method. The
gate from a deleted `bridge/out` at `WSPORT=8685`: **`check-all OK`, exit 0, 938.8
s**, at a load average of 5–10 — 9c's fourteen games in 379 s, 10g's two early
`newGame` acts queued and released, 12c's twenty assertions, and **881 / 873
pass / 0 fail / 8 skipped** `node --test` plus 96 vitest in step 13
(`var/check-all-hardening-rebased.log`,
evidence §8).

### Verification round 1, and the rebase onto engine and sets (`aead79d`, 2026-09-28)

The verifier re-ran every claim against `3e4acbd` and returned `passed: false`
on one major finding and five minors. All six are fixed, and none is left as a
follow-up. Evidence §9 has the numbers.

- **Major: step 6 compared no stack.** The four questions never looked at a
  mid-game board, and g1's final board has no stack and no combat. So the stack
  reversed, a stack key renamed, `priority` nulled and a combat key renamed
  (all mid-game) each passed. Two questions were added, the boundary boards and
  the stack by id-set, and each is invariant by construction. Both held on all
  four loaded re-recordings. The selftest has 18 cases, and the five new drifts
  pass the old tool and fail the new one. D113 is amended, with a dated note, to
  say what the first version understated. Follow-up 7 above is the one limit
  left.
- **The weight-1 line** was replaced by two actions per clip (follow-up 4
  above, closed).
- **`MTG_TABLE_CONFIG`**: `check-all.sh` and `scripts/play.sh` unset it, and
  `bridge/run.sh` names any other config on stderr.
- **The crash check's duration** is quoted as ~8 s everywhere, and the script
  prints its own time.
- **The catalog claim** now names what it proves: a row for a non-creature deck
  card.
- **The rebase onto `aead79d`.** The engine and sets had landed first with
  D109–D112, so this branch renumbered its own to D113–D115. It did this before
  rebasing, on its own tree, where every D109–D111 was its own (92 lines in
  16 files). The conflicts were prose only. `catalog.json` is current.

The gate ran from a deleted `bridge/out` at `WSPORT=8685`: **`check-all OK`,
exit 0, 940.5 s**, at a load average of about 9–16. Step 6's selftest was 18/18
and all six questions said `same`, byte for byte too. 9c's fourteen games took
384 s. In 10g, 2 early `newGame` acts were queued and released. 12c passed 20/20
in 6 s. Step 13 ran **881 / 873 pass / 0 fail / 8 skipped** `node --test` plus 97
vitest (`var/check-all-hardening-fix1.log`, evidence §9.7). 9b's advisory
reported 3 more `buttonCancel` acts and 4 more `input` frames under load, with
the same 233 `state` frames. After the gate, two seed-42 recordings on a loaded
core, with this bridge, said SAME to all six questions and DIFFERENT under
`--strict`. `~/forge` and `~/.forge` are unchanged.

---

## Deferred — out of scope for M0–M7

Not cancelled, not scheduled. **M6 has landed and M7's Tier 1 with it**, so these
are now revisitable rather than blocked; nothing below is scheduled by that, and
each still needs a decision of its own before it becomes work. The arena's
**Tier 3** (per-card models) belongs on this list too; **Tier 2** left it on
2026-09-13 and is now **complete** — four slices, T0–T14, the camera views,
per-card identity, proportioned bodies in costumes and the duelists (*M7 Tier 2*
above; slice 4 is not yet committed). **Tier 3 means likeness**, and a likeness model of a Marvel character
would be **personal-only** — local, gitignored, never committed or published, and
never made from card art (**D54**): *Tier 3 — a note, not a plan*, above.

- ~~A second deck, a deck picker, and an AI profile selector.~~ **Done
  2026-09-27 as match setup** — *Match setup*, above: a second real deck for the
  AI, and the AI's deck and Forge profile chosen by a flag or `config.json`.
  What stays here is its browser half: **a deck and profile picker in the
  page**. Today the choice is made before the session starts, and changing it
  in the browser would mean an act that ends the session and seats a new one,
  because `createAiPlayer` and both decks are fixed before `startMatch` (report
  11 §9). There is still no "difficulty" to pick (**D107**).
- ~~The SQLite (`node:sqlite`) + FTS5 card library, the `oracle_cards` bulk
  stream, a local image cache and an `/api/images` proxy.~~ **Brought forward
  2026-09-27** on the user's request (**D90**): `tools/card-library/` (the index,
  the bulk stream, the image cache, the query CLI) and the card browser at
  `#cards` (`web/src/cards/`), whose image route is **dev-server only** and never
  fetches — so there is still no `/api/images` *proxy* (**D92**).
  `docs/evidence/card-library.md` is what was measured, and *The card library
  and the card browser*, above, has the status and twelve follow-ups. What stayed
  out: report 03 §4.5's re-fetch on a newer `image_updated_at` and its dated retry
  for a `missing` / `placeholder` image, `resolve --write`, the
  `/cards/named?fuzzy=` rung, a production (non-Vite) route, and every-print
  images without `--yes` (`tools/card-library/README.md`, *Not done*).
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
| 5 | Card images hot-linked from `cards.scryfall.io`, or proxied through our own origin with a 302 (the way Endstep does)? | **Hot-link in v1.** Unchanged for the board. The card browser (2026-09-27) serves the user's own image cache from the dev server's origin and hot-links on a miss — never a proxy (**D92**). |
| 6 | Install a JDK? Not needed for this plan, but it would bring `jar`, `jshell`, a debugger and Maven. Unpack Temurin 21 into `tools/jdk/` (no sudo) or `apt install openjdk-21-jdk` (sudo)? | **No JDK. The JRE's `jdk.compiler` / `jdk.jdeps` modules suffice.** |
| 7 | GitHub: public repo or private? Affects whether NOTICE and the Fan Content disclaimer must be publication-quality on day one. | Undecided — **NOTICE is written to publication quality anyway**, so either answer works. |
| 8 | Is losing to the Forge AI acceptable in v1, or does the AI profile / difficulty picker come forward from the deferred list? | **The picker CAME FORWARD on 2026-09-27**, when the user asked for deferred work to be expedited: match setup (amendment **M44**) picks the AI's deck and its Forge profile (`--ai-deck`, `--ai-profile`, `config.json`'s `match` block). **It is not a difficulty setting** (**D107**) — Forge has none, and in same-seed pairs against the automated seat Cautious and Reckless were not measurably different (`docs/evidence/match-setup.md` §P). Whether losing to the AI is acceptable is unchanged: nothing here makes it weaker. |
| 9 | **New, M5.** Should Forge's floating-mana warning (`FPref.UI_MANA_LOST_PROMPT`, a `confirm` before you pass priority with mana that would be lost) be on in real games? It is off in stock Forge; `--mana-lost-prompt` turns it on in memory for probe runs, and it is the only way the `confirm` ask kind is reachable at all. | **ANSWERED BY M6: ON.** `config.json` `"manaLostPrompt": true`, set in memory only (never `save()`), overridable with `--mana-lost-prompt` / `--no-mana-lost-prompt` (amendment M40). `confirm` therefore occurs in ordinary games; nothing else moved. Raise it again if the prompt turns out to be a nuisance. |
| 10 | **New, Tier 2.** Report 13 §13's first six questions — art direction, models from card art, the GPU, idle breathing, duelists, lights. | **ANSWERED by the user before T0**, as nine decisions, recorded as **D53–D62**: stylised low-poly CC0 figures under a holographic, unlit treatment; figures at their card with the card plane kept; **no** AI-generated models from card art; **no** Mixamo; procedural slab lands; bloom on if the bench allows (it did, on the GTX 1080); breathing only while something else animates; silhouette busts, avatars deferred; mana motes to the controller's casting anchor. **One of the nine has since been superseded**: "silhouette busts, avatars deferred" (**D62**) by slice 4's full duelists (**D99**), on the workflow's reading of the user's verdict on slice 3 — the busts are kept as the fallback, and whether the duelists were wanted is slice 4's follow-up 1. |
| 11 | **New, Tier 2.** Commit `web/public/models/figures.glb` (**373,236 bytes since slice 4** — 143,920 in slices 2–3, 126,404 in slice 1 — CC0, built by `tools/build-figures.mjs` from five sources), or gitignore it and regenerate it like `web/public/art.json`? | **Undecided — nothing in the code depends on the answer.** A checkout without it draws every creature as its disc, and the duelists as their busts, and says so once in the console, and `figures.test.ts` skips its hash check. If it is committed, `figures.test.ts` holds it to the bytes and sha256 `models.json` records, and `@gltf-transform/cli` should be pinned exactly first (Tier 2 follow-up 17 — since slice 4 it also decides the simplifier's version, **D96**). |
| 12 | **New, Tier 2.** Should the live combat budget let the clip lane play (Tier 2 follow-up 1)? Today a combat batch in the human's own turn is snapped, so the lunge and the hit are replay-only. | **Unchanged: Tier 1's budgets stand.** The user's play-test of slice 1 (2026-09-27) reported nothing major, so the default holds; slice 2 fixed a second cause (the idle-gap clock, **D72**) and measured the first live (17 of 44 batches still snapped). Raise it again if the next play-test — *"What slice 2 hands to T9–T14"* — says the combat reads wrong live. **Slice 4 added a third casualty**: a duelist's flinch when the human takes damage is snapped the same way, and the verifier never saw one live (slice 4 follow-up 7). |
| 13 | **New, Tier 2 slice 3.** Should your figures face the OTHER seat? Measured in slice 3 (**D81**): the models' fronts are at +Z and `layout.ts`'s `seatFacingY('you')` is 0, so **your figures face your camera and the opponent's face away** — both sides face outward, away from the combat lanes. For: a badge, an eyepatch, a pistol, a laser eye and a face read on YOUR side. Against: an attacking figure lunges toward the opponent back first — the Doombot's exhaust leads its lunge and its laser leaves its eye on the far side and crosses its own body — and Agent 13's `pistolDraw` aims at you. | **Unchanged: your figures face you.** Turning them is one line (`seatFacingY`), and every prop and every T11 beat follows it through the one definition of a front — but it changes what the whole table looks like, so it is yours to decide after a play-test. Since the second verification pass two of the "against" points are gone whichever way you decide: an attacker turns to face its defender for the length of its attack (**D82**), and every identity prop reads from behind too (**D83**). |
| 14 | **New, Tier 2 slice 3.** Is **likeness** — figures that look like the characters, a model per card — part of the end goal, or is identity-through-props and costumes (slices 3 and 4) where the arena should stop? **Since slice 4 this is the one question Tier 2 leaves open.** | **Undecided; Tier 3 is not started and nothing assumes it.** Slices 3 and 4 are as far as identity goes inside Tier 2 — a proportioned CC0 body in a painted costume carrying shared props. If likeness is wanted, it is **personal-only** (local, gitignored, never committed or published, `committable: false` in the manifest), never generated from card art and never from Mixamo (**D54**), and its source is yours to choose — *Tier 3 — a note, not a plan*, in *M7 Tier 2* above. A play-test of slice 4 is the input: if the cards read as themselves at the table, the answer may be "no"; *What Tier 3 would be, concretely, after slice 4* says how small the seam is if it is "yes". |
| 15 | **New, card library.** Commit `fixtures/cards/` — a 0.69 MB slice of Scryfall's data (172 `oracle_cards` lines, 84 MSH/MSC print lines, 6 sets, no images), reduced to the fields the library reads — or gitignore it? | **Committed as reduced** (**D90**): it keeps `cards-lib`, `cards-api` and six `cards-ui` tests offline and hermetic, and it is regenerated by `make-fixture.ts`, never hand-edited. The alternative is to gitignore it and let those tests skip when it is absent — a suite whose result depends on what is lying around, which the repo has been bitten by once (`MTGTABLE_WS_LOGS`). |
| 16 | **New, card library.** What contact goes in `config.json`'s `scryfallUserAgent`? Scryfall asks for an accurate, identifying User-Agent; the committed one reads `github.com/<user>/mtg-table`. | **Only you can supply it.** Until then `build.ts` and `images.ts` warn on every run that talks to Scryfall, and NOTICE §2 says it must be replaced before anyone talks to Scryfall. |
| 17 | **New, card library.** Fetch every MSH + MSC print's image (`images.ts --all-prints --yes`: 1,338 images, ~104 MiB into `var/cards/images/`), so browsing the two sets stops hot-linking? | **Not fetched**: only the ten decks' 41 images are cached, and the browser hot-links the rest from `cards.scryfall.io`. Nothing depends on the answer. |
| 18 | **New, engine and sets.** Play Reality Fracture now — on Forge's daily build, or by overlaying card scripts onto 2.0.14 — or wait for an official Forge release that ships the set? | **ANSWERED by you, 2026-09-27: wait.** *"Let's not break anything to force in the latest cards."* Recorded as **D109–D111**: official releases only, no daily build, no hand-written or overlaid scripts, no fixture re-recorded, and the deck stays as you built it (no edits to dodge the three Empower cards). *Engine and sets* has the checklist for the day. |
| 19 | **New, engine and sets.** Fix the bridge's M6 next-game race (*Engine and sets* follow-up 1) on `main` now, as its own change, or leave it until the day? It is latent on 2.0.14 (0 of 5 sessions) and killed a game in 2 of 6 on the daily build. | **Not scheduled — but it must land before any engine switch**, with its fix chosen in a DECISIONS entry. The two gate defects (follow-ups 2 and 3) and `MtgTable`'s OK on a 0-turn game (follow-up 4, the match-setup branch's file) are the same question. |
| 20 | **New, engine and sets.** The FRA opponent: accept `docs/drafts/decks/fra-gb-leftovers.dck` (your notes' green-black leftovers deck, plus 18 basics), change its mana, or supply another list? | **A draft until you say** (**D112**). Accepting it is `cp` into `decks/`. On the daily build it beat the red-white deck 25–15 with the Forge AI piloting both, which says little about you at the red-white seat. |
| 21 | **New, engine and sets — for the day.** (a) Move the engine pin into the repo — `tools/forge-engine.json`, `tools/get-forge.sh`, `var/forge-engine/<version>/`, a relative `forgeJar` with its sha256 in `config.json` — instead of an absolute path to a hand install? (b) Re-record `g1` (probably `g2` / `g3`) if the release, like the daily, differs from 2.0.14 only in the order of `stats.cardIds`? | **Neither happens without you, and they are two decisions, not one.** (a) is specified in report 14 §5.2 and not built (**D110**); (b) follows report 14 §5.4 — re-record only after a content diff, stop on any real change, and in a commit of its own. |
| 22 | **New, engine and sets.** Keep the prepared files to commit (the two FRA deck files, `tools/audit-deck.mjs` and its helper, `tools/javap-seam-diff.sh`, `docs/research/patches/`, `docs/drafts/`, report 14 and its evidence), and should `audit-deck.mjs` join `check-all.sh`? | **Keep them; `audit-deck.mjs` stays a hand tool** — it needs a built `bridge/out`, takes a few seconds, and today it would only re-prove the MSH decks the gate already plays. Showing Prepare on the board (follow-up 8) is a later decision of its own, not the day's. |
