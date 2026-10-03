# M5 evidence — the board side: nothing dead-ends

What was actually run, on **2026-09-12**, with real numbers. This is the **board
half** of M5 (`PLAN.md` §M5 and "What M4 hands to M5"): `useMana`, the asks that
stop being modals, zone browsers, the pending-target arrow, the declared combat
bands, the targeting count, and five of the eight M4 follow-ups. The probe decks
and the new fixtures are a separate pass and are cited here where they were used.

Nothing here re-implements an M4 affordance. The seam is still
`<Board actions={…}/>` — `null` is a replay and every control is inert, non-null
is a seat — clicks are still never gated on `selectable` (amendment **M8**), the
engine's button labels are still rendered verbatim, and every card on the screen
still goes through the one `CardTile`.

---

## 0. What shipped

| File | Lines | What it is |
|---|---:|---|
| `web/src/render/picker.ts` | 333 | **new** — the decision "is this ask answerable on the board?", the `Targeting` context a tile reads, `drawnEntities`, and `toggleChoice` (moved here from `AskModal.tsx`, one function, two callers) |
| `web/src/render/AskPicker.tsx` | 295 | **new** — the decision panel's half of a board-shaped ask: kind, id, prompt, running count, the candidate list with the engine's labels verbatim, Answer / Default / Cancel (null) / Reset |
| `web/src/render/CombatBands.tsx` | 175 | **new** — the declared attackers and blockers, from `combat.bands` only |
| `web/src/render/zones.ts` | 126 | **new** — which zones may be browsed, by whom, and what a panel contains (pure) |
| `web/src/render/ZoneBrowser.tsx` | 113 | **new** — the panel itself, every card through `CardTile` |
| `web/src/render/pool.ts` | 58 | **new** — `spendableColors` / `manaPipAct` / `manaColorForKey` (pure) |
| `web/src/mana.css` | 1,994 | **new** — an extract of `mana-font@1.18.0`'s stylesheet with its two `@font-face` blocks replaced by one woff2 (§7) |
| `web/src/render/Board.tsx` | 1,179 (+365) | the ask draft, the zone panels, the hover, the click counter, the `Targeting` provider, the pending arrow's source |
| `web/src/render/CardTile.tsx` | 554 (+111) | a candidate tile: the `ask` outline, `data-ask-option`, a click that answers instead of acting, the `assign_damage` number input, hover handlers **on candidates only** |
| `web/src/render/AskModal.tsx` | +131 | `art`, and `CardTile` for `order`, `manipulate_list` and the delayed-reveal panel |
| `web/src/render/DecisionPanel.tsx` | 417 (+59) | mounts `AskPicker`; "chosen k of min..max"; the dead "Auto Pay" button is gone (§6) |
| `web/src/render/Mana.tsx` | +78 | `ManaPoolPips` takes `onSpend`: a pip with mana under it is a `<button data-act="useMana">` |
| `web/src/render/PlayerRail.tsx` | +68 | the live pips, a seat as an ask candidate, a way into the library browser |
| `web/src/keys.ts` | +83 | the `useMana` row and `planKey`'s mana pre-pass; `KeyContext.poolColors`; the `zones` overlay |
| `web/src/render/arrows.ts` / `ArrowsOverlay.tsx` | +43 / +23 | the fourth arrow class, `pending`, and `pendingArrow` |
| `web/src/render/ZoneRow.tsx` | +25 | the caption becomes the way into the browser |
| `web/src/styles.css` | 2,656 (+470) | the M5 block, plus M4 follow-ups 6 and 7, plus the band-strip fix (§11) |
| `web/test/picker.test.ts` | 253 | **new** — 7 tests: the rule, over every ask in the corpus, plus the printed picker/modal census (§1.1) |
| `web/test/board-m5.test.tsx` | 328 | **new** — 9 tests: picker vs modal in the real `<Board/>`, a pip click that produces the act, the zone browser |
| `web/test/zones.test.ts` | 150 | **new** — 4 tests: no panel can show another seat's hand |
| `web/test/pool.test.ts` | 99 | **new** — 5 tests: the pip → act mapping |

**1,431 insertions, 133 deletions** across 14 edited files, plus 11 new ones.

---

## 1. The rule: which asks stop being a modal

`PLAN.md` is explicit that M5's job *"is not 'a modal for these kinds'; it is
'the board-shaped ones stop being a modal'"*. The rule is one sentence, and it
lives in `web/src/render/picker.ts`:

> An `ask` is board-shaped **iff every one of its options is a card the board is
> already drawing a tile for, or a player it is drawing a rail for.**

Three clauses, each load-bearing:

- **every**, not most. A picker that can express four of five options is a dead
  end for the fifth, and M5's exit criterion is that nothing dead-ends. One
  option outside the board sends the whole ask to the modal.
- **already drawing**, not "the id resolves". `drawnEntities()` is written
  against what `Board.tsx` mounts, not against `resolve.findCard`, and the two
  are different sets on purpose: another seat's hand is in the snapshot (as
  five-key stubs) and is **never** drawn (report 10 §3.2), and an unrevealed
  library card has no tile either. `stackCards` are excluded as well, because
  the stack panel can be collapsed with `S`.
- a `choose_list` with `reveal: true` (§5.3 — "acknowledge only", min = max = −1)
  and a `choose_entities` with a `delayedReveal` (§5.3 — the engine handing over
  cards out of a hidden zone) are **never** pickers, cards or not. Neither is a
  choice made *on the board*, and the reveal panel belongs in the modal.

`assign_damage` is the same question about a different answer shape: it is
board-shaped when every **blocker** has a tile, because that is where the number
inputs go. The defending player is option 0 and keeps its row in the panel
(§5.3), and the index is never renumbered.

**The picker marshals nothing.** The answer is built by `AskModal`'s own
`answerFromDraft` / `defaultDraft` from the same `AskDraft` the modal uses, so
the two surfaces cannot disagree about what an answer looks like — which §5.3
says a recording cannot catch.

### 1.1 The split, measured over the whole committed corpus

Every `ask` frame in `fixtures/games/` and `fixtures/synthetic/`, folded through
the real reducer and put through `boardPick` with that frame's own board:

| kind | modal | picker |
|---|---:|---|
| `ability_menu` | 21 | — |
| `assign_amount` | 11 | — |
| `assign_damage` | — | **4** (2 with 2 candidates, 2 with 3) |
| `choose_entities` | 8 | — |
| `choose_list` | 57 | **1** (3 candidates) |
| `confirm` | 3 | — |
| `manipulate_list` | 1 | — |
| `options` | 1 | — |
| `order` | 5 | — |
| `sideboard` | 1 | — |
| `text` | 7 | — |

`web/test/picker.test.ts` asserts both columns are non-empty, so neither branch
can rot: a corpus where nothing became a picker, or where everything did, fails.

The four `assign_damage` pickers are **engine-produced** — two from
`fixtures/games/human-trample-7.jsonl` (the M5 trample probe) and two from
`human-ability-42.jsonl`. The `choose_list` picker is the synthetic discard
(three cards in the viewer's own hand). The 57 `choose_list` modals are mostly
Forge's *"Choose optional costs"* (`kind: "other"` — a cost, not a card) and its
reveals.

**And that is one kind, in practice — say so.** Split the table by where the
frames came from and the honest summary of this milestone's headline is a
number:

| corpus | files | asks | pickers |
|---|---:|---:|---|
| `fixtures/games/` — engine recordings | 15 | **108** | **3, all `assign_damage`** (`human-trample-7`, `human-ability-42`, `human-auto-42`) |
| `fixtures/synthetic/sample-handwritten.jsonl` — hand-written | 1 | 12 | 2 (one `assign_damage`, one `choose_list`) |

So the `choose_list` branch of the picker is exercised **only by the synthetic
generator** — which is also the only file in the repo carrying an `options`, a
`manipulate_list` or a `sideboard` — and no live browser session (the builder's
or the verifier's) has produced a card picker at all. "Board-shaped asks stop
being modals" reaches exactly one kind against this engine and these decks.

That is a fact about what Forge asks, not a gap in the rule, and every other kind
is excluded by a *stated* rule rather than by accident. The whole of
`fixtures/games/`, by option kind:

| ask | n | option `kind` | why not a picker |
|---|---:|---|---|
| `assign_damage` | 3 | `card` + `player` | — it **is** the picker |
| `choose_list` (`reveal: true`) | 22 | `card` | §5.3 — `min = max = −1`, acknowledge only; there is nothing to point *at* |
| `choose_entities` | 7 | `card` | every one carries a `delayedReveal` (§5.3): cards out of a hidden zone, which have no tile |
| `choose_list` | 24 | `other` | Forge's *"Choose optional costs"* — a cost, not a board entity |
| `ability_menu` | 20 | `ability` | an ability is not a tile (D20/D22) |
| `assign_amount` | 10 | `color` | a mana colour is not a board entity |
| `choose_list` | 6 | `number` + `text` | `getInteger`'s number list plus *"Other…"* (**M25**) |
| `choose_list` | 4 | `color` | e.g. the Thriving-land colour choice — correctly modal |
| `text` / `order` / `confirm` | 6 / 4 / 2 | *(no options)* | nothing to draw on the board |

**Those 22 + 7 = 29 card-optioned asks are the whole of what a card picker could
ever have taken here, and §5.3 sends every one of them to the modal on purpose.**
`options` would be the remaining candidate and has no call site anywhere in the
2.0.14 jar (**M22**).

`web/test/picker.test.ts` now prints this census as a `t.diagnostic` line on
every run and asserts `assign_damage:picker > 0` by name, so the split is a
number in the suite output rather than a sentence in a document — and the day a
card picker does appear, the number moves visibly.

### 1.2 What the picker looks like

`?replay=games/human-trample-7.jsonl`, frame **528 / 1155**, the real
`assign_damage` the trample probe was built to force:

- the decision panel: `ASSIGN_DAMAGE  a1 · timeout 30000 ms · the engine is
  waiting for this`, the prompt *"Assign 3 combat damage from #28 (order
  overridden)"*, **assigned 3 of 3 ✓**, and two candidate rows —
  `[0] Forge AI — the defender (option 0, §5.3) · player 1` and
  `[1] face-down card — lethal 2 · card #55`, each with a number input;
- the blocker's own tile on the battlefield carries the same number input
  (`3`, with `lethal 2` beside it), disabled because this is a replay;
- no modal, no scrim: the board is visible, and the attack (red) and block
  (green) arrows are drawn over it.

`?replay=synthetic/sample-handwritten.jsonl`, frame **15 / 35**, the
`choose_list` discard: the three candidate cards in the hand are outlined — a
**distinct `ask` variant**, purple with a `?` caret, not the gold `selectable`
outline, because they are different states (§5 vs §4) — the chosen one turns
green with a `✓`, and the panel reads *"chosen 1 of 1 · click the outlined cards
on the board"*.

### 1.3 The modal is unchanged, and still has work to do

Four kinds got engine evidence for the first time today, from the probe agent's
new fixtures, and all four are modals **by the rule**, not by omission:

| fixture | kind | what the modal renders |
|---|---|---|
| `human-search-7.jsonl` @ 207 | `choose_entities` + `delayedReveal` | 14 option rows (*"Select a card from your library"*) and the panel *"Rampant Growth - Looking at cards in library of player 0"* with **31 cards drawn as `CardTile`s** |
| `human-amount-7.jsonl` @ 246 | `assign_amount` | *"Assign 2 mana from #28"*, five rows `white/blue/black/red/green — color · max 2` — §5.3's `MagicColor.Color` keys, exactly as predicted |
| `human-number-7.jsonl` @ 578 | `text` | *"Enter a number between 0 and 99:"*, `initial (empty) · numeric` |
| `human-ability-42.jsonl` @ 197 | `ability_menu` | *"Choose an ability of card #2"*, `[0] A.I.M. Scientists … can play`, `[1] Basic landcycling {2} …` |

The delayed-reveal panel is the one M5 changed: it was a list of names and is now
31 tiles through the one card renderer. Those cards came off the wire through the
same gated serialiser as every other card (§5), which is why drawing them adds no
name the frame did not already carry — and `web/test/render.test.tsx` now says so
explicitly rather than implicitly (§8).

---

## 2. `useMana` — the one real dead end, closed

`PLAN.md`: *"A state in which Forge expects floating mana to be spent through
`useMana` cannot be resolved from the browser at all. Everything else on this
list is a missing comfort."*

- **The pips are controls.** `ManaPoolPips` takes an `onSpend`; a colour the pool
  actually holds renders as `<button data-act="useMana" data-mana="U"
  aria-label="spend one U — 1 floating">`, and the six read-only pips are what
  everything else still gets (a replay, the opponent's rail, an outstanding ask).
- **The act is a colour and nothing else** (§2.2): `manaPipAct(pool, color)` is
  pure, returns `{action:"useMana", color}` or `null`, and
  `web/test/pool.test.ts` asserts the object has exactly two keys — *"A `cardId`
  is a `clickCard`, not a `useMana`"*.
- **The keyboard is `W U B R G C`**, and it is a *pre-pass* in `planKey` rather
  than an ordinary table row: with the colour floating the letter spends it,
  and with an empty pool `C` is still Forge's `SHORTCUT_SHOWCOMBAT` and `B` is
  still M6's pass-to-before-my-turn (`bindingFor` is a first-match lookup and the
  `useMana` row is deliberately **last** in `KEYMAP`). A letter with no mana
  behind it says *"no floating mana of that colour — tap a land first"* rather
  than doing nothing.

**Measured live** (seed 42, the user's deck, the ws bridge on port 8660):

```
turn 1, main phase: click Island #38 in hand   → Island #38 on the battlefield, hand 7 → 6
                    click Island #38 on board  → tapped; rail reads "mana pool: 1 U"
                                                 pip U becomes a button, pool--live
                    click the U pip            → var/games/human-ws-42/frames.jsonl line 40:
   {"v":1,"seq":6,"t":1789211979564,"dir":"c2s","type":"act",
    "body":{"action":"useMana","color":"U"}}
```

The act reached the bridge and **the pool did not change** — which is correct:
nothing was being paid at that moment, so Forge dropped a meaningless act, which
§2.2 says is exactly the right response ("the response to a meaningless `act` is
to drop it … never to crash and never to block"). The board did not hang, did not
guess, and did not invent a local rule about when a pip may be pressed.

The session's own act histogram: **52 `buttonOk`, 9 `clickCard`, 1 `useMana`**,
and zero `ask` frames in thirteen turns — which is why the ask picker had to be
screenshotted from a recording rather than from that game (§9).

### 2.1 Two notes against the probe pass's amendment M26

The probe pass landed `docs/protocol.md` amendment **M26** the same day, and it
says two things this client has to answer for.

1. *"`color` is a colour **name** … `MagicColor.fromName` … parses a
   **two-character** string as a pair of colours, so send the full name."* This
   client sends the single letter `"U"`, which is what `protocol.ts` has typed
   `UseManaAct.color` as since M1 (`ManaColor` = `W U B R G C`, the same six keys
   `state.players[].manaPool` carries). That is **safe, and checked in the jar's
   own bytecode** rather than assumed:

   ```
   forge.card.MagicColor.fromName(String):   null → 0
                                             "all" → 31
                                             length == 2 → fromName(c0) | fromName(c1)   ← the trap
                                             else → toLowerCase(), then the 1-char switch
                                                    w u b r g c
   ```

   A `ManaColor` is one character, so the two-character branch is unreachable
   from here, and the `toLowerCase()` on the way to the switch is why `"U"`
   arrives as blue. The other two transports (`ConsoleTransport`,
   `AutoTransport`) send `"blue"`; if the bridge ever narrows its parse to names
   only, the change here is one line in `main.tsx`.
2. *"Offer the control only while the engine is asking for mana (an `input` whose
   OK button the engine labelled `Auto`)."* **Not done, deliberately.** The only
   signal on the wire for "a mana payment is in progress" is the *text* of a
   button label, and deciding what a control does by matching an engine string is
   the one thing `CLAUDE.md` §Scope and §2.2 both forbid — the labels are
   Forge's, they are rendered verbatim, and they are not a protocol. So the pips
   are controls whenever the pool the engine published is non-empty, a press
   outside a payment is a meaningless act that §2.2 says the server drops, and
   the board neither hangs nor lies about why. A typed `input` field ("the engine
   is collecting mana") would let the client be stricter without reading prose;
   that is an M6 protocol question, not a board one.

---

## 3. Zone browsers

`PLAN.md`: *"No zone browsers … `input.openZones` renders as a text hint, which is
correct, but there is nothing to open."*

- A graveyard / exile / command strip's caption is now a `<button>` that opens a
  panel listing that zone as full-size `CardTile`s; so is the rail's revealed
  library slice. The 45 px strips are unchanged — they are the at-a-glance
  reading, and the panel is the readable one.
- **`input.openZones` opens the named zones by itself**, with no effect and no
  timer: the hint is a render-time default and the player's click is an override
  keyed to that hint, so when the engine's hint changes the override is discarded
  and when it clears the panel closes. That is why the panel shows up under
  `renderToStaticMarkup` in the tests exactly as it does in a browser.
- **Which zones** is `zones.ts`, and the one rule that matters is pure and tested
  over the corpus: a **hand is browsable only at the viewer's own seat**. A
  library panel is the revealed slice and says `n shown of count` rather than
  drawing `count` card backs (§3.4 / P2).
- `Esc` closes it — but only when no `ask` is outstanding, because §5.4's
  always-legal `null` is the more important escape hatch; the panel has its own
  close button for that case.

**Measured live**, both paths:

- *engine-driven*: at the cleanup discard, Forge pushed
  `openZones: [{playerId: 0, zones: ["hand"]}]` and the panel opened by itself,
  headed *"Zones the engine opened — `input.openZones` is a view hint; it reveals
  no cards (§4.3)"*, listing `Human · hand  8 cards`. When the discard completed
  and the hint went away, the panel closed by itself.
- *click-driven*: clicking `human · graveyard 1 ⤢` opened
  `Zone — everything in it, at a readable size` / `Human · graveyard  1 card`
  with `Web Up` drawn as a real card. `Escape` closed it and did **not** press
  the engine's Cancel (the prompt was unchanged afterwards).

---

## 4. Two defects the browser found

Both were found by driving the real board, and neither is visible from a test.

1. **The caption button could not be clicked.** M4's `.zonerow__label` is
   `pointer-events: none` — it is decoration over the row, and a caption that ate
   a card's click would be worse than no caption. Turning it into a `<button>`
   inherited that: `document.elementFromPoint` at the button's own centre
   returned `ul.row.row--strip`, the click reached the tile underneath, and the
   panel never opened. The fix is four lines of CSS —
   `button.zonerow__label { z-index: 60; pointer-events: auto; background: … }` —
   and the chip background is there because the button now sits over card art.
   It covers the top ~11 px of the first tile's left edge; the rest of that tile
   is still its own click.
2. **A stale pending arrow.** The hover that feeds the pending-target arrow is
   set by a candidate tile's `mouseenter`. A tile that leaves the board *under
   the pointer* — the card you just clicked to discard — fires no `mouseleave`,
   because React unmounts it rather than moving it, so the arrow kept pointing at
   a card that was now in the graveyard. The fix is to re-ask the question at
   render time: the hover is a target only while it is still a candidate, which
   is also exactly the right rule (an arrow may only end on something the engine
   is currently offering).

---

## 5. The pending-target arrow, and where it honestly cannot be drawn

The fourth arrow class (`pending`, dashed, `--select`) is drawn from the source
of the choice to the candidate under the pointer, and the source is looked for in
this order: `assign_damage`'s `attackerId` (§5.3) → `input.focusCardId` (§4) →
the top stack item → **the last card this seat clicked**.

That last fallback exists because of a live measurement: at Forge's
`InputSelectTargets` for a spell being cast, `input.focusCardId` is `null`, the
stack is empty, **and the card itself has left the hand** — the only thing on
screen that names it is the prompt, and the prompt is the one string the client
may not parse. So for that input the board draws the outlines and the count and
no arrow, which is the documented behaviour for a missing endpoint ("an endpoint
that is not on the board is not an arrow", `arrows.ts`) rather than a guess. The
arrow does draw when the source is a permanent (an activated ability), a stack
item whose targets are chosen after it is on the stack, or an `assign_damage`
attacker.

---

## 6. Targeting min/max, and the button that was a lie

- While `selectable.mode !== 'none'` the decision panel prints
  **`chosen k of min..max`** — and labels it *"clicks sent since this prompt; the
  engine is the judge of every one"*, because the wire carries no running count
  (§4 has the id set and the bounds and nothing else). It is never enforced:
  a board that refused the click completing a choice would be rules logic
  (`CLAUDE.md` §Scope). Seen live at the discard (`chosen 0 of 1`, 8 outlined)
  and at Pym Particles' target selection (`chosen 0 of 1`, 4 creatures outlined).
- **The "Auto Pay" button is gone.** It was disabled, it named M5, and there is
  no such client feature: Forge's `InputPayMana` writes `Auto` on its **own OK
  button** (`InputPayMana.java:376-395`), two buttons to the left, rendered
  verbatim. Measured live twice in one turn: clicking `Aerial Doombot {U}` in
  hand put the decision panel into *"Aerial Doombot - Creature 1 / 1 · Pay Mana
  Cost: {U}"* with OK reading **Auto**, and pressing it paid the cost and put the
  spell on the stack. `A`'s keymap row now says so instead of promising a button.

---

## 7. M4 follow-ups

| # | What it was | Status |
|---|---|---|
| 1 | `mana-font`'s CSS drags ~3.5 MB of unused faces into the build | **closed** — §7.1 |
| 3 | `TypeError: set is not iterable`, once, from a layout effect | **not reproduced** — §7.2 |
| 4 | `render.test.tsx`'s decision paragraph is false | **closed** — rewritten on today's terms (§8) |
| 5 | the selectable-outline assertion is order- and name-coupled | **closed** — §8 |
| 6 | the log drawer is 520 px wide against a 264 px rail | **closed** — §7.3 |
| 7 | the hand fan's outer tiles leave their grid cell | **closed** — §7.3 |
| 2, 8 | report 10 §2.2's arithmetic; `check-redaction.mjs` and a four-line session | untouched — neither is in `web/` |

### 7.1 `mana-font`: 3.72 MB → 187.40 kB, and the fork that did it

Measured in `web/node_modules/mana-font/fonts/`: **nine files, 3,720,178 bytes**
(`mana.svg` alone is 1,907,690). `main.tsx` imported the package's stylesheet
wholesale, whose first two rules are `@font-face` blocks naming
eot/woff/ttf/svg for **Mana** *and* for **MPlantin** — a font this client never
uses — and Vite resolves every `url()` in an imported stylesheet into the build.

`web/src/mana.css` is that stylesheet, filtered, plus one `@font-face` for the
woff2 the package ships and `mana.css@1.18.0` does not list. The filter keeps
every rule whose selector alternatives use only classes this client can produce —
`.ms`, `.ms-cost` (including the per-colour and split/hybrid backgrounds, which
are `.ms-cost.ms-<symbol>`), `.ms-shadow`, and **every** `.ms-<symbol>::before`
content rule. All 612 of them are kept deliberately: `manaSymbolClass()` turns
whatever is between a pair of braces into a class, and the deck in play is not
the only deck the opponent can be holding; a curated subset renders a blank pip
for the first unexpected symbol. 66 rules were dropped (`ms-split`, `ms-half`,
`ms-level`, `ms-loyalty-outline`, `ms-duo`, the `ms-loading` animation, …).

The one-off derivation, kept here so the fork can be re-derived on an upgrade
rather than patched by hand (this is the cost **D29** named, now paid):

```js
// node, from web/: split mana.css into top-level rule blocks, then
const glyphs = new Set();           // every class with a `content:` rule
for (const [sel, body] of blocks)
  if (body.includes('content:'))
    for (const m of sel.matchAll(/\.(ms-[a-z0-9-]+)::?(?:before|after)/g)) glyphs.add(m[1]);
const allowed = new Set(['ms', 'ms-cost', 'ms-shadow', ...glyphs]);
// keep a comma-alternative iff it is a simple compound of allowed classes
// (optionally with ::before/::after); drop @font-face; write the survivors.
```

Build output, measured both ways today by swapping the one import line in
`main.tsx` and running `npx vite build` twice:

```
with `mana-font/css/mana.css`  (M4's import, minus the woff2 override this pass moved)
  dist/assets/  11 files, 4,775,769 B — of which EIGHT are fonts, 3,532,778 B:
     mana.svg 1,907,690 · mana.eot 408,358 · mana.woff 408,284 · mana.ttf 408,204
     mplantin.svg 211,042 · mplantin.eot 69,852 · mplantin.ttf 69,628 · mplantin.woff 49,720
  (M4's configuration also carried styles.css's woff2 override, which is the ninth
   file and the 3,720,178 B — 3.72 MB — follow-up 1 reports. The arithmetic agrees
   to the byte: 3,532,778 + 187,400 = 3,720,178.)

with `./mana.css`  (this pass)
  dist/assets/   4 files, 1,420,886 B — of which ONE is a font:
     mana-D0absDf6.woff2  187,400 B   ← the only one the browser ever fetched
  (1,432,461 B after the M5 fix pass, 2026-09-12: same four files, same one
   font; the growth is 12 kB of JS and source map, not another face.)
     index-*.css           66,597 B   │ gzip 13.96 kB
     index-*.js           254,640 B   │ gzip 79.20 kB   (+ 912,249 B source map)
```

**3,532,778 bytes of fonts nothing fetched, gone**, and the stylesheet went from
76.09 kB to 66.60 kB (15.96 → 13.96 kB gzipped) because 66 unused rules went with
them.

**This contradicts `DECISIONS.md` D29**, which accepted the wholesale import and
said plainly that it *"becomes worth fixing the moment anything is packaged or
served over a network"*. `DECISIONS.md` is outside this pass's file list, so the
amendment is **not** written: whoever merges M5 should add a dated entry
recording that the fork was taken, with §7.1 as its derivation.

### 7.2 The `set is not iterable` crash: not reproduced

M4 follow-up 3 asks for a reproduction **before** anything in `rects.ts` is
touched, and says a cold load showing the same symptom would mean something
different. Nothing in `rects.ts` was touched. What was run:

- a full live game in a browser (13 turns, 62 frames out, ~500 in), driven
  through the real board with the console open: **zero errors**;
- two Vite HMR updates of `Board.tsx` and two of `styles.css` *during* that game
  — the closest thing to the hypothesised cause (a stale module holding the
  pre-fix one-element-per-key shape): **zero errors**;
- a **cold load** afterwards (full navigation, new module graph) against the same
  live game: the board rendered 23 tiles and 1 arrow, and the console held only
  Vite's connect lines and React's devtools notice.

So: not reproduced, on a cold load or across HMR, with the registry doing real
work (arrows drawn from measured rects on every frame). No guard was added, and
the hypothesis in follow-up 3 — a stale HMR module — remains the only candidate.

### 7.3 The two cosmetic ones, measured

**The hand fan** (follow-up 7). A rotated box is taller than the card inside it
(`h·cos θ + w·sin θ`), and the row is exactly `--ch-hand`, so the tile is what
has to give: `.row--hand` now sizes tiles at **0.88** of the row's tokens and the
fan angle is clamped to ±10°. Measured in the live board:

| viewport | row (`--ch-hand`) | tallest tile | row bottom | lowest tile bottom |
|---|---:|---:|---:|---:|
| 1600 × 900 | 190 px | 177 px | 888 | 882 |
| 1280 × 720 | 150 px | 138 px | 710 | 704 |

Every tile is inside its row at both breakpoints (it was 121 × 159 in a 150 px
row, ~5 px below it, before), and `document.body` still does not scroll
sideways.

**The log drawer** (follow-up 6). `inline-size: min(520px, 60vw)` became
`var(--rail-l)`, and every string in it wraps (`overflow-wrap: anywhere`).
Measured at 1280 × 720 with the drawer open: drawer `x = 10, width = 216`, rail
`x = 10, width = 216`, overflow past the rail's right edge **0 px**, longest log
line 147 px. Report 10 §10's *"left edge, over the rail"* is now true.

---

## 8. Tests

`npm --prefix web test` is **370 `node --test` + 54 vitest** (M4: 271 + 41), and
`npm run build` is zero TypeScript errors.

New, and what each one can catch:

- **`test/picker.test.ts` (7)** — the rule, over every ask in the corpus:
  `drawnEntities` never contains another seat's hand (asserted non-vacuous);
  every picker candidate really is on the board; one option off the board sends
  the whole ask to the modal; a `reveal` and a `delayedReveal` stay in the modal;
  `assign_damage`'s defender stays at index 0; `max === 1` is a radio button.
  It fails if the corpus ever produces *no* picker or *no* modal.
- **`test/zones.test.ts` (4)** — no panel, for any seat, in any frame of any
  fixture, can show another seat's hand; a panel shows exactly the cards the wire
  carried for that zone and never more than `count`; `openZones` becomes panels
  for seats that exist, with Forge's capitalised zone names lowercased and the
  duplicates that produces dropped.
- **`test/pool.test.ts` (5)** — the pip → act mapping, the two-key act body, the
  six letters, and that every `manaPool` in the corpus carries all six keys.
- **`test/board-m5.test.tsx` (9)** — the real `<Board/>`: a board-shaped ask
  renders as a picker and **`AskModal` is not mounted**; a non-card ask and a
  library search still render the modal; the picker is inert on a replay;
  `assign_damage` puts its inputs on the blockers and keeps the defender's row;
  **a pip click produces the act** (`ManaPoolPips` is hook-free, so the element
  it returns is walked and its `onClick` invoked — a real click with no DOM);
  the pips are your rail's only and never during an ask; `openZones` opens the
  browser, drawn with `CardTile`, with no id and no name from an opponent's hand
  (asserted non-vacuous).

Changed in `test/render.test.tsx`:

- **the decision paragraph** (follow-up 4) now says what is true: the board has
  state, refs and three effects; `renderToStaticMarkup` runs none of them and is
  still the right harness because every effect is measurement or input, not
  rendering; and it names what this harness cannot cover (a handler firing) and
  where that is covered instead.
- **the selectable-outline assertion** (follow-up 5) matches the `<li>` and reads
  its two attributes independently, so a concealed tile (which carries no
  `data-card-name` by design) is counted and re-ordering `CardTile`'s attributes
  cannot silently empty the set.
- **`askCards(ask)`** — the cards an outstanding ask carries in its body are
  added to the permitted-name set and skipped by the opponent-hand id check,
  because §5 puts every one of them through the same gated serialiser as every
  other card on the wire, and M5 draws them (the modal's `order` /
  `manipulate_list` rows, the delayed-reveal panel, the picker's thumbnails).
  Without it, `human-search-7`'s 31 revealed library cards fail a check that was
  written when the modal printed labels only.

---

## 9. The live game, and the replay screenshots

**Ports.** The bridge ran on **8660** and Vite on **5180** (`--strictPort`), both
started by hand and both killed by PID afterwards; the user's own 8642/5173 were
never touched. `tools/check-all.sh` was **not** run for this reason: its step 10
starts five ws servers on `config.json`'s port, which is the user's.

```bash
./bridge/run.sh mtgtable.MtgTable --transport ws --port 8660 --seed 42 --keep-open
npm --prefix web run dev -- --port 5180 --strictPort
# http://127.0.0.1:5180/?ws=1&port=8660
```

Thirteen turns, driven a click at a time through the browser; the log is
`var/games/human-ws-42/frames.jsonl` (521 lines). What it exercised, in order:

| # | Gesture | What happened |
|---|---|---|
| 1 | the mulligan buttons | `Play` / `Keep` — the engine's own labels, `buttonOk` / `buttonCancel` |
| 2 | **a land click** | `Island #38` from hand to the battlefield, hand 7 → 6 |
| 3 | a land click on the board | tapped; `mana pool: 1 U`; the U pip became a button |
| 4 | **a mana pip click** | `act useMana {color:"U"}` on the wire (§2) |
| 5 | the discard at cleanup | 8 tiles outlined, `chosen 0 of 1`, §4.2's "the engine wants a card click" hint, **and the zone browser opened by itself** on the engine's `openZones` |
| 6 | **a zone browser click** | `human · graveyard 1 ⤢` → the panel, `Web Up` as a full tile; `Escape` closed it |
| 7 | the declared bands | *"declare attackers · 1 band, as the engine reports them"* with Peggy Carter's thumbnail → `Human` · unblocked, beside the red attack arrow |
| 8 | **the Auto pay button** | `Aerial Doombot {U}` → *"Pay Mana Cost: {U}"* with OK reading **Auto**; pressed, paid, on the stack |
| 9 | **a spell with a target** | `Pym Particles {U}` → 4 creatures outlined, `chosen 0 of 1`; clicked Peggy Carter; OK read **Auto** again; the spell resolved onto the stack with its target chip and the purple target arrow |
| 10 | Concede | two clicks → *"Game over. Winner: Forge AI. AllOpponentsLost"* |

**Two honest notes about that session.** Forge dispatched **no `ask` at all** in
thirteen turns — every decision arrived as an `input` — so the ask picker is
evidenced from recordings (§1.2) and not from this game. And the browser driver's
`ref`-based clicks stopped landing after a mid-session viewport resize (a
coordinate-frame artifact of the harness, not the board): the final Concede was
driven with an `element.click()` instead, and the two-step arming was verified
directly (`Concede` → `Concede — click again to confirm` → the `over` frame).

Replay panels, one per kind that now has a fixture (§1.2, §1.3):

```
?replay=games/human-trample-7.jsonl     frame 528/1155   assign_damage → PICKER
?replay=games/human-search-7.jsonl      frame 207/777    choose_entities + delayedReveal → modal, 31 tiles
?replay=games/human-amount-7.jsonl      frame 246/1185   assign_amount → modal, five colour rows
?replay=games/human-number-7.jsonl      frame 578/1357   text → modal, numeric
?replay=games/human-ability-42.jsonl    frame 197/1594   ability_menu → modal
?replay=synthetic/sample-handwritten.jsonl frame 15/35   choose_list → PICKER
```

---

## 10. What M5's board half does **not** do

- **`clickAbility` is still never sent from the browser.** A multi-ability card
  still goes through the asynchronous `ability_menu` (D20/D22), whose answer the
  bridge applies with the same `IGameController.selectAbility`. The act is still
  unexercised from this end.
- **`passPriority`, `undo`, `alphaStrike`, `nextGame`, `setPhaseStop`,
  `setYield`** remain M6, and their keys still flash their milestone.
- **No band-building gesture.** `CombatBands` *reads* `combat.bands`; attackers
  and blockers are still declared by clicking tiles and pressing the engine's
  button, which is how `InputAttack` / `InputBlock` genuinely work.
- **`assign_amount` is not a picker**, even when its targets are entities on the
  board: §5.3's keys may be colours, and the corpus's eleven are all colours.
  Adding it is a one-line change to `boardPick` on the day a recording shows
  entity keys.
- **`input.weak` is still `[]` on the wire**, so Forge's "this would be tapped by
  Auto" hint has nothing to draw; the tile style for it has existed since M4.
- **The user has not pressed the space bar.** Unchanged from M3 follow-up 9 and
  M4: the driver delivers `Space` as `{key:"", code:"", keyCode:0}`, so the
  binding is covered by `keys.test.ts` and by the buttons being clicked directly.
  Every other key used here — `L`, `Escape` — was driven for real.

---

## 11. The band strip was a grid row, and it starved the middle

Found by the verification pass on **2026-09-12**, after everything above was
measured. It is new M5 code interacting with M4 layout, and it is **not**
`PLAN.md`'s M4 follow-up 2 (the 23 px spec-arithmetic debt, which is about the
spec table and not about a collapsed row).

### What shipped

`<CombatBands/>` was mounted as an in-flow child of `.table__middle`
(`Board.tsx`), whose `grid-template-rows` is `1fr 1fr` — one row per seat's
graveyard / exile / command strips. A third child therefore landed in an
**implicit auto third row**, and an auto row is sized to its content *before* the
`1fr` rows are given anything.

### Reproduced

`?replay=games/human-ability-42.jsonl`, frame **1122 / 1594**, at the repo's own
reference viewport **1600 × 900** — where `--middle-min` is `120px` and the
middle is already sitting on that floor:

```js
getComputedStyle(document.querySelector('.table__middle')).gridTemplateRows
// BEFORE: "0px 0px 112px"          <- both strip rows collapsed
// the same frame with `.bands { display: none }`:
//         "58px 58px"              <- M4's geometry
```

Two consequences, both measured in the page:

- the strips' 62 px tiles (`--ch-strip`) had a 0 px row to sit in, so they
  overflowed and painted over the band strip and the stack panel;
- the two `.zonerow__label` **buttons** are `position: absolute` at the top of
  their row, so with the rows at 0 px they landed a grid gap apart and
  **overlapped by 9 px** — `Forge AI · graveyard` at y 317–330 and
  `Human · graveyard` at y 321–334. `document.elementFromPoint(295, y)` returned
  the *Human* button for every `y >= 320`, leaving **4 px** of the opponent's
  new zone-browser control hittable.

Reproduced at 1366 × 768, 1440 × 900 and 1600 × 900, live and in replay; **not**
at 1920 × 1080, where the middle is tall enough to absorb the extra row. Even
outside combat the always-mounted "declare" strip (22 px, *"nothing declared yet"*)
took its bite out of both rows.

### The fix

There is no in-flow answer at that viewport — two 62 px strip rows plus the 4 px
gap already want 128 px of a 120 px box — so the strip **leaves the flow**, the
way `.stackpanel` beside it already has (`styles.css`, `.bands`):

- `position: absolute`, anchored `inset-block-end: 0` / `inset-inline-start: 0`;
- shrink-to-fit rather than stretched, with
  `max-inline-size: calc(100% - var(--stack-w) - 10px)`, because an absolute
  inset resolves against the **padding** box and `.table__middle` reserves the
  stack column with `padding-inline-end`;
- `z-index: 55` — above any tile (a tile's z-index is its `--i`) and **below the
  60 the caption buttons carry**, so both zone-browser controls stay clickable
  over the strip. That is the escape hatch for the cards the strip now covers:
  the browser draws every card in the zone through `CardTile`, and those tiles
  take the ordinary `clickCard`;
- background `#131a20cc` → `#131a20e6`, because it now sits over card art;
- belt and braces on the caption itself: `.zonerow--strip { min-block-size: 18px }`
  and the plain caption moved from `2px` to the row's top edge, so a short row can
  never put two captions inside each other again.

### Closed, measured

Same replay, same frame, same browser (`?replay=games/human-ability-42.jsonl`
frame 1122, vite on 5180):

| viewport | `.table__middle` | `gridTemplateRows` | `.bands` | both captions hit-test to themselves |
|---|---:|---|---|---|
| 1600 × 900 | 120 px | **`58px 58px`** | 453 × 120, bottom-anchored | yes (tops 62 px apart: 317 / 379) |
| 1440 × 900 | 120 px | **`58px 58px`** | 453 × 120 | yes |
| 1366 × 768 | 133 px | **`64.53px 64.53px`** | 446 × 133 | yes |
| 1920 × 1080 | 295 px | **`145.53px 145.53px`** | 438 × 151 | yes |

`58px 58px` is exactly what the same frame measures with the band strip removed
altogether, i.e. the fix restores M4's geometry rather than approximating it.
Across frames 200 / 600 / 1000 / 1122 / 1500 of that fixture — no strip, a 22 px
declare strip, a 120 px strip and an 87 px strip — the rows stay `58px 58px` at
1600 × 900. `document.documentElement.scrollHeight > innerHeight` is `false` at
all four viewports.

The repo has no DOM test environment (`node --test` type-strips and vitest runs
in the `node` environment, per `CLAUDE.md` §"The web client"), so there is
nowhere to assert a computed grid track. These numbers are the pin.

---

## 12. Status — the documentation pass, 2026-09-12

Three of this file's choices are now dated entries in `DECISIONS.md`, because
each is the kind a later pass would otherwise relitigate in code rather than in
prose:

- **D33** — §1's rule, with its three load-bearing clauses and the census that
  says what it actually reaches (3 of 108 asks in `fixtures/games/`, all
  `assign_damage`). Rejected alternatives recorded there: a per-kind allow-list,
  a partial picker, resolving option ids against the *snapshot* instead of
  against the mounted board, and marshalling the answer in the picker.
- **D34** — §2's pips as the `useMana` control, including §2.1's two answers to
  amendment M26: the single-letter colour is safe (checked in the jar's own
  bytecode, now amendment **M30**), and conditioning the control on an engine
  *button label* is what `CLAUDE.md` §Scope forbids. The end-to-end guard the
  verification pass added — the act **and** the drop in the seat's `manaPool` —
  is part of that entry.
- **D36** — §11's overlay, **with the trade stated rather than buried**: while
  the band strip is tall it covers part of the graveyard / exile strips behind
  it, and the caption buttons at `z-index: 60` over the strip's 55 are the escape
  hatch. That asymmetry is the decision, not an implementation detail.

D29's *"overridden rather than forked"* clause was already superseded by **D32**
for §7.1's `mana.css` fork.

**In the other documents.** `README.md`'s *"Playing in the browser"* now
describes the four things a player can see from this milestone — the pips as
buttons (and the six mana letters), a question answered on the board versus one
answered in a dialog, opening a zone, and the combat band strip — in the
player's vocabulary rather than the code's. `PLAN.md` §M5 carries "What the board
gained" as seven numbered items and the **M5 follow-ups**, which is where the
four things this file could not close now live: no DOM test environment
(follow-up 4 — §11's grid tracks and §4's hit-testing are pinned by the numbers
above and by nothing else), the overlay trade (5), the picker reaching one kind
(7), and the space bar still unpressed (13).

**The gate on this pass** (documentation only — no `.ts`, `.tsx`, `.css` or
`.java` file is in its diff): `WSPORT=8663 ./tools/check-all.sh` → `check-all OK`,
exit 0, `real 8m52.621s`. Step 13 is **377 `node --test`** (372 pass, 0 fail, 5
skipped) **+ 55 vitest**, with `render.test.tsx` mounting `<Board/>` for every
frame of all fifteen committed recordings in 31.8 s, and `npm run build` clean.
Details and the other steps: `docs/evidence/m5-probes.md` §13.
