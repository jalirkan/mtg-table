# web/CLAUDE.md — the TypeScript client's conventions

These load when you work under `web/`, on top of the root `CLAUDE.md`. The 3D
arena's own conventions are `web/src/arena/CLAUDE.md`, loaded under that
directory; read it too before changing anything the arena shares with the board
(`reduce.ts`, `protocol.ts`, the transports, `art.ts`, `keys.ts`, `<AskModal>`).
The card browser (`#cards`, `web/src/cards/`) is one tool with the card index,
so its conventions are `tools/CLAUDE.md`'s *Card library* — convention 6 above
all, which keeps `CardView` apart from `CardTile`.

## The test suites

`npm --prefix web test` runs **two** suites: `node --test test/*.test.ts` and
then `vitest run`, which is the only one that mounts `<Board/>` (Node's type
stripping does not transform JSX). `vitest` is a dev dependency, so a checkout
with no `web/node_modules` fails `check-all.sh` at its web step with a message
saying exactly that.

**`npm --prefix web test` is hermetic, and it is kept that way by
`MTGTABLE_WS_LOGS`.** `web/test/ws-log.test.ts` replays whatever that variable
names — check-all sets it to the logs step 10 just produced — and falls back
to the committed `fixtures/games/human-*.jsonl` when it is unset. It must never
go back to globbing `var/`: it did, and three leftover scratch directories were
enough to turn a green suite red with nothing in the repo changed (282 pass / 3
fail with them present, 279 / 0 with them moved aside). A test whose result
depends on what is lying around in `var/` is not a test.

## The web client — the conventions M4 added

The board is now a real Magic table (`docs/research/10-board-ui-spec.md` is its
spec, `docs/evidence/m4-board.md` what was measured). Six conventions hold it
together, and each is a defect that was actually hit.

1. **Nothing under `web/src/render/` may import CSS at module level.** There is
   exactly one stylesheet import in the app — `web/src/styles.css` from
   `main.tsx` — plus `mana-font/css/mana.css` immediately before it. The render
   tests run under `node --test` (type stripping, no bundler) and under vitest's
   **`node`** environment, and neither can load a stylesheet; a component that
   imports its own CSS breaks both suites at import time, before a single
   assertion runs. Per-component CSS modules are allowed *in principle* and are
   not used for that reason. The `mana-font` import is first because a later
   `@font-face` wins and `styles.css` overrides it to the woff2 (**D29**).
2. **`CardTile` is THE card renderer.** Every card in every zone — battlefield,
   hand, graveyard, exile, stack, the revealed slice of a library, the decision
   panel's thumbnail, the zoom, an `ask`'s options, the board picker, the zone
   browser, the combat bands — goes through it, and it is imported by exactly
   **ten** files and by nothing else: `ZoneRow`, `HandFan`, `PlayerRail`,
   `StackPanel`, `DecisionPanel`, `CardZoom` (M4) and `AskModal`, `AskPicker`,
   `ZoneBrowser`, `CombatBands` (**M5**). `Board.tsx` imports the file too but
   takes only its `Clicks` **type**, which is why it is not on the list. This is
   the renderer's half of hard rule 8: a new surface that draws its own card
   markup is how a name for a `hidden: true` id gets back on screen, and it is
   exactly what the per-frame `data-card-name` check in
   `web/test/render.test.tsx` would stop catching. Keep the list closed — adding
   an eleventh importer is a decision, and `grep -rl "from './CardTile.tsx'"
   web/src` is how you check it. **M7's arena has its own single card renderer,
   `arena/scene/CardPlane.tsx`** — the same rule for a different renderer, and
   without the `data-card-name` backstop; see `web/src/arena/CLAUDE.md`. **The card
   browser (`#cards`) draws library cards with `cards/CardView.tsx`** and never
   imports `CardTile` (**D94**, `tools/CLAUDE.md`'s *Card library*) — public card data, not a
   game, so it is not an eleventh importer. **The workshop (`#workshop`) draws its
   card LIST's thumbnails with one `<img>` of its own** (`workshop/Workshop.tsx`),
   exempt for the same reason: the list is deck cards, tokens and archetypes whose
   facts come only from face-up sightings, a concealed entry never looks its art
   up and draws a back, and its pedestal draws every card through the arena's
   `CardPlane` — but for its **inspect** view (**D196**), which draws the same
   `normal` image `CardPlane` draws for the card, face up only, as the art-box
   backdrop and the frame panel. `workshop.test.ts` holds it at two `imageUrl(`
   (the thumbnail and the inspect URL) with every `lookupArt(` guarded by
   `concealed === null`. **The story page (`#story`) draws a card image
   of its own** (`story/Story.tsx`'s `CardImage`, **D127**), exempt for the same
   reason again: it is the Scryfall image of a face-up card a narrated fact NAMES
   — looked up by that name, never by an id — beside the moment on screen, and a
   ref with no name is never drawn. `story.test.ts` holds it at one `imageUrl(`
   and one `lookupArt(`, on `card.name`.
3. **The rect registry (`web/src/render/rects.ts`) is namespaced and
   set-valued.** Keys are `c:<cardId>` / `p:<playerId>` / `s:<stackId>` because
   **the id spaces collide** — the committed corpus has a `stack[].id` that is
   also a battlefield `Card.id` (`arrows.test.ts` counts them every run). One key maps to a **Set** of
   elements and a `null` ref callback removes nothing, because the same card can
   be mounted more than once and the copy that unmounts must not delete the key
   the row tile registered (it did, and every arrow touching that card vanished).
   There is **one** `ResizeObserver`, on the board root; measurement happens in
   the post-render sweep and never inside render; the sweep bumps a version only
   when a rect actually moved. Use the isomorphic layout-effect shim already in
   that file, or `renderToStaticMarkup` starts printing SSR warnings.
4. **One keymap table.** `web/src/keys.ts` is the **25** rows (18 at M4; M7 added
   `V` and `K`, Tier 2's slice 2 the three camera rows, the workshop `W`, and the
   arena's inspect `I`, D241) plus two pure
   functions (`bindingFor`, `planKey`); the handler and the `?`/`H` overlay both read it,
   and a test asserts every chord in `KEYMAP` appears in the overlay's markup.
   Adding a key is a row, never a new branch in a handler. Its dispatchers are
   `Board.tsx`, `Arena.tsx` and — for `W` (`openWorkshop`) alone — `main.tsx`,
   which owns the view and takes the key in the capture phase only while the arena
   is really mounted (never under `?arena=off`, where `W` is the board's floating
   white mana). A page with no board has a table of its own: the card browser's
   `cards/keys.ts` and the workshop's `workshop/keys.ts`, each row carrying its
   action. Two rules live in
   `planKey` and are tested there: **a focused button keeps `Space` and nothing
   else** (the browser will already activate it; sending `buttonOk` too answers
   the engine twice — and M3's handler dropped the *whole* keyboard for a focused
   button, so clicking a card turned `Escape` off), and `Esc` goes overlay → open
   `ask` (answer `null`, §5.4) → the engine's Cancel button, in that order.
5. **Arrows are decoration and never the only channel** (**D30**). The overlay is
   `aria-hidden`, `focusable="false"`, `pointer-events: none`, and every fact it
   draws is also text somewhere: the stack panel's target chips, the tile's
   `→ defender` / `blocks …` notes, the log drawer's band list. Three cues —
   curvature, colour **and** dash pattern — so colour alone never carries it.
6. **Keep the testable half pure.** `labels.ts`, `resolve.ts`, `arrows.ts` and
   `keys.ts` contain no JSX, no React and no DOM types, which is why `node --test`
   can import them and why `arrows.test.ts` can build arrows for every
   committed `state` frame without a browser. Put geometry, label composition and
   id resolution there, not in a component.

And two rules that did not change and are easy to lose in a restyle: **never gate
a click on `selectable`** (amendment M8), and **render `buttons.*.label`
verbatim**. The board still draws no phase-stop state of its own — but **the dots
are live as of M6** (**D37**, superseding D31): they render from
`players[].phaseStops` and from nothing else, a click is
`act: setPhaseStop {phase, turn, stop}`, and the next `state` says what happened.
A stream *without* the field — every recording made before 2026-09-12 — still
draws Forge's documented defaults, disabled, with the legend saying so;
`phaseStopsOf` is the one place the two cases are told apart. There is **no
"hold priority" control**: Forge has no such feature, so D31's disabled toggle
was removed rather than enabled.

`npm --prefix web test` is **1,099 `node --test` + 124 vitest (8 files)** standalone on
this tree. Inside `check-all.sh` it is two jobs, `13b-render` (`vitest run`) and
`13c-node` (`node --test`, after step 10, because its ws-log suite replays the
logs `MTGTABLE_WS_LOGS` names, and after the build job `13a-build`, because
`personal.test.ts` greps the `web/dist` it writes), so the node count there is
higher. M7's eight
suites (`layout`, `colour`, `replay-cues`, `cues-exhaustive`, `camera`,
`liveness`, `perf`, plus the vitest `arena-hud`) and Tier 2's nine (`figures`,
`figure-pose`, `clips`, `tiles`, `attach`, `stack`, slice 3's `traits` and
`facing`, and slice 4's `duelists`) are in the same glob and need no GPU and no
DOM — which is what report 09 §2.4's `[NO three]` annotations bought, and report
13 §10 bought again for `figures/`. Every earlier count is
`docs/evidence/test-count-history.md`.
`render.test.tsx` renders every frame of every fixture **twice**, once as a
replay and once as a seat, which is what makes the read-only assertion and the
hidden-information assertions per-frame rather than per-suite.

## The conventions M5 added

Six more, and like M4's each one is a defect that was actually hit.

1. **A question is answered on the board iff EVERY one of its options is already
   drawn there** (**D33**). The decision is `web/src/render/picker.ts`, pure and
   corpus-tested; one option outside the board sends the whole ask to the modal.
   `drawnEntities()` is written against **what `Board.tsx` mounts**, never
   against `resolve.findCard` — the snapshot contains another seat's hand as
   five-key stubs and an unrevealed library, and a rule written against it would
   offer a click on a card the player cannot see, which is hard rule 8 arriving
   through the picker. **If you add or remove a surface that mounts cards, update
   `drawnEntities` in the same change**; `web/test/picker.test.ts` prints the
   picker/modal census every run and fails if either column is empty. The picker
   **marshals nothing**: the answer is built by `AskModal`'s own
   `answerFromDraft`, so the two surfaces cannot disagree.
2. **Nothing new may be an in-flow child of `.table__middle`** (**D36**). Its
   `grid-template-rows` is `1fr 1fr` — one row per seat — and a third child lands
   in an implicit **auto** row that is sized to its content *before* the `1fr`
   rows get anything: at 1600 × 900 both zone rows measured **0 px**, the strips'
   tiles overflowed, and the two caption buttons overlapped by 9 px — leaving
   **4 px** of the opponent's zone control hittable. `.stackpanel` and `.bands` are
   absolute; so is the next one. The z-index budget in that box is **a tile = its
   own `--i`, `.bands` = 55, the `.zonerow__label` buttons = 60**, and the order
   matters: the captions must stay clickable *through* an overlay, because the
   zone browser is the escape hatch for the cards it covers.
3. **No React hook below a component's early return.** `Board` has
   `if (board === null) return …`; a `useMemo` under it shipped, threw *"Rendered
   more hooks than during the previous render"* on the first real frame, and the
   **whole suite stayed green** — `render.test.tsx` mounts each frame fresh with
   `renderToStaticMarkup` and can never see a hook count change between renders.
   `web/test/hooks-order.test.ts` is a **source scan** (negative-controlled: put
   a `useMemo` back below the guard and it goes red) and it is all the repo has —
   there is no eslint and no DOM test environment.
4. **Never decide what a control *does* by matching an engine string** (§Scope,
   amendment **M30**). Render `buttons.*.label` verbatim; never branch on it. The
   mana pips are live whenever the pool is non-empty precisely because the only
   alternative was matching the word `Auto` to detect a mana payment. When the
   client needs to know a *state*, the answer is a typed field on the wire, not a
   regex over prose.
5. **The probe policy is a flag, and a recording says which one it ran under.**
   `--probe` (`AutoTransport`'s four decisions taken the other way) and
   `--mana-lost-prompt` (`FPref.UI_MANA_LOST_PROMPT`, **in memory, never
   `save()`**) are what make the four new ask kinds reachable; the **default** is
   what M5's exit criterion and every M2/M3 fixture measure, and 9b's multiset
   diff is the standing proof that the default did not move. Both appear in the
   session header as `policy` / `prefs` (**M31**). **Do not re-record a committed
   fixture with `--probe`** unless you mean to change what it is evidence of.
   `tools/ws-auto-play.mjs` mirrors the policy line for line, on purpose.
6. **A typed act earns its gate in `tools/ten-games.sh`'s sixth `ROWS` field —
   with its EFFECT, not just its count.** `useMana` had no end-to-end guard
   anywhere while `check-all.sh` step 10f said in as many words that it was
   "asserted elsewhere"; elsewhere was `ten-games.sh`, which did not contain the
   string. A count alone would still pass if the client sent the act and the
   bridge dropped it, so seed 4 also asserts the seat's `manaPool` shrinks across
   it. The other assertion worth knowing about is the **ask-kind ceiling** (no
   more than 150 asks of one kind in one game): an ask loop is the one wedge
   every other assertion is blind to, and one shipped.

## The conventions M6 added

Six, and the thesis under all of them is one sentence: **every comfort feature is
an engine feature rendered, never a client state machine.** A control that
remembers something the engine did not tell it is the defect, not the feature.

1. **Every M6 field is OPTIONAL on the wire, and there is exactly one reader per
   field.** `phaseStopsOf`, `yieldOf`, `undoOf`, `buttonFocus` and `stackYield`
   in `web/src/protocol.ts` are where "the key is absent" becomes "this recording
   predates M6", and a component must not test for the key itself — fourteen
   committed fixtures were recorded before 2026-09-12 and `render.test.tsx`
   replays all of them, twice each. The same rule on the emitter side is
   all-or-nothing: `tools/check-redaction.mjs` **fails** a file that carries
   *some* comfort keys and not others (*"M6's comfort block is HALF PRESENT"*),
   because "absent is fine" once made a bridge that stopped writing
   `players[].phaseStops` pass over every fixture.
2. **A `hello_ok` whose `gameId` changed is a RESET, not an update** (**D44**,
   amendment **M38**). The reducer drops board, input, ask, game-over, log,
   events, notices and `lastAct`, keeps the session, and bumps the game number; a
   `hello_ok` with the *same* id is a `resync` re-delivery and keeps everything.
   On the bridge, `WireGuiGame.openView` is the **one** reset hook — every cache
   keyed by a Forge id is rebuilt there, because `endCurrentGame()` has replaced
   every `PlayerView`. **A new cache goes in that method or it is a stale one.**
3. **Two narrow relaxations of the hidden-information gate, and both are
   negative-controlled.** An `ask` may justify the `state` **immediately** before
   it and nothing further back (`WireGuiGame.ask()` deliberately flushes that
   snapshot one frame ahead — report 06 W4), and a `reveal: true` `choose_list`
   is its own delayed reveal; `reveal: true` on **any other kind** is a failure,
   so the flag cannot switch amendment P12's option-card audit off. If you widen
   either one, add the control in the same change —
   `fixtures/negative/redaction/` and `check-redaction-selftest.mjs` are the
   pattern, and PLAN.md's M6 follow-up 8 is a standing request for a second
   reader of both.
4. **A typed act earns its gate step by its EFFECT** (M5 convention 6, extended).
   Step **10g** asserts `setPhaseStop`, `yieldTo`, `setYield` and `undo` by the
   `state` each one changed, and names `passPriority` as a **count** because that
   is all it can be. A *behavioural* claim needs an engine that can repeat itself:
   auto-yield went from a printed number to an assertion only when
   `decks/yield-probe.dck` put the same `yieldKey` back on top of the stack every
   turn (`--require-yield-repeat`).
5. **The four acts that produce no game event are pushed by `refreshState()`, and
   that hop is guarded twice** (**D39**, hard rule 3). D22's `inputGen` stamp
   **and** a positive "the engine is parked" predicate; a skipped refresh is
   counted and printed. `useMana` is deliberately **not** a fifth caller — the
   board marks the pool provisional instead. **The acts themselves are the other
   half** (**D136**, amendment **M48**): `undo` and `useMana` write the engine
   from the EDT outside Forge's input protocol, so they are applied only while
   the engine is quiet on this seat (`ActGuard`: parked on an input, no ask, the
   input they arrived under, nothing activating, nothing of ours walking, no
   engine thread running) and are otherwise refused with
   `notice {title:"Not now"}`. An undo applied whenever it arrived raced
   `Game-0` inside `MagicStack`'s undo stack and crashed the engine. `concede`
   raced too (the player-list walk) and is never refused: from a running engine
   only the outcome is written and `Game-0`'s own check ends the game. No fourth
   hop: D136 says why one would have excluded nothing.
6. **No control for a feature Forge does not have.** D31's "hold priority" toggle
   was **removed, not enabled** (**D37**): `YieldController.setDisableAutoYields`
   is a different feature and is not on the wire. The same rule retires
   `autoPay` and `endTurn` — those arrive as the engine's own *labels* on OK and
   Cancel, rendered verbatim, and inventing an act for them throws the engine's
   answer away.

## Workshop — the conventions D102–D104 added

Five, and the thesis is one sentence: **the workshop is the arena pointed at one
card: it draws with the arena's code and decides nothing the arena would not.**
`#workshop` (`web/src/workshop/`) is the card viewer the user asked for on
2026-09-27, to see the figures and how they act. It is a page that builds its own
boards and has no transport. README's *Arena mode → The workshop* is how to use
it, `docs/evidence/workshop.md` is what was measured, and PLAN.md's *The
workshop* has the status, **the rebase-onto-slice-4 checklist and how it went**,
and the follow-ups (seven closed by the reconciliation, five new). **D102–D104
are numbered after slice 4's D95–D101**, which this branch was rebased onto
(`23e26b3`); the `match-setup` branch numbered its own D102–D105 too, landed
second, and renumbered them **D105–D108**. The workshop and `#cards` link to each other: *View in
3D* in the browser's detail panel, *card text* in the workshop's header.

1. **Downstream of the arena, and the coupling is a list** (**D102**). Nothing
   under `arena/` imports `workshop/`, and the workshop's code edits nothing under
   `arena/` (the reconciliation's two arena fixes — `Arena.tsx`'s state-backed
   `loopRef`, three fizzle rows in `cues.json` — were the arena's desk, each held
   by an arena-side test). **Every arena export it uses is named in `Workshop.tsx`'s header
   comment**, and `workshop.test.ts` fails on an import the list does not name:
   add the name there, with what it is for, in the same change. Something the
   workshop needs from the arena is an arena change, made on the arena's desk,
   never a workshop-local copy of arena logic. There are three exceptions, each
   where the arena keeps the logic out of the workshop's reach, and each says so
   in its header:
   - `validated.ts` is `Arena.tsx`'s `useFigureData` / `useCueData` as pure
     functions;
   - `clipCue.ts` is the registry's `playClip` discipline for one clip;
   - `legibility.ts` is `test/prop-raster.ts`'s rasteriser for the browser (a
     page cannot read `node:fs`). A test holds it equal pixel for pixel, so when
     `prop-raster.ts` changes, `legibility.ts` follows. Slice 4's per-family head
     (the skin and hair slots, `HUMAN_HEAD_FROM`) was the first such change, and
     it followed on the reconciliation.
2. **Every board is a synthetic FRAME from `synthetic.ts`** (**D104**). It is the
   only module that makes a `ClientState`, and the only one that imports the
   reducer as a value. Nothing poses a rig, places a card or chooses a mesh by
   hand. The pedestal hands the folded state to `layout`, `figurePose`,
   `FigureLayer`, `CardPlane` and `CueRunner`, so hard rule 8's renderer half —
   the anonymous disc, the stub with no figure, the back — holds on the pedestal
   because it is the arena's code. A new rehearsal copies an event shape the
   corpus shows Forge sending. What only the engine could choose (aim, what a
   blocker blocks, who crews) carries a `fiction` line that the panel shows.
   `catalog.json` is **generated**: after a deck, a fixture or a deck card's own
   `cues.json` entry changes, run `node tools/build-workshop-catalog.ts` (a test
   fails until you do), and never edit it by hand. The cue names are read for
   `threeD` — what the workshop can show of a card, the card browser's *View in
   3D* — because the browser may import no arena.
3. **The frame loop is the arena's** (**D102**). `CueRunner` is THE loop on the
   pedestal too. The workshop's one `useFrame` is `Pedestal.tsx`'s renderer at
   priority 1, after `CueRunner`, and it allocates nothing. The page carries no
   `fetch`, no socket, no timer and no URL except the Scryfall credit; every
   `mixer.update` is `0`; there is no `useAnimations` and no `useGLTF`. A clip on
   its own is `workshop.clip` in a **copy** of `REGISTRY`, never an entry in
   `REGISTRY` itself. There is no `HitProxy` and no `onAct`, so the pedestal takes
   no click, and `PedestalDirector` drops camera cues. The pedestal's `<Canvas
   frameloop>` is backed by React state: a fiber-initiated re-render (a resize)
   re-applied a stale mode and froze a batch. The arena had the same defect
   (measured on the reconciliation) and has the same fix — its `loopRef`'s setter
   is a state setter (M7 convention 5). **The duelists are not on the pedestal**:
   they are a seat's, not a card's (**D99**), so `CueRunner` is handed no busts
   and no `DuelistLayer` is mounted (a test holds both).
4. **Tuning leaves the browser only by the clipboard** (**D103**). Overrides live
   in `localStorage` under `mtg-table.workshop.overrides`, with every access in
   `try`. Only the workshop reads them, and they pass the arena's own validators:
   `validated.ts` is `Arena.tsx`'s order. **Never add a path that writes
   `traits.json` or `cues.json` from the page, and never let the arena or the
   board read that key**, because a tuned look in a game is a renderer that
   remembers. The copy buttons print the **committed** text with the edit folded
   in: every key in order, comments, `presence` and `station` kept. They are
   disabled while the validator names the card, and `workshop.test.ts` holds the
   copies to the committed text byte for byte — `cues.json` one value per line,
   `traits.json` as slice 4 re-wrote it, `JSON.stringify(…, null, 2)`. A new
   trait key needs a row in `Workshop.tsx`'s `TuningPanel`, whose field list is
   written out; slice 4's `costume` (a row per `COSTUME_SLOTS` slot) and `body`
   were the first, and `workshop.test.ts` now fails when `validate.ts`'s
   `TRAIT_KEYS` names a key the panel does not write.
5. **A page of its own, by `#cards`'s rules** (**D94**, **D102**):
   - lazy, through `lazy(() => import('./workshop/Workshop.tsx'))` (**D49**); the
     scene chunk it shares with the arena is `arena-scene-*.js`, named by
     `vite.config.ts`;
   - the mode app is unmounted under it;
   - its keys are its own table, `workshop/keys.ts`, whose rows carry their
     actions, with no `case '<key>'` in `Workshop.tsx`. `W` is its one row in
     `web/src/keys.ts`, dispatched by `main.tsx` only while the arena is really
     mounted;
   - its CSS is appended to `styles.css`;
   - its logic is pure `.ts`: only `Workshop.tsx`, `Pedestal.tsx`,
     `legibility.ts` and `data.ts` may import three or React;
   - its components are in `hooks-order.test.ts`'s scan.

   The list's thumbnail and the inspect view are its card images outside
   `CardPlane` (M4 convention 2's exemption), and a concealed entry never looks
   its art up.

   Its URL is `#workshop?card=<name>` — read by `links.ts`'s `cardFromLocation`,
   the hash's query first as `#cards` reads its own, and written back as the list
   moves — and `&view=inspect` opens (and, while inspecting, keeps) the inspect
   camera (`workshopViewFromLocation`, **D241**): the arena's `I` writes it, the
   page reads `?personal=0` as the arena does, and its ▣ arena link is the way
   back to the same frame. **`links.ts` is the one workshop module another page imports**:
   `cards/CardDetail.tsx`'s *View in 3D* (live for a creature, a Vehicle, or a
   card with its own `cues.json` entry; greyed with the reason otherwise), and it
   imports only `catalog.json` and a type — so keep it that way, or the card
   browser's chunk starts carrying the workshop.

The tests are `web/test/workshop.test.ts`, inside `npm --prefix web test`,
so inside `check-all.sh` too. Its liveness half (`workshopFiles()`) scans every
`.ts` / `.tsx` **directly under** `web/src/workshop/`, and skips subdirectories.
Keep the directory flat, or extend the scan in the same change. The screenshot
driver's handle, `window.__mtgWorkshop` (the queue, `select`, the options, the
camera mode, the relief toggle, `orbitBy`, fiber's store), exists only under `import.meta.env.DEV`, as
`__mtgArena` does.

**The personal tier on the pedestal** (**D196**; the arena's conventions are
`web/src/arena/CLAUDE.md`'s *The personal tier*). The workshop reads the same
overlay the arena does (`usePersonalOverlay`, dev server only), badges every card
an active personal model dresses — face up only — and dresses the pedestal
exactly as `Arena.tsx` dresses (`personalChoicesOf`, `dressPoses`); the *personal /
repo* toggle is the A/B, and the pedestal loads no seat's model (there are no
duelists on it). **Inspect** is a camera mode (`framing.ts`'s `inspectLayout`, pure):
the figure in its signature pose, the card's art box enlarged behind it, the frame
and text with the art window cut out floating beside it.

**The relief window** (**D225**–**D228**; `docs/guides/personal-tier.md`'s *The
relief cache*). Where the personal tier's relief cache (`personal/relief/`,
`tools/personal/relief.mjs` — depth maps derived from card art, so never
committed) has the card's map, the art box is a window: two layers on one
subdivided grid (`perf.ts`'s `RELIEF_GRID`) whose vertices recede along their
rays from the inspect camera's seat by the map (`workshop/relief.ts`'s
`RELIEF_VERTEX`, at most `RELIEF_DEPTH` of the backdrop's height) — the FRONT,
the painting cut at every silhouette (`RELIEF_CLIFF` by grid cell, and pixel by
pixel by the map's blue, a KEEP MASK the tool decides, which keeps each
subject's painted contour on the front so it moves with it), and the BACK behind
it, what the silhouettes hide filled with the background just across them,
mirrored and out of focus, within what an orbit can reach — both clipped to the
window's rectangle (`RELIEF_FRAGMENT`), so from the seat it is the painting and
orbiting shows its depth behind a still frame, its nearest point on the flat
picture's plane and the figure as clear of it (`INSPECT_WINDOW`, measured densely
over every figure and every clip; a death falls through it, flat or relief). It
is not a card — `CardPlane` still draws the card — but the inspect view's
backdrop, built once per card at commit and drawn unlit, with no ink mark and no
halftone. Five rules hold it: **`relief.ts` is pure and the one reader of
the relief index**; **`inspectSourceOf` is the inspect view's one way to a card's
image and so to its map**, face up only, and `workshop.test.ts` sweeps the
catalog with a hostile copy and an ungated control; **the route is named once,
`Pedestal.tsx`'s DEV-gated `RELIEF_BASE`**, so a build has none and draws every
backdrop flat; **a map is drawn only at `perf.ts`'s `RELIEF_MAP_VERSION`** (the
dev route serves any other without its back layer, so it is flat until the tool
runs again, rather than a blue the shader misreads); and **nothing of the relief
runs in a frame loop**. The toolbar's
*relief* checkbox is the A/B. **A deck card no recording showed face up takes its facts
from the engine's card script** (`catalog.json`'s `engine` list, `tools/forge-scripts.ts`):
facts are still what Forge puts on the wire, never typed by hand.

## The story page — the conventions D124–D128 added

Five, and the thesis is one sentence: **the story is the narrator's text beside
the replay's cursor — one narrator, one cursor, and nothing on the page the log
did not show its seat.** `#story` (`web/src/story/`) is the other half of watching
two AIs play: the arena shows what happened, the story says it in words, turn by
turn, with the moment on screen highlighted. README's *Reading a game back* and
*Spectate* say how to use it, `docs/evidence/story.md` is what was measured, and
PLAN.md's *The story page* has the status and the follow-ups — the first of them
a story panel INSIDE the arena, with its mount point named, which this branch left
to the arena's desk.

1. **One narrator** (**D124**). `web/src/story/narrate.ts` is the narration —
   `tools/narrate.mjs` imports it and adds only the file read and the flags, and
   `story.test.ts` fails if the CLI defines a narration of its own again. It is
   **erasable TypeScript with no import at all**, because Node runs it by type
   stripping: no enum, no namespace, no parameter property, no `node:` module, no
   DOM, no clock (a source scan holds each). Every fact carries `frameIndex`;
   `toJson` strips it, so `--json` stays byte for byte. **A change to a sentence
   is a `--write-golden`, a read diff, and a look at the page** — both readers
   print it.
2. **A page over the replay, not a renderer** (**D125**). Lazy through
   `lazy(() => import('./story/Story.tsx'))`, the mode app unmounted under it
   (the key-listener reason of `#cards` and `#workshop`), its own keymap
   (`story/keys.ts`, rows carrying actions, `Story.tsx` mapping them in one
   `Record<StoryKeyAction, …>` with no `case` on a key name), its CSS appended to
   `styles.css`, its logic pure in `page.ts` and `narrate.ts`, its components in
   `hooks-order.test.ts`'s scan. **It imports no transport**: `main.tsx`'s
   `StoryReplay` loads the log through the replay app's own `useReplayLoad` (the
   fetch cache, the follow-mode poller, the cursor maps) and hands the page
   frames, the cursor, the folded state, the follow word and four callbacks. No
   `fetch`, no socket, no timer, nothing from `render/`, `arena/`, `cards/` or
   `workshop/` — `story.test.ts` scans for each. **Nothing but `main.tsx` imports
   `story/`** (the CLI in `tools/` aside); a story panel in the arena is a
   decision that relaxes that line, not a quiet import.
3. **The narration is re-told, never patched** (**D126**). The page narrates the
   frames the transport holds, memoised on their count — about 4 ms for g1 — so a
   followed log is simply re-told as it grows, and the story of a log being
   written is the CLI's story of the same bytes. With what comes after the cursor
   **hidden** (`S`; the default while following) it narrates
   `frames.slice(0, cursor)`, so the summary card is the game so far and never
   names a winner the page has not played; `story.test.ts` proves a prefix tells
   the prefix of the story over every bridge log. Do not add an incremental
   narrator for speed without a measurement that needs one.
4. **Hard rule 8 on the page is a rendering test, with a control** (**D127**).
   The page prints only narrated sentences and marks only the names facts carry
   (`segmentText` cuts at the names `faceOf` resolved; an unnamed ref has nothing
   to find); its one card image is looked up by such a name, face up only (M4
   convention 2's exemption above). `story-render.test.tsx` renders `<Story/>`
   over every fixture at seven cursors, dimmed and hidden, against an oracle
   written apart from the narrator — by ids, by backing, by the decks' names,
   hidden-means-hidden — and injects a real deck card's name the log never shows
   into an always-hidden stub to prove the checks catch it (the by-names check
   from the decks alone). **A new surface on the page is a new row in that
   sweep.**
5. **One cursor, across the page's views** (**D128**). `replayCursors` puts a
   finished replay back on its frame; `followCursors` does the same for a
   followed log **only if the viewer had paused** — watching live, the live edge
   is where they were, and the transport joins it as a fresh page does. The
   story's `▣ arena` / `V` and `▤ board` / `B`, and the replay bar's `☰ story`,
   all leave at the frame on screen. `./scripts/spectate.sh --story` opens
   `#story` on a game still being recorded.
