# mtg-table — M4 board UI spec

**Status: spec for `PLAN.md` M4 ("A board that looks like Magic", 3 evenings).**
Written 2026-09-11. Basis: `docs/protocol.md` v1, `docs/research/05-architecture-synthesis.md`
§7/§9-M4, `docs/research/03-scryfall-card-library.md` §2, `docs/research/06-hidden-information-audit.md`,
`docs/research/09-arena-tier1-plan.md` §3–§4, and Forge 2.0.14 itself.

The reference look is **endstep.cc** as the user screenshotted it. This document turns that
screenshot into components, CSS numbers, protocol field reads and a test.

**Scope discipline, restated so it survives contact with a pretty UI.** M4 is a *renderer*.
`README.md`'s NON-GOALS and `CLAUDE.md` §Scope are binding: no mana-payability prediction,
no targeting validation, no phase-stop logic, no client-side stack resolution, no second card
serialiser, no rules anywhere. A button is enabled **iff** the engine said so, and a card is
**outlined** iff its id is in `input.selectable.cardIds` — which, since protocol amendment
**M8**, is *not* the same as "clickable": `selectable` is the explicit selection set
(targeting, discard, blockers) and is empty at your own main phase, where your hand is
clickable anyway. **Forge is the judge of a click**; a rejected one comes back as a `notice`
(`docs/protocol.md` §4.1, §4.2, §9 invariant 8, and §0.0 item 6 below). Everything in here that
looks like a decision is a *label* or a *coordinate*, never an answer.

---

## 0.0 Wire changes since this document was written (2026-09-11, M1 fixes)

**Read this before implementing §6 or §15.** Five things in `docs/protocol.md` §3
changed after this spec was drafted, and four of them touch the card renderer:

1. **A card has two shapes, and a face-down card is not a third.**
   *(Amended again on 2026-09-11 by protocol amendment P3, hours after the line
   below was written: the intermediate "three shapes" answer is superseded and no
   emitter produces it.)* §6.1's "four keys and nothing else" is gate 1 only, and
   the stub is now **five** keys (`owner` joined it, amendment P1). A face-down
   permanent whose identity is concealed takes the **ordinary full branch**: its
   `name` is `""` and its `setCode` `"???"`, because that is Forge's own
   face-down characteristic, and what the gate withholds is the `alt` block. So a
   card renderer asks `isHidden(card)` for "is this a back" and `altFace(card)`
   for "may I draw the real face"; `isFaceDownHidden` still exists but matches
   nothing any current emitter writes. `fixtures/games/morph.jsonl` (new,
   `decks/morph-probe.dck`) is the fixture that exercises the gate. See §3.3.
2. **`state.stackCards: Card[]`** is a new top-level key: the source card of
   every stack item, through the same single redaction gate. A spell on the stack
   is in `ZoneType.Stack` and therefore in **no** player zone, so
   `stack[].sourceCardId` must be resolved against `stackCards` **first** and the
   player zones second. This is what lets the stack panel draw a real card.
3. **`manaCost` is `null`** for a card with no mana cost — never `""` and never
   Forge's `"no cost"`. Do not write a `hasCost()` helper; test for `null`.
4. **Nullable fields the renderer must be total over:** `zone.from` / `zone.to`
   (a token entering from or leaving to nowhere), every `defender`
   (`combat.bands[]` and `events[].bands[]`), and `stack[].sourceCardId` /
   `stack[].controller`. Events are the opposite — an event missing a required id
   is dropped by the bridge, never emitted as null (§3.6 rule 5).
5. `fixtures/games/` is engine-produced logs only; `sample-handwritten.jsonl`
   moved to `fixtures/synthetic/`. §15's fixture list and the 873-frame count in
   §0 are therefore stale: it is now g1 374 + g2 223 + g3 274 + morph 233 state
   frames.
6. **`input.selectable` is the explicit selection set, not the clickable set**
   (protocol amendment **M8**, 2026-09-11, from the M2 human-seat recordings —
   which did not exist when this document was written). `setSelectables` is
   called for targeting, discard and declare-blockers; `InputPassPriority` never
   calls it, so at your own main phase `selectable` is
   `{cardIds: [], min: 0, max: 0, mode: "none"}` **and your hand is still
   clickable** — 78 of the 86 `clickCard` acts in
   `fixtures/games/human-auto-42.jsonl` are exactly that. §5.1's
   `.tile--selectable` is therefore an **outline for an outstanding choice**, and
   the tile must be a `<button>` (i.e. clickable) for the viewer's own cards even
   when nothing is selectable. **Forge is the judge**: send `act: clickCard` and
   render the `notice {level:"warn", title:"Not selectable"}` that comes back for
   a click it will not take. Deciding clickability locally would be rules logic
   (§18.3), and a board written to the old rule cannot play a land.

Also new and worth reusing rather than reinventing: `web/src/render/describe.ts`
(pure, testable label functions) and `web/src/render/ErrorBoundary.tsx`. A
renderer crash used to blank the whole page; the boundary is why it now shows a
banner and keeps the replay controls alive. Keep `<Board>` inside it.

---

## 0. What was verified for this document

Nothing below is inferred. `[jar]` = `javap` against
`/home/justin-a/forge/forge-gui-desktop-2.0.14-jar-with-dependencies.jar`;
`[src]` = the 2.0.15-SNAPSHOT checkout, read as prose per `CLAUDE.md`;
`[live]` = an HTTP request made today; `[probe]` = run on this machine today.

| Claim | Evidence |
|---|---|
| `PhaseType` has exactly 13 constants, in this order: `UNTAP UPKEEP DRAW MAIN1 COMBAT_BEGIN COMBAT_DECLARE_ATTACKERS COMBAT_DECLARE_BLOCKERS COMBAT_FIRST_STRIKE_DAMAGE COMBAT_DAMAGE COMBAT_END MAIN2 END_OF_TURN CLEANUP` | `javap … forge.game.phase.PhaseType` **[jar]** |
| Forge's own phase strip renders **12** labels — it omits `UNTAP` | `PhaseIndicator.java:22-33` **[src]** (`addPhaseLabel("UP", UPKEEP)` first) |
| The stop prefs are 12 and are offset by one from `PhaseType.values()` | `CMatchUI.java:1420-1432` **[src]**: `for (int p = 1; p < phases.length; p++) … keys[p - 1]` |
| Stop prefs exist as `PHASE_HUMAN_*` / `PHASE_AI_*`, 12 each | `javap … ForgePreferences$FPref` **[jar]**; `ForgePreferences.java:239-264` **[src]** |
| Human stop defaults: MAIN1, DECLAREBLOCKERS, MAIN2 = `true`; rest `false` | `ForgePreferences.java:253-264` **[src]** |
| AI stop defaults: BEGINCOMBAT, DECLAREATTACKERS, DECLAREBLOCKERS, EOT = `true`; rest `false` | `ForgePreferences.java:239-251` **[src]** |
| A phase cell is a tri-state widget in Forge: `enabled` (= stop here), `active` (= current), `yieldMarked` (= the pass-to target) | `javap … forge.toolbox.special.PhaseLabel` **[jar]** — `getEnabled/setEnabled`, `getActive/setActive`, `isYieldMarked/setYieldMarked`, `setOnToggled`, `setOnRightClick` |
| Forge's own tooltip: "Phase: {0}<br>Click to toggle. Right-click to fast-forward." | `res/languages/en-US.properties:3272` |
| Pass-to is `YieldController`, in `forge.gamemodes.match` (**not** `forge.gui.control` as `PLAN.md` M6 implies) | `javap … forge.gamemodes.match.YieldController` **[jar]**: `setMarker(PlayerView, PhaseType, boolean)`, `getAutoPassUntilMarker()`, `isPriorityAtOrPastMarker(...)`, `setSkipPhase(PlayerView, PhaseType, boolean)`, `isSkippingPhase(...)`, `setAutoPassUntilEndOfTurn(boolean)` |
| `YieldMarker` is exactly `(PlayerView phaseOwner, PhaseType phase)` | `javap … forge.gamemodes.match.YieldMarker` **[jar]** |
| Forge has **no "hold priority" feature**. Grep of `en-US.properties` for `priority` returns auto-pass, AFK and "must wait" strings only; no `FPref` named `*HOLD*` exists | `res/languages/en-US.properties`; `javap … FPref` **[jar]** |
| `SHORTCUT_*` keycodes (decoded below) | `ForgePreferences.java:330-349` **[src]**; all 20 present as `FPref` constants **[jar]** |
| Esc → Cancel is a *button* key listener, guarded by `UI_ALLOW_ESC_TO_END_TURN` when Cancel reads "End Turn" | `VPrompt.java:74-84` **[src]** |
| Space/Enter activates a focused Forge label; there is no global "space = OK" | `FLabel.java:220-223` **[src]** |
| `CardView.isToken()` and `isTokenCard()` exist; so do `isFaceDown()`, `isSick()`, `isAttacking()`, `isPhasedOut()`, `canFaceDownBeShownTo(PlayerView)` | `javap … forge.game.card.CardView` **[jar]** |
| `InputPayMana.supportAutoPay()` exists — the Auto button is an engine feature, not ours | `javap … forge.gamemodes.match.input.InputPayMana` **[jar]** |
| Scryfall WEBP `grid` = 488×680, **37,270 bytes**; JPG `normal` = 488×680, **73,417 bytes** | `HEAD https://cards.scryfall.io/{grid,normal}/front/1/3/1383e587-….{webp,jpg}` **[live]** |
| Scryfall WEBP `display` = 672×936, **50,338 bytes** — *smaller than the 488×680 JPG* | same **[live]** |
| Every variant answers `access-control-allow-origin: *`, `cache-control: public, max-age=31556952` | same **[live]**, confirming report 09 §4.2 |
| `mana-font@1.18.0`, published 2024-11-11. Code MIT, font SIL OFL 1.1, symbols © WotC. No runtime dependencies. `main: css/mana.css` | `registry.npmjs.org/mana-font` + repo README **[live]** |
| `mana.css@1.18.0` defines `.ms`, `.ms-cost`, `.ms-shadow`, `.ms-tap`, `.ms-untap`, `.ms-power`, `.ms-toughness`, `.ms-split`, `.ms-half`, `.ms-loyalty-{0..25,up,down,start,x,zero,outline}`, `.ms-counter-{plus,minus,plus-uneven,minus-uneven,loyalty,charge,lore,stun,shield,…}`, `.ms-ci-*`, `.ms-dfc-*` | downloaded and grepped **[live]** |
| `mana.css@1.18.0`'s `@font-face` lists **eot/woff/ttf/svg but not woff2**, although `fonts/mana.woff2` exists on the CDN at 187,400 bytes vs `mana.woff` at 408,284 | `mana.css:1-7` + `HEAD` on both **[live]** |
| `perfect-arrows@0.3.7`, MIT, no runtime deps, ESM build 24,645 bytes, last published 2021-09-28. `getBoxToBoxArrow(x0,y0,w0,h0,x1,y1,w1,h1,opts) → number[]` = `[sx,sy,cx,cy,ex,ey,ae,as,ac]` | `registry.npmjs.org/perfect-arrows`, `dist/lib/*.d.ts` **[live]** |
| Node v24.20.0 has `module.registerHooks` and `process.features.typescript === 'strip'`; `esbuild@0.28.2` is already installed under `web/node_modules` (transitively, via Vite 7); `react-dom@18.3.1` ships `server.js` | `node -e …` **[probe]** |
| A 20-line `registerHooks` + `esbuild.transformSync` loader makes `.tsx` importable from `node --test`, and `renderToStaticMarkup` then renders a component to a string | full probe run **[probe]** |
| `renderToStaticMarkup` prints the React warning *"useLayoutEffect does nothing on the server"* | same probe **[probe]** |
| Fixture sizes: `g1` 374 state frames / 3.67 MB, `g2` 223 / 1.74 MB, `g3` 274 / 2.39 MB, `sample-handwritten` 2 / 15 KB — **873 state frames to render in the test** | `grep -c '"type":"state"'` on `fixtures/games/*.jsonl` |

Two consequences worth pulling out of that table now:

1. **`display` WEBP costs fewer bytes than `normal` JPG at 1.4× the linear resolution.** Report
   03 §2.1's recommendation ("store `normal` as the interoperable baseline, `display`/`grid`
   when we want the crisper render") is now measured, not assumed.
2. **The "Hold Priority" toggle in the reference screenshot has no engine behind it.** Forge
   always returns priority to a human after they cast; MTGO's hold-priority idea does not
   exist there. §8.4 says what we render instead.

---

## 1. Component tree

New and changed files, all under `web/src/`. `Board`'s export and props stay source-compatible
with M1 so `main.tsx` keeps working; only `onAct` is added.

```
web/src/
  render/
    Board.tsx           the grid, the keyboard listener, the rect-registry provider
    PlayerRail.tsx      one seat: name, life, poison, zone counts, mana pool
    DecisionPanel.tsx   title + engine prompt + OK/Auto Pay/Cancel/Undo + Pass-to row
    PhaseStrip.tsx      turn number + 13 phase cells + Hold Priority
    ZoneRow.tsx         one horizontal row of tiles (lands / permanents / graveyard strip)
    CardTile.tsx        THE card renderer. Every card anywhere goes through this.
    HandFan.tsx         the viewer's hand, fanned
    StackPanel.tsx      the floating "The Stack" panel
    ArrowsOverlay.tsx   one SVG over the whole board
    LogDrawer.tsx       left-edge drawer over the rail
    AskModal.tsx        the blocking-question dialog shell
    CardZoom.tsx        Z / hover-hold: one big card
    HotkeysOverlay.tsx  H: the keymap, rendered from the same table the handler uses
    rects.ts            rect registry (context + hook). Not a component.
    labels.ts           PHASE_LABELS, STEP_TITLE, COUNTER_LABELS. Pure data.
  keys.ts               the keymap table + useKeyboard()
  art.ts                + imageUrl(entry, size, side), + preloadArt(index)
  reduce.ts             + a capped `log` ring (§10)
  styles.css            one plain stylesheet, extended
```

```
<Board state art onAct?>                        ClientState in, ActBody out
├── <RectsProvider>                             rects.ts — a Map<string, DOMRect>
├── aside.rail-left
│   ├── <PlayerRail seat={opponent} />
│   ├── <PlayerRail seat={you} />
│   ├── <DecisionPanel />
│   └── <LogDrawer />                           absolutely positioned over the rail
├── main.table
│   ├── <ZoneRow kind="lands"      owner={opponent} />
│   ├── <ZoneRow kind="permanents" owner={opponent} />
│   ├── div.table__middle
│   │   ├── <ZoneRow kind="graveyard-strip" owner={opponent} />   (small, right-aligned)
│   │   ├── <StackPanel />                      floating, right of centre
│   │   └── <ZoneRow kind="graveyard-strip" owner={you} />
│   ├── <ZoneRow kind="permanents" owner={you} />
│   ├── <ZoneRow kind="lands"      owner={you} />
│   └── <HandFan />
├── aside.rail-right
│   └── <PhaseStrip />
├── <ArrowsOverlay />                            absolute, inset 0, pointer-events none
├── <AskModal />                                 rendered iff state.ask !== null
├── <CardZoom />                                 rendered iff zoomed !== null
├── <HotkeysOverlay />                           rendered iff hotkeys open
└── div.toasts                                   state.notices, newest 4
```

`ZoneRow` is one component for three jobs because a "lands row" and a "permanents row" differ
only in `--cw` / `--ch` and the filter over `zones.battlefield.cards`. Do not write three.

**Hard rule for this tree:** no file under `render/` may `import './x.css'`. The M4 test
imports these modules from `node --test`, which has no CSS loader (§15). All styling lives in
`styles.css`, imported once by `main.tsx` — which is already how M1 does it.

---

## 2. Layout

### 2.1 Tokens

One plain stylesheet, no framework, two explicit breakpoints. Card aspect is **488 : 680 =
1 : 1.3934** — the exact Scryfall `normal`/`grid` ratio, so an `<img>` never letterboxes. (A
real card is 63×88 mm = 1 : 1.3968; the 0.2 % difference is invisible and matching the asset
is worth more.)

```css
:root {
  /* geometry — 1600 × 900 and anything wider */
  --pad: 12px;            /* page padding                                  */
  --gap-col: 12px;        /* between rail and table                        */
  --gap-row: 10px;        /* between zone rows                             */
  --gap-card: 8px;        /* between tiles in a row, before overlap kicks in */
  --rail-l: 264px;
  --rail-r: 128px;

  --ch-bf: 132px;   --cw-bf: 95px;    /* permanents:  132 / 1.3934 = 94.7  */
  --ch-land: 104px; --cw-land: 75px;  /* lands:       104 / 1.3934 = 74.6  */
  --ch-hand: 190px; --cw-hand: 136px; /* hand:        190 / 1.3934 = 136.4 */
  --ch-strip: 76px; --cw-strip: 55px; /* graveyard / exile strips          */
  --ch-stack: 61px; --cw-stack: 44px; /* stack-panel thumbnails            */

  /* board palette — extends M1's tokens, does not replace them */
  --felt: #10161c;
  --felt-line: #1d2731;
  --you: #6fb4ff;         /* the viewer's colour, everywhere               */
  --opp: #ff8a6b;         /* the opponent's colour, everywhere             */
  --tap: #b9772f;
  --arrow-target: #c79bff;
  --arrow-attack: #ff6b6b;
  --arrow-block: #7ddf87;
}

@media (max-width: 1439px) {          /* 1280 × 720 */
  :root {
    --pad: 10px; --gap-col: 10px; --gap-row: 8px; --gap-card: 6px;
    --rail-l: 216px; --rail-r: 112px;
    --ch-bf: 104px;   --cw-bf: 75px;
    --ch-land: 84px;  --cw-land: 60px;
    --ch-hand: 150px; --cw-hand: 108px;
    --ch-strip: 62px; --cw-strip: 45px;
    --ch-stack: 54px; --cw-stack: 39px;
  }
}
```

The alternative — `clamp(96px, 14.7vh, 140px)` everywhere — is fewer lines but impossible to
screenshot-verify. Two explicit blocks; take a screenshot at each size at the end of every
evening.

### 2.2 The grid

```css
.board {
  display: grid;
  block-size: 100dvh;
  padding: var(--pad);
  gap: var(--gap-row) var(--gap-col);
  grid-template-columns: var(--rail-l) minmax(0, 1fr) var(--rail-r);
  grid-template-rows:
    var(--ch-land)            /* opponent lands       */
    var(--ch-bf)              /* opponent permanents  */
    minmax(120px, 1fr)        /* the table            */
    var(--ch-bf)              /* your permanents      */
    var(--ch-land)            /* your lands           */
    var(--ch-hand);           /* your hand            */
  grid-template-areas:
    "railL oppLands  railR"
    "railL oppPerms  railR"
    "railL middle    railR"
    "railL youPerms  railR"
    "railL youLands  railR"
    "railL hand      railR";
  background: var(--felt);
  position: relative;   /* the arrows overlay and the log drawer anchor here */
  overflow: hidden;     /* the page never scrolls; rows compress instead     */
}
```

Derived sizes (arithmetic, so it can be checked against a screenshot):

| | 1600 × 900 | 1280 × 720 |
|---|---|---|
| table column width | 1600 − 24 − 264 − 128 − 24 = **1160 px** | 1280 − 20 − 216 − 112 − 20 = **912 px** |
| rows, fixed | 104+132+132+104+190 = 662 | 84+104+104+84+150 = 526 |
| row gaps (5) | 50 | 40 |
| page padding | 24 | 20 |
| **middle row (1fr)** | 900 − 736 = **164 px** | 720 − 586 = **134 px** |
| permanents per row, no overlap | ⌊(1160+8)/(95+8)⌋ = **11** | ⌊(912+6)/(75+6)⌋ = **11** |
| lands per row, no overlap | ⌊(1160+8)/(75+8)⌋ = **14** | ⌊(912+6)/(60+6)⌋ = **13** |
| hand cards, no overlap | ⌊(1160+8)/(136+8)⌋ = **8** | ⌊(912+6)/(108+6)⌋ = **8** |
| left-rail budget | 876 px tall for 2 rails + decision + pass-to ≈ 670 | 700 px for ≈ 580 |
| right-rail budget | 876 px for turn(44) + 13×30 + hold(40) = 474 | 700 px for 40 + 13×24 + 36 = 388 |

Eleven permanents and fourteen lands with no overlap is comfortably more than a 40-card W/U
deck puts on a board; the overlap rule below is the safety net, not the normal case.

### 2.3 Rows never scroll — they overlap

A zone row is a flex row that packs tighter as it fills, the way a real table does. The
component passes a **slot count**, not a card count, because a tapped tile is wider (§4.3):

```tsx
const slots = untappedCount + tappedCount * (CH / CW);   // a plain number
<ul className="row" style={{ '--slots': slots } as CSSProperties}>
```

```css
.row {
  display: flex; align-items: center; justify-content: center;
  inline-size: 100%; block-size: 100%; margin: 0; padding: 0; list-style: none;
  --step: min(
    calc(var(--cw) + var(--gap-card)),
    calc((100% - var(--cw)) / max(calc(var(--slots) - 1), 1))
  );
}
.row > li + li { margin-inline-start: calc(var(--step) - var(--cw)); }
```

CSS `calc()` permits division by a `<number>`, and a custom property that resolves to a bare
number qualifies; `max(calc(var(--slots) - 1), 1)` keeps a one-card row from dividing by zero.
The `100%` in the numerator resolves at the use site — the `li`'s containing block, i.e. the
row's content box — which is what we want. Past the threshold the margin goes negative and the
cards shingle left-over-right; `li { z-index: var(--i) }` (index passed as a style var) keeps
the shingling consistent instead of letting DOM order fight `position`.

### 2.4 Wireframe — 1600 × 900

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ┌── rail-left 264 ───┐ ┌──────────────── table  1160 ─────────────────┐ ┌ rail-right 128 ┐           │
│ │ ● Opponent    (AI) │ │ ▣ ▣ ▣ ▣ ▣ ▣                      opp lands  │ │   ROUND  9     │  104     │
│ │ ♥ 17   ☠ 0         │ │                                     104 h   │ │   turn 17      │          │
│ │ ▤ 21  ✋ 4  ⚰ 2    │ ├──────────────────────────────────────────────┤ ├────────────────┤          │
│ │ {W}{U}             │ │ ▢ ▢[T] ▢ ▢                    opp permanents│ │ Untap      · · │  132     │
│ ├────────────────────┤ │                                     132 h   │ │ Upkeep     ○ ● │          │
│ │ ● Pacho       (you)│ ├──────────────────────────────────────────────┤ │ Draw       ○ ○ │          │
│ │ ♥ 20   ☠ 0         │ │  ⚰▫▫          ┌──────────────────┐          │ │ Main 1     ● ○ │          │
│ │ ▤ 24  ✋ 5  ⚰ 1    │ │               │ THE STACK        │          │ │ ─ combat ───── │          │
│ │ {W}{U}{1}          │ │   ← arrows    │ ▭ Quake — tgt ◀──┼──┐       │ │  Beginning ○ ● │  164 1fr │
│ ├────────────────────┤ │     drawn     │ ▭ Coulson ETB    │  │       │ │  Attackers ○ ● │          │
│ │ DECISION           │ │     here      └──────────────────┘  │       │ │  Blockers  ● ● │          │
│ │ Your first main    │ │  ⚰▫▫                                │       │ │  1st strike○ ○ │          │
│ │ phase              │ ├─────────────────────────────────────┼──────┤ │  Damage    ○ ○ │          │
│ │ "Play a land or…"  │ │ ▢ ▢ ▢[T]▢ ◀────────────────────────┘      │ │  End combat○ ○ │          │
│ │ ┌────────────────┐ │ │        ▲ selectable            your perms  │ │ Main 2     ● ○ │  132     │
│ │ │ OK      SPACE  │ │ ├────────────────────────────────────────────┤ │ End        ○ ● │          │
│ │ │ Auto Pay    A  │ │ │ ▣ ▣[T]▣ ▣ ▣                    your lands  │ │ Cleanup    ○ ○ │  104     │
│ │ │ Cancel    ESC  │ │ ├────────────────────────────────────────────┤ ├────────────────┤          │
│ │ │ Undo   CTRL+Z  │ │ │      ╱▔▔╲╱▔▔╲╱▔▔╲╱▔▔╲╱▔▔╲                  │ │ Hold priority  │          │
│ │ └────────────────┘ │ │     │ ▭  ││ ▭  ││ ▭  ││ ▭  ││ ▭ │  hand    │ │ [ OFF ]        │  190     │
│ │ PASS TO            │ │      ╲__╱╲__╱╲__╱╲__╱╲__╱     fanned       │ │                │          │
│ │ End of turn     E  │ │                                            │ │                │          │
│ │ My next turn    T  │ └────────────────────────────────────────────┘ └────────────────┘          │
│ │ Before my turn  B  │                                                                              │
│ ├────────────────────┤    ▣ land  ▢ permanent  ▭ hand/stack card  [T] tapped (rotated 90°)         │
│ │ ‹ LOG              │    ● stop set   ○ stop clear   · no pref (UNTAP)   left dot = your turn      │
│ └────────────────────┘                                right dot = opponent's turn                   │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.5 Wireframe — 1280 × 720

Same areas, tighter tokens. The only structural change is that `PlayerRail` drops to one line
per stat pair and `StackPanel` narrows to 200 px.

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│ ┌ rail-left 216 ─┐ ┌───────────── table 912 ──────────────┐ ┌ rail-r 112 ┐         │
│ │ ● Opponent  AI │ │ ▣ ▣ ▣ ▣ ▣                 opp lands  │ │  ROUND 9   │  84     │
│ │ ♥17 ☠0 ▤21 ✋4 │ ├──────────────────────────────────────┤ │  turn 17   │         │
│ ├────────────────┤ │ ▢ ▢[T] ▢                  opp perms  │ ├────────────┤ 104     │
│ │ ● Pacho    you │ ├──────────────────────────────────────┤ │ Untap  · · │         │
│ │ ♥20 ☠0 ▤24 ✋5 │ │ ⚰▫  ┌───────────────┐               │ │ Upkeep ○ ● │         │
│ ├────────────────┤ │     │ THE STACK     │               │ │ Draw   ○ ○ │ 134 1fr │
│ │ DECISION       │ │     │ ▭ Quake ◀─────┼──┐            │ │ Main 1 ● ○ │         │
│ │ Your first     │ │ ⚰▫  └───────────────┘  │            │ │ Begin  ○ ● │         │
│ │ main phase     │ ├────────────────────────┼────────────┤ │ Attack ○ ● │         │
│ │ "Play a land…" │ │ ▢ ▢ ▢[T] ◀─────────────┘ your perms │ │ Block  ● ● │ 104     │
│ │ [OK     SPACE] │ ├──────────────────────────────────────┤ │ 1st    ○ ○ │         │
│ │ [Auto Pay   A] │ │ ▣ ▣[T]▣ ▣                your lands  │ │ Damage ○ ○ │  84     │
│ │ [Cancel   ESC] │ ├──────────────────────────────────────┤ │ EndCmb ○ ○ │         │
│ │ [Undo  CTRL+Z] │ │    ╱▔╲╱▔╲╱▔╲╱▔╲╱▔╲       hand        │ │ Main 2 ● ○ │         │
│ │ PASS TO E T B  │ │   │▭ ││▭ ││▭ ││▭ ││▭│                │ │ End    ○ ● │ 150     │
│ ├────────────────┤ │    ╲_╱╲_╱╲_╱╲_╱╲_╱                   │ │ Cleanup○ ○ │         │
│ │ ‹ LOG          │ └──────────────────────────────────────┘ │ Hold [OFF] │         │
│ └────────────────┘                                          └────────────┘         │
└────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Protocol field map

Every read, by component, cited to `docs/protocol.md`. A component that wants a field not in
this table is a bug or a protocol change (§16) — never a computation.

`you` is resolved once in `Board`: `state.hello?.you ?? state.session?.seat ?? null`
(§2.1, §8.1, §10.7). `opponent` is the other entry in `board.players`. Both by **id**, never by
array index (§3.1, §10.7).

### 3.1 `Board`

| Reads | Section | Use |
|---|---|---|
| `state.hello.you`, `state.session.seat` | §2.1, §8.1 | seat resolution |
| `state.hello.players[].{id,name,isAi}` | §2.1 | names before the first `state` arrives |
| `state.hello.unsupportedCards` | §2.1 | a persistent warn banner if non-empty; never swallowed |
| `state.board` (whole) | §3 | `null` → the empty-board placeholder, unchanged from M1 |
| `state.board.gameOver`, `state.gameOver` | §3.1, §7 | the result banner; sticky |
| `state.input`, `state.ask` | §4, §5 | passed down; also gates the keyboard handler |
| `state.notices` | §6 | toasts |

`Board` builds two indexes once per `board` identity, with `useMemo`:

```ts
cardsById:  Map<number, {card: AnyCard; owner: number; zone: ZoneName}>  // every zone, both seats
playersById: Map<number, PlayerState>
```

**§10.1 is a hard constraint on these indexes.** `stack[].id` is a `StackItemView` id and
collides with `Card.id` — fixture `g1.jsonl` has a hidden card `#56` and a stack item `#56` in
the same frame. `cardsById` therefore contains **only** card ids, stack items are never put in
it, and every rect-registry key is namespaced (`c:41`, `p:1`, `s:56`, §11.2).

### 3.2 `PlayerRail`

| Reads | Section |
|---|---|
| `player.{id,name,isAi,life,poison}` | §3 |
| `player.counters` — every counter type **except** poison | §3.1, **§10.2** |
| `player.manaPool.{W,U,B,R,G,C}` — all six keys always present, zeros included | §3.1 |
| `player.zones.library.count` — **count only, never `cards`** | §3.4 |
| `player.zones.{hand,graveyard,exile,command}.count` | §3.1 |
| `board.activePlayer`, `board.priority` — player **ids**, `null` pre-game | §3.1, §10.5 |

Renders the *opponent's* hand as a count, never as tiles. That is both the reference look and
the cheapest possible redaction posture.

Clickable iff `input.selectable.mode === 'players'` and this id is selectable → `act:
clickPlayer` (§2.2). See the open question in §16.4 about where player ids live.

### 3.3 `ZoneRow` and `HandFan`

| Reads | Section |
|---|---|
| `player.zones.battlefield.cards` | §3.1 |
| `player.zones.{graveyard,exile}.cards` and `.count` | §3.1 |
| `players[you].zones.hand.cards` | §3.1 |
| each `Card.types` — to split lands from the rest (see below) | §3.2, §10.4 |
| each `Card.attachedToId` — attachments are hoisted into their host's tile, not laid out | §3.2 |
| `input.selectable.cardIds`, `input.highlighted` | §4 |

**Land/permanent split.** `card.types` is Forge's `CardType.toString()` verbatim, with a plain
**hyphen** and no em dash (§10.4). The split is
`/(^|\s)Land(\s|$|—|-)/.test(card.types)` — a *presentation* bucket, exactly like phase labels,
and it never affects what is clickable. A card that matches both (a creature-land) goes in the
permanents row; that is a layout choice, not a rules one.

**Attachments.** A battlefield card with `attachedToId !== null` is removed from its own row and
rendered inside its host's tile (§4.4). The host is looked up in `cardsById` across *both*
seats, because an Aura on the opponent's creature lives in the caster's `attachmentIds` but must
draw on the opponent's row. If the host id does not resolve — the host is hidden, or gone — the
attachment falls back to a standalone tile. Never drop it.

### 3.4 `CardTile`

| Reads | Section | Rendering |
|---|---|---|
| `isHidden(card)` → `{id, zone, controller, hidden}` and nothing else | §3.3 | CSS card back, **no name, no `title`, no `alt`, no `aria-label` naming it** |
| `name` | §3.2 | the text frame; `data-card-name` (the test in §15.2 reads this) |
| `manaCost` | §3.2 | mana pips (§13) |
| `types` | §3.2, §10.4 | the type line, hyphen preserved |
| `power` / `toughness` — **strings** (`"*"`, `"1+*"`), `null` off creatures | §3.2, §10.4 | the P/T pill, verbatim |
| `loyalty` — `null` unless a planeswalker | §10.4 | loyalty shield instead of the P/T pill |
| `damage` | §3.2 | a separate red `−N` chip; **never subtracted from `toughness`** |
| `counters` (every type, no exclusion) | §3.2, §10.2 | badges (§4.5) |
| `tapped` | §3.2 | 90° rotation (§4.3) |
| `sick` | §3.2 | desaturation + badge, only when `zone === 'battlefield'` |
| `attacking` / `blocking` | §3.2 | a combat outline; the arrow itself comes from `combat.bands` |
| `faceDown` | §3.2 | card back + a "face-down" microlabel |
| `attachedToId` / `attachmentIds` | §3.2 | §4.4 |
| `controller` / `owner` | §3.2 | the 3 px colour stripe (`--you` / `--opp`) |
| `zone` | §3.2 | gates which affordances apply |
| `abilities[].{id,text,canPlay,isSpell}` | §3.2, **§10.3** | an ability chip per `canPlay === true`; `[]` in every M1 fixture and that is correct |
| `input.selectable.cardIds` / `.mode` | §4 | `.tile--selectable`, `<button>`, `act: clickCard` |
| `input.highlighted` | §4 | `.tile--highlighted`, **not** clickable |
| `input.focusCardId` | §4 | `.tile--focus` |

`abilities[].canPlay` is the engine's answer and the only basis for showing an ability
(§3.2). `abilities[].id` is echoed back in `act: clickAbility`; the client never reconstructs
an ability.

### 3.5 `DecisionPanel`

| Reads | Section |
|---|---|
| `input.prompt` — **rendered verbatim, never rewritten** | §4 |
| `input.buttons.ok.{label,enabled}`, `input.buttons.cancel.{label,enabled}` | §4 |
| `input.selectable.{cardIds,min,max,mode}` | §4, **§4.2** |
| `input.focusCardId` → thumbnail via `cardsById` | §4 |
| `board.phase`, `board.activePlayer` | §3.1, §10.5 |
| `state.gameOver` | §7 |

### 3.6 `PhaseStrip`

| Reads | Section |
|---|---|
| `board.turn`, `board.round` | §3.1 — **show `round` large, `turn` small**; §3.1 says showing `turn` where the player expects `round` is a bug report waiting to happen |
| `board.phase` — the Forge `PhaseType` name verbatim, `null` pre-game | §3.1, §10.5 |
| `board.activePlayer` | §3.1 |
| `players[].stops` *(proposed, §16.1)* | — |
| `state.passTo` *(proposed, §16.1)* | — |

### 3.7 `StackPanel`

| Reads | Section |
|---|---|
| `board.stack[]` — ordered **bottom first**, last element resolves next | §3.1 |
| `stack[].id` — a `StackItemView` id, a **different id space** from card ids | **§10.1** |
| `stack[].sourceCardId` — the only correct way to reach the card | §10.1 |
| `stack[].controller`, `.text` | §3 |
| `stack[].targetCardIds`, `.targetPlayerIds` | §3 |

### 3.8 `ArrowsOverlay`

| Reads | Section |
|---|---|
| `board.stack[].{id,targetCardIds,targetPlayerIds}` | §3 |
| `board.combat` — **`null` outside a combat phase**; `bands` is `[]` outside combat | §3.1 |
| `combat.bands[].{attackerIds, blockerIds, defender:{kind,id}, damageOrder}` | §3.1 |

`defender.kind` is `"player"` or `"card"` (planeswalkers, battles) and `id` is a player id or a
card id accordingly (§3.1). Resolve through the namespaced registry, never by guessing.

### 3.9 `LogDrawer`

Reads `state.log` (the new ring, §10) and `state.notices` (§6). It resolves ids against the
**same frame** the event came from (§3.6 rule 1), and an id that does not resolve prints
"a card" — never a name remembered from an earlier frame (report 06 §0.6).

### 3.10 `AskModal`

Reads `state.ask` — one of the twelve kinds in §5.1, with `askId` and `timeoutMs`. M4 restyles
the shell only; per-kind bodies are M5.

---

## 4. `CardTile`

### 4.1 Sizing

```css
.tile { inline-size: var(--cw); block-size: var(--ch);
        display: grid; place-items: center; position: relative; }
.tile__face { inline-size: var(--cw); block-size: var(--ch);
              border-radius: calc(var(--cw) * 0.045);   /* ≈ 4.3px at 95px wide */
              overflow: hidden; position: relative; }
.tile__img  { position: absolute; inset: 0; inline-size: 100%; block-size: 100%;
              object-fit: cover; opacity: 0; transition: opacity 140ms ease; }
.tile__img--loaded { opacity: 1; }
```

The text frame is always rendered *underneath* the `<img>`. A slow image, a 404, a blocked
request — none of them change the layout, and none of them can block a click, because the click
handler is on `.tile`, which exists before any network call (synthesis §7, `PLAN.md` M4:
"A missing image renders a generated text card frame and never blocks a click").

### 4.2 Images

`art.json` keys on **name** and stores the Scryfall `normal` JPG plus `scryfallId` (see
`web/src/art.ts`, `tools/fetch-art.ts`). Report 03 §2.2's CDN shape is
`https://cards.scryfall.io/{size}/{side}/{id[0]}/{id[1]}/{id}.{ext}`, so every other variant is a
string substitution away — no refetch, no regenerated `art.json`, and `art.json` keeps `normal`
as the interoperable baseline exactly as report 03 §2.1 recommends.

```ts
// art.ts — new
export type ImgSize = 'thumb' | 'grid' | 'display' | 'small' | 'normal' | 'large';
const WEBP = new Set<ImgSize>(['thumb', 'grid', 'display']);

export function imageUrl(e: ArtEntry, size: ImgSize, side: 'front' | 'back' = 'front'): string {
  const id = e.scryfallId;
  if (id.length < 2) return side === 'back' ? (e.back ?? e.front) : e.front;  // fallback
  const ext = WEBP.has(size) ? 'webp' : 'jpg';
  return `https://cards.scryfall.io/${size}/${side}/${id[0]}/${id[1]}/${id}.${ext}`;
}
```

**Which size, and why** (all three numbers measured live today, §0):

| Where | CSS width | Size | Bytes | Reason |
|---|---|---|---|---|
| battlefield, lands, hand | 60–136 px | **`grid`** (488×680 WEBP) | 37,270 | 2.0× oversampled at DPR 2 for the hand; **half the bytes of `normal` JPG at identical dimensions** |
| stack panel, log drawer | 39–44 px | **`thumb`** (146×204 WEBP) | ~8 K | 1.7× at DPR 2; 28 of them cost less than one `grid` |
| card zoom (Z) | ~440 px | **`display`** (672×936 WEBP) | 50,338 | still fewer bytes than `normal` JPG, and it is the only place the extra pixels are visible |

Decode memory is the reason `display` is not the board default: 672×936×4 B = 2.5 MB per
decoded bitmap × 28 distinct cards ≈ 70 MB, against 1.33 MB × 28 ≈ 37 MB for `grid`.

`<img>` attributes, all four load-bearing:

```tsx
<img src={url} width={488} height={680}        /* intrinsic ratio → zero CLS          */
     decoding="async"                          /* never block the main thread         */
     loading="eager"                           /* every board card is in the viewport */
     referrerPolicy="no-referrer" draggable={false} alt=""
     onLoad={…} onError={…} />
```

`alt=""` is deliberate: the tile itself carries the `aria-label` (§14), so a duplicate `alt`
would make every card announce twice.

**Warm the cache once.** After `loadArtIndex()` resolves, `preloadArt(index)` fires
`new Image().src = imageUrl(e, 'grid')` for all 28 entries — ≈ 1.0 MB one-off. Scryfall answers
`cache-control: public, max-age=31556952` (verified live), so the second game and every reload
are instant. Do not preload `thumb` or `display`; they are small and rare.

**Failures are permanent and cheap.** `onError` adds the URL to a module-level `Set<string>` and
forces the text frame. Never retry; a retry loop against a CDN that is answering 404 is a
self-inflicted rate-limit.

**The card back is drawn in CSS, not fetched.** Scryfall has no generic-back endpoint, and
synthesis §8 forbids committing card images or Forge's `res/` assets. A radial-gradient rounded
rectangle with a centred glyph is free, always available, scales to any `--cw`, and carries no
licensing question at all.

### 4.3 Tapped = rotate 90°, and the row makes room

```css
.tile--tapped { inline-size: var(--ch); }                  /* claim the rotated footprint */
.tile--tapped .tile__face { transform: rotate(90deg); }    /* about the centre, the default */
.tile--tapped .tile__face::after { box-shadow: inset 0 0 0 2px var(--tap); }
```

A 95×132 face rotated about its centre inside a 132-wide tile becomes a 132×95 shape still
centred in the tile, so **nothing overlaps a neighbour**. The cost is horizontal room, which is
exactly what Forge's own battlefield pays, and §2.3's `--slots` already accounts for it
(`tapped * (CH / CW)` = `tapped * 1.3934`).

Overlays (P/T, counters, stripe) live on `.tile`, **not** inside `.tile__face`, so they stay
upright when the face rotates. That is the single most common way this goes wrong.

`prefers-reduced-motion: reduce` → no transition on the rotation; it simply is or is not
rotated.

### 4.4 Attachments overlap their host

```
.tile__attachments  position:absolute; inset:0; pointer-events:none;
  child i: transform: translate(calc(i * 10%), calc(i * 7%)) scale(.82); z-index: -1;
```

Equipment and Auras render *behind and down-right of* their host, peeking out — the standard
tabletop read. They are removed from their own controller's row (§3.3) and take no slot. Their
own selectable/highlight state still applies, so `pointer-events` is re-enabled on the visible
sliver (`.tile__attachments > *:not(:last-child) { pointer-events: auto }` on the exposed edge —
or, simpler and adequate for M4, clicking anywhere on the host's tile when the *attachment* is
the selectable one is disambiguated by the DecisionPanel's prompt; ship the simple version and
revisit only if it actually bites).

### 4.5 Badges

| Badge | Source | Rendering |
|---|---|---|
| P/T | `power`/`toughness` strings | bottom-right pill, `power`/`toughness` verbatim, `.ms .ms-power` / `.ms-toughness` glyphs optional |
| damage | `damage > 0` | a red `−N` chip beside the P/T pill. **Never** subtracted from `toughness` — that is a rules computation |
| loyalty | `loyalty !== null` | bottom-right shield, replaces the P/T pill |
| counters | `counters` map | bottom-left column, one pill per type |
| summoning sick | `sick && zone === 'battlefield'` | `filter: grayscale(.35) brightness(.86)` on `.tile__face` + a 14 px swirl badge, top-left |
| token | `card.token` *(proposed, §16.1)* | dashed 1 px border + a "TOKEN" microlabel. **Until the field exists, no token affordance** — do not infer one from a missing `setCode` or an id range |
| controller | `controller` | a 3 px stripe down the left edge, `--you` / `--opp` |
| face-down | `faceDown` | the CSS back + a "face-down" microlabel |

Counter labels map only what we can name; anything else prints the raw Forge
`CounterType.getName()` string. Never invent a rules meaning for a counter:

```ts
// labels.ts
export const COUNTER_LABELS: Record<string, {text: string; cls: string}> = {
  P1P1:  { text: '+1/+1', cls: 'ctr--plus'  },
  M1M1:  { text: '−1/−1', cls: 'ctr--minus' },
  LOYALTY:{ text: 'loyalty', cls: 'ctr--loyalty' },
  POISON: { text: 'poison', cls: 'ctr--poison' },
  // …everything else: { text: name, cls: 'ctr--other' }
};
```

`mana-font` supplies real glyphs for a useful subset — `.ms-counter-plus`, `.ms-counter-minus`,
`.ms-counter-plus-uneven`, `.ms-counter-loyalty`, `.ms-counter-charge`, `.ms-counter-lore`,
`.ms-counter-stun`, `.ms-counter-shield` and ~30 more, all verified present at 1.18.0 (§0).

---

## 5. Affordances, and the one invariant that decides them

### 5.1 The three card states

```ts
const sel  = input?.selectable;
const isSelectable  = sel?.mode === 'cards' && sel.cardIds.includes(card.id);
const isHighlighted = input?.highlighted.includes(card.id) ?? false;
const isFocus       = input?.focusCardId === card.id;
```

| State | Class | Element | Non-colour cue | Click |
|---|---|---|---|---|
| selectable | `.tile--selectable` | `<button type="button">` | 3 px solid outline **+ a corner caret** | `act: clickCard` |
| highlighted | `.tile--highlighted` | `<li>` | violet dashed outline + a dotted top edge | none |
| focus | `.tile--focus` | either | a soft ring + a thumbnail in the DecisionPanel | none |
| none of the three, **viewer's own card** | — | `<button type="button">` | no outline | `act: clickCard` |

`selectable` wins over `highlighted` when both apply. Using real `<button>` elements for
selectable cards buys keyboard and screen-reader support for free and is why §14 is short.

**The fourth row is amendment M8 and it is the one M5 depends on.** `isSelectable` decides the
*outline*, never the element: `selectable` is empty for the whole of your main phase, so a tile
that is only a `<button>` when `isSelectable` is true cannot play a land or cast a spell. Every
card the viewer controls or owns in a visible zone is a button; Forge rejects the ones it will
not take, with a `notice`. (An opponent's battlefield permanent is clickable too — that is how
targeting works when the engine *has* set selectables — so the simple rule is: a tile with a
real id is a button unless the card is a hidden stub.)

### 5.2 `ok.enabled === false` means "click a card" (§4.2)

This is the documented hang: a button-only client stalls at the discard step with no error
(report 02 §4.7, protocol §4.2 and §9 invariant 5). `DecisionPanel` renders it explicitly:

```ts
const okDead   = input !== null && !input.buttons.ok.enabled;
const haveCards = (input?.selectable.cardIds.length ?? 0) > 0;

if (okDead && haveCards)  → amber hint line:
    "Click a card — {min}{max>min ? `–${max}` : ''} of {n} highlighted"
    and the OK button renders disabled with that same text as its title/aria-describedby.

if (okDead && !haveCards && state.ask === null && state.gameOver === null)
    → a LOUD amber "waiting on the engine — nothing here is clickable" line.
```

The second branch is the point. That exact combination — OK disabled, nothing selectable, no
outstanding `ask`, game not over — is the signature of a wedged game thread, and it must be
*visible*, because a wedge is otherwise indistinguishable from a hung app (synthesis §11). §15.2
asserts branch one on every fixture frame that reaches it.

### 5.3 What is never computed

No mana-payability preview. No "you can't cast this" grey-out beyond
`abilities[].canPlay`. No target legality. No stop logic. No stack resolution. Forge already
knows; we render its answer (`CLAUDE.md` §Scope).

---

## 6. `PhaseStrip`

### 6.1 The vocabulary

Thirteen cells, one per `PhaseType` constant, in enum order (`[jar]`, §0). Labels are ours —
the client maps Forge's phase name to a label and never parses meaning out of it (§3.1) — but
they are derived from Forge's own two vocabularies so nothing is invented:

| `PhaseType` | Forge `nameForUi` (`en-US.properties:2464-2476`) | Forge cell caption (`PhaseIndicator.java:22-33`) | **Our label** |
|---|---|---|---|
| `UNTAP` | Untap step | *(none)* | Untap |
| `UPKEEP` | Upkeep step | `UP` | Upkeep |
| `DRAW` | Draw step | `DR` | Draw |
| `MAIN1` | Main phase, precombat | `M1` | Main 1 |
| `COMBAT_BEGIN` | Beginning of Combat Step | `BC` | Beginning |
| `COMBAT_DECLARE_ATTACKERS` | Declare Attackers Step | `DA` | Attackers |
| `COMBAT_DECLARE_BLOCKERS` | Declare Blockers Step | `DB` | Blockers |
| `COMBAT_FIRST_STRIKE_DAMAGE` | First Strike Damage Step | `FS` | First strike |
| `COMBAT_DAMAGE` | Combat Damage Step | `CD` | Damage |
| `COMBAT_END` | End of Combat Step | `EC` | End of combat |
| `MAIN2` | Main phase, postcombat | `M2` | Main 2 |
| `END_OF_TURN` | End step | `ET` | End |
| `CLEANUP` | Cleanup step | `CL` | Cleanup |

The six combat rows are indented under a `─ combat ─` divider, matching
`PhaseType.PHASE_GROUPS` **[jar]**, which groups them exactly that way.

`board.phase === null` in the pre-game frames (§10.5) → no cell is active and the strip renders
"before the game". `render(state)` must be total over that; a strip that assumes a phase string
crashes on frame 1 of every fixture.

### 6.2 Each cell is a stop toggle, with two dots

Forge's `PhaseLabel` is a tri-state widget — `enabled` (stop here), `active` (current phase),
`yieldMarked` (the pass-to target) — and `CMatchUI` keeps **one indicator per player field**, so
the state is per (player-whose-turn-it-is, phase). We render that as two dots per row:

```
  Main 1     ● ○          left dot  = stop when it is YOUR turn   (FPref.PHASES_HUMAN)
             ↑ ↑          right dot = stop when it is the OPPONENT's turn (FPref.PHASES_AI)
```

- Filled `●` = stop. Hollow `○` = pass through. `·` = **no toggle exists** — only `UNTAP`,
  because `CMatchUI.actuateMatchPreferences` loops `p = 1 … 12` and there is no
  `PHASE_*_UNTAP` pref (§0). Rendering a 13th toggle that cannot exist would be a lie.
- Filled/hollow is a *shape* difference, not only a colour one (§14).
- The current phase's row gets `.phase--active`: a filled background in `--you` or `--opp`
  depending on `board.activePlayer === you`.
- Click a dot → `act: setPhaseStop {playerId, phase, stop}` — **already in the protocol**
  (§2.2), mapped server-side to `YieldController.setSkipPhase(PlayerView, PhaseType, !stop)` and
  read back by `IGuiGame.isUiSetToSkipPhase` (`PLAN.md` M6).
- Right-click → the pass-to marker, mirroring Forge's own tooltip ("Right-click to
  fast-forward") and `PhaseLabel.setOnRightClick` → `YieldController.setMarker`.

**In M4 the dots are read-only.** They render from `players[].stops` when the field exists
(§16.1) and otherwise from Forge's own defaults, so a screenshot is honest on day one:

```
you (PHASES_HUMAN):  MAIN1, COMBAT_DECLARE_BLOCKERS, MAIN2
opponent (PHASES_AI): COMBAT_BEGIN, COMBAT_DECLARE_ATTACKERS, COMBAT_DECLARE_BLOCKERS, END_OF_TURN
```

(both verbatim from `ForgePreferences.java:239-264`). M6 makes them live; the markup does not
change, only `onClick` and the data source.

### 6.3 Turn number

`ROUND {board.round}` large, `turn {board.turn}` small underneath. §3.1 is explicit: `turn`
counts **player turns**, report 04 measured 17 `GameEventTurnBegan` for a game the log calls
"Turn 9", and showing one where the player expects the other is a bug report waiting to happen.

### 6.4 Hold Priority

There is no such Forge feature (§0). The honest mapping is the **inverse of Forge's auto-pass**:
`FPref.YIELD_AUTO_PASS_NO_ACTIONS` / `YieldController.setDisableAutoYields(boolean)` /
`setAutoPassUntilStackEmpty(...)`. "Hold priority ON" = auto-yield disabled = the engine always
stops for you.

M4 renders the toggle disabled with a tooltip naming that mapping and M6 as the milestone. It
must not become a client-side state machine: a client that swallows a priority pass because a
toggle is on has put rules in the browser.

---

## 7. `DecisionPanel`

### 7.1 Title

```ts
// labels.ts — presentation only
const STEP_TITLE: Record<string, string> = {
  UNTAP: 'untap step', UPKEEP: 'upkeep', DRAW: 'draw step',
  MAIN1: 'first main phase',
  COMBAT_BEGIN: 'beginning of combat',
  COMBAT_DECLARE_ATTACKERS: 'declare attackers',
  COMBAT_DECLARE_BLOCKERS: 'declare blockers',
  COMBAT_FIRST_STRIKE_DAMAGE: 'first-strike damage',
  COMBAT_DAMAGE: 'combat damage', COMBAT_END: 'end of combat',
  MAIN2: 'second main phase', END_OF_TURN: 'end step', CLEANUP: 'cleanup',
};

title =
  board.phase === null            ? 'Before the game'
: board.activePlayer === you      ? `Your ${STEP_TITLE[board.phase] ?? board.phase}`
: `${opponentName}'s ${STEP_TITLE[board.phase] ?? board.phase}`;
```

`MAIN1` → "Your first main phase", matching the screenshot. The fallback `?? board.phase` means
a `PhaseType` constant we have never seen renders as its raw name instead of `undefined`.

**Below the title, `input.prompt` is rendered verbatim** in a `role="status"` region. It is
never rewritten, never summarised, never replaced by the title (§4). The title says *where we
are*; the prompt says *what the engine wants*.

### 7.2 Buttons

| Button | Label | Hint chip | Action | Milestone |
|---|---|---|---|---|
| OK | **`input.buttons.ok.label`, verbatim** | `SPACE` | `act: buttonOk` | M4 |
| Auto Pay | "Auto Pay" | `A` | mana auto-payment | **M5** — disabled in M4 |
| Cancel | **`input.buttons.cancel.label`, verbatim** | `ESC` | `act: buttonCancel` | M4 |
| Undo | "Undo" | `CTRL+Z` | `act: undo` | **M6** — disabled in M4 (§16.1: needs `input.canUndo`) |
| Concede | "Concede" | `CTRL+Q` | `act: concede` | **M4**, always enabled |

Two notes that matter more than they look:

- **The OK label comes from the engine.** `updateButtons` sends "OK", "End Turn", "Done" and
  others depending on the input; Endstep's screenshot says "Pass Priority" because that is
  *its* engine's word. Hardcoding "Pass Priority" over Forge's label is precisely the
  "the board threw the engine's answer away" failure that synthesis §3.2 calls out. Render the
  label; put the words "pass priority" in the keyboard hint and the tooltip. **See §16.4.1 —
  the user may prefer otherwise, and it is a one-line change either way.**
- **Concede must be reachable from every UI state** (§5.2, §9 invariant 6), including while an
  `ask` is open and while the board is wedged. It lives in the DecisionPanel *and* on `CTRL+Q`
  bound at `window`, outside the modal's focus trap.

### 7.3 Pass to

Three buttons, hints `E` / `T` / `B`, all disabled in M4 with tooltips naming their M6 engine
call:

| Button | Engine call (`[jar]`-confirmed) |
|---|---|
| End of turn | `YieldController.setAutoPassUntilEndOfTurn(true)` |
| My next turn | `YieldController.setMarker(youView, <phase>, true)` |
| Before my turn | `YieldController.setMarker(opponentView, END_OF_TURN, true)` |

The active marker shows in the **PhaseStrip**, as `PhaseLabel.setYieldMarked` does in Forge —
one place for "where are we going", not two.

---

## 8. `StackPanel`

Floating, absolutely positioned inside the middle row, right of centre, 240 px wide at 1600 and
200 px at 1280. Toggled by `S` (Forge's `SHORTCUT_SHOWSTACK` = keycode 83, §12).

- `board.stack` is ordered **bottom first**; the panel renders it **reversed**, so the item that
  resolves next is the top row, tagged "resolves next" (§3.1).
- Each row: a `--cw-stack` thumbnail of `cardsById.get(item.sourceCardId)` at Scryfall `thumb`,
  a controller colour stripe, `item.text`, and target chips.
- Target chips are **text**: each `targetCardIds` id resolved to a name (or `hidden card #id`
  when the id does not resolve — which is correct, not a bug, §3.6 rule 1), each
  `targetPlayerIds` id to a player name. The arrows are decoration; the chips are the
  information (§14).
- The row carries `ref={rects.register('s:' + item.id)}` — namespaced, because `stack[].id` and
  `Card.id` collide (§10.1).
- Empty stack → the panel collapses to a 1-line "stack empty" strip rather than disappearing, so
  its presence does not flicker every priority pass.

---

## 9. `ArrowsOverlay`

### 9.1 The rect registry

```ts
// rects.ts
type Key = `c:${number}` | `p:${number}` | `s:${number}`;   // namespaced — §10.1
interface Rects {
  register(key: Key): (el: HTMLElement | null) => void;   // ref callback
  get(key: Key): DOMRect | undefined;                     // board-relative
  version: number;                                        // bumps on re-measure
}
```

`Board` owns the provider. One `useLayoutEffect` after each render sweeps the registered
elements, calls `getBoundingClientRect()` on each, subtracts the board root's own rect, and
stores the result. One `ResizeObserver` on the board root (not 80 of them — every tile moves
together) plus a `window.resize` listener re-run the sweep.

`useLayoutEffect` is the isomorphic hazard: `renderToStaticMarkup` warns *"useLayoutEffect does
nothing on the server"* (reproduced in the §0 probe). Use the standard shim and keep it in one
place:

```ts
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;
```

### 9.2 Geometry — hand-rolled, ~40 lines

```ts
function arrow(a: DOMRect, b: DOMRect) {
  const ac = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
  const bc = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  const s  = edgePoint(a, ac, bc);          // where the line leaves box a
  const e  = edgePoint(b, bc, ac);          // where it enters box b
  const dx = e.x - s.x, dy = e.y - s.y, d = Math.hypot(dx, dy) || 1;
  const bow = Math.min(90, Math.max(24, d * 0.18));      // arc height, clamped
  const c  = { x: (s.x + e.x) / 2 - (dy / d) * bow,
               y: (s.y + e.y) / 2 + (dx / d) * bow };
  const head = Math.atan2(e.y - c.y, e.x - c.x);
  return { path: `M${s.x} ${s.y} Q${c.x} ${c.y} ${e.x} ${e.y}`, head, e };
}
```

`edgePoint` is the standard ray/rectangle intersection (clamp the direction against the box's
half-extents). The head is a 9 px triangle rotated to `head`. Stroke the path twice — a 4 px
dark under-stroke then a 2 px coloured one — so an arrow stays readable over card art.

**Three arrow classes, three colours, three shapes:**

| Class | From → To | Colour | Bow |
|---|---|---|---|
| `.arrow--target` | `s:<stackId>` → `c:<targetCardId>` / `p:<targetPlayerId>` | `--arrow-target` | full (long, high arc) |
| `.arrow--attack` | `c:<attackerId>` → band `defender` (`p:` or `c:`) | `--arrow-attack` | half (`bow * 0.5`) |
| `.arrow--block` | `c:<blockerId>` → its attacker | `--arrow-block` | quarter (short, nearly straight) |

**Why not `perfect-arrows`.** It is MIT, 24,645 bytes of ESM, has no runtime dependencies and
its `getBoxToBoxArrow` returns `[sx, sy, cx, cy, ex, ey, ae, as, ac]`, which drops straight into
the same `M/Q` + head code above — so it is a genuinely low-risk dependency and the documented
fallback. But its `bow`/`stretch`/`flip` heuristics are tuned for sparse node graphs, and our
arrows run between near-identical boxes in a dense grid where the three classes want three
*different*, known shapes. Forty lines we control beat a 2021 dependency we would spend the
evening tuning. If hand-rolled reads badly on a wide board, swapping in `perfect-arrows@0.3.7`
is a ten-line change, and report 09 §3.4 already plans the 3D analogue of the same two fields.

### 9.3 Rendering

One `<svg class="arrows" aria-hidden="true">`, `position:absolute; inset:0;
pointer-events:none`, `viewBox="0 0 W H"` in CSS pixels of the board rect. Nothing in it is
focusable and nothing in it is the sole carrier of any fact (§14). Under
`prefers-reduced-motion: reduce`, no dash animation and no fade-in.

**Scope note.** `PLAN.md` M5 lists "SVG targeting arrows" and M4 does not. This spec puts arrows
in M4 for the subset that `state` already carries with no new input plumbing — stack targets and
combat bands — because the reference screenshot has them and because they cost one evening-third
once the registry exists. **M5 keeps** the arrows drawn *while choosing* targets, which needs
`ask`/`input` wiring that does not exist yet. Flagged as §16.4.5.

---

## 10. `LogDrawer`

Left edge, over the rail, toggled by `L` (Forge's `SHORTCUT_SHOWCONSOLE` = 76).

**It is not Forge's game log.** Report 06 §0.5 and §5.4 establish that `GameEventAddLog` /
`GameEventRandomLog` are text leak channels — `CardView.toString()` returns the real name for a
card in *any* zone — and protocol §3.6 rule 4 already drops them. The drawer is built from
`state.events` (ids only) and `state.notices`.

That needs one small change in `reduce.ts`, because `ClientState.events` holds only the most
recent frame's batch:

```ts
export const MAX_LOG = 500;
export interface LogEntry { seq: number; t: number; event: GameEvent; }
// ClientState gains: log: LogEntry[]   — capped, oldest dropped, same shape as `notices`
```

Put it in `reduce.ts` and nowhere else. `reduce` is the only function that sees every frame, it
is pure, and the replay transport's "step back" is literally "re-fold from the session header"
(`reduce.ts` header comment) — so a log built there is automatically correct when scrubbing. A
drawer that subscribed to the transport itself would desync the moment the user scrubbed.

Entry text is composed at render time from ids resolved against **that frame's** board, and an
unresolvable id prints "a card" (§3.6 rule 1, report 06 §0.6: a redacted card replaces, it never
merges). 500 entries ≈ a whole game at the observed event density; the cap matches `MAX_NOTICES`
in spirit.

---

## 11. `AskModal`

M4 is presentation only. The twelve kinds keep their M3 rendering inside a new shell:

- `<div role="dialog" aria-modal="true" aria-labelledby>` over a scrim.
- Focus moves to the first control on open and returns to the previously focused element on
  close; a focus trap cycles within the dialog. `CTRL+Q` (concede) is bound at `window` and is
  deliberately **outside** the trap (§5.2/§9 invariant 6).
- `Esc` answers `null`. This is always legal — §5.2 requires every `ask` to be answerable with
  `null`, and the server returns Forge's documented default.
- A thin timeout bar driven by `ask.timeoutMs`, which §5 calls advisory for the client and
  enforced by the server. Show it; do not enforce it.
- The reducer already throws on an unknown `ask.kind` (§5.1); the modal never needs a default
  branch, and must not grow one.

M5 replaces the bodies (mana payment, targeting, `assign_damage`, `order`, …).

---

## 12. Keyboard

### 12.1 Forge's own bindings, decoded

`ForgePreferences.java:330-349`; keycodes are `java.awt.event.KeyEvent` VKs
(17 = Ctrl, 16 = Shift):

| `FPref` | value | keys | `en-US.properties` description |
|---|---|---|---|
| `SHORTCUT_SHOWSTACK` | `83` | **S** | Match: show stack panel |
| `SHORTCUT_SHOWCOMBAT` | `67` | **C** | Match: show combat panel |
| `SHORTCUT_SHOWCONSOLE` | `76` | **L** | Match: show console panel |
| `SHORTCUT_SHOWDEV` | `68` | D | Match: show dev panel |
| `SHORTCUT_UNDO` | `17 90` | **Ctrl+Z** | Match: undo last action |
| `SHORTCUT_CONCEDE` | `17 81` | **Ctrl+Q** | Match: concede game |
| `SHORTCUT_ENDTURN` | `17 69` | **Ctrl+E** | Match: pass priority until end of turn or interrupt |
| `SHORTCUT_ALPHASTRIKE` | `17 65` | Ctrl+A | Match: Alpha Strike (attack with all available) |
| `SHORTCUT_SHOWTARGETING` | `84` | **T** | Match: toggle targeting visual overlay |
| `SHORTCUT_AUTOYIELD_ALWAYS_YES` | `89` | Y | auto-yield ability on stack (Always Yes) |
| `SHORTCUT_AUTOYIELD_ALWAYS_NO` | `78` | N | auto-yield ability on stack (Always No) |
| `SHORTCUT_YIELD_OPTIONS` | `17 89` | Ctrl+Y | Yield: open Yield Options menu |
| `SHORTCUT_YIELD_AUTO_PASS` | `80` | P | Yield: toggle Auto-Pass / cancel active yields |
| `SHORTCUT_CARD_ZOOM` | `90` | **Z** | Match: zoom the currently selected card |
| `SHORTCUT_SHOWHOTKEYS` | `72` | **H** | Match: show keyboard shortcuts |
| `SHORTCUT_PANELTABS` | `17 84` | Ctrl+T | Match: toggle panel tabs |
| `SHORTCUT_CARDOVERLAYS` | `17 79` | Ctrl+O | Match: toggle card overlays |
| `SHORTCUT_MACRO_*` | `16 82` / `16 50` / `16 51` | Shift+R / Shift+2 / Shift+3 | macros |

Plus, not in `FPref`:

- **Esc → Cancel**, as a key listener on the two prompt buttons, guarded by
  `FPref.UI_ALLOW_ESC_TO_END_TURN` when Cancel's label is "End Turn" (`VPrompt.java:74-84`).
- **Space/Enter activates a focused label** (`FLabel.java:220-223`). Forge has **no global
  "space = OK"**; it works there because the OK button is focusable Swing.

### 12.2 Our keymap

```ts
// keys.ts — one table, consumed by both the handler and HotkeysOverlay
```

| Key | Action | Matches Forge? | M4 |
|---|---|---|---|
| `Space` | `act: buttonOk` if `ok.enabled`, else flash the §5.2 hint | **divergence** — adopted from the reference look; Forge has no global binding | ✅ |
| `Esc` | close modal → `answer: null`; else `act: buttonCancel` if `cancel.enabled` | `VPrompt.java:74-84` | ✅ |
| `Ctrl+Q` | `act: concede` (after a confirm) | `SHORTCUT_CONCEDE` | ✅ |
| `Z` | card zoom (focused, else hovered) | `SHORTCUT_CARD_ZOOM` | ✅ |
| `S` | toggle StackPanel | `SHORTCUT_SHOWSTACK` | ✅ |
| `C` | toggle combat arrow emphasis | `SHORTCUT_SHOWCOMBAT` | ✅ |
| `L` | toggle LogDrawer | `SHORTCUT_SHOWCONSOLE` | ✅ |
| `H` | HotkeysOverlay | `SHORTCUT_SHOWHOTKEYS` | ✅ |
| `A` | Auto Pay | Forge's Auto lives in `InputPayMana` (`supportAutoPay()`); `Ctrl+A` is Alpha Strike | **M5** |
| `Ctrl+Z` | `act: undo` | `SHORTCUT_UNDO` | **M6** |
| `E` | pass to end of turn | Forge uses **Ctrl+E**; we bind **both** | **M6** |
| `T` | pass to my next turn | **conflict** — Forge's `T` is `SHOWTARGETING` (§16.4.3) | **M6** |
| `B` | pass to before my turn | unbound in Forge | **M6** |
| `Ctrl+A` | `act: alphaStrike` | `SHORTCUT_ALPHASTRIKE` | **M5/M6** |
| `Y` / `N` | always-yes / always-no on the open `ask` | `SHORTCUT_AUTOYIELD_*` | **M6** |

Handler rules, all four load-bearing:

1. One listener, registered on `window` in a `useEffect` in `Board` with an **empty dep array**;
   it reads the current state through a ref. Re-binding on every frame would add and remove a
   listener ~600 times a game.
2. Ignore the event entirely when `e.target` is an `input`, `textarea`, `select` or
   `[contenteditable]`, or when `e.isComposing`.
3. `preventDefault()` **only** for keys we actually consumed — `Space` scrolls the page
   otherwise, and swallowing browser shortcuts we do not use is hostile.
4. A key whose action is not yet implemented does nothing except flash its chip in the
   DecisionPanel, so the hint is never a lie.

---

## 13. Mana pips

**`mana-font@1.18.0`** — code MIT, font SIL OFL 1.1, symbols © Wizards of the Coast; published
2024-11-11; no runtime dependencies; `main: css/mana.css` (all verified live, §0). MIT and OFL
1.1 are both GPL-3.0-compatible, so this is the first and only runtime CSS dependency `web/`
takes, and `NOTICE` gains an entry for it.

```bash
npm i --prefix web mana-font@1.18.0
```

```ts
// main.tsx, next to './styles.css'
import 'mana-font/css/mana.css';
```

Vite rewrites the `../fonts/mana.*` URLs inside the package's CSS and emits the font files into
`dist/assets/`, so nothing is hot-linked and nothing needs copying by hand.

`manaCost` on the wire is Forge's brace string, `"{1}{W}"` (§3.2). Parsing is a regex over the
braces and a lowercase of the contents; hybrid and Phyrexian symbols already have classes:

```tsx
export function ManaCost({ cost }: { cost: string | null }) {
  if (!cost) return null;
  return <>{[...cost.matchAll(/\{([^}]+)\}/g)].map(([, sym], i) => (
    <i key={i} className={`ms ms-${sym.toLowerCase().replace('/', '')} ms-cost ms-shadow`}
       aria-hidden="true" />
  ))}<span className="sr-only">{cost}</span></>;
}
```

`{W/U}` → `ms-wu`, `{2/W}` → `ms-2w`, `{W/P}` → `ms-wp`, `{X}` → `ms-x`, `{T}` → `ms-tap` — all
present at 1.18.0 (§0). `.ms-cost` draws the round coloured badge; `.ms-shadow` adds the drop
shadow. The `sr-only` span carries the raw string so a screen reader reads something meaningful
(§14).

**One measured optimisation worth the two lines.** `mana.css@1.18.0`'s `@font-face` lists
eot/woff/ttf/svg and **not woff2**, even though `fonts/mana.woff2` exists on the CDN at
**187,400 bytes against `mana.woff`'s 408,284**. Add one override after the import:

```css
@font-face {
  font-family: "Mana";
  src: url("mana-font/fonts/mana.woff2") format("woff2");  /* 187 KB, not 408 KB */
  font-weight: normal; font-style: normal; font-display: block;
}
```

Also scope the mana font to `.ms`, and never import `MPlantin` — `mana.css` declares it but we
do not use it, and Vite will emit a second 400 KB face if anything references it.

---

## 14. Accessibility

Not a checklist bolted on at the end; five rules that fall out of the component choices already
made.

1. **Selectable cards are `<button>` elements** (§5.1). That gives keyboard focus, `Enter`/
   `Space` activation, and a role, for free. Non-interactive cards are `<li>` with
   `aria-label`. Do not put `onClick` on a `<div>` anywhere in `render/`.
2. **Redaction extends to the accessibility tree.** A hidden card's `aria-label` is exactly
   `"face-down card"` — no id-derived name, no `title`, no `alt`. §15.2 tests the rendered
   markup, which catches a leak through `aria-label` as readily as one through visible text.
   A visible card's label is composed from fields already on screen:
   `"Agent Phil Coulson, Legendary Creature - Human Spy Hero, 2/2, tapped, one +1/+1 counter"`.
3. **Nothing is colour-only.** Selectable adds a corner caret; highlighted adds a dashed edge;
   phase stops are filled vs hollow *shapes*; the three arrow classes differ in curvature as
   well as hue; `--you` / `--opp` are always paired with the player's name. Body text on
   `--panel` and `--felt` must clear 4.5:1 — check `--muted: #8d95a3` on `--felt: #10161c`
   (≈ 7.1:1, fine) and any new dimmer token before shipping it.
4. **Arrows are decoration.** The SVG is `aria-hidden="true"`, and every fact it draws is also
   text: stack targets as chips in `StackPanel` (§8), combat as a list under the board (kept
   from M1's `CombatPanel`, restyled and collapsed by default). Information that exists only as
   a picture fails for a screen reader *and* for a screenshot pasted into a bug report.
5. **Motion and focus.** `@media (prefers-reduced-motion: reduce)` removes the hand-fan hover
   lift, the image fade-in, the tap rotation transition and any arrow animation — the end states
   are unchanged. `:focus-visible` gets a ring visually distinct from `.tile--selectable`'s
   outline, so "focused" and "the engine will accept this" never look the same.

`role="status"` on the prompt region and `aria-live="polite"` on the notice toasts. The prompt
changes on almost every priority pass, so `polite` (not `assertive`) is correct; `assertive`
would interrupt continuously.

---

## 15. Test strategy

Goal: **every frame of every committed fixture renders without throwing**, run by `npm test`,
with no JVM, no browser and no jsdom. 873 state frames across four fixtures (§0).

### 15.1 Making `.tsx` importable from `node --test`

Node 24 strips types from `.ts` but **does not transform JSX**, so `Board.tsx` cannot be
imported directly. `module.registerHooks` (present in v24.20.0) plus `esbuild.transformSync`
(esbuild 0.28.2 is already in `web/node_modules` via Vite 7) is 20 lines and no new download.
**This was run end-to-end on this machine today** (§0) — the markup came back and the
`useLayoutEffect` SSR warning appeared exactly as §9.1 predicts.

```ts
// web/test/tsx-hook.ts
import { registerHooks } from 'node:module';
import { transformSync } from 'esbuild';

registerHooks({
  load(url, context, nextLoad) {
    if (!url.endsWith('.tsx')) return nextLoad(url, context);
    const r = nextLoad(url, { ...context, format: 'module' });
    const src = typeof r.source === 'string'
      ? r.source : Buffer.from(r.source as ArrayBuffer).toString('utf8');
    const out = transformSync(src, {
      loader: 'tsx', format: 'esm', jsx: 'automatic', target: 'node22', sourcefile: url,
    });
    return { ...r, format: 'module', source: out.code };
  },
});
```

```jsonc
// web/package.json
"devDependencies": { "esbuild": "^0.28.2", /* already installed transitively — now explicit */ },
"scripts": { "test": "node --import ./test/tsx-hook.ts --test test/*.test.ts" }
```

Add `esbuild` as an explicit devDependency rather than relying on a transitive hoist. Vitest
would also work and would cost a real install and a second config; `node --test` is what the
repo already uses.

### 15.2 `web/test/render.test.ts`

```ts
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { Board } from '../src/render/Board.tsx';
import { EMPTY_ART_INDEX, parseArtFile } from '../src/art.ts';
```

For each fixture, fold with the existing `reduce`, and on **every** frame whose type is `state`
render `<Board state art />` and assert:

1. **It does not throw.** This is the headline and it catches the whole class of "the renderer
   assumed a field the engine sometimes omits" — most sharply the pre-game frames where `turn`,
   `round` are 0 and `phase`, `activePlayer`, `priority` are all `null` (§10.5), and
   `abilities: []` frames (§10.3), and `combat: null` outside combat (§3.1).
2. **No name leaks through the view.** Collect `data-card-name="…"` out of the markup and
   assert the set is a subset of the names on **non-hidden** cards in that same frame. This is
   strictly stronger than the wire-level check in `fixtures.test.ts`, because it catches the
   leak report 06 §0.6 says is *"the worst remaining leak … in `reduce.ts`, not in
   `Snap.java`"* — a renderer that keeps a name for an id whose latest serialisation is
   `hidden: true`. The wire test cannot see that; this one can.
3. **Selectables are rendered exactly once each.** For every id in `input.selectable.cardIds`
   that resolves to a card in a rendered zone, exactly one element carries
   `data-selectable="true"` with that id. Guards the §5.2 invariant from the *rendering* side.
4. **The disabled-OK hint appears.** Whenever `buttons.ok.enabled === false &&
   selectable.cardIds.length > 0`, the markup contains the click-a-card hint string. A direct
   test of protocol §4.2 / §9 invariant 5 — the exact condition that stalls a button-only client.
5. **Two art indexes.** Render each fixture once with `EMPTY_ART_INDEX` (every card is a text
   frame — the fresh-checkout path, since `art.json` is gitignored) and once with a small
   committed stub index, so both branches of `artFor` are exercised. Put the stub inline in the
   test; do not commit an `art.json`.

Run all 873 frames by default. If it exceeds ~10 s of `npm test`, honour
`MTG_RENDER_STRIDE=<n>` to sample every nth frame from the big fixtures, and always render
`sample-handwritten.jsonl` in full. Report the actual wall time in the M4 notes.

`ArrowsOverlay` renders nothing under SSR because its rect registry is empty and effects do not
run — which is correct, tests the empty-registry branch for free, and is why §9.1's isomorphic
shim must exist before this test does.

### 15.3 What this test is not

Not an interaction test and not a visual one. No jsdom, no `@testing-library/react`, no
screenshots, no snapshot files to churn. The visual check is a human looking at two screenshots
(1600×900 and 1280×720) at the end of each evening — which is `PLAN.md` M4's deliverable
anyway.

---

## 16. Protocol deltas and open questions

### 16.1 Fields M4 wants that the protocol does not have

Per `CLAUDE.md`: **change `docs/protocol.md` first, then the Java emitter, then the TS reducer.**
None of these blocks evening 1.

| # | Change | Why | Source |
|---|---|---|---|
| 1 | `Card.token: boolean` (§3.2) | the token affordance; there is no other way to know, and inferring from `setCode` would be a guess | `CardView.isToken()` **[jar]** |
| 2 | `players[].stops: string[]` (§3.1) — the `PhaseType` names this player stops on | the PhaseStrip's **read** side; `act: setPhaseStop` already exists as the write side (§2.2) | `YieldController.isSkippingPhase(PlayerView, PhaseType)` **[jar]**, inverted |
| 3 | `state.passTo: {playerId, phase} \| null` (§3.1) | the pass-to marker cell, which Forge draws on its own phase strip | `YieldController.getAutoPassUntilMarker()` → `YieldMarker(PlayerView, PhaseType)` **[jar]** |
| 4 | `input.canUndo: boolean` (§4) | the Undo button's enabled state | `IGameController.canUndoLastAction` (`PLAN.md` M6) |
| 5 | `input.selectable.playerIds: number[]`, or one sentence in §4 saying `cardIds` carries player ids when `mode === "players"` | `PlayerRail` cannot know which seats are clickable | §4 is silent today |
| 6 | `ClientState.log: LogEntry[]`, capped at 500 | the LogDrawer (§10). **Client-side only — not a wire change** | — |

All of 1–5 are ids, booleans and enum names. None carries a name, oracle text or any other
identity-bearing string, so none of them touches redaction.

### 16.2 Report 06 §6 changes that M4 must be written against

Report 06 lists ten protocol changes due **before M3**. Five of them change what M4 reads, so
write the components against the post-06 shapes from the start rather than retrofitting:

- §6.1 the redacted stub gains `owner` → five keys, not four. §15.2's key-set assertion in
  `fixtures.test.ts` will need the same update.
- §6.2 `faceDown` gains a nullable `alt: {name, manaCost, types, power, toughness}`, populated
  only when `canFaceDownBeShownTo(me)`. `CardTile` renders `alt` when present, back otherwise.
- §6.3 `library` gains a `cards` array of only `canBeShownTo(me) === true` cards, never a
  redacted stub. `PlayerRail` grows a small "revealed on top" slot.
- §6.7 every ask option list gains an optional `card`, so `AskModal` can show art instead of a
  bare label.
- §6.9 `input.focusCardId` becomes (or is joined by) `input.focusCard: Card | null`, because
  `setCard` is frequently pushed with a card that is **not in the snapshot**. `DecisionPanel`'s
  thumbnail must prefer `focusCard` over a `cardsById` lookup, or it will render blank for
  surveil and `willPutCardOnTop`.

### 16.3 What M4 explicitly does not do

Mana payment UI, targeting from `selectable` min/max, attacker/blocker declaration,
`assign_damage`, the `choose_*` / `order` / `assign_amount` bodies, graveyard and exile
browsers, arrows *during* a targeting choice — all M5. New Game, Undo, Concede-without-restart,
live phase stops, Pass-To, always-yes/no — all M6. The 3D renderer — M7.

### 16.4 Open questions for the user

1. **The OK button's label.** Render Forge's label verbatim ("OK", "End Turn", "Done"), or
   substitute "Pass Priority" to match the endstep screenshot? This spec recommends **verbatim**,
   with "pass priority" in the hint and tooltip, because overriding the engine's own word is the
   documented "the board threw the engine's answer away" failure (synthesis §3.2). One line
   either way.
2. **Hold Priority.** There is no Forge feature (§0, §6.4). Render it as the inverse of
   auto-yield in M6, or drop the toggle from the rail entirely?
3. **`T` collides.** Forge binds `T` to `SHORTCUT_SHOWTARGETING`; the reference binds it to "pass
   to my next turn". Our targeting overlay is always on, so `SHOWTARGETING` has nothing to
   toggle — this spec takes `T` for pass-to and notes the divergence. Object now if that will
   annoy.
4. **Image variant.** `grid` (488×680 WEBP, 37 KB) for the board, per §4.2 — against report 09
   §4.2's `normal` (73 KB JPG) for the arena's three.js textures. Unifying on `grid` would share
   one warm HTTP cache between the two renderers. Change report 09's choice, or keep two?
5. **Arrows in M4 or M5?** `PLAN.md` M5 lists them; this spec draws the read-only subset (stack
   targets, combat bands) in M4 because the screenshot has them and the data is already on the
   wire. Confirm the third evening can absorb it, or defer §9 wholesale to M5.

---

## 17. The three evenings

Each evening ends with a command that runs **with no JVM** — `fixtures/games/*.jsonl` is the
input all the way through — and a screenshot at both viewport sizes.

### Evening 1 — the frame

```bash
npm --prefix web run dev:replay          # /?replay=games/g1.jsonl
npm --prefix web test
```

Build: the `styles.css` token block and `.board` grid (§2); `PlayerRail`; `PhaseStrip` including
the 13 rows, the combat divider, the two dot columns rendered from Forge's defaults and the
round/turn header; `DecisionPanel` with title, verbatim prompt, the five buttons and their hint
chips, **and the §5.2 disabled-OK / stall lines**; `LogDrawer` behind the new `reduce.ts` log
ring; `keys.ts` plus `HotkeysOverlay`; `labels.ts`. Zone rows stay M1's text lists.

**Exit check.** Both rails are pixel-right at 1600×900 and 1280×720; scrubbing `g1.jsonl` end to
end never throws; the strip's active cell tracks `board.phase` including through the two
pre-game `phase: null` frames; `H` lists the keymap; `L` opens a log that scrubs backwards
correctly.

**Watch for.** The pre-game frames (§10.5) — build every component total over `phase === null`
and `activePlayer === null` on day one, not after the first crash.

### Evening 2 — the cards

```bash
node tools/fetch-art.ts && npm --prefix web run dev:replay
```

Build: `art.ts`'s `imageUrl` + `preloadArt`; `CardTile` complete — image layer over text frame,
CSS card back, tap rotation with the `--slots` accounting, summoning-sick treatment, counters,
P/T and damage, loyalty, controller stripe, attachments hoisted into their host; `ZoneRow` with
the overlap formula; `HandFan`; `mana-font` + the woff2 override; `CardZoom` on `Z`.

**Exit check.** This is `PLAN.md` M4's deliverable — *a screenshot the user would show someone*.
Take it at both sizes from `g1.jsonl` at a frame with a full board. Then delete
`web/public/art.json` and reload: every card must render as a text frame, and every click must
still work.

**Watch for.** Overlays drifting when a card taps (§4.3 — they belong on `.tile`, not
`.tile__face`). An `<img>` without `width`/`height` causing layout shift. `art.json`'s ten `MSC`
cards and `Peggy Carter, Secret Agent` (report 03: no `msh` printing at all) — confirm the miss
list is empty, and if it is not, that the misses render as text and are visible in the UI.

### Evening 3 — stack, arrows, tests, polish

```bash
npm --prefix web test && npm --prefix web run typecheck && npm --prefix web run dev:replay
```

Build: `rects.ts` with the namespaced registry and the single root `ResizeObserver`;
`StackPanel` with thumbnails and text target chips; `ArrowsOverlay` with the three classes;
`AskModal`'s shell, focus trap and Esc-answers-null; `render.test.ts` and `tsx-hook.ts`; the
accessibility pass of §14 (labels, contrast, `prefers-reduced-motion`, `:focus-visible`).

**Exit check.** `npm test` renders all 873 state frames green, including the name-leak assertion;
arrows land on the right cards on a frame from `g1.jsonl` with a targeted spell on the stack and
a declared-blockers frame; the whole board is keyboard-navigable; a 200 % browser zoom does not
produce a horizontal scrollbar.

**Watch for.** The `stack[].id` / `Card.id` collision (§10.1) — if an arrow points at a random
permanent, this is why. The `useLayoutEffect` SSR warning (§9.1) means the shim is missing.
Re-measuring rects inside a `useEffect` that depends on `state` re-runs 600 times a game;
depend on the board identity and the observer, not the whole state.

---

## 18. Summary of the invariants M4 adds

1. Every card anywhere goes through **one** `CardTile`, and hidden cards get a CSS back with no
   name in the DOM, no `title`, no `alt` and no `aria-label` that names them.
2. The rect registry is **namespaced** — `c:` / `p:` / `s:` — because `stack[].id` and `Card.id`
   are different id spaces that collide (§10.1).
3. A card is **outlined** iff its id is in `input.selectable.cardIds`; a button is enabled iff
   the engine said so. The client computes no rules answer, including for phase stops, mana —
   and **for whether a click is legal**: `selectable` is the explicit selection set (amendment
   M8), it is empty while you hold priority, the viewer's own cards are clickable anyway, and a
   click Forge will not take returns `notice {title: "Not selectable"}`. Deciding that locally
   would be the rules logic this milestone does not have.
4. `input.prompt` and the two button labels are rendered **verbatim**.
5. `ok.enabled === false` with selectable cards renders a visible "click a card" line; with
   *nothing* selectable and no open `ask`, it renders a loud stall warning.
6. `render(state)` is total over the pre-game frames (`phase`/`activePlayer`/`priority` `null`,
   `turn` 0), over `combat: null`, and over `abilities: []`.
7. Nothing under `render/` imports CSS, so `node --test` can import all of it.
8. Arrows are decoration; every fact they draw is also text.
9. Concede is reachable from every UI state, including inside a modal's focus trap.
10. A missing image is cosmetic. It never changes layout and never blocks a click.
