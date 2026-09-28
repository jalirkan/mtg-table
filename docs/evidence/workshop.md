## The workshop — one card on a pedestal, with the arena's own renderer

A card viewer for workshopping Tier 2's identity work: pick any card, see it as
the arena draws it — card plane, figure, props, disc, tile, aura look — close up,
at table distance or on the whole table, from your seat or both seats, facing
either way; play every clip its body has and every cue the card resolves to,
through the real cue engine, with the queue's own pause / step / skip / speed;
tune its `traits.json` row and its `cues.json` params live; and read how many
pixels each prop gets from the table view on both seats.

Built in the worktree `/home/justin-a/code/mtg-table-t2e`, branch `workshop`, from
`main` at `0368a90`, and moved onto `main` at **`754f504`** (the card library and
`#cards`) by the fix pass below — the working tree re-applied over the new base,
with `useView.ts`, `main.tsx`, `styles.css` and `hooks-order.test.ts` merged by
hand. **Nothing is committed.** Nothing under `web/src/arena/` was
edited: the workshop consumes the arena through its existing exports only, and
`web/src/workshop/Workshop.tsx`'s header lists every one of them (a test fails if
a workshop file imports an arena export the list does not name) — that list is
what to re-check when this branch is rebased onto Tier 2 slice 4.

### How to open it

```bash
npm --prefix web run dev                    # then /#workshop, or /?view=workshop
#   /?view=workshop&card=Peggy               opens on a card (a name, or part of one)
#   W in the 3D arena opens it; the ⚒ workshop link in the top bar does too
node tools/build-workshop-catalog.ts        # regenerate the card list (decks + corpus)
node tools/build-workshop-catalog.ts --check
```

It opens **no socket and fetches no log**: `main.tsx` mounts it instead of the
replay or live app, exactly as it mounts `#cards` (D94 — a hidden board would keep
its `window` key listeners live under the workshop's keys). A live socket already
open stays open on `window`, a replay resumes at the frame it was left on
(`replayCursors`, main's), and while the live game waits on the player the
workshop's header carries a chip saying so. The only network it causes is the arena's own — `art.json` through
`art.ts`, the Scryfall images the card planes and the list's thumbnails draw, and
`models/figures.glb` through `scene/models.ts`.

Its own keys, one table (`workshop/keys.ts`, each row carrying its action) that
both the handler and the Keys box read: `SPACE` pause/resume the cue clock, `.`
step, `,` advance a paused clock 50 ms, `K` skip all, `[` `]` speed, `B` both seats,
`F` facing, `T` camera mode, `R` reduced motion, `↑` `↓` previous/next card, `V`
back to the arena.

### What it is made of

| file | what | three / React |
|---|---|---|
| `catalog.json` | generated: every `decks/*.dck` card with its wire facts (type line, cost, P/T, token), every token the corpus saw, the deck names never seen face up (`Giant Growth`) | — |
| `catalogBuild.ts` | how that file is made — modal facts over off-battlefield sightings (Peggy's battlefield power is −3 under Quantum Reduction; her printing is 2/1) | no |
| `catalog.ts` | the list's entries (deck cards, tokens, 11 generic archetypes, the face-down creature and the redacted stub), `cardOf` (the protocol's three shapes), `roleOf`, `rungsOf` | no |
| `synthetic.ts` | **the one place a `ClientState` is made**: `pedestalState`, `soloState`, `rehearse` (24 transitions — a Vehicle is crewed, then attacks or blocks), `crewedEntry`, `clipBatch` — frames folded through the real reducer | no |
| `cueRows.ts` | each rehearsal's events through `selectorsFor` / `resolve` / `cuesFor`: cue id, selector, source rung, ms, clip — and what the rung order outranked | no |
| `keys.ts` | the page's keymap: rows with their actions, `workshopActionFor` | no |
| `clipCue.ts` | `workshop.clip`: a clip and nothing else, in a COPY of `REGISTRY` | no |
| `facing.ts` | `turnPoses` and `PreviewStage` (a `SceneStage` whose `yawTo` takes the preview's turn out) | no |
| `framing.ts` | the three camera poses and `tablePixels` (the nominal scale, never the caption) | no |
| `tuning.ts`, `validated.ts` | overrides through `validateTraits` / `validateCues`, `localStorage` in `try` | no |
| `data.ts` | `figures.json`, `models.json` and `cues.json` validated as `Arena.tsx` validates them (`traits.json` is `traits.ts`'s `TRAITS`) | no |
| `legibility.ts` | the meter: a browser re-implementation of `test/prop-raster.ts`; and `drawnHeightPx`, the caption's drawn body height | three |
| `Pedestal.tsx` | the scene: `CardPlane`, `FigureLayer`, the fields, `CueRunner`, and the one `useFrame` (the split renderer) | yes |
| `Workshop.tsx` | the page | React |

**The rule under all of it is the arena's: the workshop is a renderer.** The
pedestal draws a synthetic frame with the arena's own `layout`, `figurePose`,
`FigureLayer`, `CardPlane` and `CueRunner`, so every arena rule holds on it with no
workshop code saying so — and that is what the tests assert, not what they assume:

- a **face-down creature is the anonymous disc** with no props and the `default`
  rung; a **redacted five-key stub is a card back with no figure at all**
  (`figurePose`'s own rule: drawing a creature for it would assert it is one);
- the **stances are poses**: tapped kneels (`crouch`), sick is translucent,
  blocking interposes the dummy from `state.combat`;
- a **death is queued before the body is asked** (D64): `lethal` and `dies` leave
  `deathPending(subject)` true at enqueue, the after-board has no pose, the body
  falls from the departure field (`ws-10`);
- an **attacker ends its turn facing its defender** under either facing (D82): the
  preview's turn is taken out of `yawTo` exactly;
- **aim is the stack's**: Wasp's `cast` carries `beamTo` = the dummy (this frame's
  stack), Quake's `resolved` carries `strikeCard` = the dummy (the PREVIOUS
  frame's — T6's look-behind). What a spell targets is the one fiction: the engine
  says it on the wire, here the workshop does (the dummy, the other seat's copy, or
  an Aura's host), and the panel says so.

### Measured

**Tests** — `npm --prefix web test`: **734 `node --test` + 79 vitest, 0 failures**
(704 + 79 before; +28 in `web/test/workshop.test.ts`, +2 in `keys.test.ts`).
`hooks-order.test.ts` now scans `web/src/workshop/` too (it caught a straight
apostrophe in JSX text that desynchronised its brace counter — fixed).
`workshop.test.ts` covers:

- the catalog is exactly what `decks/*.dck` + `fixtures/games/*.jsonl` produce;
- every creature of every deck posed by the real `figurePose` on its pedestal board
  (Peggy: props `hat` + `shield`, tint `#f3ede4`); vehicles fly the carrier, lands
  get a tile, attachments sit on their host, spells get a form;
- **every rehearsal of every card, single and both seats (1,376 batches, 2,432 cues), plays
  through the real `CueQueue` and decays to identity** — no offset, clip or effect
  outlives its batch — and the census of what played prints every run;
- the per-card entries are reached (Peggy → `attack.aegis`, Agent 13's `muzzle`, the
  Doombot's `attack.jet`, Ant-Man's `attack.shrink`, the Agents' spotlight only
  alone), and **every `cues.json` selector of every deck card is reached by some
  rehearsal** (`unreachedSelectors` is empty for all of them);
- `workshop.clip` writes a clip and nothing else, leaves `REGISTRY` untouched, and
  writes no clip under reduced motion;
- the facing preview changes `facingY` and nothing else, and undoes itself;
- table distance reproduces view 1's pixel size at 1600 × 900 on any canvas height
  — measured, since the fix pass, on the projected body (below), not on the
  formula that sets it;
- overrides go through the validators: a tint applies, `scale: 99` is refused with
  the validator's own message and the row falls through, `beamTo` in a cue's params
  is refused ("event facts are the ladder's"); a throwing `localStorage` is none;
- **the legibility meter equals `prop-raster.ts` pixel for pixel** over 40
  readings (Peggy, Coulson, the Doombot, Fury × both seats × standing / kneeling);
- liveness: no transport, no `fetch`, no socket, no timer, no URL but the Scryfall
  credit; exactly one `useFrame` (the renderer, priority 1, after `CueRunner`);
  every `mixer.update(0)`; the pure modules import no three and no React; the
  reducer is imported as a value only by `synthetic.ts`; `main.tsx` reaches the
  workshop only through `lazy(() => import(…))`; nothing under `arena/` imports it;
  the arena's JSON imported the way the arena imports it.

**The gate** — `WSPORT=8671 ./tools/check-all.sh` (without deleting `bridge/out`):
**`check-all OK`, exit 0, 760 s** (`var/check-all-workshop.log`, local): every JVM
step, 9b–9d and 10a–10g unchanged, and inside it node --test **744 / 736 pass /
0 fail / 8 skipped** plus **79** vitest (the ten extra node tests are the ws-log
suite's, which the gate points at its own fresh logs).

**Build** — `npm --prefix web run build`: zero TypeScript errors.

| chunk (gzip) | `main` @ `0368a90` | workshop branch |
|---|---|---|
| entry JS `index-*.js` | 86.24 kB | **86.97 kB (+0.73)** |
| entry CSS `index-*.css` | 14.99 kB | 16.29 kB (+1.30 — the workshop's rules, appended to the one stylesheet) |
| `Arena-*.js` | 347.70 kB | 8.91 kB + a shared chunk 339.86 kB (named `tiles-*.js` by rollup) |
| `Workshop-*.js` | — | 22.05 kB |
| `Post-*.js` | 16.54 kB | 16.58 kB |

The entry grows by the route (`WorkshopLink`, the `W` dispatcher, the lazy import
stub) and the keymap row's text; none of it is `three`. The arena and the workshop
now share their common code in one lazy chunk, which rollup names after one of its
modules; the arena's download is the same bytes (+1 kB of chunk overhead).

**The `W` key.** `keys.ts` gains one row, `openWorkshop` (`W`), before `useMana`
(first match wins, and M5's pre-pass still gives `W` to floating white mana on the
board). In the arena it plans `view: openWorkshop`, dispatched by `main.tsx` —
which owns the view — in the capture phase, so the arena's own handler (left
untouched) never sees it; on the board it is `inert` with "press V first". The `?`
overlay lists it (`ws-21`). Headless: pressing `W` over the `g1` replay in the
arena landed on `#workshop`.

**Idle costs nothing**: 0 `gl.render` calls in 3 s with Peggy on the pedestal
(bloom on); the Doombot's `presence` bob keeps the loop at `always`, as it does in
the arena.

**A defect found and fixed on the way — and the arena may share it.** A batch
enqueued while the clock was paused froze: fiber's `store().frameloop` read
`demand` while `CueRunner`'s `loopRef` read `always`. `<Canvas>` re-applies its
`frameloop` prop on every render, including the ones it makes on its own (a
resize — the queue bar's status line had wrapped and changed the canvas height),
and the prop was the ref's value at the pedestal's LAST render, from before the
enqueue. The pedestal now hands `CueRunner` a `loopRef` whose setter is React
state, so the prop is always the mode; verified by resizing the viewport mid-cue
(`always` held) and by the idle probe (`demand`, 0 frames). `Arena.tsx` passes
`frameloop={loopRef.current}` the same way, so a window resize while a batch plays
between two arena renders would likely freeze it until the next frame arrives —
**not verified in the arena**, and not changed here (the arena is slice 4's desk);
the queue bar is also held to one line.

### The fix pass (after review) — rebased onto `754f504`

Every blocker and major, and the minors, of the workshop review; each verified in
the browser pane (dev server on **5181**) as well as by a test.

- **"Copy as cues.json entry" lost data** (major). It was built from the params
  panel's selector list, which leaves out `presence`, `station` and every comment,
  so pasting the Doombot's export dropped its hover and Web Up's its cocoon. The
  export is now the card's RAW committed entry — every key in its order, `_note` /
  `_t11` / `_station` / `presence` / `station` kept — with only the overridden
  selectors' `params` replaced, printed in the file's own style. Tested for all 28
  entries: the unedited copy is the committed entry (deep-equal, same key order)
  **and the committed text byte for byte**; with one override on any of the
  entries' selectors, only that selector's `params` differ; pasting the five
  entries with a presence or a station over the file keeps `presence` and
  `stations` identical through `validateCues`. In the pane: the Doombot's copy
  carries `"presence": { "hoverY": 0.2, … }`; Web Up's with `cast` overridden keeps
  `station` and changes only `cast.params`.
- **"Copy as traits.json row" exported refused rows** (minor). Both copy buttons
  are disabled while the arena's validator names the card (the tooltip says why),
  and the row keeps the committed order with `_note` where it was (all 14 rows
  byte for byte). `turnedRatio` no longer shows an invented `0.83 inherited`: it
  says **"required, not set"** (red) when this row turns the figure and has no
  ratio, and setting `turn` carries a ratio in only when a rung below has a real
  one. In the pane: Peggy `turn: 30` → the validator's message, the label, the
  button disabled; `turnedRatio: 0.9` → enabled, the row copied.
- **`W` under `?arena=off#arena`** (minor). The dispatcher is armed only when the
  arena is really mounted (`arenaFlagsFromQuery().off` is false). In the pane:
  `W` over `?replay=games/g1.jsonl&arena=off#arena` stayed on `#arena` and the
  board's own handler got the key; over `…#arena` it opened `#workshop`.
- **The mode app unmounting** (minor). Main's card browser settled the question the
  same week (D94: unmount, because a hidden board's keys would act on a live game),
  and brought `replayCursors`; the workshop now follows it and says so. In the
  pane: the `g1` replay in the arena at frame 250 → `W` → `V` → frame **250**. The
  chip: with a live transport on `window` (a stand-in object — no bridge was run)
  the header said *your live game is waiting: "Declare attackers: …"* for an
  `input`, *waiting on an answer* for an `ask`, and nothing once `gameOver` was set;
  with no transport, none, and no socket was opened.
- **The caption's height was nominal** (minor). It is now the body as DRAWN in view
  1 at 1600 × 900 — the resting rig's skinned vertices projected through the table
  camera (`legibility.ts`'s `drawnHeightPx`): **Peggy 61.3 px** (the caption said
  70), **the Doombot 56.1** (50), **the giant ant 127.4** (100), Coulson and Fury
  61.3. The test builds the same bodies independently (`prop-raster.ts`) and holds
  the caption to within 0.5 px of them, and holds the table-distance camera to
  within 6% of view 1 on 540-, 900- and 1200-px canvases. A ring swarm (the Air
  Force) has no drawn body and no caption.
- **The list thumbnail** (minor): documented as the card browser's `CardView` is —
  CLAUDE.md M4 convention 2 and a comment at the `<img>` — and held by a test: one
  `imageUrl(` in the workshop, every `lookupArt(` guarded by `concealed === null`,
  no `CardTile` / `CardView` import.
- **A second keymap** (minor): `WORKSHOP_KEYS` plus a switch became
  `workshop/keys.ts` — rows with actions, `workshopActionFor` — and a
  `Record<WorkshopKeyAction, () => void>` in the page; a test fails on any
  `case '<key>'` in `Workshop.tsx`, on an action with no handler, or on a legend
  not drawn from the table.
- **useView had no test for the route** (minor): the workshop's spellings, the
  query's bare word, the hash over the query in all four directions with `#cards`
  and `#arena`, and every view's round trip, beside main's `cards` cases.
- **Vehicles** (minor): three new rehearsals — `is crewed` (the corpus's crew batch:
  the crew taps, `cast`, `stats`, `resolved`), `crewed, attacks alone` and
  `crewed, blocks` — on the crewed card (`Artifact Creature - Vehicle`, Forge's own
  rewrite), posed as a creature under its carrier. The Air Force's clip buttons say
  **"hidden rig: the swarm is procedural"** (the rig `FigureLayer` never draws, D88).
- **The Helicarrier Strike's fizzle** (arena data, not this branch's): left in
  `cues.json` for the slice-4 or cue-data desk. The workshop now shows it: every cue
  line says when the ladder's rung order outranked a more specific selector below —
  the Strike's `fizzles` row reads *outranks the default's `resolved:fizzled` →
  `resolved.fizzle`*. Over the deck: `attackers` over `attackers:alone` ×4,
  `resolved` over `resolved:fizzled` ×3, `damage` over `damage:lethal` ×1,
  `counters` over `counters:-` ×2 (printed every run).
- **The build** (minor): the shared chunk is named `arena-scene-*.js`
  (`vite.config.ts`'s `chunkFileNames`: a shared, non-entry chunk carrying `three`),
  and CLAUDE.md now carries the route, the 24-row keymap with `main.tsx` as `W`'s
  dispatcher, and the chunk figures.

**Tests after the fix pass** — `npm --prefix web test` on `754f504` + this tree:
**837 `node --test` + 91 vitest, 0 failures** (797 + 91 on `754f504`; the
`workshop` suite is 38, `keys.test.ts` +2). `tsc --noEmit` clean. `check-all.sh`
was **not** re-run for the fix pass.

| chunk (gzip) | `main` @ `754f504` | this tree |
|---|---|---|
| entry JS `index-*.js` | 86.47 kB | **87.36 kB (+0.89)** |
| entry CSS `index-*.css` | 16.26 kB | 17.62 kB (+1.36 — the workshop's rules, appended to the one stylesheet) |
| `Arena-*.js` | 347.70 kB | 8.92 kB + `arena-scene-*.js` 339.87 kB (shared with the workshop) |
| `Workshop-*.js` | — | 24.07 kB |
| `CardBrowser-*.js` | 9.67 kB | 9.67 kB |
| `Post-*.js` | 16.54 kB | 16.58 kB |

(`754f504` built from a `git archive` of it in the scratchpad, with this
worktree's `node_modules`.)

### Screenshots

Headless Chromium on the **GTX 1080** (`ANGLE (NVIDIA Corporation, NVIDIA GeForce
GTX 1080/PCIe/SSE2, OpenGL 4.5.0)`), 1600 × 1000, the dev server on port 5184.
Local and gitignored, in `var/shots-workshop/`; the CDP driver is a scratch script
(the slice-3 pattern), not in `tools/`.

| file | what |
|---|---|
| `ws-00-arena-before-W.png` | the `g1` replay in the arena; `W` then opened the workshop |
| `ws-01-list.png` | the list scrolled to tokens, the generic archetypes and the concealed pair, each with its rung chip |
| `ws-02-peggy-1x.png` | Peggy Carter at 1× — hat, shield, card plane, disc (its caption's "70 px" is the first pass's nominal number; drawn, she is 61) |
| `ws-03-peggy-table-distance.png` | the same at table distance: the size she has in view 1 at 1600 × 900, the dummy across the table |
| `ws-04-both-seats.png` | both seats: your copy left, the opponent's right, the same camera angle — their back |
| `ws-05-facing-other-seat.png` | the facing preview flipped (PLAN question 13): the shields swap sides, the opponent's figure shows its front |
| `ws-06-clip-attack-mid.png` | the `attack` clip paused mid-swing from the table angle |
| `ws-19-peggy-attack-clip-side.png` | the same clip from the side (orbited): the arm out |
| `ws-18-peggy-die-clip-60pct.png` | the `die` clip at 60%: the body down |
| `ws-15/16/17-agent13-side-*.png` | Agent 13 at rest, in `pistolDraw`, and in `attack` (her card alias resolves it to `pistolDraw`) |
| `ws-07-cue-aegis-mid.png` | Peggy attacks alone — `attack.aegis` at 300 of 900 ms: the lunge, the turn toward her defender, the bubble and rings |
| `ws-08-tuning-tint.png` | the tuning panel with Peggy's tint overridden to `#3fa9f5` (browser-local), applied on the pedestal |
| `ws-09-legibility-coulson.png` | the meter for Coulson: the badge green on both seats, the tie red (one-sided by nature; the test forgives it — its partner is the badge) |
| `ws-10-lethal-mid.png` | lethal damage mid-film: the card gone, the body still standing before its death cue |
| `ws-11-face-down.png` | the face-down creature: a card back and the anonymous disc |
| `ws-12-redacted.png` | the redacted stub: a card back and no figure |
| `ws-13-helicarrier.png` | the Helicarrier's carrier silhouette over its card (the `subtype:vehicle` rung) |
| `ws-14-super-suit.png` | Super Suit on a Soldier-token host: the armour shell look, the card under its host |
| `ws-21-board-hotkeys-W.png` | the board's `?` overlay listing `W` |

### Limits, deviations, and what is owed

- **A redacted stub previews as a card back with no disc**, not as a disc: that is
  the arena's rule (`figurePose` gives a five-key stub no figure — report 13 §1.4),
  and the workshop draws what the arena draws. The face-down creature is the disc.
- **The meter's bar is 48 px of AREA** (`traits.test.ts`'s `IDENTITY_MIN_PX`), red
  under it; it also prints each prop's visible height, but a height bar of 48 would
  fail nearly every prop — a whole figure is 45–75 px tall at the table view. It
  measures at 1600 × **1000** (the test's frame) while "table distance" frames at
  1600 × **900** (the brief's); the two are said on screen. It counts pixels, not
  contrast (slice 3 follow-up 12), and it does not apply the test's one-sided
  forgiveness — it colours, the note explains.
- **Costume**: slice 4's palette is not in this tree. The tuning panel reads its
  fields from what `validateTraits` accepts, and the pedestal draws with the arena's
  own `FigureLayer`, so the costume should appear with the rebase; the field list in
  the panel is written out and will need the one new row.
- **Camera cues are dropped** on the pedestal (`PedestalDirector`): the camera is the
  user's. The Helicarrier's fly-in swoop is not previewed.
- **Bloom is single-view only** (the composer takes over rendering); in both-seats
  mode the split renderer draws without it.
- **"Takes damage" is lethal for an X/1** (Peggy): the ladder's `lethal` rung is
  correct — any damage kills a 1-toughness creature.
- The board's `inert` flash for `W` is not drawn in a replay with no `input` (the
  board's existing rule for every inert key).
- **Port**: the brief named 5181; another agent's vite (pid 64370, the `t2d`
  worktree) held it, so this ran on **5184**. That agent's `vite.pid` / `vite.log`
  in the shared scratchpad were overwritten by mistake and restored (pid) / noted
  (log).
- CLAUDE.md got the fix pass's targeted edits (M4 conventions 2 and 4, the chunk
  paragraph, the test count, the route); PLAN.md, README and DECISIONS.md were
  **not** updated, to keep the rebase onto slice 4 (which rewrites those sections)
  small — no decision number was taken, because slice 4 is numbering its own.
