# M5 fixes — the three dead ends a verification pass found, and what closed them

2026-09-12. Worktree `/home/justin-a/code/mtg-table-m5` (branch `m5`), ports
8660/8661 and 5180 only. Amendments **M28–M31** in `docs/protocol.md` come from
this pass.

M5 is the milestone called *"nothing dead-ends"*. An independent verification run
replayed its evidence — re-recording four kinds at a fresh seed, re-checking two
unreachability proofs in the 2.0.14 bytecode, playing the board in a browser — and
found the engine-side claims sound and **three live dead ends still open**, one in
each half of the seat: the scripted policy, the ask modal, and the board's own
diagnostic banner. All three are fixed here, each with the measurement that
reproduced it and the measurement that closed it.

| # | Where | The dead end | Closed by |
|---|---|---|---|
| 1 | `AutoTransport.java`, `ws-auto-play.mjs` | a `confirm` backstop that **latched** and reproduced the 969-ask loop it was written to prevent | alternation + progress-scoped counters + an ask ceiling (§1) |
| 2 | `AskModal.tsx` | the board's **Default** button on a numeric `text` ask sent `""` into `getInteger`'s `while (true)` | `defaultAnswer` returns `null` for that kind (§2) |
| 3 | `wedge.ts` | the red *"Nothing to do … concede"* banner fired on an ordinary unaffordable cast | a seventh clause: an enabled `Cancel` is not a wedge (§3) |

Four smaller findings are §4–§7; a defect this pass introduced and caught in the
browser is §8; the gate is §9. A **second** verification pass, later the same
day, found one major and two minors — all three closed in **§10**.

---

## 1. `confirm` — the backstop that chose the other wrong answer

### What shipped

`AutoTransport.answerFor`, M5 as committed:

```java
return String.valueOf(seen > 2 ? !dflt : dflt);
```

Prompts 1–2 get `defaultYes` (`true`). Prompts 3..∞ get `false` — **forever**.
On the one `IGuiGame.confirm` a human seat reaches (amendment **M24**:
`InputPassPriority`'s floating-mana warning), `false` means *do not pass
priority*, which returns to the same input, which asks again. A backstop that
latches has merely chosen the *other* non-advancing answer.

`tools/ws-auto-play.mjs:509` mirrored it verbatim, and `AskSelfTest` asserted it
as correct (`"the same confirm prompt, 3rd time FLIPS" -> "false"` and nothing
after it).

### Reproduced, twice, from a clean build

```bash
./bridge/run.sh mtgtable.MtgTable --transport auto --probe --mana-lost-prompt \
    --seed 77 --game-id skeptic-amount-77 \
    --deck decks/amount-probe.dck --deck2 decks/morph-probe.dck
```

- with `--probe`: **exit 124** at the 300 s cap, **2,278 identical `confirm`
  asks** (2 answered `true`, 2,276 `false`), a **35 MB** frame log, no `over`;
- **without** `--probe` (default policy, `--mana-lost-prompt` only, 150 s cap):
  exit 124, **1,047** confirm asks, 2 true / 1,045 false.

The gate was green **by luck**: `fixtures/games/human-amount-7.jsonl` and
`ten-games` seed 4 each happen to raise the confirm exactly twice, so neither ever
reached the third prompt. Sub-step 9c was one shuffle away from a 300 s `die`.

### The fix, in three parts

**(a) Alternate, do not latch.** `AutoTransport.java` and `ws-auto-play.mjs`:

```java
return String.valueOf(seen <= 2 || seen % 2 == 0 ? dflt : !dflt);
```

Prompt 3 → `!dflt`, 4 → `dflt`, 5 → `!dflt`. Whichever answer advances, the
policy reaches it within one prompt of the backstop engaging, and it reaches it
from either starting default — `AskSelfTest.policy()` now walks both.

**(b) "Identical" means "identical with no progress."** `askPromptsSeen` — and a
new `askRepeats` — are cleared whenever a `state` frame arrives whose
`turn|phase|activePlayer` differs from the last (`AutoTransport.progressKey`,
`onState`; the same five lines in `ws-auto-play.mjs`). An honest once-a-turn
confirm is therefore answered with the engine's own default **every turn**, and
only a prompt that repeats with the game standing still is treated as a loop.

**(c) A ceiling, because the silence watchdog cannot see an ask loop.**
`STUCK_MS` fires on *no frame for 60 s*, and an ask loop is not silent — the
engine re-asks the instant we answer, as fast as the CPU allows. So
`ASK_REPEAT_CAP = 20`: more than twenty identical asks of **any kind** with no
progress in between and the policy answers that ask (the game thread is parked on
it, so a concede dispatched while it is parked would sit behind it) and then
concedes. `AutoTransport.overAskRepeatCap` is static and package-private so
`AskSelfTest` can walk the cap — nothing a green run reaches ever would.

**(d) And the gate now asserts it.** `tools/ten-games.sh` grew a seventh
assertion: **no more than `ASK_KIND_CAP` (150) asks of any one kind in a single
game**, with the busiest kind printed per row. The busiest legitimate row in the
rotation is 22.

### Closed, measured

Same commands, same seed, after the fix:

| run | before | after |
|---|---|---|
| `--probe --mana-lost-prompt --seed 77` | exit 124 @ 300 s, 2,278 `confirm`, 35 MB | **exit 0**, 26.7 s game / 28.8 s wall, **3 `confirm`** (all `true`), 2,176,277 B, `MTGTABLE OK` |
| the same without `--probe` | exit 124 @ 150 s, 1,047 `confirm` | **exit 0**, 25.0 s, **3 `confirm`**, 2,163,076 B |

Three confirms, each answered with the engine's own default, because each was a
*different* priority pass — which is exactly what (b) is for. The 2,276 `false`
answers are gone, not merely capped.

`AskSelfTest` went from 76 checks to **106**, and now asserts alternation in both
directions, the reset after progress, and the ceiling with its own negative
controls.

---

## 2. The board's `Default` button on a numeric `text` ask

### What shipped

`AskModal.defaultDraft`:

```ts
case 'text': return { shape: 'text', text: ask.initial };
```

§5.2 says `initial` is `""` when Forge has none, so `defaultAnswer` → `""`.
`AbstractGuiGame.getInteger`'s "Other…" branch is a `while (true)` — verified in
the 2.0.14 bytecode: `235: ifnonnull 242` returns `null` on cancel, `275: goto 220`
re-asks on anything that is not a number in `[min,max]` — and the `text` body
carries **neither bound**. The button's tooltip said *"the kind's documented
default (§5.4) — always legal, always one click away"*; §5.4 as amended by M25 the
same day says the opposite, in as many words: *"`null` — cancel — is the answer
that terminates and `""` is not."*

### Reproduced live

Bridge on 8661 (`decks/number-probe.dck`, seed 7), vite on 5180. Volcano Hellion
→ `choose_list` (ten `kind:"number"` options plus one `kind:"text"` `Other...`)
→ option `[10]` → `text` ask `a2`, *"Enter a number between 0 and 99:"*. Pressing
**Default** produced `a3`, then `a4`, `a5`, `a6` — the identical question every
time. An empty box plus **Answer** did the same. `Cancel (null)` escaped, so it
was recoverable, not a hard wedge.

### The fix

- `defaultAnswer(ask)` returns **`null`** when `ask.kind === 'text' && ask.numeric`.
  `defaultDraft` is deliberately unchanged — the form still opens on `initial`,
  because a numeric box pre-filled with nothing is what a numeric box should look
  like. It is the *one-click answer* that must terminate.
- A new exported `draftIsSendable(ask, draft)` disables **Answer** while a numeric
  box is empty or not a number, with the reason in its tooltip. It does **not**
  range-check: the body carries no `[min,max]` and `CLAUDE.md` §Scope forbids the
  client inventing one.
- The **Default** tooltip for that kind now reads *"cancel (null) — §5.4/M25: for
  a numeric ask this is the only answer that terminates."*
- The modal body carries M25's warning verbatim: *"a number outside the engine's
  range comes back as the same question."*
- `web/test/ask-modal.test.tsx` pins
  `defaultAnswer({kind:'text', numeric:true, initial:''}) === null`, the four
  `draftIsSendable` cases, and that the free-text kind is untouched.

Amendment **M29** states the client rule in `docs/protocol.md` §5.4.

### Closed, measured live

The same deck, the same ask. Modal as rendered:

```
TEXT  a2 · timeout 0 ms   THE ENGINE IS WAITING FOR THIS
Enter a number between 0 and 99:
initial (empty) · numeric
[Answer: DISABLED] [Default] [Cancel (null)] [Reset]
This is getInteger's "Other…" box (§5.3, amendment M25). Forge re-asks in a
while (true) until the string is a number inside a range this frame does not
carry, so a number outside the engine's range comes back as the same question.
"Default" sends null — cancel — which is the answer that terminates.
```

Pressing **Default**: the modal closed and the game moved on to the next cast's
`Pay Mana Cost: {2}{R}{R}`. The session's frame log
(`var/games/fixcheck-number/frames.jsonl`) carries **one** `text` ask and one
answer:

```
choose_list a1 = [10]
text        a2 = null
```

No `a3`.

---

## 3. The wedge banner on an ordinary unaffordable cast

### What shipped

`wedgeSuspected` held six clauses (M21): OK disabled, `selectable` empty, no ask,
game not over, this seat holds priority — plus the component's 2.5 s quiet timer.

### Reproduced live

Bridge on 8660, `decks/pacho-shield.dck`, seed 42. With one Island on the table I
clicked `Quake, Agent of S.H.I.E.L.D.` ({2}{W}). Forge pushed:

```
prompt : "Quake, Agent of S.H.I.E.L.D. - Creature 3 / 3\n\nPay Mana Cost: {2}{W}"
ok     : { label: "Auto",   enabled: false }
cancel : { label: "Cancel", enabled: true  }
selectable: (none): 0 ids
```

…and no further frame. All six clauses hold after 2.5 s, so the panel rendered
`class="banner banner--error" role="alert"`: *"Nothing to do. … §4.2 calls that
the signature of a wedged game thread. Resync; if that does not help, concede."*
Clicking the enabled `Cancel` next to it recovered instantly.

Clicking a spell you cannot pay for is the single most likely mistake a hobbyist
learning Magic makes.

### The fix

One clause, first in the list of things that are *not* a wedge:

```ts
if (input.buttons.cancel.enabled) return false;
```

A state the engine is offering a **labelled way out** of is by construction not
"nothing to do", and a genuinely wedged game thread is not pushing an enabled
button at you — it is not pushing anything. Amendment **M28**; §4.2 now says
seven clauses.

### Closed, measured

`web/test/wedge.test.ts` keeps the M21 method — measure the difference, do not
assert it from memory — so `wedgeSuspectedPreCancelClause` was added beside
`wedgeSuspectedPreM21` and the corpus line now prints three counts:

| recording | pre-M21 | M21 (6 clauses) | **+ cancel clause** |
|---|---|---|---|
| `human-ability-42.jsonl` | 334 | 311 | **40** |
| `human-amount-7.jsonl` | 296 | 282 | **4** |
| `human-auto-2026.jsonl` | 120 | 119 | **15** |
| `human-auto-42.jsonl` | 334 | 311 | **40** |
| `human-auto-7.jsonl` | 359 | 351 | **0** |
| `human-number-7.jsonl` | 407 | 342 | **36** |
| `human-scry-7.jsonl` | 103 | 98 | **4** |
| `human-search-7.jsonl` | 135 | 122 | **12** |
| `human-trample-7.jsonl` | 273 | 257 | **9** |

(measured against the re-recorded fixtures of §6) and the worst gap to the next
frame after any flagged frame is still **≤ 58 ms** against a 2,500 ms banner, so
the clause removes noise and flags nothing new.

Two negative controls were added, both from the frame measured above: **an
unaffordable cast with `Cancel` enabled is not a wedge** (and the six-clause rule
must still flag it, or the control measures nothing), and **the same frame with
`Cancel` disabled still is**. The board is a real one — the first snapshot of
`human-auto-42.jsonl` in which this seat holds priority — because no committed
fixture contains an unaffordable cast: the scripted seat never makes that mistake.

Live, after the fix: 10.2 s parked in the identical state, `banners: []`,
`document.querySelectorAll('[role="alert"]').length === 0`.

---

## 4. The mana pips, twice over (amendment M30)

**The spec and the client disagreed in print.** M26 ended *"Offer the control only
while the engine is asking for mana (an `input` whose OK button the engine
labelled `Auto`)"*, and the board does not do that — it offers the pips whenever
the pool is non-empty and no ask is outstanding. The builder's reason is right and
is now written down rather than implied: **deciding what a control does by
matching an engine button label is what `CLAUDE.md` §Scope forbids**, and the
label is Forge's to change. There is no typed signal on the wire; adding
`input.payingMana` (one line, `inputQueue.getInput() instanceof InputPayMana`) is
an M6 row, and §2.2 now says so and says to delete the paragraph when it lands.
Meanwhile the pip's own title tells the truth:

> `act: useMana U — spend one floating U (key U). The engine accepts it only
> during a mana payment (§2.2, M30); at any other time it is silently dropped.`

**And `color` is a letter here.** M26 said "send the full name" while the browser
has sent `"U"` / `"R"` since M1 (`ManaColor` in `protocol.ts`). Verified in the
2.0.14 bytecode: `MagicColor.fromName` tests `length == 2` on the **raw** string
first (offsets 18–44) and only then lowercases and switches on `w u b r g c` for
length 1 (offsets 45–257, returning 1/2/4/8/16/0), so a one-character `ManaColor`
can never reach the colour-pair branch. §2.2 now records that both spellings are
correct and that a **two**-character string is still a colour *pair*.

---

## 5. The stale pool between a `useMana` and the next snapshot

Forge pushes **no `state` frame for a mana payment**. Measured again live: with
`U1` floating and `Pay Mana Cost: {2}{W}` on screen, clicking the U pip took the
cost to `{1}{W}` — the act really paid — and the only frames that followed were
`input`s, so the last snapshot still said `manaPool {U:1}` and the pip went on
rendering a live button with the count **1** over an empty pool.

The bridge-side fix (emit a snapshot after an applied `useMana`) is a game-thread
change and hard rule 3 says where snapshots may be built, so the client half was
taken instead. `Board` remembers the `board` object it sent a `useMana` against —
the reducer replaces `board` wholesale on every `state`, so object identity *is*
the question "has a snapshot arrived since?" — and while it is still that object
the pips render **provisional**: dimmed, `·` in place of the count, title *"waiting
for the next snapshot"*, `aria-label` "count unconfirmed", `data-provisional="true"`.

They stay **clickable**, deliberately: paying `{2}` with two blue mana is two
clicks and the second one is real. What is withheld is the number, not the
control — *a hint that lies is worse than no hint* (report 10 §5).

Measured live, in order: `pool pool--live` with `["0","1","0","0","0","0"]` →
click → cost `{2}{W}` → `{1}{W}` and `pool pool--live pool--provisional` with
`["·","·","·","·","·","·"]` → Cancel → next snapshot → `pool pool--live`,
`floating mana — W0 U1 B0 R0 G0 C0`.

---

## 6. The session header records what shaped the run (amendment M31)

`fixtures/games/human-amount-7.jsonl` carried two `confirm` asks that **cannot**
occur on stock Forge preferences, with nothing in the file saying why — the only
record was `docs/evidence/m5-probes.md`. A reader who re-recorded it on defaults
would conclude the emitter had changed.

`MtgTable.sessionHeader` now writes two **optional** keys, omitted when unset so
no existing recording changes: `"policy": "probe"` for `--probe`, and
`"prefs": ["UI_MANA_LOST_PROMPT"]` for `--mana-lost-prompt`.
`tools/check-redaction.mjs` shape-checks both and requires neither; §8.1 documents
them. The opponent deck-path nulling is deliberate and untouched.

The four M5 fixtures were re-recorded so they carry it. Compared with
`tools/fixture-multiset-diff.mjs`:

| fixture | difference from the committed version |
|---|---|
| `human-ability-42.jsonl` | **the header line only** (`"policy":"probe"`) |
| `human-amount-7.jsonl` | **the header line only** (`"policy":"probe","prefs":["UI_MANA_LOST_PROMPT"]`) |
| `human-search-7.jsonl` | the header, plus 8 `input` frames where Forge's `awaitNextInput()` re-push landed differently (778 → 776 lines). Identical ask kinds, identical acts. |
| `human-number-7.jsonl` | the header, plus **six `text` answers instead of one**: `a2 a5 a8 a10 a13 a16` are all `"0"` where the committed file had `"0" null null null null null` |

That last one is §1(b) working as intended: the six Volcano Hellion casts are six
separate questions on six different turns, not five rejected repeats of one, so
the probe answers each with a real string and the fixture now carries **six**
round trips through `showInputDialog` rather than one. Ask kinds, act counts and
line counts are otherwise identical, and all sixteen committed logs still PASS
`tools/check-redaction.mjs` with no flags.

---

## 7. `ten-games.sh` row 8 says what it cannot promise

Row 8 is `decks/trample-probe.dck` and it produces **no `assign_damage`** at
seed 8 — reproduced here (`seed 8  trample-probe  21 (round 11)  30s
[choose_list]`), the third independent run to measure the same thing. The file's
comment said the probe decks are in the rotation because they *"force an ask kind
the user's deck never produces"*, which for this row at this seed is not true; the
caveat lived only in `docs/evidence/m5-probes.md` §10.

The caveat is now in the `ROWS` comment beside seed 8 — `assign_damage` needs two
blockers on one attacker or a trampler that gets through, which a seed does not
guarantee, and the committed `human-trample-7.jsonl` is where that kind's evidence
lives — and each row carries the kind it exists to force as a fifth field, printed
as an **ADVISORY** line and never as an exit code. This run printed two:

```
ADVISORY: seed 8 produced no assign_damage -- which kinds fire is a property of
          the shuffle, not of the code (see the ROWS comment)
ADVISORY: seed 10 produced no order -- …
```

A row that stops producing its kind is now visible instead of silent, and the gate
still asserts what it always asserted: that nothing dead-ends, not that a kind
fires.

---

## 8. A defect this pass introduced, and the browser that caught it

Wiring §5's provisional pips, `spendMana` was written as a `useMemo` — placed
where the old expression was, which is **below** `Board`'s one early return
(`if (board === null) return <empty board/>`). React counts hooks per render, so
the first frame with a board threw *"Rendered more hooks than during the previous
render"* and `ErrorBoundary` drew *"The board could not render frame 3."*

**The whole suite stayed green.** `render.test.tsx` mounts every frame with
`renderToStaticMarkup`, which builds a fresh tree each time and therefore can
never see a hook-count change *between* renders of one component; this repo's
vitest setup has no DOM to re-render into. Only the browser saw it.

Fixed by making the value a plain expression (a fresh closure per render costs
nothing; `PlayerRail` is not memoised), and pinned by a new source-level test,
`web/test/hooks-order.test.ts`: no `use*` call may appear between `Board`'s
`board === null` guard and the end of the component. Negative-controlled — putting
a `useMemo` back below the guard turns it red.

---

## 9. The gate

```
rm -rf bridge/out && ./tools/check-all.sh   →  check-all OK   (real 8m52.079s)
```

Run twice from a deleted `bridge/out`: 8 m 57.407 s and 8 m 52.079 s.

- **step 3** `JsonSelfTest: 38` / `AskSelfTest: 106` (was 76) / `GameLogSelfTest: 35`, 0 failures
- **step 6** `OK: 377 normalised lines identical to fixtures/games/g1.jsonl`
- **9b** `MULTISET IDENTICAL: 1588 frame(s)` against `human-auto-42.jsonl` — the default policy did not move
- **9c** `10/10 games reached over, zero UNIMPL, every log through check-redaction`, **268 s**, seven kinds
  (`ability_menu assign_amount choose_entities choose_list confirm order text`),
  busiest kind in any one game **22** against a cap of 150
- **10f** `OK: 7 clickAbility act(s) over the socket, none of them unresolvable`
- **11** all sixteen committed fixtures PASS with no flags
- **13** `npm run build` → `dist/assets` **4 files, 1,432,461 B** (922,040 of which is the JS source map), **one** font — `mana-D0absDf6.woff2`, 187,400 B; and `npm test` **377** `node --test` (372 pass, 0 fail, 5 skipped) + **55** vitest
- **9b** printed `MULTISET DIFFERS: 2 frame instance(s)` on the *final* run and `IDENTICAL: 1588` on the one before it. The two frames are **the same frame** — `input {prompt:"Waiting for Forge AI..."}` — at multiplicity 16 vs 14, i.e. `awaitNextInput()`'s 250 ms re-push landing a beat differently, which is why the step is advisory. Re-recorded seed 42 twice more by hand afterwards: `MULTISET IDENTICAL: 1588 frame(s)` both times. The emitter did not move.

Processes: every one started here was killed by PID; `ss -ltnp` showed nothing on
8660, 8661 or 5180 afterwards. The main checkout, `~/forge` and `~/.forge` were
never written.

---

## 10. A second verification pass — one major, two minors

Later on **2026-09-12**, after §1–§9 were green, a second independent pass
re-ran the gate, re-recorded six probe sessions at seed 77, re-derived the two
unreachability proofs from the jar and played the board again. It found the
engine side sound and three things wrong on this side.

| # | Where | Severity | The finding | Closed by |
|---|---|---|---|---|
| 10.1 | `web/src/styles.css`, `Board.tsx` | **major** | the M5 combat-band strip destroyed M4's middle zone rows at ordinary laptop heights | `.bands` leaves the flow — `docs/evidence/m5-board.md` §11 |
| 10.2 | `tools/ten-games.sh` | minor | `useMana` had **no** automated end-to-end guard, and `check-all.sh` said it did | ten-games **assertion 8** (§10.2) |
| 10.3 | `docs/evidence/m5-board.md`, `PLAN.md` | minor | "board-shaped asks stop being modals" reaches exactly one kind here, and nothing on record said so | the census (§10.3) |

### 10.1 The band strip was a grid row

`<CombatBands/>` was mounted as an in-flow child of `.table__middle`, whose
`grid-template-rows` is `1fr 1fr`, so it landed in an **implicit auto third
row** — and an auto row is sized to its content before the `1fr` rows get
anything. At 1600 × 900 both strip rows measured **0 px**
(`gridTemplateRows: "0px 0px 112px"`), their 62 px tiles overflowed, and the two
zone-browser caption buttons overlapped by 9 px, leaving 4 px of the opponent's
control hittable. It is fixed by making `.bands` an overlay like `.stackpanel`,
and the before/after `gridTemplateRows` at four viewports — plus the live
measurement — is **`docs/evidence/m5-board.md` §11**.

### 10.2 `useMana` had no gate, and the gate said it did

`tools/check-all.sh` step 10f said, in as many words, that `useMana` *"is
REPORTED here and asserted elsewhere: … its gate is ten-games.sh seed 4 on
decks/amount-probe.dck"*. It was not: `grep -c useMana tools/ten-games.sh`
returned **0**. Seed 4 does produce the acts (18 of them), and 10f printed
`probe acts 0 useMana, 7 clickAbility`, so **nothing in the gate would have
failed** if `AutoTransport` had stopped sending the act or the bridge had stopped
applying it. Its only remaining coverage was the pure client mapping
(`web/test/pool.test.ts`, `keys.test.ts`) and a static fixture. Contrast
`clickAbility`, which 10f does assert (`>= 1`).

`ten-games.sh` now has a sixth `ROWS` field — acts that **must** appear, an exit
code rather than the fifth field's advisory — and seed 4 carries `useMana`.
Assertion 8 is two halves, because the count alone is the weaker question:

- `grep -c '"action":"useMana"' "$frames" >= 1` — AutoTransport still sends it;
- and the **effect**: the seat's `manaPool` is strictly smaller in the `state`
  frame after a `useMana` act than in the `state` before it. That is the half
  that would catch a bridge which accepted the act and dropped it.

Measured on the row itself:

```
===  4/10  seed 4   amount-probe.dck             --probe --mana-lost-prompt
PASS  var/games/ten-4/frames.jsonl
    acts: useMana x18 (pool dropped after 7 of 18)
```

**Negative-controlled, both halves**, against that same frame log:

| doctored log | acts | drops | which assertion fires |
|---|---:|---:|---|
| unmodified | 18 | 7 | none — passes |
| every `"action":"useMana"` line deleted | 0 | 0 | the count (`grep -c` → 0) |
| every `state`'s `manaPool` frozen at `{W:2,…}` — "the bridge ignored the act" | 18 | 0 | the effect |

`check-all.sh`'s comment at 10f now names assertion 8 and records that it was
written *because* the comment claimed it.

### 10.3 The picker reaches one kind, and now says so

Over `fixtures/games/` — 15 recordings, **108 asks** — `boardPick` accepts
**3**, and all three are `assign_damage`. The `choose_list` branch is exercised
only by the hand-written `fixtures/synthetic/sample-handwritten.jsonl`, and no
live browser session has produced a card picker. Every other card-optioned ask
in the corpus is excluded by a *stated* rule — 22 `choose_list` reveals
(`min = max = −1`) and 7 `choose_entities` with a `delayedReveal`, both modal by
§5.3 — and the rest have no board entity to point at. The full table, by option
kind, is now `docs/evidence/m5-board.md` §1.1; `PLAN.md` M5 carries the summary;
and `web/test/picker.test.ts` prints the census on every run and asserts
`assign_damage:picker > 0` by name:

```
ℹ picker/modal census (5 picker, 115 modal): ability_menu:modal=21 assign_amount:modal=11
  assign_damage:picker=4 choose_entities:modal=8 choose_list:modal=57 choose_list:picker=1
  confirm:modal=3 manipulate_list:modal=1 options:modal=1 order:modal=5 sideboard:modal=1 text:modal=7
```

(That line is over `games/` **and** `synthetic/`, which is why it reads 4 + 1
rather than 3 + 0.)

### 10.4 The gate, after these three

```
rm -rf bridge/out && WSPORT=8663 ./tools/check-all.sh   →  check-all OK
```

- **step 3** `JsonSelfTest: 38` / `AskSelfTest: 106` / `GameLogSelfTest: 35`, 0 failures
- **step 6** `OK: 377 normalised lines identical to fixtures/games/g1.jsonl`
- **9b** ADVISORY `MULTISET DIFFERS: 2 frame instance(s)` — **the same frame the
  §9 run saw**: one `input {prompt:"Waiting for Forge AI..."}` at A×16 vs B×14,
  i.e. two ticks of `awaitNextInput()`'s 250 ms re-push, with a browser and a
  vite server on the same machine. Re-recorded seed 42 twice more afterwards on
  a quiet machine: `MULTISET IDENTICAL: 1588 frame(s)` both times. No Java
  changed in this pass (`git diff --stat` touches no `.java` file), and the
  emitter did not move.
- **9c** `10/10 games reached over, zero UNIMPL, every log through
  check-redaction`, **268 s**, seven kinds, and the new
  `acts: useMana x18 (pool dropped after 7 of 18)`
- **10f** `OK: 7 clickAbility act(s) over the socket, none of them unresolvable`
- **13** `npm run build` → `dist/assets` **4 files**, one font
  (`mana-D0absDf6.woff2`, 187.40 kB); `npm test` **377** `node --test`
  (372 pass, 0 fail, 5 skipped) + **55** vitest

**The browser, live** (bridge on **8660**, vite on **5180**, `pacho-shield`
seed 5, conceded at turn 5): the band strip rendered bottom-anchored inside the
middle at 87 px with one real band, the two zone rows stayed at
`68.70px 68.70px`, both caption buttons hit-tested to themselves, and clicking
the `Human · graveyard 2 ⤢` caption **through** the band strip opened the zone
browser with 2 `CardTile`s, both clickable — which is the escape hatch that
makes the overlay honest. Zero `[role="alert"]`, no body scroll, zero
`.tile--concealed`, and `check-redaction.mjs var/games/fix2-live/frames.jsonl`
**PASS** (174 opponent-hand cards, all redacted).

Ports used: 8660 and 8663, and 5180 for vite — never 8642 or 5173. Every process
started here was killed by PID; `ss -ltnp` showed nothing on 8660–8669
afterwards. Nothing was written under `~/forge`, `~/.forge` or the main
checkout.
