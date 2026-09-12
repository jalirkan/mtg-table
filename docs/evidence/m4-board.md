# M4 evidence — a board that looks like Magic (evenings 1 and 2)

What was actually run, on 2026-09-11, with real numbers. Evenings **1 and 2** of
[`docs/research/10-board-ui-spec.md`](../research/10-board-ui-spec.md) §17: the
CSS grid and the layout tokens, the component tree, `CardTile` with Scryfall art
over a generated text frame, the two rails, the decision panel, the thirteen-row
phase strip, and mana pips from `mana-font`. Evening 3 — the rect registry, the
arrows overlay, `CardZoom`/`HotkeysOverlay` on the keyboard, the `AskModal`
shell rewrite — is **not** in this pass and is listed in §9 below.

Nothing here re-implements an M3 affordance. The seam is still
`<Board actions={…}/>`: `null` is a replay and every control is inert; non-null
is a seat. Clicks are still never gated on `selectable` (amendment **M8**), the
engine's button labels are still rendered verbatim, and the stall rule is still
imported from `web/src/render/wedge.ts`.

---

## 0. What shipped

| File | Lines | What it is |
|---|---:|---|
| `web/src/render/Board.tsx` | 621 | **rewritten**: the CSS grid, the seat ordering, the battlefield land/permanent split, attachment hoisting, combat notes, toasts, the game-over banner |
| `web/src/render/CardTile.tsx` | 429 | **new** — THE card renderer: art over text frame, CSS card back, tap rotation, sick tint, counters, P/T, damage, loyalty, token, attachments, the three selection states, hover/focus zoom |
| `web/src/render/DecisionPanel.tsx` | 339 | **new**: step title, verbatim prompt, the two engine buttons with key hints, Auto Pay / Undo disabled with tooltips, Concede, the §4.2 hints, the wedge banner, `openZones` |
| `web/src/render/LogDrawer.tsx` | 244 | **new**: the log ring, notices, this frame's events, combat bands, stack cards, the session block |
| `web/src/render/labels.ts` | 198 | **new**: `PHASE_ORDER`, strip captions, `STEP_TITLE`, counter labels, Forge's stop defaults, the land/permanent split, the tile aria-label composer |
| `web/src/render/PlayerRail.tsx` | 165 | **new**: name button, life, poison, counters, zone counts, mana pool, the revealed slice of a library |
| `web/src/render/PhaseStrip.tsx` | 159 | **new**: round/turn header, 13 rows, the combat divider, two dots per row, Hold priority |
| `web/src/render/StackPanel.tsx` | 99 | **new**: the floating stack, `thumb` art, text target chips |
| `web/src/render/Mana.tsx` | 91 | **new**: `ManaCost` and `ManaPoolPips` over `mana-font` |
| `web/src/render/ZoneRow.tsx` | 90 | **new**: one row, the slot count, the overlap rule |
| `web/src/render/HandFan.tsx` | 83 | **new**: the viewer's hand, fanned |
| `web/src/render/resolve.ts` | 69 | **new**: `findCard` / `cardLabel` / `playerName` / `entityLabel`, moved out of `Board.tsx` so they are importable from `node --test` |
| `web/src/styles.css` | 1916 | **rewritten**: the token block, the grid, both breakpoints, the tile, the rails, the drawer |
| `web/src/art.ts` | 256 | **edited**: `artEntryFor`, `imageUrl(entry, size, side)`, `preloadArt` |
| `web/src/main.tsx` | 573 | **edited**: the one-line top bar, banners as overlays, the `mana-font` import, the art preload |
| `web/test/render.test.tsx` | 613 | **edited**: every frame rendered **twice** (replay and a fake-actions seat), the name-leak subset check, the opponent-hand check, the read-only check, and a negative control for all three |
| `NOTICE` | +22 | section 5: `mana-font` 1.18.0, MIT + OFL-1.1 |

One new runtime dependency, as report 10 §13 allows: **`mana-font@1.18.0`**
(`npm i --prefix web mana-font@1.18.0`, version confirmed on the registry:
`version = '1.18.0'`, `dist-tags.latest = '1.18.0'`). No arrows helper was added
— evening 3 owns the arrows, and §9.2's hand-rolled geometry is still the plan.

---

## 1. Geometry, measured in the browser

`getBoundingClientRect()` in the live page, both viewports, with the board in
its ws mode. The two numbers to check against report 10 §2.2's table are the
column widths and the row heights.

**1600 × 900**

```
viewport            1600 × 900      document.scrollWidth 1600  (no sideways scroll)
top bar                  23 px
board                1600 × 877
rail-left  264 px   table 1160 px   rail-right 128 px      ← §2.2 exactly
rows        104 / 132 / 141 / 132 / 104 / 190
            lands  perms  middle  perms  lands  hand
stack panel          240 × 141, inset-inline-end 0 of the middle row
```

**1280 × 720**

```
viewport            1280 × 720      document.scrollWidth 1280  (no sideways scroll)
board                1280 × 697
rail-left  216 px   table  912 px   rail-right 112 px      ← §2.5 exactly
rows         84 / 104 / 111 / 104 /  84 / 150
phase strip  scrollHeight 675 = clientHeight 675  (13 rows fit with no scroll)
decision     scrollHeight 448 = clientHeight 448
```

**The one deviation from §2.2, and why.** The spec computes a 164 px middle row
at 1600 × 900 and 134 px at 1280 × 720 from a board that owns the whole viewport.
This board sits under a 23 px application bar (title, seat, socket status,
credits), so the middle row is **141 px** and **111 px** instead. Everything else
— the three column widths and the five fixed row heights — is the spec's number
to the pixel. The alternative was a second chrome strip for the connection state
and a footer for the credits, which is ~70 px and comes out of the hand row; the
bar carries all three instead, and transient banners (`Waiting for the bridge`,
a rejected frame, log warnings) are **absolute overlays** so they never shorten
the board either. `--middle-min` is 120 px / 96 px, so the middle row is the one
that compresses when anything else grows.

---

## 2. A live game, seed 42 — three turns, described

```bash
./scripts/play.sh --no-open --keep-open --seed 42      # bridge pid 586063, vite pid 586177
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8642/health   # 200
```

Driven in a real browser at **1600 × 900** unless noted. Each screenshot below
is what was on screen; the "ugly" column is deliberate.

| # | Frame | What is on screen | Ugly |
|---|---|---|---|
| 1 | pre-game | Empty felt: both rails drawn, six empty table rows with their faint captions (`forge ai · lands 0`, …), the stack panel reading `stack empty`, `ROUND 0 / turn 0 / before the game` in the right rail with no phase row active. Decision panel: **BEFORE THE GAME** and Forge's own prompt, *"Human, you have won the coin toss. Would you like to play or draw?"*, with buttons **`Play` SPACE** and **`Draw` ESC** — the engine's labels, verbatim, on OK and Cancel. | The empty rows are a lot of dark space before the first card. Real, and it is one frame long. |
| 2 | mulligan | Seven cards fanned along the bottom at 136 × 190, real Scryfall `grid` WEBP art, rotated ±6° about a point below the row. Prompt *"Human, you are going first! Do you want to keep your hand?"*, buttons **`Keep` / `Mulligan`**. | — |
| 3 | turn 1, main 1 | `Main 1` highlighted in **blue** (`--you`) in the right rail; `ROUND 1 / turn 1 / your turn`; the Human rail shows the `active` and `priority` pills; a `Your turn` toast at the top of the middle row. Decision panel title **YOUR FIRST MAIN PHASE**, prompt is Forge's four-line `Priority: Human / Turn: 1 (Human) / Phase: Main phase, precombat / Stack: Empty`. | — |
| 4 | land played | Clicking an Island in the hand (a card **not** in `selectable`, which is `{cardIds: [], mode: "none"}` — amendment M8) put it on `human · lands 1`; the hand re-fanned to six. | — |
| 5 | hover zoom | Hovering a hand card opens the 300 px `display` WEBP above it with the credit line `MSH #44 · art by Bartek Fedyczak · © Wizards of the Coast`. | It is big: at 300 × 418 it covers most of the opponent's two rows. It is a hover popup and it goes away, but a smaller zoom (or a corner-anchored one) would read better. |
| 6 | AI turn 2 | The opponent's Plains appears on `forge ai · lands 1`; `Beginning` is highlighted in **orange** (`--opp`); the Forge AI rail gets `active`. Title **FORGE AI'S BEGINNING OF COMBAT**. | — |
| 7 | AI turn 2, later | The opponent's Plains is **tapped**: the face is rotated 90° inside a 132 px-wide tile, with the `--tap` inset ring, and the row's `--slots` already paid for the extra width so nothing overlaps. `S.H.I.E.L.D. Spy Kit` on `forge ai · permanents 1`. | — |
| 8 | ability menu | Clicking `A.I.M. Scientists` raised the asynchronous `ability_menu` ask (amendment M14). The modal draws over the board with `THE ENGINE IS WAITING FOR THIS`, both engine options verbatim (`[0] A.I.M. Scientists - Creature 3 / 3 — card #2 · can play`, `[1] Basic landcycling {2} ({2}, Discard this card: …)`), and Answer / Default / Cancel (null) / Reset. Behind it, OK and Cancel are **disabled** and the panel says *"a question is outstanding — answer it above"*. | The modal is a plain panel, not the §11 dialog with a focus trap. That is evening 3. |
| 9 | paying mana | Answering `[0]` put Forge's own pay-mana input up: title **YOUR FIRST MAIN PHASE**, prompt `A.I.M. Scientists - Creature 3 / 3 Pay Mana Cost: {3}{U}`, and the OK button reads **`Auto`** — Forge's label, from `InputPayMana`, not ours. | — |
| 10 | on the stack | After `Auto`: all four Islands are tapped (four rotated tiles in `human · lands 4`), and the stack panel shows one row — a 44 px `thumb` of A.I.M. Scientists, `A.I.M. Scientists - Creature 3 / 3`, `stack #15 · Human · resolves next`. | — |
| 11 | resolved | The creature is on `human · permanents 1` with its `3/3` pill; its connive trigger is the new stack row, with the reminder text. | — |
| 12 | the discard | The connive discard is the money shot for §4.2: prompt `A.I.M. Scientists (2) Discard 1 card(s)`, **OK and Cancel both disabled**, all six hand cards outlined in gold with a corner caret, and the amber line *"OK is disabled and cards are selectable: the engine wants a **card click**, not a button. Click a card — 1 of 6 outlined."* Under it, `OPEN ZONES player 0 · hand — a view hint; it reveals no cards`. | — |
| 13 | attacking | `Select creatures to attack Forge AI…`, Cancel reads **`Alpha Strike`** (Forge's label again). Clicking the creature and pressing OK tapped it, gave it the red combat outline and the note `→ Forge AI` across its bottom edge, and put `1 attacking band — see the log drawer` in the middle row. `Blockers` is the active phase row. | The attacker's note is 8 px and truncates on a long defender name. |
| 14 | damage | Forge AI's life reads **16**; the creature carries `4/4` and a `1` counter badge (it connived). The aria-label for it is `A.I.M. Scientists, {3}{U}, Creature - Human Scientist Villain, 4/4, 1 +1/+1 counter — card 2`. | — |
| 15 | 1280 × 720 | The same declare-blockers frame at the narrow breakpoint: everything is present, tiles are 75 × 104 on the battlefield and 108 × 150 in hand, the phase strip still shows all thirteen rows with both dot columns. | The strip's captions are 10 px and `First strike` / `End of combat` ellipsise. Deliberate: the full name is in each dot's `aria-label` and `title`. |

---

## 3. The replay board, `?replay=games/g1.jsonl`

| # | Frame | What is on screen | Ugly |
|---|---|---|---|
| 16 | 0 / 376 | The empty-board placeholder inside the felt, with the amber **Read-only** pill and the replay scrubber above it. | — |
| 17 | 260 / 376, 1600 × 900 | The screenshot to show someone. Opponent: 6 lands, 6 permanents including a **Soldier token** (dashed border, generated text frame — a token has no printing and so no art, which is expected, not a miss). Middle: two graveyard strips at 45 px, one exile card, `THE STACK (0) stack empty`. Viewer: 1 permanent, 8 lands, 3 cards in hand. Left rail: both seats with life 20 / 14, `▤ 26 ✋ 1 ⚰ 0 ◇ 0` zone counts and six mana pips each. Right rail: `ROUND 9 / turn 18 / opponent's turn`, `Beginning` active in orange. | The 8-land row is where the overlap rule first bites at 1280 px; the tiles shingle by a few pixels and read fine. |
| 18 | 100 / 376 | Scrubbed **backwards**: turn 7, `End of combat` active, a permanent showing a red `−2` damage chip beside its P/T pill (damage is never subtracted from toughness). The log drawer's entry count falls with the scrub, because the ring is folded in `reduce()` and re-derived. | — |
| 19 | 260 / 376, 1280 × 720 | The same frame at the narrow breakpoint: 27 tiles, `document.scrollWidth === 1280`. | — |

**Read-only is asserted, not assumed.** On frame 260 the replay board rendered
**29** elements carrying `data-act` and **0** of them enabled, with
`data-readonly="true"` on the board root.

---

## 4. The text-frame fallback, `?replay=games/morph.jsonl`

`decks/morph-probe.dck` has **no** entry in `web/public/art.json`, so this
fixture renders the fallback path for every card on the board at once — which is
the evening-2 exit check ("delete `art.json` and reload") without touching a
generated file this pass does not own.

Frame 170 / 235, 1600 × 900: every tile is the generated frame — name, mana pips
from `mana-font`, the type line verbatim (`Creature - Goat Be…`, hyphen and all),
and the P/T in the corner. The viewer's own **face-down** permanent is a CSS card
back (a purple radial ground with a rotated diamond) carrying a `2/2` pill and
the marked ribbon **`YOU MAY LOOK — Ashcloud Phoenix 4/1`**; its accessible name
is `face-down card, Creature, 2/2, summoning sick — card 37` and **the DOM
contains no `data-card-name` for it**. Two opponent creatures carry the red
attacking outline and `→ AI-Seat0` notes.

Ugly: at 60 px (a land tile) the frame's name clamps to two lines and the type
line ellipsises early. It is legible but it is a thumbnail.

---

## 5. Mana pips

```
$ npm i --prefix web mana-font@1.18.0          # MIT + OFL-1.1, no runtime deps
```

`main.tsx` imports `mana-font/css/mana.css` **before** `styles.css`, which then
overrides the `@font-face` for family `Mana` with the woff2 the package ships and
its own CSS does not list. In the live page:

```js
[...document.fonts].map(f => [f.family, f.status])
// [["Mana","unloaded"], ["MPlantin","unloaded"], ["Mana","loaded"]]
```

The loaded face is the third entry — our override — and the build emits
`dist/assets/mana-D0absDf6.woff2` at **187.40 kB** against `mana.woff`'s
**408.28 kB**.

**Ugly, and honest:** importing the package's CSS wholesale also makes Vite emit
the faces nothing fetches — `mana.eot` (408 kB), `mana.ttf` (408 kB), `mana.svg`
(1.91 MB) and four `mplantin.*` files (400 kB) — about 3.2 MB of `dist/assets`
that no browser requests, because a later `@font-face` wins and nothing
references `MPlantin`. Report 10 §13 predicted the MPlantin half. Fixing it means
forking `mana.css`, which is a maintenance cost for a directory that is
gitignored; it is recorded here instead.

---

## 6. Tests

```
$ npm --prefix web test
node --test test/*.test.ts   →  253 pass, 0 fail   (2.4 s)
vitest run                   →   38 pass, 0 fail   (18.5 s, 2 files)
```

`web/test/render.test.tsx` now renders **every frame of every fixture twice** —
once as the replay board (`actions` null) and once as a seat (`actions` a fake
`BoardActions`) — over 12 fixtures, 7,615 frames, 2,473 of them `state`. The
run went from 8.5 s to 18.5 s for the second render and the four new
assertions per frame:

1. neither render throws, and neither prints `undefined` or `[object Object]`;
2. **every `data-card-name` in the markup is a name that same frame serialised in
   the clear** (`stackCards`, every zone of every seat, the revealed slice of a
   library, and `input.focusCard`). This is the assertion report 06 §0.6 asks
   for: it is the only check that can see a renderer which kept a name for an id
   whose latest serialisation is `hidden: true`, because the wire-level test
   cannot;
3. **no tile is drawn for a card in an opponent's hand** (the focus card the
   engine itself pushed excepted);
4. **the replay board stays read-only**: every `<button data-act="…">` in the
   replay markup carries `disabled`, and the board root carries
   `data-readonly="true"`; the live markup carries `data-readonly="false"`.

And, because a check that cannot fail proves nothing, a new
**`M4 NEGATIVE CONTROLS`** test asserts that all three of those can fail: that
the name regex matches real attributes on a real frame, that the permitted set
rejects a name the frame does not carry (`Black Lotus`), that the *live* render
of the same state really does contain enabled `data-act` buttons while the replay
render does not, and that the opponent-hand check is non-vacuous (it finds a
frame in `human-auto-42.jsonl` where the opponent's hand is non-empty).

```
$ npm --prefix web run build
tsc --noEmit         → 0 errors
vite build           → dist/assets/index-*.css 68.48 kB (gzip 14.56)
                       dist/assets/index-*.js 221.77 kB (gzip 68.99)
```

---

## 7. Hidden information, in the renderer

Nothing here changes the wire; these are the renderer's own four rules and where
they live.

| Rule | Where |
|---|---|
| One `CardTile` for every card in every zone, everywhere on the board | `CardTile.tsx` is imported by `ZoneRow`, `HandFan`, `PlayerRail`, `StackPanel` and `DecisionPanel`, and by nothing else |
| A concealed card gets a CSS back, **no name, no `title`, no `alt`, no `aria-label` that names it**, and no `data-card-name` | `CardTile` → `Face` → `.tile__face--back`; the aria-label is the literal `face-down card — card N` |
| The opponent's hand is a count in their rail and is never drawn as tiles | `PlayerRail`; asserted per frame in `render.test.tsx` |
| Every id is resolved against the frame being rendered, never cached | `resolve.ts`, called fresh per render |
| A face-down card's real face appears only through `alt` | `Face`'s `back__alt` ribbon, and only when the bridge sent one |

---

## 8. Phase stops: why the dots are read-only

`act: setPhaseStop {playerId, phase, stop}` **is** in `docs/protocol.md` §2.2 —
and its row says **M6**, mapped to `WireGuiGame`'s own stop map, which does not
exist yet. The read side (`players[].phaseStops`, §10) is not on the wire at all.
A toggle with no read-back would have to remember its own state, and a client
that remembers which phases it stops on has put phase-stop logic in the browser,
which `CLAUDE.md` §Scope forbids outright.

So the strip renders **Forge's own documented defaults** — `MAIN1`,
`COMBAT_DECLARE_BLOCKERS`, `MAIN2` for you and `COMBAT_BEGIN`,
`COMBAT_DECLARE_ATTACKERS`, `COMBAT_DECLARE_BLOCKERS`, `END_OF_TURN` for the
opponent, verbatim from `ForgePreferences.java:239-264` — the legend under it
says *"Forge defaults, read-only until M6"*, and every dot is a `disabled`
button whose tooltip names the act, the missing field and the milestone.
`UNTAP` prints `·` in both columns because there is no `PHASE_*_UNTAP`
preference to toggle. Hold priority is the same: disabled, with a tooltip naming
`YieldController.setDisableAutoYields` and M6.

When `players[].phaseStops` ships, the markup does not change — only `onClick`
and the data source.

---

## 9. What is left for evening 3

Straight from report 10 §17, unchanged by this pass:

- `rects.ts` — the namespaced (`c:` / `p:` / `s:`) rect registry and the single
  root `ResizeObserver`;
- `ArrowsOverlay` — stack targets and combat bands, three classes, three
  curvatures. Today those facts are **text**: target chips in the stack panel and
  `→ defender` / `blocks …` notes on the tiles, which §14 rule 4 requires anyway;
- `keys.ts` + `HotkeysOverlay` — `Z` zoom, `S`/`C`/`L`/`H`. Today: `Space` and
  `Escape` (M3's, in `main.tsx`), hover/focus zoom in CSS, and a button for the
  drawer;
- the `AskModal` shell: `role="dialog"`, the focus trap, `Esc` answers null, the
  `timeoutMs` bar;
- the §14 pass proper: a contrast audit of the new dim tokens, and `:focus-visible`
  against every new control.

Two smaller things this pass leaves behind:

- the hover zoom is 300 px and covers a lot of board (screenshot 5);
- the tile's combat note truncates on long defender names (screenshot 13).

---
---

# M4 evidence — evening 3: arrows, the keyboard, the dialog shell

Appended 2026-09-12. Evening **3** of
[`docs/research/10-board-ui-spec.md`](../research/10-board-ui-spec.md) §17: the
rect registry (§9.1), `ArrowsOverlay` (§9.2–§9.3), the `StackPanel` toggle (§8),
the `LogDrawer`'s unresolvable-id rule (§10), the keyboard map (§12) and its `?`
overlay, the `AskModal` shell (§11), the accessibility pass (§14), and the two
cosmetic roughnesses evening 2 left in its own notes.

Everything in §9 above ("what is left for evening 3") is now done. Nothing an
earlier evening built was re-derived: `wedge.ts` is still the stall rule,
`buttons.*.label` is still verbatim, clicks are still never gated on
`selectable`, and `<Board actions={…}/>` is still the whole of the difference
between a replay and a seat.

---

## 10. What shipped in evening 3

| File | Lines | What it is |
|---|---:|---|
| `web/src/keys.ts` | 407 | **new** — ONE keymap table plus two pure functions (`bindingFor`, `planKey`). The handler and the `?` overlay read the same 16 rows, so the help cannot list a key nothing implements. No React, no DOM types: `node --test` imports it |
| `web/src/render/rects.ts` | 222 | **new** — the namespaced (`c:` / `p:` / `s:`) rect registry, one `ResizeObserver` on the board root, the isomorphic layout-effect shim |
| `web/src/render/arrows.ts` | 189 | **new** — `edgePoint` / `arcBetween` / `buildArrows`. Pure, so the *shapes* are testable from `node --test` |
| `web/src/render/ArrowsOverlay.tsx` | 78 | **new** — one `aria-hidden` SVG, two strokes per arrow, three classes |
| `web/src/render/HotkeysOverlay.tsx` | 63 | **new** — `H` / `?`, rendered from `KEYMAP` itself |
| `web/src/render/CardZoom.tsx` | 76 | **new** — `Z`, the `display` variant through the same `CardTile`, with the credit line |
| `web/src/render/useKeyboard.ts` | 38 | **new** — one `window` listener, registered once, reading the current handler through a ref |
| `web/src/render/Board.tsx` | 854 | **edited** — the registry provider, the overlay, the keyboard, five view toggles, the two-press `CTRL+Q`, the key-flash hint |
| `web/src/render/AskModal.tsx` | +106 | **edited** — scrim, focus move + restore, a Tab trap, the `timeoutMs` bar |
| `web/src/render/StackPanel.tsx` | +40 | **edited** — the `S` toggle and the `s:<id>` registration on each row |
| `web/src/render/CardTile.tsx` | +25 | **edited** — the `c:<id>` registration, the `anchor` prop, the `zoom` tile kind |
| `web/src/render/PlayerRail.tsx` | +8 | **edited** — the `p:<id>` registration on the vitals block |
| `web/src/render/LogDrawer.tsx` | +12 | **edited** — an id that does not resolve prints `a card (#42)` |
| `web/src/main.tsx` | −40 | **edited** — M3's inline `Space`/`Escape` handler removed; the board owns the keyboard now |
| `web/src/styles.css` | 2185 | **edited** — arrows, the two overlays, the ask scrim and timeout bar, the flash, and evening 2's two cosmetic notes |
| `web/test/keys.test.ts` | 239 | **new** — 13 tests over the pure keymap |
| `web/test/arrows.test.ts` | 217 | **new** — 5 tests: the geometry, and `buildArrows` over all 2,473 committed state frames |
| `web/test/render.test.tsx` | 738 | **edited** — arrows rendered as real `<path>` elements on a stack-target frame and on a blocked-combat frame, plus an empty-registry negative control and a keymap/overlay agreement test |

**No new dependency.** Report 10 §9.2 allows `perfect-arrows@0.3.7` as the
documented fallback; the hand-rolled geometry is 60 lines including the three
bow scales, and it is unit-tested, so the dependency was not taken.

---

## 11. The three arrow classes, seen in a live game

`./scripts/play.sh --seed 42 --no-open --keep-open`, board at
`http://127.0.0.1:5173/?ws=1`, viewport **1600 × 900**. Thirteen player turns
were played through the browser (won the toss with Forge's own `Play` label,
kept, played lands, cast three creatures, enchanted the opponent's creature,
attacked, was blocked, assigned combat damage). `data-arrow` is read straight out of the DOM.

| # | Screenshot | What is on screen | `data-arrow` |
|---|---|---|---|
| 1 | **Quantum Reduction on the stack, turn 7** | The purple dashed arc leaves the stack panel's row on the right and lands on `Peggy Carter, Secret Agent` in the opponent's permanents row; the panel's target chip says the same thing in text | `target:s:11>c:44` |
| 2 | **the AI's Web Up, turn 10** | The same arc in the other direction: from the stack panel down-left to my `A.I.M. Scientists` (4/4 after its connive counter), which it exiles. `data-arrows="1"`; the panel row reads `stack #25 · Forge AI` and its chip `A.I.M. Scientists #2` (the `data-arrow` attribute itself was not read on this frame — the two either side of it were) | one `target:` arc |
| 3 | **the AI attacks, turn 10** | One red arc from `Peggy Carter` — red outline, `→ Human` note on the tile — up-left to my seat's vitals block in the left rail | `attack:c:44>p:0` |
| 4 | **my attack is double-blocked, turn 13** | Two red arcs from `Quake, Agent of S.H.I.E.L.D.` and `Aerial Doombot` to the Forge AI rail, and two green near-straight arcs from the two `Soldier Token`s back to Quake. The tiles carry `→ Forge AI` and `blocks Quake, Agent of S.H.I.E.L.D. #31` as text | `attack:c:25>p:1`, `attack:c:31>p:1`, `block:c:90>c:31`, `block:c:91>c:31` |
| 5 | **`C` pressed on the same frame** | The two combat classes thicken to 3.5 px and the targeting class drops to 40 % opacity — Forge's `SHORTCUT_SHOWCOMBAT` opens a panel; ours are always drawn, so the key emphasises them | `arrows arrows--combat` |

Every endpoint in every one of those is namespaced. **The collision §10.1 warns
about is real in the committed corpus**: `web/test/arrows.test.ts` counts **40
frames** in which a `stack[].id` is also a battlefield `Card.id`, and the same
test asserts every `from` and `to` matches `^[cps]:\d+$`.

At **1280 × 720**, a second live game (`--seed 7`, the AI on the play) produced
the same two classes: `target:s:11>c:66` with the arc from the 200 px stack
panel to `Agent 13, Sharon Carter`, and `attack:c:66>p:0` + `attack:c:63>p:0`
converging on my rail with the middle strip reading *"2 attacking bands — see
the log drawer"*.

And on the **replay** board, which is where this has to keep working without a
JVM: `?replay=games/g1.jsonl`, frame 266 of 376 at 1600 × 900 draws
`target:s:76>c:28` **and** `attack:c:65>p:0` at once, with
`data-readonly="true"`, 20 `data-act` affordances and **0 of them enabled**.

---

## 12. A defect the browser found, and the fix

Evening 3's registry started as one element per key. Pressing `Z` over a card
that was also on the battlefield registered `c:<id>` twice — the row tile, then
the zoom overlay's copy of the same card — and the overlay's registration won.
When the overlay closed, its ref callback fired with `null` and deleted the key,
so **the card stayed on the board and all three of its arrows disappeared** until
that tile next re-mounted. Measured live: four arrows before `Z`, one after.

The fix is in `rects.ts` and it is not defensive programming, it is the shape the
problem has: a key maps to a **set** of elements, a `null` callback removes
nothing, and the sweep prunes whatever has left the document and measures the
first element still in it (registration order, so the row tile wins). The
secondary copies — the stack thumbnail, the decision panel's focus thumbnail, the
zoom — also pass `anchor={false}`, which says which tile *is* the card; but the
registry no longer depends on nobody ever getting that wrong.

Verified after the fix, in the same session: zoom `c:31`, close it, and all four
of that frame's arrows are still drawn.

---

## 13. The keyboard

The map is one table of **16 bindings** (`web/src/keys.ts`), and `H` renders it.
Forge's own keycodes are cited per row from `ForgePreferences.java:330-349`, and
the four divergences say so in the row itself: `Space` (Forge has no global
binding — `FLabel.java:220-223` activates the *focused* label), `Esc` (Forge
binds it on the prompt buttons, `VPrompt.java:74-84`), `T` (Forge's `T` is
`SHOWTARGETING`, and our arrows are always on), and `B` (unbound in Forge).

What was exercised in the live browser session:

- **`H`** opened the overlay with all 16 rows, the M5/M6 pills on the seven that
  are not wired yet, and Forge's binding in the third column;
- **`Esc` closed the overlay and did *not* press Cancel** — precedence is
  overlay → open `ask` (answer `null`, §5.4) → the engine's Cancel button, and
  the mulligan prompt behind the overlay was still there afterwards;
- **`Esc` answered a live `choose_list`** ("Choose optional costs") with `null`;
  the bridge substituted Forge's documented default and the cast continued into
  "Select target creature";
- **`S`** collapsed the stack panel to its one-line strip — and the targeting
  arrow correctly fell back to the source card's own tile, which is the branch
  `web/test/arrows.test.ts` asserts over the corpus;
- **`L`** opened the log drawer (226 entries of the reducer's ring, capped at
  500, newest first) over the rail;
- **`C`** toggled the combat emphasis;
- **`Z`** zoomed the hovered card to the `display` variant with
  `MSH #32 · art by Solan · © Wizards of the Coast` under it.

Two rules that are easier to get wrong than they look, both now tested as pure
functions:

1. **A focused button keeps `Space` for itself** (the browser already activates
   it; sending `buttonOk` too would answer the engine twice) **and keeps nothing
   else**. M3's handler dropped the whole keyboard for a focused button, so
   clicking a card — which focuses its tile — turned `Escape` off.
2. **A key whose milestone has not arrived says so.** `A`, `CTRL+Z`, `E`, `T`,
   `B`, `Y`, `N` flash their chip and print the reason in the decision panel
   ("auto-pay a mana cost — M5: InputPayMana.supportAutoPay()…"), and `A` /
   `CTRL+Z` outline the disabled Auto Pay / Undo buttons they belong to.

`CTRL+Q` is two presses, like the button, and is planned from **every** state
including an open `ask` and an open overlay (§9 invariant 6). The two-press
concede was used to end the 1280 × 720 game: `Concede` → `Concede — click again
to confirm` → `Game over. Winner: Forge AI. AllOpponentsLost`.

**One environment limitation, stated plainly.** The browser automation driver
delivers `Space` as `{key: "", code: "", keyCode: 0}` — the same measurement M3
recorded — so `Space` could not be exercised through the driver at all; it is
covered by `web/test/keys.test.ts`, which asserts both the `key` and the `code`
spelling. Letter keys and `Escape` arrive correctly and were all driven for real.
Separately, at the emulated **1280 × 720** viewport the driver's synthetic mouse
clicks stopped landing (the same click through `element.click()` worked, and the
page's own `out` counter proved it), so that game was driven by dispatching
clicks on the real buttons rather than by moving a pointer. Every 1600 × 900
click in §11 was a real driver click on a real coordinate.

---

## 14. The ask dialog shell

`role="dialog"`, `aria-modal` (true only when there is a transport to answer
with), a scrim over the board, focus moved to the first control on open and
returned to the previously focused element on close, and `Tab` cycling inside.
Seen live on an `assign_damage` ask at 1600 × 900 — Forge's own
`Assign 3 combat damage from #31 (order overridden) (may skip)`, with the
defender at index 0 (§5.3) and the two blockers' lethal amounts: focus landed in
the first amount field, `document.activeElement` was that `<input>`, and the
keyboard handler correctly ignored every key while it was there.

The timeout bar renders **only when `ask.timeoutMs > 0`**. Over the socket it is
`0` — infinite while a client is connected (D24) — so no bar was drawn, which is
the honest rendering: a bar that ran out and then did nothing would misstate who
is counting.

---

## 15. Accessibility (§14)

- **Arrows are decoration.** The SVG is `aria-hidden="true"`, `focusable="false"`
  and `pointer-events: none`, and every fact it draws is also text: the stack
  panel's target chips, the tiles' `→ defender` / `blocks …` notes, and the log
  drawer's combat band list (`Agent 13, Sharon Carter #66 → Human · unblocked`).
- **Not colour alone.** The three classes differ in curvature (full / half /
  quarter bow), colour, *and* dash pattern — dashed for a target, dotted for a
  block, solid for an attack.
- **Reduced motion** now also covers the arrows' animation, the hover zoom and
  the two overlays; the end states are unchanged, and the dash patterns stay —
  nothing about them moves and they are one of the three non-colour cues.
- **Focus** stays visible: `:focus-visible` is a dashed accent ring, deliberately
  unlike `.tile--selectable`'s solid outline, so "focused" and "the engine will
  accept this" never look the same.
- **The log drawer never invents a name.** An id that does not resolve against
  the frame on screen prints `a card (#42)` — report 10 §3.9's rule, with the id
  kept so a bug report stays actionable.

---

## 16. Layout polish carried over from evening 2

Both items evening 2 recorded in its own notes are fixed:

- the hover zoom was 300 px (418 tall) and covered most of the opponent's rows
  from a hand card. It is now **232 px at 1600 and 196 px at 1280**, and `Z` is
  the one that goes big — `min(420px, 34vw, 46vh)` on a scrim;
- the tile's combat note was 8 px on one truncated line, which lost the
  defender's name exactly when it mattered. It is now 9 px over **two** lines
  with `overflow-wrap: anywhere` (8 px, one line, on the strip and stack
  thumbnails, where there is no room).

One new one found while looking at the zoom: `Z` on a **tapped** card drew it
rotated 90°, because the tile's tap rotation applies at any size. The zoom is
"let me read this card", so `.row--zoom` now cancels the rotation; the `⭮` mark
and the aria-label still say it is tapped.

The measured geometry is unchanged from §1 — `264 / 1160 / 128` at 1600 × 900
and `216 / 912 / 112` at 1280 × 720, `document.scrollWidth === innerWidth` at
both, with the same one deviation (the middle row is short by the height of the
23 px application bar).

---

## 17. Tests

```
npm --prefix web test        271 node --test  (253 + 13 keys + 5 arrows)
                              41 vitest       (38 + 3 arrows/hotkeys)
npm --prefix web run build   0 TypeScript errors
```

`web/test/arrows.test.ts` builds arrows for **every** `state` frame of every
committed recording — 2,473 frames — against a rect lookup invented in the test,
and counts what it found:

```
arrows: 35 target, 575 attack, 62 block over 2473 state frames; 40 real id collisions
```

Those counts are asserted non-zero, because a test that never met a stack target
or a blocked band would pass while drawing nothing. It also asserts the three
properties that would actually break: every endpoint is namespaced and was
really registered, a shut stack panel moves the tail to the source card, and a
missing endpoint drops that one arrow and keeps the rest (with the fully empty
registry — the server-render branch — returning `[]`).

`web/test/render.test.tsx` renders the real `<ArrowsOverlay/>` inside a
`RectsContext.Provider`, so the paths are real `<path d="M… Q…">` elements in the
markup, on a frame that has a stack target and on a frame that has a blocked
band. Its negative control is the SSR branch: `<Board/>` under
`renderToStaticMarkup` registers nothing and the overlay must draw
`data-arrows="0"` with no `<path>` at all. And one more agreement test: every
chord in `KEYMAP` appears in the `HotkeysOverlay` markup, so the help and the
handler cannot drift.

`web/test/keys.test.ts` drives `planKey` through the states that matter: `Space`
with OK enabled, with OK disabled, with OK disabled *and cards outlined* (§4.2's
hint text is asserted), inside an open ask; `Esc`'s three-way precedence; a
read-only board planning no act at all; `CTRL+Q` from every live state; and the
seven not-yet-implemented keys naming their milestone.

No SSR warning is printed by any of it — which is the check that the isomorphic
layout-effect shim (§9.1) is actually in place.

---

## 18. Servers

Two bridges were started and both were stopped by PID (`kill 614796 614690
613505`, and a standalone vite on 5174 for the replay pass). Nothing was left
listening.

The **first** game (`--seed 42`) ended with the bridge's own
`IllegalStateException: the game did not reach 'over'`: thirteen player turns
driven one browser round-trip at a time took longer than `MtgTable`'s **900 s**
game timeout, and the JVM tore the session down mid-`assign_damage`
(`ASK FAILED assign_damage: log already closed`). That is the harness's timeout
doing its job, not a defect in the board — every frame up to that point rendered
and every click was answered. The **second** game (`--seed 7`) was ended
deliberately with the two-press concede and reached `over` cleanly; it was killed
during its 30 s `--keep-open` linger, so its run summary is not in
`var/play/server.log`.

---

## 19. Status, and the documentation pass — 2026-09-12

M4 is **done**: three evenings, built and verified, with eight follow-ups open in
`PLAN.md` and none of them a defect you can see from the board. This section is
the documentation pass — what was re-run to close the milestone, and where each
fact now lives.

### 19.1 The gate, re-run for this pass

```bash
./tools/check-all.sh          # var/verify/m4docs/check-all.log
```

**`check-all OK`, exit 0, 211.99 s wall (3 m 32 s)**, with every M4 change in the
working tree. All thirteen numbered steps plus both lettered sub-steps ran:

| step | what it proved on this run |
|---|---|
| 1–4 | jar + 8 classes, the banned-accessor lint, javac + the three self-tests, `Smoke` |
| 5–6 | a fresh `RecordMatch` (seed 42) and the value-level drift diff against `fixtures/games/g1.jsonl` |
| 7–9 | `--transport null`, the scripted `--transport console` smoke, `--transport auto --seed 11` — 14 player turns, ask kinds `[choose_list, ability_menu]`, **UNIMPL members = none**, emit errors 0 |
| **9b** | `MULTISET IDENTICAL: 1588 frame(s), same content, order ignored` — `human-auto-42` re-records to the same multiset (215 act / 16 answer / 16 ask / 951 input / 154 notice / 233 state / 1 hello_ok / 1 over / 1 session). The advisory took its clean branch this time |
| 10a–10d | four ws servers: doorstep, `--disconnect-mid-ask`, a whole game through `ws-auto-play`, and `--refuse-first-ask` |
| **10e** | a fifth: *"a concede written from the `hello_ok` handler, before any input, ended the session with `over {winner: null, reason: null, matchOver: true}` and no `state` in front of it (amendment M11)"* |
| 11–12 | `check-redaction.mjs` over every committed fixture and every fresh recording, then the checker's own twelve negative controls |
| 13 | `npm run build` (tsc 0 errors) and `npm test` |

Step 13's numbers, from this run:

```
node --test   271 tests · 267 pass · 0 fail · 4 skipped   (2.43 s)
vitest         41 pass  (ask-modal 20, render 21)         (19.06 s)
tsc --noEmit    0 errors
vite build      dist/assets/index-*.css   71.53 kB (gzip 15.18)
                dist/assets/index-*.js   236.51 kB (gzip 74.04)
```

`web/test/arrows.test.ts` printed its census again on this run, unchanged:
`arrows: 35 target, 575 attack, 62 block over 2473 state frames; 40 real id
collisions`.

**A correction to §5.** The unused-font total there ("about 3.2 MB") omits
`mana.woff`. The build in this run emits **nine** font files totalling
**3.72 MB**, of which only `mana-D0absDf6.woff2` (187.40 kB) is ever requested:
`mana.woff` 408.28, `mana.eot` 408.36, `mana.ttf` 408.20, `mana.svg` 1,907.69 and
four `mplantin.*` at 400.24 together — **~3.5 MB** no browser fetches. `PLAN.md`'s
M4 follow-up 1 and **D29** carry the corrected figure.

### 19.2 Where M4's facts now live

| Fact | Written down in |
|---|---|
| M4 is done; what the evidence shows | `PLAN.md` § M4 |
| The eight open follow-ups | `PLAN.md` § *M4 follow-ups — open, 2026-09-12* |
| What the board can and cannot express, the six unevidenced ask kinds, the two probe decks | `PLAN.md` § *What M4 hands to M5* |
| Image variants, hot-linking, the text frame underneath | **D28** |
| `mana-font`, the `@font-face` override, the unused faces | **D29**, `NOTICE` §5 |
| Arrows, the rect registry, the three defects it exists for | **D30** |
| The read-only phase strip until M6 | **D31** |
| The CSS-import rule, `CardTile` as THE renderer, the registry, the keymap table, the pure modules | `CLAUDE.md` § *The web client — the conventions M4 added* |
| The board, the rails, the keys, `?` help, replay mode | `README.md` § *Playing in the browser* |
| Gate now five ws servers, 9b and 10e, 3–4 minutes | `CLAUDE.md` § *Build and run*, `README.md` § *Running it* |

### 19.3 What this pass did not do

No code was edited. `bridge/`, `web/` and `tools/` are untouched by it; the only
files it changed are `PLAN.md`, `README.md`, `DECISIONS.md`, `CLAUDE.md` and this
section. `NOTICE` already carried the `mana-font` entry (section 5) and was left
alone. The three follow-ups that are documentation debt — report 10 §2.2's
middle-row arithmetic, `render.test.tsx`'s stale decision paragraph, and its
order-coupled selectable regex — are **recorded, not fixed**: two of them are
files this pass does not own, and the third is a test whose rewrite belongs with
whoever next touches the suite.
