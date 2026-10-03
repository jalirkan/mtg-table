# M7 evidence — the arena, evenings E1 and E2

What was actually run, on 2026-09-12/13, with real numbers. Evenings **E1 and
E2** of [`docs/research/09-arena-tier1-plan.md`](../research/09-arena-tier1-plan.md)
§11: the dependency spike, the lazy route, the table and the camera rig, then
`layout.ts`, the texture pipeline and every card in the frame as a textured
plane at its resting pose.

**Nothing animates yet.** E3 owns the cue queue and the offset model; every
change in the arena still snaps. That is deliberate and it is why `layout()` is
already the only thing in the codebase that knows a coordinate — E3 adds
offsets *on top of* it and changes no file that is listed below.

Three rules were not relaxed to get here. The arena is a **renderer**: it
decides nothing, and a click is `act: clickCard` sent verbatim. A click is
**never gated on `selectable`** (amendment **M8**) — `HitProxy` has no
`selectable` prop at all, so it cannot start. And the hidden-information gate
gained a 3D half: `Placement.back` is set for a redacted stub *and* for any
face-down card, `CardPlane` branches on it before it asks for any face, and
`renderTextFrame` re-checks `isHidden` itself.

---

## 0. What shipped

| File | Lines | What it is |
|---|---:|---|
| `web/src/arena/layout.ts` | 568 | **new** — THE resting pose: anchors, rank layout with wrapping, the hand fan, the stack column, piles, attachments, tapped-keeps-its-slot. Pure, no three, no React. |
| `web/src/arena/Arena.tsx` | 276 | **new** — `<Canvas>`, the scene, the camera rig, the DOM sibling layer, the art credit |
| `web/src/arena/scene/textFrame.ts` | 303 | **new** — the text-frame fallback (488×680, the same size as Scryfall `normal`) and the **procedural** card back |
| `web/src/arena/scene/useCardTexture.ts` | 199 | **new** — sRGB, max anisotropy, `gl.initTexture`, a URL-keyed cache, and the one shared rounded-corner alpha map |
| `web/src/arena/scene/CardPlane.tsx` | 198 | **new** — THE card renderer of the arena; the `back` branch, the unlit material, the selection rim |
| `web/src/arena/colour.ts` | 98 | **new** — `manaCost` → colour identity, the one string the arena parses |
| `web/src/arena/camera.ts` | 87 | **new** — the rest pose, the §3.5 clamps, the shake and dwell budgets E5 will read |
| `web/src/arena/scene/HitProxy.tsx` | 87 | **new** — the invisible, always-clickable proxy parked at the resting pose |
| `web/src/arena/scene/Table.tsx` | 79 | **new** — the table quad and three seat lines |
| `web/src/arena/scene/geometry.ts` | 32 | **new** — `UNIT_PLANE`, one quad for every card in the game |
| `web/src/arena/scene/CardBack.tsx` | 29 | **new** — the card back as a *texture hook*, deliberately not a second card renderer |
| `web/src/useView.ts` | 110 | **new** — `#arena` / `?view=arena`, `hashchange`, no router |
| `web/test/layout.test.ts` | 445 | **new** — 13 tests, including the whole committed corpus |
| `web/test/colour.test.ts` | 118 | **new** — 6 tests, including every `manaCost` in the corpus |
| `web/src/main.tsx` | 723 (+179) | **edited** — `lazy(() => import('./arena/Arena.tsx'))`, the view switch in both modes, `onAct`, the bar toggle, `?stats` / `?grid` |
| `web/src/reduce.ts` | 552 (+36) | **edited** — `ClientState.eventSeq` |
| `web/src/styles.css` | 2860 (+79) | **edited** — `.arena`, `.arena__layer`, `.arena__credit`, `.viewtoggle` |
| `web/package.json` | +4 | three, fiber, drei pinned exactly; `@types/three` as a devDependency; `dev:arena` |
| `NOTICE` | +43 | section 6: the three MIT packages, and why the pins have no caret |

---

## 1. E1 — the dependency spike, and the go/no-go

**Ended on the React-18 line, and stayed there.** Installed exactly what report
09 §1.2 recommends:

```bash
npm i -E three@0.186.0 @react-three/fiber@8.18.0 @react-three/drei@9.122.0
npm i -DE @types/three@0.185.4
# added 76 packages, audited 169, 0 vulnerabilities, in 7s
```

- `npm install` resolved with **no peer conflict** against the repo's
  `react@18.3.1` / `react-dom@18.3.1`.
- `tsc --noEmit` (the repo's own strict config, including
  `noUncheckedIndexedAccess` and `verbatimModuleSyntax`) exits **0** with the
  whole arena in `include`.
- `vite build` succeeds.
- **It runs.** A real WebGL context, a real scene, real Scryfall textures — §8
  below is the screenshot. The 45-minute go/no-go budget was not spent: nothing
  threw, so neither the `three@0.173.0` fallback nor the React 19 move was
  needed.

Two warnings, both known and neither a break:

| Warning | Where | What it is |
|---|---|---|
| `npm warn deprecated three-mesh-bvh@0.7.8: Deprecated due to three.js version incompatibility` | install | drei 9.122 pins it. Tier 1 never imports `Bvh` / `useBVH` (accelerated raycasting for huge meshes; 40 quads do not need it), so it is cosmetic — exactly as §1.2 predicted. Not silenced with an `overrides` entry, because an override is a lie about what is installed. |
| `THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.` | browser console, once per `<Canvas>` mount | fiber 8.18.0's loop constructs a `THREE.Clock`, which `three@0.186` deprecates. A console warning, not an API gap: the loop runs. **This is the frozen line's first visible crack** and it is the shape §13's risk predicted — the day it becomes an error is the day the named trip-wire fires. |

The trip-wire is unchanged and now has a first data point: move the whole app to
React 19.2.8 + fiber 9.7.0 + drei 10.7.8 when the v8 line **breaks at runtime**
and a `three` pin does not fix it. A deprecation warning is not that.

## 2. `ClientState.eventSeq` (§2.3)

`events` was already there (M1 shipped it). `eventSeq` is new: the envelope
`seq` of the `state` frame the current batch came from, `0` before the first
one.

**It is documented as an identity, not a counter, and that is a correction to
§2.3.** The report sketches `if (s !== lastSeq + 1) flushAndSnap()`, which
cannot hold here: `seq` numbers *every* frame, so two consecutive `state` frames
in `g1.jsonl` are routinely 5–20 apart, and PLAN's *"What M6 hands to M7"* says
in as many words that `seq` is not an ordering primitive — a `resync`
re-delivers cached frames **verbatim** (amendments M10/M17). The rule written
into `reduce.ts` instead:

- `s === last` → nothing new (a re-delivery, or a non-`state` frame);
- `s > last` → a new batch, enqueue it;
- `s < last` → the stream moved backwards (a scrub, or a new game's `hello_ok`
  resetting it to 0) → flush and snap.

A *forward* scrub is indistinguishable from live progress by `seq` alone, so E3
also flushes on a changed `gameId` (invariant 10) and on a jump in
`framesApplied`. Both are already on `ClientState`; neither needed a new field.

## 3. The route, and the chunk that pays for it

`web/src/useView.ts`: `#arena` and `#/arena` (the hash is what a toggle writes,
and it fires `hashchange` without touching the transport) plus `?view=arena`
(what a command writes — `npm run dev:arena`). The hash wins when both are
present. No router dependency; no persistence.

**`npm run build`, before and after, same machine, same day:**

| | entry chunk | entry gzip | arena chunk | arena gzip |
|---|---:|---:|---:|---:|
| before M7 (main, 62 modules) | 270.26 kB | **83.99 kB** | — | — |
| after E1+E2 (664 modules) | 273.55 kB | **85.09 kB** | 916.20 kB | **248.04 kB** |
| delta | +3.29 kB | **+1.10 kB** | | |

The 2D board pays **1.10 kB gzip** for the arena's existence, and that 1.10 kB
is `useView`, the view toggle, the `Suspense` boundary and 79 lines of CSS — not
one byte of three. The arena chunk is fetched on the first `#arena` and matches
report §1.3's measured prediction (241 kB gzip) within 3%.

The CSS grew by 0.16 kB gzip and is counted in the entry column above.

## 4. The table, the rig, and the two debug flags

- `<Canvas dpr={[1, 1.5]} gl={{ antialias: true }} flat performance={{ min: 0.5 }}>`
  (§9.2 rules 4 and 9).
- **The camera rig**: a `<PerspectiveCamera makeDefault>` (fov 40, near 0.1, far
  60) plus `<OrbitControls makeDefault>` with §3.5's clamps — polar 20°–75°,
  azimuth ±25°, distance 0.7×–1.4× of the rest distance, `enableDamping`,
  `enablePan: false`. The rest pose, the shake bounds (≤ 0.02 units, ≤ 300 ms)
  and the dwell limits live in `camera.ts` as plain numbers so E5's choreography
  has one home for them.
- **The table**: one quad at `y = 0`, 12.8 × 12.4 world units, with a painted
  radial vignette and three seat lines. No lights anywhere in the scene.
- `?grid=1` — a `gridHelper` in card-height units. Off by default: under 40
  cards it is noise, and E1's "empty table" is not the state the arena is
  usually in.
- `?stats=1` — drei `<Stats>`.

## 5. `npm run dev:arena`

```jsonc
"dev:arena": "vite --open \"/?replay=games/g1.jsonl#arena\""
```

`fixtures/games/g1.jsonl` by default, exactly as `PLAN.md`'s M7 command line
says. Another fixture is a URL edit (`?replay=games/g3.jsonl#arena`) rather than
a positional argument, because a positional argument to `vite` is not one.

## 6. E2 — what a card is

- **`layout.ts`** is pure and is the only thing that knows a coordinate: seat
  anchors (mirrored through `z = 0`), the creature and land ranks with
  deterministic **id-ascending** ordering, wrapping above 9 per rank, the §3.3
  hand fan verbatim, the stack column (bottom first; the last element resolves
  next, is highest and is the only one scaled up), graveyard/exile/command piles,
  and attachments parked on their host **without taking a rank slot**. A tapped
  card keeps its slot and only rotates (`θ += π/2`).
- **`useCardTexture.ts`** does the four things §4.2 says are easy to forget:
  `SRGBColorSpace` by hand (the constructor default is `NoColorSpace` and
  `TextureLoader` never sets it), `anisotropy = gl.capabilities.getMaxAnisotropy()`,
  `gl.initTexture()` to upload now rather than at first draw, and a cache keyed
  by **URL** so seven `Plains` share one texture. Plus the one shared 256×256
  rounded-corner alpha map — the reason we draw the 73 KB `normal` JPEG instead
  of the 605 KB `png` and still have rounded corners.
- **`CardPlane` is THE card renderer** and `CardBack` is deliberately a *texture
  hook*, not a component that mounts a quad: one renderer, one `back` branch,
  one place to audit. `HitProxy` is a separate invisible mesh at the resting
  pose (§8 measures that it costs zero draw calls and is still clickable).
- **`textFrame.ts`** draws a card frame at 488×680 from fields the snapshot
  already carries, with the colour-identity border from `colour.ts`, an
  auto-shrinking name and word-wrapped rules text. It is what a **token** looks
  like — `g1.jsonl` has a `Soldier Token` on the opponent's battlefield at frame
  250, and it is visible as a dark text card in §8's screenshot.
- **The card back is drawn, not scanned** (the printed back is trademarked): a
  256×358 canvas, dark panel, radial sheen, two inner rules.
- **Click → `onAct({action:'clickCard', cardId})`**, verbatim, never gated. In a
  replay `onAct` is `null` — exactly as `<Board>` gets no `actions` — so every
  affordance is inert and nothing else differs between the two modes.
- **`input.selectable` renders as a rim** (see §9's deviation 3 for why it is a
  quad and not drei `Outlines`), `input.highlighted` as the same rim in the
  board's `--highlight` colour.
- **The art credit travels with the art**: hovering a card names its printing
  and artist; with nothing hovered, the line credits the artists of the faces
  currently on the table. A card drawn as a **back** is never named — the same
  `Placement.back` gate `CardPlane` uses.

## 7. Tests

```
npm --prefix web run test:node   →  465 tests, 465 pass, 0 fail, 0 skipped
npm --prefix web run test:render →   75 tests, 75 pass   (vitest, unchanged)
npm --prefix web run build       →  tsc --noEmit clean, vite build clean
```

`node --test` was **446** before this evening (the standalone count, nothing
skipped); the 19 new ones are `layout.test.ts` (13) and `colour.test.ts` (6).
**No existing test was edited.** The React line did not move, so nothing had to
be.

What the two new suites actually assert, beyond the hand-built cases:

- `layout()` run twice on one state gives **byte-identical** placements. That is
  §5.1's precondition: if the resting pose is a function of state alone, then
  "skip", "scrub" and "resync" are all `flushAndSnap()` and no cue needs a
  rewind path.
- Over **3,679 `state` frames** in all eighteen committed recordings plus the
  synthetic one: **84,418 placements**, no throw, no duplicate key, every
  transform finite, nothing off the table, nothing under it, and every card in
  every drawn zone placed exactly once. **15,019 of those placements are card
  backs**, and the assertion runs the direction that matters: every `isHidden`
  card is drawn as one — the
  hidden-information assertion, per frame, in the renderer that has no markup
  for `render.test.tsx` to check.
- A stack item and a battlefield card **with the same id** both get placed
  (`c:56` and `s:56`): the id spaces collide — 40 frames in the corpus have a
  `stack[].id` that is also a `Card.id` — and an activated ability's source is
  legitimately in both places at once.
- Every `manaCost` in the corpus parses to a WUBRG-ordered identity; the suite
  prints the distinct-cost table so a parser change is a diff.

## 8. In the browser, at 1600 × 900

`npm --prefix web run dev -- --port 5180 --strictPort`, then
`/?replay=games/g1.jsonl&stats=1#arena`, scrubbed to **frame 250 of 376** with
the replay controls — the same `prev / next / play / speed / scrub` bar the 2D
board uses, driving the same `LogReplayTransport` through the same pure
`reduce()`.

**What is on the table**, cross-checked against the 2D board at the same frame
and against `layout()` run in Node:

- **Far side (the opponent, −Z)**: six **tapped** lands in the back rank, each
  rotated a quarter turn so the rank reads as a row of landscape cards —
  Thriving Isle, Thriving Heath, Plains, and three Islands. In front of them six
  permanents: Peggy Carter Secret Agent, Strategic Intervention, Aerial Doombot,
  Web Up, S.H.I.E.L.D. Helicarrier, and a **Soldier Token** drawn as the dark
  text frame, because a token has no `art.json` entry and never will. Two
  equipment — S.H.I.E.L.D. Spy Kit and Super Suit — sit **on** their hosts,
  overlapping from the lower right, taking no rank slot of their own.
- **Near side (the viewer, +Z)**: one creature, **Wasp, Shrinking Savior**, with
  **Quantum Reduction** attached and overlapping it; behind her seven untapped
  lands (Thriving Isle, three Plains, three Islands) in one rank; at the left
  edge the graveyard pile (A.I.M. Scientists under Helicarrier Strike) and,
  behind it, the exile pile (Web Up), each fanned so it reads as a pile.
- **The hand**, four cards fanned and tilted up toward the camera at the bottom
  of the frame: Pym Particles, a Plains, an Island, Robotics Mastery.
- **Hands as backs**: at frame 250 the opponent holds nothing. Scrubbed to frame
  120 they hold two, and both draw as the **procedural card back** at the far
  edge; hovering one prints the generic credit line and **no name**, which is
  the hidden gate holding through the hover path as well as the render path.

The 2D board at the same frame agrees card for card (it splits the battlefield
rows slightly differently — see deviation 4).

**Draw calls — measured, by patching `WebGL2RenderingContext.prototype` in the
live page and counting between `clear()`s:**

| frame | cards on the table | draw calls per rendered frame | when |
|---:|---:|---:|---|
| 250 | 30 | 64 | before `forceSinglePass` |
| 8 | 12 | 28 | before `forceSinglePass` |
| 250 | 30 | **34** | after |

34 = 30 cards + the table + 3 seat lines. **The hit proxies cost exactly zero**,
which is §5.5's whole argument (`WebGLRenderer.projectObject` returns early on
`object.visible === false`; `Raycaster.intersect` never looks at `visible`), and
it is now measured rather than cited: at frame 8 the count was 28 per frame with
the proxies mounted and **28 with the proxy loop removed**. Well inside §9.1's
≤ 120 budget, with 86 calls of headroom for E4's effects.

That measurement found a real defect on the way — see deviation 5.

**fps: not measurable in this harness, and the number in the corner is not a
number.** drei `<Stats>` read **`0 FPS`**, and it is right to: the Browser pane
this was driven from never fires `requestAnimationFrame` — measured directly,
**0 rAF callbacks in 2,000 ms** with `document.hidden === false` — so R3F's loop
only advances when a screenshot forces a paint. The draw-call counts above are
real because they are per *rendered frame*; a frame *rate* is not. **§9.4's
measurement is still entirely E6's job**, and its method (headless Chromium over
CDP with SwiftShader, p95 ≤ 20 ms and max ≤ 50 ms) is unchanged by anything
here. What can be said: the scene renders 34 quads with no lights, no shadow
maps, no post-processing and one shared geometry, which is what the budget was
written around.

**The 2D board still works.** `/?replay=games/g1.jsonl` with no arena flag
renders the M4/M5/M6 board at frame 250 with every rail, the phase strip and the
log drawer, no console errors. Switching views with the bar toggle **keeps the
replay at frame 250 in both directions** — the transport is never touched, which
is §2.1 rule 1 in practice rather than in principle.

## 9. Deviations from report 09, and why

Six, each one a thing the report specifies that does not survive contact with
this table. All are in the code as comments at the point of the deviation.

1. **The camera rest pose is `(0, 9.3, 8.3)` looking at `(0, 0, 0.8)`, not
   §3.5's `(0, 4.2, 4.6)` → `(0, 0, 0.3)`.** The report's pose was measured in a
   probe scene, not against §3.2's anchor table, and against the real anchors it
   **cuts the viewer's own side off the bottom of the screen**: solving the
   frustum for the own-land rank at `z = 3.4` puts it 2.16 units below the
   frame's centre where the half-height is 1.38. Screenshotted, confirmed, and
   iterated to a pose that frames the opponent's hand, both battlefields, both
   graveyard piles and the viewer's own hand. §8 rule 6 ("the hand stays
   framed") is a *constraint*; the numbers under it were not load-bearing.
2. **A wrapped rank sits 0.55 away from its first row, not §3.2's 1.15.** The
   anchor table puts the creature and land ranks 1.1 apart and a card lying flat
   is 1.0 deep, so a second creature rank 1.15 "away from the table centre"
   lands exactly on the land rank. 0.55 keeps the wrapped row inside the rank's
   own band and reads like a real crowded table.
3. **The selection rim is a quad, not drei `Outlines`.** `Outlines` builds a
   copy of the parent geometry with a **`BackSide`** material
   (`drei/core/Outlines.js`: `new OutlinesMaterial({ side: THREE.BackSide })`,
   not overridable by props) and expands it along the projected vertex normal.
   Correct for a closed mesh; wrong for a single quad — a card facing the camera
   has its back face culled, so the outline would be invisible on every card you
   can read and visible only on the ones turned away. A quad 0.055 units larger,
   parented to the card, is three lines and draws the rim the spec wanted.
4. **The battlefield splits lands vs everything-else**, where the 2D board
   splits creatures vs everything-else. Both are defensible; §3.2 names the rows
   "lands" and "creatures", so an unattached Equipment shares the creature rank
   here and the land rank on the board. Worth aligning if it ever confuses
   anyone; it is not a hidden-information question and neither row hides a card.
5. **Every card material sets `forceSinglePass`, and finding out why was worth
   the evening.** Since three r152, `WebGLRenderer.renderObject` draws a material
   that is **both `transparent` and `DoubleSide` in two passes** — back faces,
   then front faces — unless that flag is set. Every card here is both (the
   rounded corners are an alpha map), so **every card was costing two draw
   calls**: measured at 64 for 30 cards + 4, then 34 with the flag. A card is a
   flat quad with no interior to sort; the second pass buys nothing.
6. **The opponent's hand pitch is `-1.15`, not §3.3's `+1.15`.** Pitch here is an
   absolute rotation about X where **flat is `-π/2`**, so `+1.15` is not a mirror
   of `-1.15` — it is the same card rotated 156°, face down through the table.
   Caught in the browser at frame 120 of `g1.jsonl`, where the opponent's two
   hand cards were two dark slivers at the top edge. Both hands now tilt up
   toward the camera, which is what a hand held across a table looks like, and
   `layout.test.ts` asserts the sign so it cannot come back.

Two smaller judgement calls, recorded so they are decisions and not drift:

- **No `V` keyboard toggle yet.** `web/src/keys.ts` is one tested table of 18
  rows owned by `<Board>` (CLAUDE.md, M4 convention 4), and the view switch
  lives above it. §2.2's `V` belongs in that table, in the change that also
  teaches the arena the keyboard — not bolted on beside it. The bar toggle is a
  link, because the hash really is the state.
- **The camera rig is not three nested objects.** §3.5 draws `rigRoot` →
  `rigOrbit` → `rigShake` → camera. `OrbitControls` writes the camera's *local*
  transform and reads its spherical coordinates back from it, so a camera under
  a non-identity parent makes every clamp wrong by that parent's transform. The
  rig's actual job — a damped spring toward the rest pose plus a bounded
  additive shake — is E5's, and E5 can do it in one `useFrame` after the controls
  update, with no parents at all.

## 10. What is not here

E3 onwards, unchanged from §11: the cue queue and the offset model, the
event-kind → cue table, `cues.json` and the S.H.I.E.L.D. cues, camera
choreography, the live `awaitingHuman()` budgets, M5's decision layer mounted
over the canvas, and §9.4's performance measurement. Also not here, and owed
before the arena is a seat rather than a spectator:

- **`drawnEntities()` in `web/src/render/picker.ts` has not been told about the
  arena** (**D33**). It decides whether an `ask` can be answered on the board by
  asking what the board mounts; the arena mounts a different set (no zone
  browser, no decision-panel thumbnail). It is correct today because the arena
  has no decision layer at all — E6 is where that has to change, in the same
  commit that mounts one.
- **`web/test/hooks-order.test.ts` does not scan the arena.** It is a source
  scan of `Board.tsx`'s one early return (CLAUDE.md, M5 convention 3) and it is
  written against that guard specifically. The arena's eight components were
  checked by hand — every hook in every one of them is above every `return`, and
  `ArtCredit` is the only one with a conditional exit at all — but "checked by
  hand" is exactly what that test exists to replace. Generalising it needs brace
  tracking rather than a line scan, which is a small job and not this evening's.
- **`liveness.test.ts`** (§10.5): the source-level assertion that nothing under
  `web/src/arena/` imports `transport/` or `reduce`'s internals, and that the
  decision layer imports nothing from `arena/cues/`. True today by inspection —
  `Arena.tsx` imports `art.ts`, `protocol.ts` types, `reduce.ts`'s `ClientState`
  type and its own modules — but it is not yet a test, and §10.5 is right that
  the crude version is the one that keeps holding.

---

# M7 evidence — the arena, evenings E3 and E4

What was actually run, on 2026-09-13, with real numbers. Evenings **E3 and E4**
of [`docs/research/09-arena-tier1-plan.md`](../research/09-arena-tier1-plan.md)
§11: the cue engine (the offset model, the queue, the stage, the ladder) and
then the whole §6 default cue table, the Tier-1 primitive kit and the cue
controls.

**The board now moves.** Taps rotate, cards slide between zones, spells rise out
of the hand that cast them, attackers lunge, blockers step in, damage jolts and
prints a number, creatures dissolve into the graveyard, life totals count. And
the property that makes all of that safe is still one line (§5.1):

```
finalTransform(card) = layout(state)[card.id]  ⊕  offsets[card.id]
```

`layout(state)` is authoritative and pure; a cue only ever contributes a
transient offset that **starts at identity and returns to identity**. So skip,
scrub, `resync` and a new `gameId` are all the same call — `flushAndSnap()` —
and none of them needs a rewind path. The fixture sweep asserts it mechanically:
after every one of **3,293 batches** across the eighteen committed recordings,
the offset map is **empty**.

---

## 0. What shipped

| File | Lines | What it is |
|---|---:|---|
| `web/src/arena/cues/registry.ts` | 1072 | **new** — cue id → implementation: all of §6, plus the generic `fx.*` primitives `cues.json` reaches for. Plain arithmetic over `t ∈ [0,1]`; **no three** |
| `web/src/arena/cues/queue.ts` | 648 | **new** — steps, stagger, coalescing, overlap, time compression, the 24-step cap, skip/step/flush, the virtual clock, and `awaitingHuman()` |
| `web/src/arena/cues/resolve.ts` | 535 | **new** — §7.3's ladder, the selector grammar, and event → targeted cue |
| `web/src/arena/cues/stage.ts` | 394 | **new** — `Stage`, `Offset`, `Effect`, `AnchorRef`, `CueImpl`, the easings, and `NullStage` |
| `web/src/arena/cues/validate.ts` | 301 | **new** — the hand-written cue-file validator (§7.4); errors drop an entry, never the file |
| `web/src/arena/cues/types.ts` | 173 | **new** — the vocabulary, and the `EVENT_KINDS` re-export that makes the table exhaustive *by type* |
| `web/src/arena/cues/defaults.ts` | 124 | **new** — §6's table as `Record<EventKind, CueSpec>` plus the zone sub-selectors |
| `web/src/arena/cues/archetype.ts` | 92 | **new** — `Card` → `creature/W`, and the looser keys |
| `web/src/arena/cues/intake.ts` | 74 | **new** — §2.3's "is this the next batch, or did the stream jump?" |
| `web/src/arena/cues/cues.json` | 47 | **new** — the data file: archetypes now, E5's per-card table later |
| `web/src/arena/scene/effects.ts` | 353 | **new** — the Tier-1 primitive kit as a fixed pool of 26 meshes |
| `web/src/arena/scene/CueRunner.tsx` | 152 | **new** — **THE** `useFrame`: begin frame → tick → write offsets → bind effects |
| `web/src/arena/scene/cardMaterial.ts` | 130 | **new** — the one shader Tier 1 writes: a noise-mask dissolve patched into the card material |
| `web/src/arena/scene/SceneStage.ts` | 112 | **new** — the browser's `Stage`, backed by `layout.ts` |
| `web/src/arena/scene/numberSprite.ts` | 100 | **new** — numbers and banners on a cached canvas (and why not drei `<Text>`) |
| `web/src/arena/scene/rigs.ts` | 36 | **new** — the ref map: placement key → mesh, material, uniforms |
| `web/src/arena/layout.ts` | 747 | +172 — the player/table anchors and `anchorPosition` / `anchorDelta`, so a cue still knows no coordinate |
| `web/src/arena/Arena.tsx` | 534 | +258 — batch intake, the queue's lifetime, `prefers-reduced-motion`, the cue controls, the dev handle |
| `web/src/arena/scene/CardPlane.tsx` | 240 | +42 — registers its rig and patches its material; the `back` branch is untouched |
| `web/test/replay-cues.test.ts` | 530 | **new** — the fixture sweep plus the queue's own rules (14 tests) |
| `web/test/cues-exhaustive.test.ts` | 431 | **new** — the ladder is total; the cue file is sane (11 tests) |
| `web/src/styles.css` | +52 | the cue control strip |

No new dependency. **`NOTICE` is unchanged** — E1's three entries still cover
everything the arena links, and §12.1's drei `<Text>` was deliberately not
bought (§4 below).

## 1. The commands, and what they printed

```bash
npm --prefix web run build     # tsc --noEmit && vite build
npm --prefix web test          # node --test test/*.test.ts, then vitest run
npm --prefix web run dev -- --port 5180    # then /?replay=games/g1.jsonl#arena
```

| | before E3 | after E4 |
|---|---:|---:|
| `tsc --noEmit` | 0 errors | **0 errors** |
| `node --test` | 465 pass | **490 pass, 0 fail, 0 skipped** (+25) |
| `vitest run` | 75 pass | **75 pass** (untouched) |
| 2D entry chunk | 85.09 kB gzip | **85.10 kB gzip** (+0.01) |
| `Arena` chunk | 248.04 kB gzip | **263.03 kB gzip** (+14.99) |

**The 2D board still pays nothing.** The whole cue engine, the primitive kit,
the dissolve shader and the controls cost **15 kB gzip inside the lazy arena
chunk** and one hundredth of a kilobyte on the 2D path (the `Arena.tsx` import
is already dynamic; the delta is rounding).

## 2. The fixture sweep — `replay-cues.test.ts`

Every line of all eighteen committed recordings through the **real** `reduce()`,
every `state` frame's `events` through the **real** queue against a `NullStage`,
with an injected clock stepped 25 ms at a time until the batch drains.

```
kind          emitted   cued  cues
stats           8232   8232  stats.flash
phase           4054   4054  phase.strip
tap             1952   1952  fx.ripple, tap.rotate
zone            1885   1885  land.rise, zone.dissolve, zone.draw, zone.enters,
                             zone.exile, zone.slide, zone.toStack
cast             414    414  cast.rise
resolved         412    412  resolved.pop
unstacked        412    412  unstacked.shatter
turn             319    319  turn.banner
attackers        318    111  attack.lunge
combat_end       301    301  combat.return
land             258    258  land.rise
damage           237    237  damage.hit, damage.lethal, damage.player
life             114    114  life.tick
blockers         110     19  block.interpose
counters          55     55  counters.drop, counters.pop
shuffle           54     54  shuffle.riffle
attach            28     28  attach.release, attach.snap
outcome           18     18  outcome.finish
scry              18     18  library.peek
mulligan           9      9  mulligan.sweep
sacrificed         5      5  sacrifice.crush
surveil            1      1  library.peek
phased             1      1  phased.fade
foretold           1      1  foretell.glimmer

3679 state frames · 3293 non-empty batches · targets 16083 resolved /
483 unresolvable (hidden) · 438 effects over the §9.3 cap
3275 batches, worst 250 ms of 250
```

**Every kind that fired resolves to a real cue, and the allowlist is one entry**
— `phase`, which §6 gives zero duration and the planner drops before the
timeline. That is E4's stated exit criterion, met.

Two rows read low and both are **correct, not missing**, verified against the
raw JSONL:

- **`attackers` 318 emitted / 111 cued.** `GameEventAttackersDeclared` fires at
  every combat, including the ones where nobody attacks: **207 of the 318 carry
  zero attacker ids**. A cue with no target is dropped by the planner.
- **`blockers` 110 / 19.** Amendment **M7**: an unblocked attacker is relayed as
  blocking *itself* (`{attackerId: 12, blockerIds: [12]}`), because that is how
  `PhaseHandler.java:728-736` builds the payload. **91 of the 110 events are
  entirely unblocked attackers**, and `cardIdsOf` skips that encoding by name
  rather than rendering "blocked by itself".

The other four assertions, all green across the corpus:

- **decay** — after every batch, `queue.length === 0` *and* `stage.offsets.size
  === 0` *and* `stage.effects.size === 0`;
- **resolution** — every targeted id is a non-negative integer, and each is
  either found in that same frame (16,083) or unresolvable (483), which §3.6
  rule 1 says is a card the viewer may not see. There is no third outcome;
- **budget** — with the human-waiting budget forced, **3,275 batches, worst case
  250 ms of 250** (§5.3). The one documented exemption is `outcome.finish`;
- **redaction** — no cue parameter and no stage op contains any card name that
  appears anywhere in that recording, and nothing matches `(\d+)`, the `name
  (id)` join shape §3.6 rule 1's sweep exists to kill.

The queue also reported **one** note over the whole corpus, and it is the
designed degradation: *"queue exceeded 24 pending steps — flushed and snapped
(§5.2)"*, on an opening hand (sixteen `zone` events and two shuffles in one
batch). A pathological turn becomes "the board just updated", never a
three-minute cutscene.

## 3. Six moments, photographed

`npm run dev -- --port 5180`, `/?replay=games/g1.jsonl&stats=1#arena`, viewport
1600×900. The Browser pane paints only when something forces it (§7), so each
shot was taken by pausing the cue clock, stepping the transport one frame, and
advancing the **virtual** clock by hand to a chosen point in the cue — the dev
handle `window.__mtgArena` exists for exactly this (§10.7's "not automated, and
honest about it"). Every number below is read back out of the live `SceneStage`
at the instant of the screenshot.

**1 — a draw.** Frame 22, `zone.draw` at 190 ms of 380.

> The opponent draws. Card **47** slides out of the library anchor into its slot
> in the opponent's fan — `d = [0.63, 0.00, 0.02]`, `scale 1.08` — and the card
> that slides in is a **back**: `name: (hidden)`, `at: hand`, `seat: opp`. The
> cue plays on an id, the renderer never learns what it is, and thirty frames
> later that same id is cast face-up as S.H.I.E.L.D. Spy Kit. Hard rule 8 in
> motion.

**2 — a cast.** Frame 30, `cast.rise` at 320 ms of 700.

> **S.H.I.E.L.D. Spy Kit** (47, the opponent's) is lifted **+0.50 y** and pulled
> **−1.00 z** back toward the hand it came from, decaying to its battlefield
> rest, at `scale 1.06`, glowing `0.71` in `#f6f0d8` — the W of its own mana
> cost, through `colour.ts`. Under it sits the additive glow sprite, `radius
> 1.1`, `strength 0.71`: a pool of warm light on the felt. The screenshot shows
> the card raised above the opponent's rank with the light under it.

**3 — an attack.** Frame 142, `attack.lunge` at 380 ms of 850.

> **Peggy Carter, Secret Agent** (44) lunges: `d = [+1.07, +0.06, +1.26]` —
> forward across the centre line toward the viewer — tilted toward her defender,
> `scale 1.04`. She is the only attacker, so the selector is
> **`attackers:alone`** and the cue carries `spotlight: 1`: a `glow` of radius
> **1.3** at strength **0.80** under her, and nobody else. That is §12.2's
> "shield-glow aura when attacking alone" arriving out of the *default* table,
> before `cues.json` has a single per-card entry.

**4 — a block.** Frame 296, `block.interpose` at 300 ms of 600.

> Two of the viewer's creatures — a **Robot Token** (97, drawn through the text
> frame, since a token has no `art.json` entry) and **Wasp, Shrinking Savior**
> (28) — both step **−2.07 z** out of their rank and into the lane in front of
> the attackers they blocked, and an **impact ring** appears at each attacker:
> `radius 0.34` at `0.81` in `#9ec7f0`, `radius 0.42` at `0.67` in `#c6ccd6`.
> Two blockers, one coalesced step, 40 ms of stagger between them.

**5 — damage and a death.** Frame 298 and frame 330.

> At 700 ms into frame 298's batch, three cards are jolting at once — **Wasp,
> Shrinking Savior**, **S.H.I.E.L.D. Helicarrier** and **Aerial Doombot** — each
> rimmed red (`glow 0.96 … 1.00`, `#ff6b5a`), each knocked back along the vector
> from its attacker, each with a red number rising and fading above it: **−4**,
> **−3**, **−1**, at `rise 0.37 / 0.35 / 0.33`. One of the four damage events
> was lethal, so `damage.lethal` also filed a camera request — `shake 0.35`,
> `priority 2`, framing card 97 — which is **recorded and not acted on**: the
> camera is E5's evening and §8's budget is four cues, not five accreted here.
>
> The death itself is frame 330, 1,430 ms in: **S.H.I.E.L.D. Helicarrier** (29)
> is now placed in the viewer's **graveyard**, and `zone.dissolve` has it
> displaced **+4.74 x** back toward the rank it died on, sunk **−0.11 y**, tinted
> grey, `opacity 0.80`, **`dissolve 0.37`** — the noise mask eating it away with
> a warm edge. 400 ms later `dissolve` peaks at **0.88** and `opacity` is
> **0.52**; then it re-forms on the graveyard pile, because a cue that ended at
> zero opacity would be a cue that does not decay to identity, and the card
> really is in the graveyard in this frame.

**6 — a life change.** Frame 330, `damage.player` then `life.tick`.

> The HUD plate under the viewer's seat flashes red (`plate`, `radius 0.9`,
> `strength 0.71`) with a large **−4** rising over it; 700 ms later the plate is
> the life counter's own and the number reads **4** — `life.tick` counting from
> `from` to `to` in red, because the delta is negative. `damage` fires before
> `life` in the engine's own batch order and the planner never sorts a batch, so
> the number and the counter agree (§6).

## 4. Five judgement calls, and what each one cost

1. **Numbers are a canvas texture, not drei `<Text>`** — a deliberate departure
   from §12.1, which buys troika SDF text for +44 kB gzip, and an answer to
   §14's question 2 the other way. Three mechanical reasons, all found while
   wiring E4: drei's `<Text>` takes its string from **`children`** and
   re-assigns it on every React render, so §9.3 rule 2's "mount once and mutate
   `.text`" fights the component; it **suspends** (`suspend(() =>
   preloadFont())`), and a component suspending inside `<Canvas>` re-suspends
   the canvas subtree; and its default font is fetched from
   **`fonts.gstatic.com`**, which makes a localhost-only game's damage numbers
   depend on a CDN. `textFrame.ts` already draws text to a canvas for the card
   fallback; `numberSprite.ts` is the same technique, cached by string **and**
   colour, capped at 64 entries. It is reversible in an afternoon if E5 wants
   SDF text.
2. **The dissolve is patched into the card material, not a second material.**
   `onBeforeCompile` prepends two uniforms and injects four lines after
   `#include <map_fragment>`, guarded by `#ifdef USE_MAP` (`vMapUv` only exists
   when the material has a map) and by `if (uDissolve > 0.0)`.
   `customProgramCacheKey` returns one constant, so all 43 card materials share
   **one** program — measured: `gl.info.programs.length === 4` for the whole
   scene. The alternatives were 40 more programs or a second card renderer, and
   CLAUDE.md's M4 convention 2 has one of those.
3. **§5.2's `naturalMs` formula is wrong, and the budget assertion caught it.**
   The report writes a batch's length as `Σ step.ms × 0.65 + last.ms`. With a
   700 ms `turn.banner` overlapped by a 180 ms `tap.rotate` that gives 635 ms,
   but the batch really finishes at 700 — so a batch compressed "to 250 ms" ran
   **275 ms** on `human-comfort-13.jsonl`. `naturalMs` now takes the latest
   finish of any step, which is what the scheduler actually lays out, and the
   worst case over 3,275 batches is exactly 250 of 250.
4. **A zone anchor with no player is the card's own side of the table.** Written
   as a comment first and implemented second, which is how the opponent's
   S.H.I.E.L.D. Spy Kit came to rise **out of the viewer's hand** at frame 30 —
   seen in the browser, fixed in `anchorDelta` (`ownSideOf`), and the `cast` cue
   now names its controller's hand explicitly rather than relying on the
   fallback. The same bug would have flown every opponent Equipment across the
   table in `attach.snap`.
5. **`prefers-reduced-motion` collapses every cue to a snap**, not to §8 rule
   7's 30% durations. A renderer whose whole vocabulary is motion should honour
   "no motion" as *no motion*, and a snapped cue still leaves the scene at
   `layout(state)`, which is the correct board either way. Verified live:
   `setReducedMotion(true)` then stepping a frame enqueues a batch with
   **0 pending steps and 0 ms remaining** — the board simply updates.

Two rules the cue table enforces that §6 does not state, both because the corpus
made them obvious:

- **`stats` gives up any card another cue already owns.** It is the commonest
  kind in the stream by a factor of four (8,232 of 19,184) and the quietest cue
  in the table (a rim at a third strength); a flash on a creature that is at that
  moment dying is noise on top of the shot that matters.
- **`unstacked` is dropped when `resolved` covers it.**
  `GameEventSpellRemovedFromStack` fires for *every* spell that leaves the stack,
  resolution included — the corpus has 412 of each, exactly — so without the
  rule a resolving spell pops and then shatters.

## 5. Performance — what is measurable here, and what is not

**Draw calls are real; a frame rate is not.** Measured at `g1.jsonl` frame 359,
the busiest board in the recording (**43 cards** placed, both battlefields full,
two graveyards, two hands). These are **dev-build** numbers read from the
`import.meta.env.DEV` handle in the browser pane; the production build's are in
E6 §5 and are the same shape (40 calls, 80 triangles, one geometry at a
30-placement frame) — the table below is bigger because the frame is:

| | idle | mid-cue |
|---|---:|---:|
| draw calls (§9.1 budget **≤ 120**) | **47** | **49** |
| triangles (budget ≤ 2,000) | 94 | 98 |
| geometries (budget ≤ 12) | **1** | **1** |
| programs | 4 | 4 |
| textures | 55 | 56 |
| meshes in the scene | 116 | 116 |
| of which **visible** | 47 | 49 |

Three things that table says out loud:

- **one geometry for 43 cards** — the shared `UNIT_PLANE` of §4.1, scaled per
  card, exactly as specified;
- **69 invisible objects cost nothing.** 43 hit proxies + 26 pooled effect
  meshes are in the scene and are skipped outright by `projectObject`
  (`WebGLRenderer.js:1862`). That is §5.5's claim — a card mid-cue is never a
  moving click target, and the proxy that guarantees it is free — measured;
- **the two live effects of a player-damage cue cost two draw calls** (47 → 49).
  The §9.3 cap of eight blended objects is therefore a ceiling of about eight
  draw calls, not eight passes.

**No fps number is obtainable in this environment, and the one in the corner is
not one.** Re-measured today, unchanged from E1/E2: `requestAnimationFrame`
fired **0 callbacks in 2,000 ms** with `document.hidden === false`. The pane
never animates on its own; it paints when a screenshot forces it, and drei's
`<Stats>` reads `0 FPS` for that reason. §9.4's measurement — headless Chromium
over CDP with SwiftShader, p95 ≤ 20 ms, max ≤ 50 ms — remains **entirely E6's
job** and nothing here substitutes for it.

## 6. The whole game, end to end

The headline command of E4, run at transport speed **2×** (200 ms per frame):

```
/?replay=games/g1.jsonl&stats=1#arena  →  play
…
frame 376 / 376 · s2c over
queue.idle = true
1,213 cues queued across 19 kinds:
  stats 703 · tap 184 · zone 124 · cast 42 · resolved 42 · turn 25 · damage 22
  attackers 20 · land 18 · combat_end 9 · life 7 · attach 6 · blockers 5
  shuffle 5 · scry 3 · unstacked 3 · counters 2 · mulligan 2 · outcome 1
notes: queue exceeded 24 pending steps — flushed and snapped (§5.2)   [×1]
console: no errors; one THREE.Clock deprecation warning (E1's known crack)
```

A whole recorded AI-vs-AI game played as a cinematic, from the opening hands to
the result banner, with nothing snapping that should not and nothing hanging.
**This is `docs/ideas/arena-mode.md`'s stated M7 milestone**, and it is E4's
deliverable.

The controls were exercised through their own buttons, not through the objects
behind them:

| control | what it did | after |
|---|---|---|
| **⏸ cues** | froze the animation clock; the frame log kept its own play state | — |
| **step batch** | snapped the 3 pending steps of the current batch | `offsets 0, effects 0` |
| **skip all** | snapped everything | `idle: true, offsets 0, effects 0` |
| **speed** | 0.5× / 1× / 2× / 4× on the cue clock, independent of the transport's | — |

Every one of them lands the scene on `layout(state)` — which is the board the
engine actually described — because skipping is `apply(t = 1)` followed by
`end()` and nothing else.

**The 2D board is still one click away and still correct.** Toggling to `#board`
at frame 359 renders M4/M5's board at the same frame, arrows and all; toggling
back rebuilds the arena from nothing (`paused: false, speed: 1, idle: true`,
same frame), which is §2.1 rule 3 — the arena is stateless with respect to the
game.

## 7. Problems, and what is still owed

- **No fps, again.** See §5. The draw-call numbers are real per rendered frame;
  a frame *rate* is not obtainable here and E6 owns §9.4.
- **The first paint after a view toggle composites black**, then the next paint
  is correct (`THREE.WebGLRenderer: Context Lost` is logged for the canvas that
  unmounted). Unchanged from E2, still reads as a pane artefact rather than a
  bug, and still worth a second look on a real browser in E6.
- **The dissolve is hard to photograph.** At its peak 88% of the fragments are
  discarded, so the card is nearly invisible — correct, and invisible in a
  800×450 screenshot. The numbers in §3 are the evidence; the pixels are not.
- **The camera does not move.** Cues file requests (`damage.lethal`,
  `fx.shockwave`) and `SceneStage` records them; nothing applies one. That is
  §8's budget being respected rather than an omission — four camera cues, chosen
  in E5.
- **`NullStage` replaces where `SceneStage` composes.** `setOffset` on the test
  double overwrites; in the browser two cues on one card compose (§5.1's
  `composeOffsets`). The difference is deliberate — the double's map is what the
  decay assertion reads, and replace-semantics give that assertion teeth — but
  it means composition is covered by the unit tests and by the browser, not by
  the corpus sweep.
- **`web/test/hooks-order.test.ts` still does not scan the arena**, which now has
  four more components. Checked by hand again: every hook in `CueRunner`,
  `CueControls`, `Arena` and `CardPlane` is above every return, and none of them
  has an early return at all. Unchanged from E2, and still exactly what that
  test exists to replace.
- **`drawnEntities()` in `web/src/render/picker.ts` has still not been told
  about the arena** (**D33**), and **`liveness.test.ts`** (§10.5) is still not
  written. Both are E6's, in the change that mounts a decision layer.
- **`./tools/check-all.sh` was not run.** It writes under `var/` and starts seven
  ws servers, both outside this evening's file scope and port range. The web half
  of that gate — `npm run build && npm test` — is green.
- **The dev handle is dev-only and is a handle.** `window.__mtgArena` exists
  under `import.meta.env.DEV` (a compile-time constant, so it is not in the
  production bundle) and carries the queue, stage, pool, rigs, renderer and
  scene. It is what made §3 and §5 measurable at all, and it is the iteration
  loop §10.7 asks for; `?cue=<id>`, the dev route that loops one cue on a dummy
  card, is still E5's.
- **`turn` is a banner, not silence.** The M7 brief summarises §6 as "turn/phase
  are silent"; §6's own table gives `phase` **0 ms** (and the planner drops it
  before the timeline, which is stronger than silence) but gives `turn` a 700 ms
  `turn.banner`. The table won, because it is the spec and because a turn change
  is the one moment a spectator needs marked — it is a HUD banner reading
  `Turn <n>` (plus `— your turn` on the viewer's own), it touches no card, and
  it is one line in `defaults.ts` to silence if the user disagrees. The arena has
  no audio of any kind, in case "silent" meant sound.
- **Nothing is committed**, per CLAUDE.md: everything is in the working tree of
  the `m7` worktree.

---

# M7 evidence — the arena, evenings E5 and E6

Run 2026-09-13, on branch `m7` in the worktree `/home/justin-a/code/mtg-table-m7`,
against report 09 §§7–12 and `docs/ideas/arena-mode.md`'s cue table. Ports 8660
(bridge) and 5180/5182 (web), never the user's 8642/5173.

**E5** is the camera and the S.H.I.E.L.D. deck's own cues. **E6** is the live
seat, the performance pass and the test strategy. Everything below was measured;
where a number disagrees with report 09 the number wins and the disagreement is
written down.

## 0. What shipped

| | |
|---|---|
| `web/src/arena/camera.ts` | §8's seven rules: orbit coordinates, the framing solver, the projection that gives rule 6 teeth, and `CameraDirector` — one lane, priority preempt, dwell caps, rule 5's snap-home, bounded shake, the user-override window |
| `web/src/arena/cues/cues.json` | **28 cards**, keyed by name, with `_note` on every entry saying which event kinds it keys off and what the source material is |
| `web/src/arena/cues/registry.ts` | 13 new cue implementations, Tier-1 primitives only |
| `web/src/arena/cues/validate.ts` | closed key sets: an unknown field is an **error**, `_`-prefixed keys are comments |
| `web/src/arena/layout.ts` | §5.1's `presence` — a hover folded into the resting pose, a bob handed to the frame loop, and `Layout.bobbing` |
| `web/src/arena/DecisionLayer.tsx` | the arena's seat: `input.prompt`, the two engine buttons verbatim, a two-step Concede, and `<AskModal>` unchanged |
| `web/src/arena/Arena.tsx` | the keyboard (from the one keymap), the hotkeys overlay, the adaptive dpr, `?dpr=` |
| `web/src/keys.ts` | two rows — **V** (switch renderer) and **K** (skip all cues) — not a second handler |
| `scripts/play.sh` | `--arena` |
| `tools/arena-bench.mjs` | §9.4's measurement, actually run |
| `web/test/camera.test.ts`, `liveness.test.ts` | 16 + 6 new assertions |

## 1. The commands, and what they printed

```bash
npm --prefix web run build     # tsc --noEmit && vite build
npm --prefix web test          # node --test test/*.test.ts, then vitest run
./scripts/play.sh --arena --no-open --port 8660 --web-port 5180 -- --games 1 --seed 42
node tools/arena-bench.mjs --url 'http://127.0.0.1:5182/?replay=games/g1.jsonl#arena'
```

| | after E4 | after E6 |
|---|---:|---:|
| `tsc --noEmit` | 0 errors | **0 errors** |
| `node --test` | 490 pass | **518 pass, 0 fail, 0 skipped** (+28) |
| `vitest run` | 75 pass | **75 pass** (untouched) |
| 2D entry chunk | 85.10 kB gzip | **85.42 kB gzip** (+0.32) |
| `Arena` chunk | 263.03 kB gzip | **273.12 kB gzip** (+10.09) |

The 2D board's +0.32 kB gzip is two keymap rows, the `?arena=off` branch and the
`?dpr=` parse — not a byte of three. The arena's +10 kB is `camera.ts`, thirteen
cues, the decision layer and drei's `PerformanceMonitor`/`AdaptiveDpr`.

## 2. E5 — the camera

`camera.ts` is plain numbers: no three, no React, no DOM, which is why all seven
of §8's rules are in `web/test/camera.test.ts` rather than in a screenshot.

**Rule 6 is §8's one measured deviation, and it changed behaviour.** Enforced
literally — "the own-hand anchor projects inside the lower 30% of the viewport…
if the clamp cannot be satisfied, the move is dropped" — it drops **both** of
§8's own camera moves. Measured at 1920×1080, fov 40:

| move | hand, projected | verdict under the literal rule |
|---|---|---|
| attack swoop (frames the opponent's combat lane) | *behind the camera* (`projectToNdc` → `null`) | dropped |
| outcome pull-back (a wide shot) | `y = −0.35` — **more** hand on screen | dropped |
| rest pose | `y = −0.84` | passes |

So rule 6 is enforced in the half with teeth — **the hand is on screen and below
the midline** — and in the half that makes it true by construction:
`solveFraming` puts the seat's own hand and battlefield anchors *into the set of
points it frames*. A pose that loses the hand is then never solved rather than
solved and rejected. With that, all three moves solve and a request for
something off the table is still dropped:

```
swoop     [0.38, 8.96, 12.08] → [0.38, 0.10, 0.95]   hand ndc (−0.05, −0.53)
flyIn     [0.00, 12.07, 8.84] → [0.00, 0.43, 1.57]   hand ndc ( 0.00, −0.61)
pullback  [0.00, 11.85, 13.18] → [0.00, 0.48, 2.40]  hand ndc ( 0.00, −0.34)
off-table                                             DROPPED
rest      [0.00,  9.30,  8.30] → [0.00, 0.00, 0.80]  hand ndc ( 0.00, −0.84)
```

**The four camera cues are four**, as §8's budget demands, and one of them is a
*release*: `attack.lunge` (a low swoop, priority 1, one request per attacker so
the first takes the lane and the rest are **dropped**), `fx.flyIn` (the
Helicarrier, priority 3), `outcome.finish` (a **cut** to a wide shot, priority 4)
and `turn.banner`, which hands the lane back so the camera settles home. Plus two
shake-only requests (`damage.lethal`, `fx.shockwave`), bounded at 0.02 units and
300 ms by `camera.ts` and not by the cue.

**"Never fight the user" is stronger than §3.5's five-second window.** Any
`OrbitControls` drag makes *the user's own pose* the new home. Springing back to
our rest pose five seconds after they let go is the same fight, delayed.

## 3. E5 — the S.H.I.E.L.D. cues, measured over the corpus

`cues.json` is 28 cards. The proof that it is not decorative is a census over all
eighteen committed recordings, printed by `replay-cues.test.ts` every run:
**1,156 of 19,208 events resolved to a per-card cue**, across **40 distinct
entries**; 1,007 more resolved to an archetype. The top of the table:

```
Island · tap                          → fx.ripple     ×433
Plains · tap                          → fx.ripple     ×260
Island · zone:*>battlefield           → fx.terrain    ×70
Thriving Isle · tap                   → fx.ripple     ×65
Strategic Intervention · cast         → cast.rise     ×28
Ant-Man's Air Force · cast/resolved   → fx.swarm      ×21 / ×21
Web Up · cast                         → fx.webWrap    ×16
Robotics Mastery · cast               → fx.circuit    ×16
Wasp · cast                           → fx.scaleBeam  ×9
Quantum Reduction · cast              → fx.collapse   ×9
S.H.I.E.L.D. Helicarrier · zone       → fx.flyIn      ×9
Aerial Doombot · attackers            → attack.jet    ×9
Quake · tap:on                        → fx.shockwave  ×8
Peggy Carter · attackers:alone        → attack.aegis  ×4
Helicarrier Strike · cast             → fx.strike     ×3
Nick Fury · zone:*>battlefield        → fx.agents     ×1
Ant-Man · attackers:alone             → attack.shrink ×1
creature/W · counters:P1P1+           → fx.badge      ×9   (archetype)
```

### Three of them, photographed in the browser

Taken at `http://127.0.0.1:5180/?replay=…#arena`, 1400×774, by pausing the cue
queue and advancing its virtual clock by hand (§10.7's iteration loop).

1. **S.H.I.E.L.D. Helicarrier flies in** (`g1.jsonl`, frame 176, `fx.flyIn` at
   t≈350 ms of 1400): the card is above the table, turning, with a downwash of
   particles under it — `dy 3.43 · dz −0.89 · rotZ 0.67 · scale 1.16`, effect
   `particles/downwash r 0.9 s 0.70`. The **default** for the same event is
   `zone.enters`: a 0.6-unit drop into the rank with a dust ring. Afterwards it
   does not come down: its `presence` (`hoverY 0.9`) is a *layout* rule.
2. **Quake's shockwave** (`g3.jsonl`, frame 98, `fx.shockwave` at t≈120 ms): two
   cyan rings expanding across the table around her card — `ring r 1.24 s 0.64`,
   plus a camera request `{shake: 0.35, priority: 2, frame: [card 31]}`. The
   default for `tap` is `tap.rotate`: a quarter-turn and nothing else.
3. **Peggy Carter's shield** (`g1.jsonl`, frame 142, `attack.aegis` at t≈400 ms
   of 900): a gold halo and a ring held around her for the length of the lunge —
   `glow/halo #f2d98c r 1.4 s 1.00`, `ring/rim r 0.63 s 0.85`, offset
   `dx 1.07 · dz 1.26 · glow 0.80`. The default `attack.lunge` translates and
   tilts and glows not at all.

### What the arena cannot know, and does not pretend to

- **Coulson's badge is keyed to the card that RECEIVED the counter**, not to
  Coulson. §3.6's `counters` event carries the card, the counter type and the two
  values and **no source**, so "Coulson did this" is not on the wire. The badge
  is the `creature/W` archetype's `counters:P1P1+` — in this deck, exactly the
  S.H.I.E.L.D. Heroes — plus Coulson's own entry for his own counters, which in
  eighteen recordings never fired once. Only a census tells you that.
- **Quake's ring is centred on HER tap**, which is the event her own attack
  raises. `arena-mode.md` asks for the ring when *her trigger* taps something;
  the engine does not say which card caused another card's tap, and inventing
  that link would be rules logic in a renderer.
- **Nick Fury's agents are tokens**, and each one enters with its own `zone`
  event and its own cue. `fx.agents` plays *beside* him (a new `beside` anchor,
  in card widths) and never creates, names or counts them.

### Two defects the cue data found

1. **§7.3's counter selectors could never match.** The grammar spells the +1/+1
   counter `P1P1` and `docs/protocol.md` §3.6 says the field is "the
   `CounterType` name, e.g. `P1P1`". **The wire does not say that**: every one of
   the 1,316 counter values in the committed corpus is `+1/+1` or `Spore` —
   Forge's *display* name. `counters:P1P1+` was dead data and `counterLabel`
   printed `++1/+1`. Fixed in the client with `counterToken` (`types.ts`), which
   normalises the wire's spelling into the grammar's; the protocol document is
   the half that is still wrong, and fixing it is the bridge's, not mine.
2. **A permanent cast and resolved in one snapshot animated twice.** A `state`
   can cover several engine steps; the Helicarrier's frame carries `cast`,
   `zone`→battlefield and **two** `resolved` events for one card. §5.1 composes
   two live cues by **adding** their translations, so the card rose out of a hand
   it had already left while descending onto the table (peak `dz −2.33`), and the
   doubled `resolved.pop` pulsed twice as hard. Two new suppression rules — a
   `cast` gives way to an arrival, and one card gets one cue of a kind per batch
   — bring it to `dz −1.18` and two cues. Rule 5 fires **60 times** in the 66
   cast-and-entered batches of the corpus, which `replay-cues.test.ts` asserts.

## 4. E6 — a live game, played entirely in the arena

`./scripts/play.sh --arena --no-open --port 8660 --web-port 5180 -- --games 1 --seed 42`
printed `arena — http://127.0.0.1:5180/?ws=1&port=8660#arena`, and that page was
the whole session. In order, and every one of them through the arena:

| step | what happened |
|---|---|
| connect | `open ws://127.0.0.1:8660/ws`, seat 0, prompt **"Human, you have won the coin toss. Would you like to play or draw?"** with the engine's own buttons **Play** / **Draw** |
| play or draw | SPACE → `buttonOk`; prompt became the mulligan |
| **keep** | buttons **Keep** / **Mulligan**, SPACE → kept a 7-card hand |
| **play a land** | clicked an Island in the 3D hand: hand 7 → 6, battlefield 0 → 1 land. A `HitProxy` raycast → `act: clickCard` → the engine |
| **cast a creature** | clicked A.I.M. Scientists → the engine asked an `ability_menu` → **M5's `<AskModal>`, unchanged, over the canvas** → answered option 0 → prompt **"A.I.M. Scientists - Creature 3 / 3 Pay Mana Cost: {3}{U}"** with OK labelled **Auto** → SPACE → four Islands tapped, the creature on the battlefield |
| (the AI answered) | it *Web Upped* the Scientists off the table; a second creature, Aerial Doombot, was cast the same way and **hovered**: `y 0.205` against every other creature's `0.020`, `bobAmp 0.018`, tilted toward the camera — its `presence`, live |
| **attack** | declare-attackers prompt "Select creatures to attack Forge AI…", Cancel labelled **Alpha Strike**; ESC declared the attack, Cancel became **Call Back**, SPACE confirmed → `attacking: true`, tapped, in the Declare Blockers step |
| **concede** | CTRL+Q armed it (*"press CTRL+Q again to concede"*, the button reading *"Concede — click again"*), CTRL+Q again sent it. Every control went disabled |
| **the 2D board** | **V** switched to the board mid-session over the same socket — `in 667 · out 91`, unchanged, no reconnect — showing "Game over. Winner: Forge AI." and the New Game row. A fresh `?ws=1` load on the same server then connected again and drew the same game over |

The cue engine ran the whole game: **17 distinct event kinds**, `zone` 86,
`tap` 60, `stats` 55, `resolved` 23, `cast` 20, `turn` 16, `land` 10,
`attackers` 6, `damage` 5, `combat_end` 5, `life` 5, `attach` 2, `mulligan` 2,
`shuffle` 2, `counters` 1, `scry` 1, `outcome` 1. One note the whole session:
`queue exceeded 24 pending steps — flushed and snapped (§5.2)`, which is §5.2
working.

The bridge exited `MTGTABLE OK`: 671 frames written, 91 read, 3 ws connections
accepted, 0 refused, **0 emit errors, 0 events dropped, 0 reveals**, 2 notices
swept. `play.sh` then stopped vite, which is contract (e).

## 5. E6 — performance, measured twice

§9.4's method, run: `tools/arena-bench.mjs` starts headless Chromium with
`--use-gl=swiftshader --enable-unsafe-swiftshader`, loads the **production**
build over `vite preview`, scrubs to the middle of `g1.jsonl`, plays at 4× so the
queue is never empty, and samples `requestAnimationFrame`.

**The first thing it measured was the compositor.** With vsync on, every delta is
a multiple of 16.7 ms — `p50 16.70 · p95 33.40 · max 133.30`, i.e. "perfect" or
"one slipped frame", and §9.4's 20 ms gate cannot tell those apart.
`--disable-gpu-vsync --disable-frame-rate-limit` is now in the script.

### 5.1 The verification pass, and what the first table got wrong

**The numbers below replace an earlier table in this document, and the reason is
worth writing down.** That table reported `?dpr=0.75` as a clean **PASS** (p50
11.9 / p95 13.8 / **max 46.3**) from a single five-second run. Re-run, that
configuration fails the `max ≤ 50 ms` half about as often as it passes it — 58.6,
73.7, 114.7, 66.5, 63.3 ms across five runs — and a gate you have to run five
times to see fail is a gate that was reported from one lucky sample.

Two mechanical faults behind it, both now fixed:

- **The draw-call line came from a different build than the frame times.**
  `window.__mtgArena` was `import.meta.env.DEV`-only, so against the production
  build this script measures, `gl.info` was simply unavailable and the script
  printed nothing — the "35 draw calls / 70 triangles" figure beside those
  timings had been read from a **dev** build. `?glinfo=1` now exposes
  `window.__mtgArena.info()` — six counters, nothing else, no scene and no
  camera — from a production build, and the bench appends it unless you pass
  `--no-glinfo`. **The production numbers are 40 draw calls and 80 triangles**,
  one geometry, 49–59 textures: still 3× inside the tightest of §9.1's budgets.
- **`max` was measuring the first upload of a texture, not the renderer.** The
  scrub jumps to a frame whose cards have never been drawn, and each Scryfall
  face is uploaded to the GPU on its **first** render — tens of milliseconds each
  under a CPU rasteriser. Instrumented (`gl.info.memory.textures` sampled beside
  every frame delta): in a 958-frame run, **every** frame over 40 ms was in the
  first twelve, and three of the four coincided with the texture count going up.
  The bench now prints where its outliers are and how many carried an upload, and
  `--settle <ms>` lets the table be measured warm as well as cold.

### 5.2 The runs

Headless Chromium + SwiftShader, production build over `vite preview` on 5180,
`g1.jsonl` scrubbed to 55% and played at 4×, **12-second samples**.

**Warm** (`--settle 4000`: the scrubbed-to frame's textures are already
uploaded). This is the steady-state render cost, which is what §9.4's p95 is
about:

| | p50 | p95 | max | frames > 50 ms | fps (p50) | §9.4 gate |
|---|---:|---:|---:|---:|---:|---|
| 1920×993, `?dpr=1` | 19.60 ms | 22.10 ms | 36.30 ms | 0 of 606 | 51 | **FAIL** (p95 by 2.1 ms) |
| 1920×993, **`?dpr=0.75`** | 12.10 ms | 13.60 ms | 46.40 ms | 0 of 971 | 83 | **PASS** |
| 1920×993, `?dpr=0.75` (2) | 12.10 ms | 13.60 ms | 33.40 ms | 0 of 975 | 83 | **PASS** |
| 1920×993, `?dpr=0.75` (3) | 12.20 ms | 13.80 ms | 32.50 ms | 0 of 969 | 82 | **PASS** |
| 1280×633, `?dpr=1` | 8.20 ms | 9.70 ms | 26.90 ms | 0 of 1434 | 122 | **PASS** |

**Cold** (the script's default 600 ms settle — a table whose cards have just
appeared, which is a real moment and not an artefact):

| | p50 | p95 | max | frames > 50 ms | §9.4 gate |
|---|---:|---:|---:|---:|---|
| 1920×993, dpr 1 | 19.10 ms | 22.20 ms | 137.80 ms | 2 of 647, last at frame **2** | **FAIL** |
| 1920×993, `?dpr=0.75` | 12.20 ms | 13.70 ms | 66.50 ms | 2 of 961, last at frame **13** | FAIL (max only) |
| 1920×993, `?dpr=0.75` (2) | 12.20 ms | 13.80 ms | 63.30 ms | 1 of 953, last at frame **46** | FAIL (max only) |

**The honest verdict, in three sentences.** At 1920 with no pin the gate fails on
p95, by about 2 ms, in every run — that is roughly one frame in a hundred over a
60 Hz refresh, steadily, and it is the resolution that costs it. At `?dpr=0.75`
or at 1280 the steady state passes both halves comfortably and repeatably. The
only thing that breaches `max` is the **first** draw of a card's texture, which
happens in the half-second after a scrub and then stops — a hitch when a card
first appears, not a frame rate.

### 5.3 Why it is the resolution

Same scene every time: **40 draw calls, 80 triangles, 1 geometry** (§9.1's budget
is ≤120 calls, ≤2,000 triangles, ≤12 geometries). 2.4× fewer pixels is 2.4×
faster at identical geometry — 1920 dpr 1 → 1280 dpr 1 takes p50 from 19.6 to
8.2 ms with the same 40 calls. The arena is fill-rate bound, which is what an
unlit, quad-only, blended scene is, and what a CPU rasteriser is worst at.

On real hardware the frame **body** — `beginFrame` + `queue.tick` + the offset
write + `pool.bind` + the camera + `gl.render` — measured **p50 0.1 ms, p95
0.2 ms, max 0.5 ms over 200 frames** at 1400×774 during the live game above,
against §9.1's 2 ms CPU budget.

**And it now really does allocate nothing** (§9.2 rule 6). The verification pass
found three allocations in the hot `useFrame`, contrary to `CueRunner.tsx`'s own
header: the `(ref) => stage.positionOf(ref)` closure handed to `pool.bind`,
`EffectPool.bind`'s `new Set<Slot>()` plus `[...effects.keys()].sort()`, and
`SceneStage.setOffset`'s `offsetFrom` + `composeOffsets` pair — a few hundred
short-lived objects a second with a busy batch. They are now a bound arrow
property, a generation counter stamped on each slot with one reused key array,
and one pooled `Offset` per card id composed in place by `composeInto`, which
`web/test/cues-exhaustive.test.ts` checks field-for-field against
`composeOffsets ∘ offsetFrom` rather than taking the claim on trust. It did
**not** turn out to be the cause of the outliers — those are texture uploads, as
measured above — but the header now describes the code.

**Honest reading.** SwiftShader is a software rasteriser; report 09 calls it "a
fair proxy for weak integrated graphics", and for *draw-call and CPU* work it is.
For *fill rate* it is one to two orders of magnitude below any real iGPU, so
19.6 ms at 1920×993 there is not 19.6 ms on the target. What it does prove is the
shape of the curve, and the control that answers it is the resolution:

- `?dpr=0.75` pins it, and is the measurement above that passes warm, three runs
  out of three.
- drei's `<PerformanceMonitor>` (bounds `[55, 60]`, a 0.25-step ladder down to
  0.6) and `<AdaptiveDpr>` are wired as §9.2 rule 9's automatic version. It
  **did** move in one of these runs — the 1920 dpr-1 cold run ended reporting a
  render dpr of 0.75 it had not started at — but it did not move in the others at
  the same 51 fps, so treat the automatic half as **unreliable rather than
  merely unproven**; the manual half is measured and works.
- The real measurement §9.4 also asks for — the iGPU itself, `DRI_PRIME=1` — is
  not possible here: there is no display, and headless Chromium has no path to
  that device.

Three §9.2 rules were checked rather than assumed: `dpr` never exceeds the
device's own ratio (a plain `1.5` on a dpr-1 display renders 2.25× the pixels the
screen can show, and cost p50 19.4 → 21.6 ms and p95 29.3 → 58.6 ms before it was
capped); the frameloop is `demand` while the queue is idle *and nothing bobs*;
and one shared `PlaneGeometry` serves every card (`geometries: 1`, measured in
the production build).

## 6. E6 — the tests

`npm --prefix web test` is **518 `node --test` + 75 vitest**. The new ones:

- **`camera.test.ts` (16)** — the orbit round trip, §3.5's clamps in both
  directions, the rest pose inside its own box, the projection, rule 6 at three
  aspect ratios, the solver (frames what it is asked *and* the seat, or returns
  `null`), the envelope's ends, shake bounded and over on time, and the director:
  priority preempt/drop, rule 5's drop-and-retire, reduced motion, the user
  window, the per-mode dwell cap, a shake-only request, release and reset.
- **`liveness.test.ts` (6)** — §10.5. The source half: no file under
  `web/src/arena/` imports a transport, `reduce.ts` is imported **as a type
  only**, `DecisionLayer` imports nothing from `cues/` or `scene/` and branches
  on no engine string, `cues/` imports no three and no React and **starts no
  timer**, and `camera.ts`/`layout.ts`/`colour.ts` import no renderer. The
  behavioural half: §4.2's stall case (`ok.enabled === false` with a non-empty
  `selectable`) is `awaitingHuman === true`, and neither the engine's selectable
  list nor `layout(state)` moves while a cue is in flight.
- **`replay-cues.test.ts` (+3)** — the per-card census above; the two new
  suppression rules over every cast-and-entered batch in the corpus; and
  `presence` changing the resting pose and surviving `flushAndSnap()`.
- **`cues-exhaustive.test.ts` (+3)** — unknown-field negative controls (a
  misspelled `ms`, a param at entry level, `presence.hoverZ`, an out-of-range
  hover) and the `_`-comment convention; the S.H.I.E.L.D. table present and
  keyed off real event kinds; the counter-token normalisation.

`tools/check-all.sh`'s web step already runs all of them — `npm test` is
`node --test test/*.test.ts` and the arena's suites are in that glob, which is
what report 09 §2.4's `[NO three]` annotations bought. The step's message now
says so. `tools/arena-bench.mjs` is deliberately **not** in the gate: it wants a
built `dist`, a preview server and a headless Chromium.

## 7. Accessibility, and the two escape hatches

- **`K` skips every animation on screen.** It is `apply(t = 1)` then `end()`, so
  the board lands on exactly `layout(state)` — the board the engine described.
  Nothing can be missed by pressing it.
- **`prefers-reduced-motion: reduce`** collapses every cue to a snap (§5.3's
  harder reading, chosen in E3) and, as of E5, **drops every camera move and
  every shake** — a renderer whose vocabulary is motion should honour "no motion"
  as no motion.
- **The `?` / `H` overlay lists the arena's keys** because they are rows in the
  one keymap: 20 rows now, `V` and `K` among them, rendered from the same table
  the handler reads.
- **`?arena=off`** renders the 2D board even at `#arena`, and says why in the
  bar. WebGL is the one thing here that can fail for a reason the user cannot
  see.
- **`?dpr=`** pins the render resolution (§5 above).

## 8. Three more defects, found by looking

1. **The whole Tier-1 primitive kit was invisible in dev.** `<StrictMode>`
   mounts, cleans up and re-mounts every effect, so `useEffect(() => () =>
   pool.dispose(), [pool])` disposed the `EffectPool` the re-mounted tree then
   used: `pool.group.children.length === 0` while `stage.effects` held a live
   ring. **Not one glow, ring, beam, plate or damage number had ever been drawn**
   — and nothing looked broken, because card motion is offsets and offsets do not
   go through the pool. `bind()` now rebuilds a disposed pool, and the Quake
   screenshot in §3 is what that looks like when it works.
2. **`window.__mtgArena.gl` was `undefined` on a fresh load** and present after a
   hot update. The handle is written by two effects in two *different
   reconcilers* — `Arena.tsx` in react-dom, `CueRunner` inside the `<Canvas>` —
   and the parent's cleanup deleted the whole object. Both now merge; neither
   deletes.
3. **`fx.flyIn` flew off the top of the screen.** From 4.6 units the Helicarrier
   projected to `ndc.y 1.43` at the rest pose — a card descending from somewhere
   nobody could see. Measured the frame edge for a card on the opponent's rank
   (`y 2.0 → 0.93`, `y 2.4 → 1.00`, `y 4.3 → 1.43`) and set the height to 2.2, so
   it enters *through* the top edge.

## 9. Problems, and what is still owed

- **§9.4's gate does not pass at 1920 under SwiftShader without turning the
  resolution down** (§5). Warm, it fails on p95 by about 2 ms at dpr 1 and passes
  both halves at `?dpr=0.75` (three runs out of three) and at 1280; cold, the
  `max ≤ 50 ms` half is breached by the first upload of a card's texture, once or
  twice in the half second after a scrub and never afterwards. The automatic
  ladder that should reach for the resolution on its own moved in one run out of
  six at the same frame rate, so it is **unreliable**, not merely unproven. The
  measurement report 09 also asks for, on the actual iGPU, is not reachable from
  this sandbox.
- **The Browser pane never animates.** `requestAnimationFrame` fired **0** times
  in 700 ms with `document.hidden === false`, so R3F's loop never advances and
  the canvas paints only when something forces it. Everything in §3 was
  photographed by driving `@react-three/fiber`'s own `advance()` by hand, and the
  offsets read back before that was understood were **inflated**: without
  `beginFrame`, a manual advance loop *accumulates* offsets, and an early draft
  of this document claimed a composed `dz` of −18.4 on that basis. It is −2.33.
  The lesson generalises: in this pane, read state through a real frame or not at
  all.
- **The arena's `<Canvas>` does not mount while the pane is hidden.** R3F waits
  for a non-zero measured size; a hidden pane reports 300×150 and `_roots` stays
  empty. Front the tab before driving it.
- **`?cue=<id>`, E5's dev loop route, is not built.** §10.7 asks for a route that
  loops one cue on a dummy card against a neutral table. What exists instead is
  the dev handle — pause the queue, `advance(ms)` by hand, drive
  `@react-three/fiber`'s `advance()` for a frame, look — which is what every
  screenshot in §3 was taken with and is strictly more general (it works on a
  real frame of a real recording). A `?cue=` route would still be nicer for
  tuning one cue in isolation, and it is a `queue.enqueueBatch` away.
- **`tools/arena-bench.mjs` is a new file in `tools/`**, which the evening's file
  list did not name. §9.4's measurement had to live somewhere; it adds no
  dependency, touches nothing existing, and is not in `check-all.sh`.
- ~~**`web/test/hooks-order.test.ts` still scans only `Board.tsx`.**~~ **Fixed in
  the verification pass** (§V.6 below): it walks every `.tsx` under
  `web/src/render/` and `web/src/arena/` — 27 files, 65 components — finds each
  component's own early returns by tracking braces through blanked strings and
  comments, and flags any `use*(` below one. Negative-controlled at both ends,
  `Board`'s deep guard and `ArtCredit`'s conditional exit.
- **`drawnEntities()` in `web/src/render/picker.ts` was not extended, and that is
  now a decision rather than an omission** (**D33**). The arena answers **every**
  ask in the modal; a shared `drawnEntities` would be wrong for one of the two
  renderers, and wrong in the direction hard rule 8 cares about. The file says so
  at the top, including what it would take to change.
- **`var/games/human-ws-42/frames.jsonl` is corrupt** — it begins with NUL bytes
  — because I started `play.sh` twice at the same seed and the second JVM opened
  and truncated the first's log before dying on the port bind. A pre-existing
  property of the per-`gameId` log path, triggered by my own mistake; no redaction
  check was run on that file and none is claimed.
- **`./tools/check-all.sh` was not run.** It writes under `var/`, starts seven ws
  servers and takes ~11 minutes; its web half (`npm run build && npm test`) is
  green, and the bridge half is untouched by this evening.
- **The `three`/fiber deprecation warning is unchanged**: `THREE.Clock: This
  module has been deprecated`, once per `<Canvas>` mount. The §1.2 trip-wire has
  still not fired.
- **Nothing is committed**, per CLAUDE.md: everything is in the working tree of
  the `m7` worktree.

---

# M7 evidence — the verification pass

*Written 2026-09-13, against the findings of an independent verification of the
arena. Eight defects: one blocker, four major, three minor. Every fix is below
with what proved it, and every one of them has a test that goes red without it.*

## V.0 What changed

| # | what was wrong | the fix | the guard |
|---|---|---|---|
| blocker | **M5's twelve ask modals were completely unclickable in the arena.** `.arena__layer` is `pointer-events: none` and only `.arena__credit` / `.arena__decision` / `.arena__cues` set it back to `auto` — `.ask-modal` never did, so the `<canvas>` won the hit test at every button's own centre. A player could only ever take the engine's default. | one CSS rule, covering `.ask-modal`, `.ask-modal__scrim` and `.overlay` (the `?`/`H` screen had the same defect) | `liveness.test.ts`: the table of widget classes must **cover** every component `Arena.tsx` mounts inside `.arena__layer`, and each class must have a `pointer-events: auto` rule in `styles.css` |
| major | **Every card the opponent controlled was unclickable.** `HitProxy`'s invisible material took three's default `FrontSide`, `Mesh.raycast` back-face-culls exactly as the renderer does, and `layout()` turns the opponent's plane normals away from the camera. | `side={THREE.DoubleSide}` on the proxy material | `liveness.test.ts` asserts the flag on the proxy's `<meshBasicMaterial>` — it is invisible to every screenshot and to a spot-check that only clicks your own cards |
| major | **A cross-seat attachment was drawn on the wrong side of the table.** `layoutPlayer` resolved a host against the placements made *so far*, so an Aura controlled by the seat laid out first and attached to the other seat's creature never resolved. | `layout()` is two passes: every seat's ranks, piles and hands, then one attachment pass over all of them | `layout.test.ts`: the cross-seat case in **both** directions, plus a corpus assertion that no attachment is drawn further than a card width from its host |
| major | **`V` did nothing on the board.** The only `toggleView` handler was `Arena.tsx`; on the board it fell through the `view` switch's `default: return` *after* `preventDefault()`. `K` was swallowed the same way. | `Board` takes `onSetView`, handles `toggleView`, and answers `skipCues` with an explicit flash | `keys.test.ts`: every `KeyActionId` is dispatched by at least one renderer, and M7's two rows by **both** |
| major | **The arena said nothing when the game ended.** No winner, no reason, no New Game row — M6's headline flow was reachable only by pressing `V`. | `GameOverBanner` and `NewGameRow` extracted to `render/GameOver.tsx` and mounted by both renderers | the extraction itself: one component, two mounts — plus the pointer-events table above, which now carries `.arena__over` |
| major | **§9.4's performance gate was reported from one lucky run**, and its draw-call figures came from a *dev* build while the frame times came from the production one. | `?glinfo=1` exposes six `gl.info` counters from a production build; the bench gained `--settle` and an outlier diagnostic; §5 re-measured and rewritten | the numbers, and the method beside them |
| minor | **The hot `useFrame` allocated three objects a frame**, contrary to §9.2 rule 6 and to `CueRunner.tsx`'s own header. | a bound `stage.positionOf`, a generation counter in `EffectPool.bind`, one pooled `Offset` per card composed in place | `cues-exhaustive.test.ts` checks `composeInto` against `composeOffsets ∘ offsetFrom` over every field, in both the one-writer and two-writer cases |
| minor | **`hooks-order.test.ts` read one file.** The arena's eleven components were covered by hand-checking — the exact failure mode that test exists to replace. | it walks every `.tsx` under `render/` and `arena/`, tracks braces through blanked strings and comments, and flags any `use*(` below a component's first own-level `return` | itself: 27 files, 65 components, negative-controlled at both ends |
| minor | **`ViewToggle`'s doc comment said `V` was "deliberately not a keyboard shortcut yet"** and cited an 18-row keymap. | rewritten to name the row and both handlers | — |

## V.1 The blocker, proved in a live game

Bridge on **8661** (`--transport ws --seed 42 --games 1 --keep-open`), vite dev on
**5180**, the arena at `/?ws=1&port=8661#arena`. Every click below is a **real
mouse click** delivered to the page, not `element.click()` — the distinction is
the whole finding, because a programmatic click worked before the fix and a real
one did not.

- `.arena__layer` computed `pointer-events: none`; `.ask-modal` and
  `.ask-modal__scrim` now compute **`auto`**, and `document.elementsFromPoint` at
  the Answer button's own centre returns `["BUTTON.btn", "DIV.ask-modal__actions",
  "SECTION.ask-modal"]` — the canvas no longer wins.
- Played into the `choose_list` the seed-42 deck raises on turn 1 ("Choose
  optional costs", the Teamwork option) with real clicks on **card planes**:
  `clickCard 38` (an Island), `clickCard 38` again (tap it), `clickCard 5`
  (Quantum Reduction) — `out` 2 → 5.
- **A real click on the modal's own option toggled it**: `☐ [0] Teamwork…` →
  `☑`, the counter went `0 of 0–1` → `1 of 0–1`, and `out` did **not** move (the
  draft is local, which is M5's marshalling unchanged). Clicked again to clear it.
- **A real click on `Answer` sent it**: `out` 5 → 6, the modal cleared, and
  `var/games/human-ws-42/frames.jsonl` carries
  `{"dir":"c2s","type":"answer","body":{"askId":"a1","value":[]}}` at seq 7.
- The `?`/`H` overlay, which had the same defect: `H`, then a **real click on its
  Close button**, and the overlay closed. It lists **20 rows**.

## V.2 The hit proxies, measured the way the finding measured them

`/?replay=games/g1.jsonl#arena` at frame 250, raycasting **every** hit proxy from
the camera at its own projected centre:

```
proxies 30 · hit 30 · miss 0 · material.side all 2 (DoubleSide)
opponent's cards among the hits: c:44 c:62 c:65 c:67 c:69 c:91 …
  at rotation.x +1.571 (lands, and creatures) and +1.921 (sick creatures)
```

Those `rotation.x` values are exactly the ones the finding measured as **misses**.
Negative-controlled in the live page, on the same object in the same second:

```
card 44 · side=DoubleSide → hit: true
card 44 · side=FrontSide  → hit: false
card 44 · side=DoubleSide → hit: true   (restored)
```

## V.3 The cross-seat attachment, at the frame the finding named

`g1.jsonl` frame 250, read out of the live rig map:

| | before (reported) | now (measured) |
|---|---|---|
| Quantum Reduction `c:5` (controller **0**) | `[0.20, 0.02, 2.44]` — on my own Wasp | **`[-1.79, 0.022, -2.16]`** |
| Peggy Carter `c:44` (controller **1**) | `[-1.99, 0.02, -2.30]` | `[-1.99, 0.02, -2.30]` |
| distance | **4.3 units**, the wrong side of the table | **0.244 units** |

Over the whole committed corpus (`layout.test.ts`): **2,030 attachment placements
checked, 857 of them cross-seat, worst host distance 0.331** against a `CARD_W`
bound. Negative-controlled by restricting the host lookup to the attachment's own
controller — both new tests go red, `games/disjoint.jsonl` reporting `c:5 drawn
4.78 units from its host c:53 (controller 0, host's controller 1)` — and green
again on restore.

## V.4 `V`, `K`, and the end of the game

- **Board → arena with a real `V`**: `#arena` appears, the canvas mounts, and the
  replay stays on **frame 200**. Arena → board with a real `V`: back to the board,
  still frame 200. Round-tripped both ways.
- **`K` on the board** now flashes *"K skips the arena's animations — there are
  none on the board; press V"* instead of being eaten.
- **`S` in the arena** (a board panel with no 3D surface) now says *"S opens a
  board panel — press V"*. It used to be dropped silently, which is the same
  defect `V` had; the arena's own header claimed otherwise and now matches.
- **Conceded from the arena** with two real clicks: `over{winner:1,
  reason:"AllOpponentsLost", matchOver:true}` came back and the arena drew
  **"Game over. Winner: Forge AI. AllOpponentsLost"** with the New Game row under
  it — *New game* disabled (`matchOver`, a `--games 1` session), *Restart match*
  live and primary.
- **A real click on Restart match**: `out` 7 → 8, a new `hello_ok`, the bar reads
  **"Game 2"**, the panel cleared and the new game's coin toss ("Play" / "Draw")
  came up. M6's headline flow is reachable from the arena.

## V.5 Performance — see §5 above

Re-measured against a production build over `vite preview` on 5180, 12-second
samples, warm and cold. Warm at `?dpr=0.75` passes both halves of §9.4's gate
three runs out of three; warm at dpr 1 fails p95 by ~2 ms; cold, the only frames
over 50 ms are the first one or two after a scrub and they carry a new texture.
**40 draw calls, 80 triangles, 1 geometry** in the production build, now readable
because `?glinfo=1` exists. The full tables and the method are in §5.

## V.6 The tests

`npm --prefix web test` is **525 `node --test` + 75 vitest** (518 + 75 before).
Seven new, and every one is negative-controlled:

- **`liveness.test.ts` +2** — the pointer-events coverage table (fails on an
  unknown component in the layer, and on a missing rule), and the hit proxy's
  `DoubleSide`.
- **`layout.test.ts` +2** — the cross-seat attachment in both directions, and the
  corpus bound on every attachment's distance from its host.
- **`keys.test.ts` +1** — every `KeyActionId` dispatched somewhere, M7's two rows
  in both renderers. It prints the census (`toggleView  case 'toggleView':
  ../src/render/Board.tsx ../src/arena/Arena.tsx`).
- **`cues-exhaustive.test.ts` +1** — `composeInto` against `composeOffsets ∘
  offsetFrom`, 13 partials × 13 partials plus the from-identity case.
- **`hooks-order.test.ts` +1** — the narrow `board === null` assertion kept
  beside the general scan, so the file still names the defect that wrote it.

`npm run build`: tsc clean, entry chunk **85.59 kB gzip** (85.42 before — the
arena is still a separate lazily-imported 273.50 kB gz chunk), CSS 14.70 kB gz.

## V.7 What is still owed

- **The automatic dpr ladder is unreliable, not merely unproven.** It moved in
  one of six benchmark runs at the same frame rate. The manual `?dpr=` is
  measured and works; the automatic half needs either different bounds or a
  different signal, and §5 now says so. **Closed by the second verification pass
  — it needed a different signal, and §W.3 below has the one it got.**
- **The `max ≤ 50 ms` half of §9.4 is not a steady-state number on a cold
  table.** The first upload of a card's Scryfall texture costs tens of
  milliseconds under a CPU rasteriser. Pre-warming the textures of the cards a
  scrub is about to reveal would remove the hitch; nothing does that today.
- **The arena still answers every `ask` in the modal** (D33) — unchanged, and
  still a decision rather than an omission.
- **`./tools/check-all.sh` was run for this pass**; its result is in the summary
  of this milestone's hand-off, not here.

---

# M7 evidence — the second verification pass

*Written 2026-09-13, against a second independent verification of the arena: six
findings, three major and three minor. Every fix is below with the measurement
that proved it and the test that goes red without it. Nothing is committed.*

## W.0 What changed

| # | what was wrong | the fix | the guard |
|---|---|---|---|
| major | **Every opponent-controlled battlefield and pile card was drawn as a MIRROR IMAGE.** `anchorsFor('opp')` mirrored an anchor with `pitch: -a.pitch`, so `FLAT` (−π/2) became **+π/2** — which does not spin the card in the table plane, it flips the quad's normal. The card's top edge projected to the bottom of the screen while its left edge stayed on the left. 12 of the 30 placements at `g1.jsonl` frame 250 had a downward normal. | `pitch` is never mirrored; the opponent gets `seatSpin(seat) = π`, an **in-plane** half-turn that `place()` adds to `options.spin`. `layoutAttachments` takes the same spin **from its host's seat**, and its offset turns with it. | `layout.test.ts`: `−sin(rotation.x) ≥ 0` for **every placement of every frame of every committed recording**, plus a two-seat unit test and a tap-direction test. Negative control: restore the `-a.pitch` and three tests go red. |
| major | **The arena never showed a life total.** No persistent player HUD of any kind: the layer held the prompt, the two engine buttons, Concede, the cue strip and the art credit. `life.tick` / `damage.player` put a number on screen for 400 ms and a cue decays to identity by construction (§5.1), so the number was gone again. | A per-seat DOM plate in the layer (§12.1's "HUD overlays — plain DOM above the canvas — free"): name, life, poison when non-zero, hand/library/graveyard/exile/command counts and the mana pool, built from the **board's own** `<ZoneCount>`, `<ManaPoolPips>` and `counterLabel`. | `arena-hud.test.tsx` renders `<DecisionLayer>` over every frame of `g1.jsonl` and asserts both seats' life in the markup; `liveness.test.ts`'s widget-class table gains `.arena__seat`, so it cannot ship inert. |
| major | **§9.4's performance gate failed at default settings and the ladder that should have prevented it never fired.** drei's `<PerformanceMonitor>` decides on a smoothed fps average over ten ≥250 ms windows — 2.5 s of *rendering* per decision — and the gate is a p95. | `<PerformanceMonitor>` replaced by `<DprGovernor>` (`arena/perf.ts` + one `useFrame`): a 48-frame rolling window of frame intervals, stepping when **more than half of them are late**, moving by **index over a rung list**. | `perf.test.ts` (six tests, no GPU): the rungs, the clamps, the down-then-up round trip, the off-ladder snap, the rate trigger against both measured distributions. And the bench: `node tools/arena-bench.mjs` with **no** `--dpr` now prints `OK`. |
| minor | **`docs/protocol.md` §3.6 said the `counters` event's `counter` field was "the `CounterType` name, e.g. `P1P1`"** — and every one of the 1,316 counter values in the corpus is Forge's *display* name. §3.1 and §3.2 said the same about the `counters` map. | §3.1, §3.2 and §3.6 corrected; amendment **M43**; **decision D46** records that the bridge is *not* changing and why; `protocol.ts` and `Snap.java` comments follow. | the corpus itself: `grep` over `fixtures/` finds `+1/+1` and `Spore` and **no `P1P1` at all**. |
| minor | **`layout.ts` had its own `isLand()`** (`/\bland\b/i`) beside `render/labels.ts`'s `isLandTypeLine` — two definitions of "is this card a land" for the same card in the same app. | `layout.ts` imports `isLandTypeLine` and the local regex is gone. | the existing `layout.test.ts` rank tests plus the whole corpus sweep, which now runs through the shared predicate. |
| minor | **`prefers-reduced-motion: reduce` collapsed every cue to nothing** rather than to 30% of its duration, which is what report 09 §8 rule 7 — cited by the code — actually asks for. | `REDUCED_MOTION_SCALE = 0.3` in `queue.ts`; shake and camera moves stay hard off, which is the other half of the same rule. | `replay-cues.test.ts`: the compression factor **and** the queue's own remaining time, asserted at 0.3× and asserted non-zero. |
| minor | **§10.7's `?cue=<id>` loop route and §7.1's `?cues=<url>` override are not built**, and the replacement — `window.__mtgArena` — was undiscoverable. | `?cues=` is now a **documented refusal**: it is a `fetch`, and §2.1 rule 1 says the arena never calls one. README's arena section documents the dev handle with a runnable recipe, and `Arena.tsx`'s comment says why the query parameter is not there. | — (documentation) |

## W.1 The mirror, measured through the live camera

`g1.jsonl` frame 250, dev server on 5180, the arena's own camera at its rest
pose, each card's four local corners pushed through `mesh.matrixWorld` and
`camera` and read in NDC:

| card | seat | TL | TR | BL | BR |
|---|---|---|---|---|---|
| `c:16` Plains | you | (−0.263, **−0.422**) | (−0.166, −0.422) | (−0.279, **−0.662**) | (−0.177, −0.662) |
| `c:44` Peggy Carter | opp | (−0.172, **0.412**) | (**−0.248**, 0.412) | (−0.165, **0.545**) | (−0.237, 0.545) |
| `c:80` Super Suit | opp | (−0.203, 0.432) | (−0.278, 0.432) | (−0.194, 0.563) | (−0.266, 0.563) |

Read the two flips. My Plains has top above bottom (−0.422 > −0.662) and left
left of right: upright. Peggy Carter has **top below bottom** (0.412 < 0.545)
*and* **left right of right** (−0.172 > −0.248) — both axes reversed, which is
what a 180° rotation does and what a reflection does not. The verification pass
measured this same card before the fix at TL(−0.252, 0.412) TR(−0.175, 0.412)
BL(−0.241, 0.545): top below bottom, **left still left** — one axis, i.e. a
mirror.

Both opponent cards now carry `rotation = [−1.5708, 0, 3.1416]`: the same flat
pitch as mine, plus the half-turn. And `c:80` is the attachment whose host is
`c:44` — before the fix `layoutAttachments` hardcoded `FLAT` with no spin, so the
equipment read normally while the card it was bolted to read backwards.

Enumerated over the whole frame: **30 placements, 12 of which would have had a
downward plane normal under the old anchors, 0 of which do now.** Photographed
from the opponent's own reading direction (camera 2 units above their rank, up =
`+Z`): "Super Suit", "Artifact — Equipment", the rules text, "MSC · EN ·
Smitherling" and the collector number all read **forward and upright**, as does
the Quantum Reduction beside it.

Corpus, through the new assertion in `layout.test.ts`: **3,679 state frames,
84,418 placements, every one with `−sin(rotation.x) ≥ 0`.** Negative control:
put `pitch: -a.pitch` back and `layout.test.ts` goes from 17 pass / 0 fail to
14 / 3.

## W.2 The life totals

`.arena__layer`'s full `innerText`, dev server, `g1.jsonl` frame 250 — the same
dump the finding made, which previously contained no number about either seat:

```
AI-Seat1 AI · priority ♥ 20 life ✋0 hand ▤27 library ⚰0 graveyard  0 0 0 0 0 0 mana pool empty
AI-Seat0 AI · you · active ♥ 14 life ✋4 hand ▤24 library ⚰2 graveyard ◇1 exile  0 0 0 0 0 0 mana pool empty
the engine has not asked for anything yet  Concede CTRL+Q
⏸ cues step batch skip cue skip all speed … idle
Card images and data from Scryfall · art by …
```

- Two plates, at the two seat edges of the frame (`[1108, 94, 162, 84]` and
  `[1098, 628, 172, 84]` at 1280 × 720). The engine's own `activePlayer` and
  `priority` are the only things the tags say.
- `getComputedStyle('.arena__seats').pointerEvents === "none"` and
  `'.arena__seat'` **`auto`**; `document.elementFromPoint` at a plate's centre
  returns `DIV.arena__seat arena__seat--opp`, not the canvas.
- Pressing **V** at frame 330 shows the 2D rails carrying **the same numbers**
  (♥ 16 / ♥ 4, ▤24 ✋1 ⚰0 / ▤22 ✋3 ⚰1) — they are the same components, so they
  cannot drift.
- `arena-hud.test.tsx`: **748 life totals rendered across 374 `g1` frames**, and
  seat 0's life printed at every value it took (20 → 14 → 8 → 4 → 2) in the frame
  it changed and in every frame after it.

Poison is drawn only when it is non-zero — a permanent `☠ 0` on a plate this size
is noise, and §3.1 gives poison its own key precisely because it is not a
`counters` entry.

## W.3 The resolution ladder — why the old one could not work, and what the new one measures

Production build over `vite preview` on **5182**, headless Chromium with
`--use-gl=swiftshader --enable-unsafe-swiftshader --disable-gpu-vsync
--disable-frame-rate-limit`, `g1.jsonl` scrubbed to 55% and played at 4×.

**The old ladder, reproduced.** `node tools/arena-bench.mjs --settle 4000 --ms
6000`, no `--dpr`: `RENDER dpr 1 · p50 19.40 · p95 22.40 · max 37.30` →
`FAIL: p95 22.40 ms > 20 ms`. The resolution never moved. Given twenty seconds
instead of six it *did* eventually move to 0.75 — and still reported
`p95 22.40`, because "eventually" was most of the run. Two mechanical reasons,
both read out of `node_modules/@react-three/drei/core/PerformanceMonitor.js`:
it needs **ten ≥250 ms windows** before it will act at all (2.5 s of *rendering*,
and the arena renders on demand), and it acts on an fps **average** while the
gate is a p95.

**Why a percentile of the window is the wrong trigger too**, which the first
attempt at a fix found the hard way. A p95 over 16–48 samples is within a frame
or two of that window's *maximum*, and SwiftShader produces 30 ms outliers at
every resolution — so the governor read its own outliers as "still too slow" and
walked to the 0.6 floor. Measured, over 48-frame windows on the same replay:

| render dpr | frames late (> 17 ms) | worst window | p50 | p95 | gate |
|---|---:|---:|---:|---:|---|
| 1.00 | **292 of 293 — 99.7%** | 100% late | 20.30 | 23.10 | FAIL |
| 0.75 | **12 of 488 — 2.5%** | 18.8% late | 12.00 | 14.00 | OK |

Two regimes an order of magnitude apart, so the trigger is *"more than **half**
the window was late"*, which is in the middle of the gap and cannot be reached by
a cluster of outliers.

**The rungs, and the 0.85 that was not one.** Stepping by ±0.25 and clamping at
the 0.6 floor is not a ladder: 1.00 → 0.75 → 0.50 clamps to 0.60, and a step back
*up* from there lands on **0.85**, which is on no ladder and is a measurably
worse place to sit than the 0.75 under it (p95 16.80 at 0.85, 14.00 at 0.75). The
trace of a real run showed exactly that: `0.75 → 0.6 → 0.85`. Moving by index
over a precomputed rung list gives `0.75 → 0.6 → 0.75` instead, and
`perf.test.ts` keeps the naive arithmetic as its negative control.

**The runs, after.** `node tools/arena-bench.mjs` with **no `--dpr`**:

| settle | p50 | p95 | max | frames > 50 ms | final render dpr | §9.4 gate |
|---|---:|---:|---:|---:|---:|---|
| `--settle 4000 --ms 6000` | 8.60 ms | **13.80 ms** | 29.60 ms | 0 of 595 | 0.75 | **OK** |
| `--settle 4000 --ms 6000` (2) | 8.80 ms | **14.20 ms** | 29.80 ms | 0 of 586 | 0.75 | **OK** |
| default (`--settle 600`) | 8.50 ms | 13.90 ms | 80.70 ms | 2 of 500, last at frame **18** | 0.75 | p95 OK, max FAIL |
| default (2) | 8.60 ms | 15.50 ms | 63.60 ms | 2 of 494, last at frame **31** | 0.75 | p95 OK, max FAIL |

(Four runs of the build `check-all` produced. Two earlier runs of an
intermediate build gave 13.70 and 13.50; every run since the ladder was rewritten
has been between 13.5 and 15.5, and none has failed the p95.)

For comparison, pinned, on the same machine in the same session:
`?dpr=1` → p50 19.40–20.30, **p95 22.40–23.60**, FAIL; `?dpr=0.75` → p50
12.00–12.20, p95 14.00–14.20, OK.

**The honest caveats, restated.** SwiftShader is a software rasteriser and a hard
lower bound, not the machine this will run on; the dev box's real GPUs are
explicitly not the target (§9's own note) and no measurement on the user's iGPU
is possible in this sandbox. And the `max ≤ 50 ms` half still fails on a **cold**
table — 1–3 frames in the first ~40 — which is the first upload of a card's
Scryfall texture and which is unchanged by this work: pinned `?dpr=0.75` (no
governor, no resize at all) shows the same thing at max 64.70 ms, and pinned
`?dpr=1` at 82.30 ms. It is a hitch when a card first appears, not a frame rate,
and the bench's own outlier line says so. What has changed is that **the
documented default is now the configuration that passes the p95 gate**, rather
than one that needs a query parameter typed by hand.

**One thing left as it was, and named.** `<AdaptiveDpr />` is still mounted and
is **dormant**: it acts on `performance.current`, which only moves when something
calls `regress()`, and the only candidate is drei's `<OrbitControls regress>` —
a prop this file does not pass. It is harmless, the plan asks for it, and its
trap is now written next to it: it writes `current × viewport.initialDpr`, the
resolution the canvas *started* at, so turning `regress` on would make it undo a
governor decision on every mouse-up. Turn one on and the other off.

## W.4 Reduced motion, at 30%

Measured in the browser exactly as the finding measured it — four stepped frames
from `g1.jsonl` frame 250, the queue paused, the cue clock read directly:

| | steps queued | time queued |
|---|---:|---:|
| reduced motion **off** | 5 | 1,629 ms |
| reduced motion **on** | 5 | **489 ms** |

`489 / 1629 = 0.300`. Before the fix the second row was **0 steps / 0 ms**: the
cue was not shortened, it was deleted — and several cues are the only channel for
a *fact* (the damage number, the counter pip, the life delta), so deleting them
removed information rather than motion. Shake and camera moves remain hard off:
every shake in `registry.ts` is gated on `ctx.reducedMotion` and
`CameraDirector.request` drops every move, which `camera.test.ts` already
asserted and still does.

## W.5 The tests

| suite | before | after |
|---|---|---|
| `node --test` | 525 pass | **534 pass**, 0 fail, 0 skipped |
| `vitest` | 75 pass (4 files) | **79 pass (5 files)** |

New: `web/test/perf.test.ts` (6, the resolution ladder) and
`web/test/arena-hud.test.tsx` (4, the life totals over every `g1` frame).
Extended: `layout.test.ts` (+2 unit tests and the corpus normal assertion),
`replay-cues.test.ts` (the reduced-motion factor and the queue's own timing),
`liveness.test.ts` (`.arena__seat` in the widget-class table).

Negative controls run for this pass:

- restore `pitch: -a.pitch` in `anchorsFor` → `layout.test.ts` 14 pass / **3
  fail**, naming the two-seat test, the tap-direction test and the corpus sweep;
- the naive clamp arithmetic is asserted *inside* `perf.test.ts` to produce 0.85,
  so the rung ladder is compared against the thing it replaced rather than
  against nothing.

## W.6 Build and chunk sizes

`npm run build` (tsc --noEmit + vite build), zero TypeScript errors:

```
dist/assets/index-….js    275.07 kB │ gzip:  85.62 kB     ← the 2D entry chunk
dist/assets/Arena-….js    996.34 kB │ gzip: 274.26 kB     ← lazy, fetched on #arena
dist/assets/index-….css    71.99 kB │ gzip:  14.87 kB
```

Against the tree this pass started from (275.04 kB / **85.60 kB** gzip entry,
994.23 kB / **273.50 kB** gzip arena): the 2D entry chunk moved by **+0.02 kB
gzip** — that is the `ZoneCount` export in `PlayerRail.tsx` and nothing else, and
the arena is still the only thing that pays for the arena — and the lazy arena
chunk by **+0.76 kB gzip**, which is the HUD plate, `perf.ts` and the governor,
net of drei's `<PerformanceMonitor>` coming out. `dist/index.html` still carries
one module script, no `modulepreload` for the arena, and exactly one
`import("./Arena-….js")` in the entry.

## W.7 What is still owed

- **`max ≤ 50 ms` on a cold table** — see W.3. Pre-warming the textures of the
  cards a scrub is about to reveal would remove it; nothing does that today, and
  it is not caused by anything in this pass.
- **No `?cue=<id>` loop route** (§10.7). The dev handle is documented instead;
  `?cues=<url>` is refused on the no-`fetch` rule and that refusal is now written
  down rather than implied.
- **`COUNTER_LABELS` in `web/src/render/labels.ts` is keyed by the enum-constant
  spelling** (`P1P1`, `M1M1`), so on the **2D board** `counterLabel('+1/+1')`
  falls through to its default: correct text, generic class, no `mana-font`
  glyph. Found while fixing the protocol doc, recorded in **D46**, and
  deliberately not changed here — it is a board rendering change with its own
  evidence to gather, not an arena one.
- **The governor cannot climb back on a vsync-locked display.** A browser pinned
  to 60 Hz reports 16.7 ms whether the GPU had 2 ms of work or 16, so there is no
  headroom to read. It therefore sits where it is, which is the right answer for
  the common case (it never declined, so it is already at the ceiling) and is a
  stale low resolution only for a machine that was slow earlier in the same
  session. A reload starts at the ceiling again; `?dpr=` pins it outright.

---

# M7 status — Tier 1 closed out, and the documentation pass

*2026-09-13. **This pass changed no code.** It wrote M7 into the documents that
are supposed to describe the repo — `PLAN.md`, `README.md`, `DECISIONS.md`,
`CLAUDE.md`, `docs/ideas/arena-mode.md` — and then ran the gate once to prove the
tree it describes is the tree that works.*

## S.1 Where Tier 1 stands

**Built, and the two commands both work.** `npm --prefix web run dev:arena`
plays a recorded game as a cinematic with no JVM; `./scripts/play.sh --arena`
plays a live game against the Forge AI entirely from the 3D seat; `V` switches
renderer mid-game over the same socket. Six evenings E1–E6 of report 09 §11, then
two independent verification passes — **eight findings (one blocker, four major,
three minor), then six (three major, three minor); all fourteen closed**, each
with a mechanical guard that goes red without the fix.

**Nothing is committed.** Everything is in the working tree of the `m7` worktree,
per CLAUDE.md's *"the user commits"* rule.

| | as of this pass |
|---|---|
| 2D entry chunk | **275.07 kB / 85.62 kB gzip** — from 83.99 kB gzip before M7, so the whole milestone costs the 2D board **+1.63 kB gzip** and no `three` |
| arena chunk | **996.38 kB / 274.30 kB gzip**, lazy, fetched on the first `#arena`; no `modulepreload` in `dist/index.html` |
| `tsc --noEmit` | 0 errors |
| `node --test` | **534 pass / 0 fail / 0 skipped** standalone; **544 tests, 536 pass, 0 fail, 8 skipped** inside `check-all.sh` |
| `vitest` | **79 pass, 5 files** |
| cue coverage | all **25** `EVENT_KINDS` have a default cue (exhaustive *by type*); over the 18 committed recordings — 3,679 `state` frames, 3,293 non-empty batches, **19,208 events**, **1,156 per-card** (40 entries of `cues.json`'s 28 cards) + **1,007 archetype**; 16,083 targets resolved, 483 unresolvable **and correct**; 0 effects over the §9.3 cap; the offset map **empty** after every batch |
| draw calls | **40 / 80 triangles / 1 geometry** in a production build (§9.1 budget: ≤120 / ≤2,000 / ≤12) |
| frame times | default, no pin: **p50 8.6 ms · p95 13.8–15.5 ms**, the ladder settling on render dpr 0.75 — **passes §9.4's p95 ≤ 20 ms**. Pinned `?dpr=1`: p95 22.4–23.6 ms, **fails**. Cold table still breaches `max ≤ 50 ms` (first texture upload). **All of it SwiftShader, a lower bound** |

## S.2 What the documents now say, and where

| file | what was added |
|---|---|
| `PLAN.md` | the M7 row in the milestone table; a rewritten **§M7** — status, the two commands (and why M6's `npm run dev:arena -- <file>` line was never runnable), what the evidence shows (chunks, cue coverage, performance, tests); **"M6 follow-ups closed by M7 — none, and that is the expected answer"**; **"M7 follow-ups — twelve"**; **"What Tier 1 hands to Tier 2"**. A note under the M6 follow-ups saying none of them moved, and the deferred list retitled M0–M7 |
| `README.md` | an **Arena mode** section: the three ways in, `V` and `K`, the full key story, the cue-control strip, reduced motion at 30%, and **the replay corpus as spectator mode** (eighteen games, no JVM); the M7 commands in the run block; the arena tree and its eight test suites in the repo layout. One correction: the draw-call figure was **35/70 from a dev build**, and the production numbers are **40/80** |
| `DECISIONS.md` | **D47** the React-18 3D line (and why the app does not move to React 19); **D48** the exact version pins with no caret, and the named trip-wire; **D49** the arena as one lazily-imported chunk; **D50** `layout(state)` authoritative, cues as offsets that decay to identity; **D51** one validated cue data file keyed by card name, with the three-rung ladder and the *"a cue keys off an event about THAT card"* rule; **D52** the Scryfall `normal` texture and the one shared rounded-corner alpha map |
| `CLAUDE.md` | **"The conventions M7 added — the arena"**, six of them: it decides nothing (and how that is asserted); `CardPlane` is THE card renderer of the arena; `layout(state)` ⊕ a decaying offset; cues are data and the table is exhaustive by type; one `useFrame`, one geometry, no allocation in the hot path; the DOM layer is `pointer-events: none` so every widget must opt back in. Plus the arena commands, the updated test counts, and the decisions table at fifty-two |
| `docs/ideas/arena-mode.md` | a **STATUS** block (Tier 1 built, Tiers 2 and 3 not started) and a row-by-row table of **which of its 22 cue rows Tier 1 implements** — all of them, with three stated deviations (Quake's ring is on her own tap, Coulson's badge is on the card that *received* the counter, Strategic Intervention gets the generic pair) and two that wait on a rigged model |

## S.3 The gate, run once

```bash
WSPORT=8664 ./tools/check-all.sh        # var/check-all-m7-docs.log
```

**`check-all OK` — exit code 0, 726 s (12 m 06 s) wall clock.** Thirteen numbered
steps plus the five lettered ones, on ports **8664** only; the user's 8642/5173
were never touched. Inside it: `ten-games.sh` **268 s** (10/10), the `sideboard`
ask at 9d, seven fresh ws servers at 10a–10g, `check-redaction.mjs` over the
committed fixtures and every fresh recording, then `npm run build` (0 TS errors,
the chunk sizes above) and `npm test`.

That is the band M6 measured (682–712 s), so M7 added a renderer and eight test
suites — **+88 `node --test` tests and +4 vitest** against M6's standalone 446 +
75 — to the web step and **cost the gate nothing measurable** —
which is the other half of *"`tools/arena-bench.mjs` is deliberately not in the
gate"*: the arena's own suites are pure and fast, and only the GPU measurement
was left outside.

## S.4 What is still owed

Unchanged by this pass, and now listed in one place rather than four: **`PLAN.md`
§"M7 follow-ups — twelve"**. The three that are measurement limits rather than
defects are §W.3's cold-table `max`, SwiftShader as a lower bound with no path to
the real iGPU, and a dpr governor that cannot climb back on a vsync-locked
display. The rest are a missing `?cue=` dev route, a dormant `<AdaptiveDpr/>`,
two deliberate non-changes (`drawnEntities`, `COUNTER_LABELS`), the absence of a
canvas equivalent of `render.test.tsx`'s `data-card-name` sweep, the bench being
outside the gate, `three`'s deprecation warning, and one corrupt file under
`var/` that a duplicate `play.sh` at the same seed produced.
