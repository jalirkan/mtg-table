# M1 hardening — evidence

Dated 2026-09-11. One pass, three agents working from one amendment list: this
file records **what the documents now say**, with the report that justifies each
change. The Java and web/tools agents append their own sections below (runs,
diffs, counts, re-recorded fixtures); nothing in §1 is a measurement, and
nothing in §1 claims a code change was made.

Inputs to this pass:

| Report | What it settled |
|---|---|
| `docs/research/06-hidden-information-audit.md` | Every reveal path in Forge (twelve), the complete `mayLook` surface, the ten protocol changes due before M3, the `Snap` checklist, the checker assertions A1–A11. |
| `docs/research/07-wireguigame-spec.md` | The M2 seam: the 37th abstract member, the five threads, the eleven ask kinds and their real shapes, amendments A1–A8. |
| `docs/research/08-deck-card-coverage.md` | Card-by-card fidelity for the deck in play: one real script bug, one benign warning, one pref that must be off. |
| `docs/research/10-board-ui-spec.md` | M4's read of the wire; `Card.token`; the fields M4 wants that do not exist yet. |
| `docs/research/11-engine-comfort-features.md` | M6 as engine features: phase stops, pass-to, auto-yield, auto-pay, undo, new game — and the fields they need. |
| The M1 verification round | The ungated `StackItemView.getText()` path, the same-deck fixture corpus, three nullability drifts. |

---

## 1. Amendments applied to the documents

Numbering matches the amendment list this pass worked from (P1–P20). Only the
items owned by the documents are listed; P11, P12, P17's lint, P19 and P20 are
code and tooling, and land in §2–§3 below.

### 1.1 `docs/protocol.md`

The file now opens with a dated **Amendments** table (rows A–L) summarising the
same changes for a reader who does not have this file. Section by section:

| Item | Section | What changed | Cites |
|---|---|---|---|
| **P1** | §3.3 | The redacted stub is **exactly five keys** — `{id, zone, owner, controller, hidden}`. `owner` is new. The prose says why: `canBeShownTo`'s `case Hand` compares `getController()` while the zone arrays are keyed by the zone's player, so without `owner` the client guesses when a control-change effect makes them differ. | 06 §6.1, §1.1 |
| **P2** | §3.4 | Rewritten from "libraries are always a count" to `library: {count, cards}`, where `cards` holds **only** cards for which `canBeShownTo(viewer)` is true, never a stub, `cards.length <= count`. The section names the effects that reach it (Future Sight, Bolas's Citadel, Experimental Frenzy, Oracle of Mul Daya, Hidden Agenda) and says why no `ask` can carry them: the statics are continuous and nothing blocks. | 06 §0.4, §P6, §6.3 |
| **P3** | §3.2 | New subsection "Face-down cards and `alt`": the snapshot reads `getCurrentState()` only, except an `alt` block `{name, manaCost, types, power, toughness}` from `getAlternateState()`, emitted only when `isFaceDown() && canFaceDownBeShownTo(viewer)`, `null` otherwise, key always present. Plus: **P/T are `null` and `types` is `""` for a face-down card outside `battlefield`/`stack`** (Forge's own detail panel shows neither; the 2/2 Creature is `CardUtil.getFaceDownCharacteristic`'s artifact). **Corrected later the same day:** gate 2 failing does *not* produce a second object — the card takes the ordinary full branch, whose `name` is already `""` and `setCode` `"???"` (Forge's own face-down characteristic), and the eleven-key `faceDownHidden` shape is **superseded**. One concealed shape, not two. | 06 §1.3, §1.4, §6.2 |
| **P4** | §3.6 | Rule 4 is now a table. `GameEventZone`'s parenthetical is corrected — it carries `zoneType()`, `player()`, `mode()`, `card()`, `sa()` in 2.0.14 and is dropped anyway, because `GameEventCardChangeZone` covers real movement and `GameEventZone` also fires from `Player.updateFlashbackForView`. `GameEventAddLog`, `GameEventRandomLog`, `GameEventSubgameStart`/`End`, `GameEventAnteCardsSelected` added to the drop list; `targetDescription()`, `stackDescription()`, `outcomeStrings()`, `matchSummary()` banned at field level and marked as never-emitted in the events table. Four kinds added — `scry {player,toTop,toBottom}`, `surveil {player,toLibrary,toGraveyard}`, `phased {cardId,phasedOut}`, `foretold {player}`. | 06 §5.3, §5.4, §4 |
| **P5** | §9 | **Invariant 10 is now "a `hidden` card replaces, never merges"**, with the id-stability evidence and the note that it is the one leak a log checker structurally cannot see (it is tested against `reduce()` directly). The old invariant 10 (events drop, cards never drop) is renumbered **11**. The list is now eleven invariants. | 06 §0.6, §6.10, §9.A8 |
| **P6** | §4.3, §5 | `open_zones` deleted. New §4.3 "`openZones` is a hint, and was never a question" carries the evidence (`PlayerZoneUpdate` has no card accessor; `CMatchUI` only opens panels; the calls arrive on the EDT). §5 now says **eleven kinds**. | 06 §3; 07 §0.2–§0.3 |
| **P7** | §5.1–§5.4 | §5 rewritten. New §5.1 defines the option object (`id` = ask-local index, `label`, `kind`, optional `cardId`/`playerId`/`abilityId`/`card`) and says why an index is the only workable address. §5.2 is the eleven-kind table. §5.3 carries the per-kind traps: `order`'s `{ordered, remember}` answer and never-`null` rule, `min`/`max` as Forge's `remainingMin`/`remainingMax`, indices addressing `dest ++ source`; `choose_list`'s `reveal`; `assign_damage`'s defender at index 0 marshalling to key `null`; `assign_amount`'s colour keys; `delayedReveal`'s shape; the `manipulate_list` whole-library risk that D13 closes; `sideboard`'s `PaperCard`s. One sentence carries the rule that matters most: **every card inside an ask or input body comes from the one serialising function, and every option label through the same gate.** | 07 §1, §7; 06 §6.5–§6.8, §P2 |
| **P8** | §5.3, D13 | The pref is recorded as **D13** in `DECISIONS.md` (in-memory only, never `save()`, plus the `LOAD_CARD_SCRIPTS_LAZILY` assertion) and referenced from `docs/protocol.md` §5.3 and `PLAN.md` M0. | 08 §5; 06 §0.3, §P5 |
| **P9** | D14 | The A.I.M. Scientists overlay is recorded as **D14**, including why the override goes to `var/forge/custom/cards/` (`ForgeConstants.USER_CUSTOM_CARDS_DIR`) and not `forge-home/res/cardsfolder`, and that Forge does not create that directory. | 08 §2 |
| **P10** | `PLAN.md` M0 | The `SVar 'Any' not found` warning is reclassified **informational**, with the reason (a hard-coded sentinel in `CostTeamwork`, two cards not one, amount 0 either way, all three rules paths skip it) and the instruction that a non-zero count is not a finding. | 08 §3 |
| **P14** | README, CLAUDE.md, `.gitignore`, `config.json` | Repo layout and command lists name only files that exist, with `M2+`/`M3+`/`M4+` markers on the rest; `npm run dev:replay -- <path>` corrected to `npm --prefix web run dev:replay` plus the `?replay=` query param (the npm script takes no path argument); `forge-home/forge.profile.properties` gitignored; README says **eight milestones** and **fourteen decisions**; `scryfallUserAgent` gained a contact hint. | M0 verifier |
| **P15** | §3.2 | `Card.token` added (`CardView.isToken()`, javap-confirmed in this session). | 10 §16.1 |
| **P16** | §10 | New section **"Planned additions (M3/M6) — not yet emitted"**, reconciling report 10 §16.1 and report 11 §10 under report 11's names: `players[].phaseStops`, `state.yield`, `state.undo {can, depth}`, `stack[].{yieldKey, isAbility, isOptionalTrigger, yielded}`, `input.buttons.focus`, `input.selectable.playerIds` (player ids never travel in `cardIds`), and the acts `passPriority` / `yieldTo` / `newGame {mode}` / `setYield {yieldKey, mode}` / `useMana {color}`. It also records that **Undo, End Turn and Auto Pay are engine button *labels***, that the client renders `buttons.*.label` verbatim, and that **there is no `autoPay` act** — none was ever in the act table, and §2.2 now says so explicitly so one does not get added. A new `hello_ok` per game is documented in §2.1 and §7. | 10 §16.1; 11 §0.1, §6, §8.3, §10 |
| **P18** | README, CLAUDE.md | Both now link `docs/guides/java-for-typescript-people.md` and reports 06–11, each with a one-line description. | java primer |

Two further document-level changes, not numbered in the list:

- **The M1 appendix is gone.** The Java agent's "§10 — notes from the M1
  implementation" was an appendix of twelve observations. Each is now in the
  section it annotates — stack-id collisions and the pre-game `turn: 0` frames in
  §3.1, `loyalty`/P/T/`types` and the empty `abilities` array in §3.2, the
  measured before/after of gate 2 in §3.3, AI-vs-AI coalescing in §3.5, the
  `damageType` key in §3.6, what a recording contains and why the fixture corpus
  is split in §8.4–§8.5, and the three `stackText` decisions in §3.6 rule 1.
  Nothing was dropped.
- **The "open gap" is marked closed** in §3.3 and in `PLAN.md` M3, citing report
  06 §2 (twelve paths) and §1.2 (the exhaustive `mayLook` grep) as the
  enumeration that closes it.

### 1.2 Nullability decided once, across all four ends

The M1 review left three fields whose nullability differed between
`docs/protocol.md`, `Snap.java`, `protocol.ts` and `tools/check-redaction.mjs`.
The document now states one answer for each, and the code agents match it:

| Field | Decision | Where it is stated |
|---|---|---|
| `Card.types` | **never `null`** — `""` when Forge has nothing (and `""` for a face-down card outside battlefield/stack) | §3.2 |
| `over.reason` / `state.gameOver.reason` | **`string \| null`** — `null` when `Game.isGameOver()` is true but the `Match` outcome map is not yet populated; `""` would misreport it | §7 |
| `Card.controller` / `Card.owner` | numbers everywhere **except `state.stackCards`**, where the hint is the nullable `StackItemView.getActivatingPlayer()`; the five-key redacted stub may also carry nulls (a zone-less `CardView` from `chooseCardsPile` has null zone *and* null controller) | §3.2, §3.3 |

### 1.3 `PLAN.md`

- M0 → **done**; M1 → **done, pending hardening**, with what "pending hardening"
  means spelled out (the five work items) and the note that M1's deliverable is
  not reopened.
- M2 gains the five findings from report 07 that change how the evening is spent:
  the **37th** abstract member (`protected abstract void
  updateCurrentPlayer(PlayerView)`, absent from `IGuiGame`, so the name-level diff
  missed it); **build the `input` path before the `ask` path** (with
  `isLibgdxPort() == false` almost every yes/no is an `InputConfirm`); the
  **off-game-thread guard in `handleGameEvents`** (reached via
  `InputQueue.removeInput` from `InputSyncronizedBase.stop()` on the click
  thread — buffer, do not walk the view graph); **`openZones` as a local hint**;
  and the three rules (ids only in pushes, only the game thread blocks, no thread
  named `Game*`).
- M3's gate is marked closed, with the implementation items that replace it.
- M4 points at report 10 and lists the post-hardening fields to write against.
- M6 is rewritten against report 11: half of it needs no new wire (the engine
  already sends the labels), phase stops are answered from **`WireGuiGame`'s own
  map** (Forge consults `YieldController` only `if (isRemoteClient())`, and we are
  not one), `YieldController` is in `forge.gamemodes.match`, a `yieldKey` is a
  card name so the wire carries an opaque handle, undo is mana abilities only,
  `endCurrentGame()` invalidates every cached id, Space follows
  `buttons.focus`, and Forge has no "hold priority" feature to render.
- The deferred AI-profile item now records what it would actually be (four `.ai`
  files and a `profileOverride` argument, because the no-override branch saves a
  pref).

### 1.4 `DECISIONS.md`, `README.md`, `CLAUDE.md`

- **D13** — `UI_SELECT_FROM_CARD_DISPLAYS` off, in memory, in every process,
  before the first game; `LOAD_CARD_SCRIPTS_LAZILY` asserted `"false"`.
- **D14** — the A.I.M. Scientists overlay: committed source of truth,
  `make-forge-home.sh` copies it into `var/forge/custom/cards/`, `Smoke` proves
  the loaded card has no `Trample` and that deck legality still passes. Its
  "rejected" list records the neighbouring decision *not* to paper over the
  `SVar 'Any'` warning with a card-script lie.
- `README.md` — `check-all.sh` documented as **the one command to run before
  committing**, with what it chains; the repo layout rebuilt from what is on disk;
  a documents table linking the guide and reports 06–11.
- `CLAUDE.md` — **eleven** hard rules now. Rule 8 rewritten around the three
  gates, the five-key stub (the *only* concealed shape — its second bullet was
  corrected the same day, see the P3 row above), the single sanctioned
  `getAlternateState()`, `library.cards` and the ask-option labels. Rule 10 is the
  lints (`tools/lint-bridge.sh`'s banned list, the `CardView`-only-in-`Snap.java`
  rule with its ALLOW list, and the three conventions a grep cannot check: enums
  via `.name()`, nullable ints via `nInt`, both branches of the null-state check).
  Rule 11 is the bootstrap (D13 + D14). The abstract-member recipe now warns that
  the `comm` diff yields 36 and misses `updateCurrentPlayer`.

---

## 2. Bridge evidence

*(appended by the Java agent: build output, `lint-bridge.sh` results, the `Smoke`
keyword proof for D14, the re-recorded `g1`/`g2`/`g3` at seeds 42/7/2026, the
disjoint-fixture proof that `stack[].text` and `events[].cast.text` are gated, and
the `~/.forge` mtime comparison for the run window.)*

### 2.1 One instruction the implementation overruled, deliberately: `manaCost`

The amendment list this pass worked from said `manaCost` "arrived as the literal
`no cost` for lands and tokens and the renderer worked around it (fix at the
emitter instead: **empty string**)". The emitter uses **`null`**, not `""`, and
that is the outcome all four ends implement:

| End | What it says |
|---|---|
| `bridge/src/mtgtable/Snap.java` | tests `ManaCost.isNoCost()` and writes `null` |
| `docs/protocol.md` §3.2 | "`manaCost` is `null` for a card with no mana cost … Never `""`, and never Forge's `ManaCost.NO_COST.toString()`" |
| `web/src/protocol.ts` | `manaCost: string \| null` |
| `tools/check-redaction.mjs` | **rejects** `""` and rejects `"no cost"` — verified by probe |

`null` is the better answer: `""` is a *value* that a renderer can print and a
comparison can match, so it silently becomes a second spelling of "absent", which
is the failure the instruction was trying to prevent. 0 of the 37,243 cards in the
committed corpus carry the literal `"no cost"`, and 0 carry `""`. Recorded here so nobody re-opens it:
changing to `""` means changing the checker **first**, because the checker is the
thing that would block the emitter change.

### 2.2 Named M2 items — shapes the engine has never emitted

These are code-complete and renderer-tested but **not** engine-evidenced. Each is
an M2 item, not an M1 defect: an AI-vs-AI recording has no human seat, so nothing
in it can produce them. `fixtures/synthetic/sample-handwritten.jsonl` carries one
of each so the *renderer* is total over them today, and
`web/test/synthetic.test.ts` fails if that coverage evaporates.

| M2 item | What is missing | What would produce it |
|---|---|---|
| **M2-E1 `surveil`** | `GameEventSurveil` never fires in any recording | a deck with a surveil card, recorded once the emitter runs with `UI_SELECT_FROM_CARD_DISPLAYS` off (D13) so surveil routes to `confirm` / `choose_list` |
| **M2-E2 `phased`** | `GameEventCardPhased` never fires | one card with phasing (Teferi's Veil, Vodalian Illusionist) in a probe deck |
| **M2-E3 `foretold`** | `GameEventCardForetold` never fires, and its wire body is `{player}` because the 2.0.14 event has no card accessor | a foretell card in a probe deck. If a later Forge adds the accessor, the body becomes `{player, cardId}` and that is an amendment, not a fix |
| **M2-E4 face-down outside play** | 514 face-down cards on the battlefield and 14 in `stackCards` across the corpus; **0** anywhere else, so §3.2's "no public body outside `battlefield`/`stack`" rule is proved only by negative probes | a foretold or face-down-exiled card — the same probe deck as M2-E3 |
| **M2-E5 every `ask` and `input`** | no engine recording contains an `ask`, `input` or `notice` frame **at all** (§8.4) | M2's `WireGuiGame`. Until then the eleven kinds live in the hand-built fixture and in `docs/protocol.md` §5.2 |
| **M2-E6 an opponent-library reveal** | `library.cards` is non-empty only for the *viewing* seat, in `future-sight.jsonl` | an Opposition Agent / Bribery effect. `check-redaction.mjs` already WARNs on the shape and refuses it a permanent A6 exemption |

**What this pass did close:** `library.cards` with content is no longer on this
list. `decks/future-sight-probe.dck` (22 Island + 18 Future Sight) and
`fixtures/games/future-sight.jsonl` are engine evidence for §3.4's amendment —
98 frames carry a revealed top card — and `web/test/fixtures.test.ts` now asserts
the corpus still contains one, rather than asserting only the shape of `[]`.

## 3. Web and tooling evidence

*(appended by the web/tools agent: `check-redaction.mjs` A1–A11 results over the
committed fixtures and a fresh recording, `npm test` / `npm run build`, the
`reduce()` replace-never-merge unit test, and `check-all.sh` end to end.)*

### 3.1 The checker now fails, and there is a corpus that proves it

`tools/check-redaction.mjs` accepted five reverted amendments in silence: the
absence of a key an amendment added was downgraded to a per-file WARN, so
deleting `owner` from a stub, `token` or `alt` from a card, `cards` from a
library, or reviving an eleven-key `faceDownHidden` object all **passed**
`check-all.sh` with exit 0. The tolerance was bought for one file that
`check-all.sh` never even ran the checker on.

- The tolerance is now behind an explicit **`--pre-amendment`** flag. No
  committed file needs it and no line of `check-all.sh` passes it.
- `check-all.sh` step 6 now covers `fixtures/synthetic/*.jsonl` as well as
  `fixtures/games/*.jsonl` and the fresh recording.
- `fixtures/negative/redaction/` is the checker's own negative control:
  `baseline.jsonl` (a clean three-state slice of `g1`) plus **nine** copies
  carrying exactly one defect each. `tools/check-redaction-selftest.mjs` — step 7
  of `check-all.sh` — asserts the baseline passes clean, every probe is rejected
  *and rejected for the right reason*, `--pre-amendment` turns exactly the five
  missing-key probes into warnings, and `--pre-amendment` still refuses a stub
  with a `name` on it. Regenerate with `tools/make-negative-fixtures.mjs`.
- An opponent's non-empty `library.cards` is now **warned** about by seat and
  count, and its ids no longer join A6's `everRevealed` set: an
  Opposition-Agent-style reveal is real but transient, so it must not confer a
  permanent name-before-reveal exemption. The probe
  `a6-library-reveal-is-not-a-whitelist.jsonl` passed the old checker and fails
  the new one.

### 3.2 The hand-built fixture is no longer the odd one out

`fixtures/synthetic/sample-handwritten.jsonl` was the only artifact in the repo
carrying `input` / `ask` / `answer` frames **and** the only one still in the
pre-amendment shapes, so amendments P6 and P7 — the largest piece of protocol
surface this pass changed — had zero fixture coverage and the one file that could
have supplied it actively contradicted the spec. Regenerated from
`tools/make-sample-fixture.mjs`, it now carries five-key stubs, `token` and `alt`
on every card, `{count, cards}` libraries, no `faceDownHidden` object, **all
eleven ask kinds with the answer that closes each**, an `input` whose `focusCard`
is not in the snapshot plus non-empty `weak` and `openZones`, a face-down card in
three positions, and the `surveil` / `phased` / `foretold` events. It passes
`check-redaction.mjs` with no warnings, under the same rules as an engine
recording.

Because it does, the four fields that were typed optional in
`web/src/protocol.ts` purely to accommodate it — `library.cards`,
`input.focusCard`, `input.weak`, `input.openZones` — are now **required**, and
the four guards they forced in `Board.tsx` and `fixtures.test.ts` are gone. That
was the CLAUDE.md rule 10 pattern ("the renderer never tests for key absence")
leaking into the TypeScript side.
