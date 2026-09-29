# web/src/arena/CLAUDE.md — the arena's conventions

These load when you work under `web/src/arena/`, on top of the root `CLAUDE.md`
and `web/CLAUDE.md` (the board's conventions, whose M4 convention 2 this file's
`CardPlane` mirrors). They are in the order they were written: M7's Tier 1, Tier
2 and its three later slices, report 15's three art-direction lanes, the status
layer, the personal tier's loader, then villain identity and its second lane. The
workshop (`web/src/workshop/`) draws with this directory's code, and its own
conventions are `web/CLAUDE.md`'s *Workshop*.

## The conventions M7 added — the arena

Six, and the thesis under all of them is the same one sentence as the milestone:
**the arena is a RENDERER.** It is a second renderer over the same frame stream —
`web/src/arena/`, lazily imported, sharing `reduce.ts`, `protocol.ts`, the
transports, `art.ts`, `keys.ts` and M5's `<AskModal>` with the 2D board. Read
[`docs/research/09-arena-tier1-plan.md`](../../../docs/research/09-arena-tier1-plan.md) in
full before touching it; `docs/evidence/m7-arena.md` is what was measured.

1. **It decides nothing, and that is mechanical.** No file under
   `web/src/arena/` imports a transport; `reduce.ts` is imported **as a type
   only**; `DecisionLayer` imports nothing from `cues/` or `scene/` and branches
   on **no engine string**; `camera.ts`, `layout.ts`, `colour.ts` and everything
   in `cues/` import no renderer, no three, no React and start **no timer**.
   `web/test/liveness.test.ts` is a source scan that asserts every clause of
   that, and it is the file to extend when the arena grows a module. The two
   board rules (`web/CLAUDE.md`, after M4's conventions) hold here unchanged and
   for the same reasons: a click is never gated on `selectable` (`HitProxy` has
   no such prop to gate on) and `buttons.*.label` is rendered verbatim.
2. **`CardPlane` is THE card renderer of the arena**, exactly as `CardTile` is
   the board's (M4 convention 2), and for the identical reason: it is the
   renderer's half of hard rule 8. Every card in every zone goes through it —
   battlefield, hand, piles, the stack, attachments — and `layout.ts` sets
   `Placement.back` for a redacted stub **and** for any face-down card *before*
   `CardPlane` asks `art.json` for a face. `web/test/layout.test.ts` asserts
   `isHidden(card) ⇒ placement.back` over **84,418 placements in 3,679 frames**
   of the committed corpus. A second surface that draws its own quad is how a
   concealed name gets on screen, and a canvas has no `data-card-name` for
   `render.test.tsx` to catch it with. `CardBack.tsx` is deliberately a *texture
   hook*, not a second renderer.
3. **`layout(state)` is authoritative; a cue only ever adds an offset that decays
   to identity** (**D50**). `finalTransform = layout(state)[id] ⊕ offsets[id]`.
   `layout.ts` is pure — no three, no React, no time — and is the **only** thing
   in the arena that knows a coordinate; a cue that wants a card to *stay*
   somewhere adds a `presence` rule to the resting pose instead (the Helicarrier
   hovers that way, which is why it survives `skip all`). This is what makes
   skip, scrub-backwards, `resync` and a new `gameId` one call —
   `flushAndSnap()` — with no rewind path. `replay-cues.test.ts` asserts the
   offset map is **empty** after every one of the corpus's 3,293 batches. **Do
   not animate the scene graph directly**; that is the defect this prevents.
4. **Cues are DATA, and the table is exhaustive by type.**
   `cues/cues.json` (**D51**) is the whole per-card and archetype table;
   `cues/defaults.ts` is a `Record<EventKind, CueSpec>`, so a new event kind on
   the wire **will not compile** until it has a default. The ladder is per-card →
   archetype → default and a bad entry is dropped by `validate.ts`, never the
   file. The rule the file lives by: **a cue keys off an event that is about THAT
   card.** §3.6's `counters` event carries no *source*, so "Coulson gave this
   counter" is not on the wire; the engine never says which card caused another
   card's tap, so Quake's ring is centred on **her own**. Inventing either link
   is rules logic in a renderer.
5. **One `useFrame`, one geometry, and no allocation in the hot path.**
   `scene/CueRunner.tsx` is THE frame loop (begin frame → tick → write offsets →
   bind effects); `scene/geometry.ts` is one `PlaneGeometry` for every card in
   the game; `scene/effects.ts` is a **fixed pool of meshes** — 26 at Tier 1,
   38 with Tier 2's twelve mana-mote slots (**D60**), **45** since slice 3's
   per-card beats (**D79**). Three
   allocations hid in that loop behind a header claiming there were none — a
   `bind` closure, a `new Set()` plus a sorted key array, and a compose pair —
   and `web/test/cues-exhaustive.test.ts` now checks the pooled compose
   field-for-field against the naive one rather than taking the claim on trust.
   `frameloop` is `demand` while the queue is idle and nothing bobs, so an idle
   table costs nothing — and two things follow from that which each shipped
   broken (**D72**): **the cue clock does not run while the queue is idle** (the
   first frame after a parked loop is a batch's `t = 0`, never the idle gap played
   as film, and a late frame mid-cue adds at most `MAX_TICK_MS`), and **`<Canvas
   frameloop>` is `CueRunner`'s ref, never a literal** — fiber re-applies the prop
   on every render, so a literal `demand` froze a running batch on every hint.
   **And the ref's setter is React state** (the workshop's reconciliation,
   2026-09-27): `<Canvas>` also re-renders on its own — a resize — with the
   props of `Arena`'s last render, so a plain `useRef` froze a batch resized
   mid-play and kept an idle table drawing after one (measured, `g1`@100). Every
   write re-renders `Arena` once; `liveness.test.ts`'s frameloop clause holds all
   four parts.
6. **The DOM layer over the canvas is `pointer-events: none`, so every widget in
   it must opt back in.** `.arena__layer` lets the `<canvas>` keep every click
   the DOM does not want — and `pointer-events` inherits, so a widget with no
   `auto` rule of its own is **completely inert**. That shipped: the ask modals
   and the `?`/`H` overlay were dead at every button's own centre.
   `web/test/liveness.test.ts` parses the layer's JSX block, requires its table
   of widget classes to **cover every component mounted there**, and requires
   each class to carry a `pointer-events: auto` rule — so the next widget added
   to that layer cannot ship inert.

Two more things worth knowing before you change anything here. **The arena chunk
must stay lazy** (**D49**): `lazy(() => import('./arena/Arena.tsx'))` is the only
way in, nothing under `arena/` may be imported statically from the 2D path, and
`npm run build`'s own output is the check — the 2D entry chunk is 93.52 kB gzip
on this tree (90.40 before the status layer put its glyph kit and the tile's row
in it), and none of it is `three`. **Since the workshop the arena's scene
is a chunk two lazy pages share** — `three`, fiber, drei and `arena/scene/`,
named `arena-scene-*.js` by `vite.config.ts`'s `chunkFileNames` (371.93 kB gzip
on this tree) — with `Arena-*.js` and `Workshop-*.js` on top, and the one
stylesheet carries the workshop's rules. And
**`tools/arena-bench.mjs` is not in the gate**, on purpose: it wants a built
`dist`, a `vite preview` server and a headless Chromium. Every performance number
in `docs/evidence/m7-arena.md` is from **SwiftShader**, a software rasteriser and
an explicit lower bound (Tier 2 found a headless path to the real GPU — see its
conventions below), and a frame *rate* read from a Claude browser pane is not a
measurement at all (`requestAnimationFrame` fires 0 times there).

## The conventions M7 Tier 2 added — the manifestation stage

Six, and the thesis under all of them extends M7's: **the arena is still a
renderer, and a manifestation is a pose.** Tier 2 put things *on* the table — a
figure at every creature, auras on the figure, lands as terrain, mana motes, the
stack as spell forms, two duelists (silhouette busts until slice 4), bloom — and
every one of them is a pure function of the frame on screen except the transitions. Read
[`docs/research/13-arena-tier2-plan.md`](../../../docs/research/13-arena-tier2-plan.md)
in full before touching `web/src/arena/figures/` or the Tier 2 files under
`scene/`; [`docs/research/12-arena-tier2-assets.md`](../../../docs/research/12-arena-tier2-assets.md)
is the asset landscape and `docs/evidence/m7-tier2.md` is what was measured.
**D53–D63** are the decisions, the user's nine among them; slice 2 (T8,
`docs/evidence/m7-tier2-slice2.md`) added **D64–D68** and **D73** for the figures
and **D72** for the cue clock under them, and its camera rules are the next
section's; slice 3 (T9–T12, `docs/evidence/m7-tier2-slice3.md`) added
**D75–D81**, its second verification pass **D82–D87** and its documentation pass
**D88–D89**, and its per-card identity rules are the section after that; slice 4
(T13 and the proportioned bodies, `docs/evidence/m7-tier2-slice4.md`) added
**D95–D101** (**D90–D94** are `main`'s card library, which landed on
`main` first), and its body, costume and duelist rules are the last Tier 2 section.

1. **If the snapshot says it, it is a POSE; if only the event says it, it is a
   CUE** (**D56**). A creature's figure, its stance (tapped kneels, it does not
   turn with its card; `sick` is translucent; blocking comes from
   `state.combat`, never the `blockers` event), an aura on its host, a land's
   tile and its tapped dimming, the standing mana pool, a spell form at its
   caster's anchor, a tether to its target, the combat freeze — all poses,
   correct after `skip all`, a backwards scrub, a `resync` and a new `gameId`
   with no history. Summon, lunge, hit, the snap-on, the ripple, a mote's
   flight, the strike, the fizzle — cues, which decay to identity. Build a thing
   on the wrong side and it is either invisible after a skip or stuck on screen.
   **The defect this prevents is a renderer that remembers.** A death is the one
   place that line was argued twice (**D64**, superseding D56's clause): the
   snapshot that carries it has already removed the living figure, so the body is
   a transient of its own — `FigureLayer`'s `DepartureField`, built at commit from
   the PREVIOUS frame's pose (one frame of look-behind, like **D63**), drawn from
   that snapshot until the card's own death cue has ended, decided once by
   `CueQueue.deathPending` through `figures/clips.ts`'s `stepDeparture`, and
   stepped out of the rank that closed up behind it (`departureStand`). **Its fate
   is the queue's, not the clip lane's**: slice 2 first drew it only while the `die`
   REQUEST was on the stage, and every death blinked for up to 1.3 s while the
   batch's damage cues played — `clips.test.ts` now walks the queue's timeline over
   all 17 corpus deaths. It also depends on `Arena.tsx`'s intake being a
   **`useLayoutEffect`** (the canvas is a second React root with its own scheduler;
   a liveness clause holds it). `attach.test.ts`, `tiles.test.ts` and
   `stack.test.ts` sweep the corpus for the pose half.
2. **`figurePose` is THE pose and `FigureLayer` is THE figure renderer** — the
   same rule as `CardPlane` (M7 convention 2), and the renderer's half of hard
   rule 8 in a new shape, because choosing a mesh is a statement about what a
   card is. `figures/pose.ts`'s `figurePose(layout(state), combat, data)` is
   pure, and `figures/` imports no three, no React, no DOM and starts no timer
   (`liveness.test.ts`). **`layout.ts` is still the only module that knows a
   coordinate** — `standPointOf`, `FIGURE_STANDOFF`, `FIGURE_MAX_WIDTH`, the
   `casting` anchor, `DEPARTURE_STEP` and `ON_CARD_DISC_ORDER` all live there.
   **The width clamp is strict for every archetype** (**D65**: no floor, no
   overflowing drone — slice 1's drone numbers were the build's mismeasurement),
   and **a wrapped rank's back row stands ON its own card** (**D66**), its disc in
   the disc field's second pass, after the cards, because a transparent disc that
   writes no depth is painted over by any card drawn after it. A figure is placed only for a card whose
   `Placement.back` is `false`; a **face-down creature is always the anonymous
   disc** (`figure-pose.test.ts` asserts it over 1,138 corpus instances); a
   redacted permanent gets no figure at all. A figure **carries no name** (no
   label above it, ever), **takes no click** (`raycast` is cleared on every
   clone, so `HitProxy` stays the only thing the raycaster sees), and nothing
   gates on `selectable`. `replay-cues.test.ts`'s redaction net covers model ids
   and clip names, because `"helicarrier"` in an op log is a name by another
   spelling. The other pose layers — `discs.ts`, `tiles.ts`, `casting.ts`,
   `overlays.ts`, `busts.ts` — are each an `InstancedMesh` field, bound **only**
   from `CueRunner`'s frame loop (a liveness clause). The duelists are not
   creatures and not `FigureLayer`'s: `scene/DuelistLayer.tsx` is THEIR one
   renderer, bound only through `BustField.bind` (slice 4, below).
3. **The clip lane is scrubbed, never ticked** (**D57**). The cue's `t` becomes
   `action.time = t × duration`, then `mixer.update(0)`; a zero delta is a
   scrub in `three@0.186.0`, so pause, speed, step, skip, the live budgets and
   reduced motion hold for skinned animation with no second clock.
   `liveness.test.ts` asserts **every `mixer.update` under `web/src/arena/` is the
   literal `0`**, that only `scene/CueRunner.tsx`, `scene/FigureLayer.tsx` and
   (since slice 4) `scene/DuelistLayer.tsx` call one, and that only the frame loop
   writes `action.time` — negative-controlled.
   **Never use drei's `useAnimations`**: it is a `useFrame` per creature with a
   wall clock. Clips arbitrate through **one** function, `clipBeats`, that both
   `SceneStage` and `NullStage` call (a test double that drifts from the real
   stage is worth nothing — it hid a defect once); a request with the same `key`
   replaces its own; `stage.clips` is empty after every batch; under
   `prefers-reduced-motion` no clip is written. A clip is keyed by **cue id**
   (`figures/clips.ts`'s `CLIP_FOR`) and a per-card variant is `params.clip` —
   **never a new cue id**. A missing clip removes only what the model would have
   added; root motion is refused at build time. **The stance and the cue are
   always two actions** (the 2026-09-27 hardening pass, verification round 1):
   `FigureRig.restActions` holds the stance on each clip's `restTwin`
   (`scene/models.ts`), so an attack cue on an attacking figure crossfades off
   the held pose instead of sharing one action whose weight fell short of 1
   (`test/clip-lane.test.tsx`).
4. **Only CC0 assets, each with a written provenance — no Mixamo, and nothing
   from card art** (**D54**, user decisions 3 and 4). `tools/assets-manifest.json`
   is hand-written: URL, bytes, sha256, date, and the licence badge **verbatim on
   the day**, because the badge is the only evidence that survives the page
   changing. `web/src/arena/figures/models.json` is **generated** by
   `tools/build-figures.mjs` — never edit it by hand. Models load from
   `web/public/models/` through three's own `GLTFLoader` + `MeshoptDecoder` and
   from nowhere else: **never drei's `useGLTF`**, whose DRACO decoder defaults to
   `https://www.gstatic.com/…`. Liveness holds that as an **allow-list**, not a
   hostname denylist (Tier 2 follow-up 8, closed in slice 2): no string literal
   under `web/src/arena/` may carry a URL scheme unless `URL_ALLOW` names it with a
   reason (today only the Scryfall credit link), and in the arena's JSON only
   provenance keys may. The negative controls live in the test. A missing
   `figures.glb` is a **supported state**: every creature draws its disc and
   every duelist its bust. Three
   pipeline traps, each measured: **`meshopt` is the last step** (a `prune` after
   it undid the compression); **`prune --keep-attributes true` after `unlit`**
   (the default strips `NORMAL`, and the fresnel shader then draws every figure
   solid black in a file that still validates); and the skinned join is the
   script's own, because `gltf-transform join` skips skins. Since slice 2 the
   build **verifies every source's bytes and sha256** against the manifest before
   it builds, the library carries **no texture** (**D67**), and `figures.test.ts`
   fails when the committed `figures.glb` is not the file `models.json` records.
   **Since slice 4** every humanoid card stands in a proportioned body on the
   Universal Animation Library's own 65-joint rig, and every clip it plays is the
   library's, retargeted by the build (**D95**); the three chibi fallbacks keep
   Kenney's one 7-joint rig and **D68**'s clip set. The build also resolves the
   meshoptimizer nested under `@gltf-transform/cli` to decimate the bodies
   (**D96**), so pin that CLI before you trust a rebuild's bytes. **The Tier 3 seam:**
   a per-card entry in `figures.json` may choose a model and alias a clip; it may
   not introduce a model used by exactly one card.
5. **The scene has no lights, and an idle table still renders nothing** (**D53**,
   **D58**; D53's *unlit* is superseded for the figures by **D137**'s comic look,
   whose key light is a uniform — see *The comic look* below). No lights, no
   shadow maps, and the cards are never lit; figures use
   `scene/figureMaterial.ts` (`scene/holoMaterial.ts` until Lane LOOK, now a
   re-export) — one program for every figure and both duelists, the hologram's
   view-space fresnel or the comic look's bands from a uniform key,
   `#include <colorspace_fragment>`, a costume palette since slice 4 (below), and
   nothing that reads a clock. Figures
   breathe **only while the queue is awake**. The hot path still allocates
   nothing: colours go through `scene/colourCache.ts`'s `parsedColour`, never a
   per-frame `Color.set('#…')`; anchors are pooled. The budgets are separate on
   purpose: the effect pool is **fixed at 49** (glow 8, ring 8, beam 5,
   particles 3, text 6, plate 3, mote 12, streak 4 — 26 at Tier 1, 38 with the
   motes, 45 since slice 3's T11 beats, **D79**, 49 since the comic motion lane's
   speed lines, **D147**; at most
   `MAX_LIVE_EFFECTS = 8` blended transients and `MAX_LIVE_MOTES = 12` motes
   live at once), pose overlays have their own
   `MAX_POSE_OVERLAYS = 12`, and at most `MAX_FIGURES = 12` creatures carry a
   model (the rest draw discs). Anything that parks a mesh invisible must
   **`prime()`** it at mount — three compiles a program the first frame an
   object is drawn, and under bloom that compile landed mid-game as a 52–62 ms
   frame. **The "allocates nothing" claim is a liveness clause now**, not a
   header comment: it reads the bodies the frame loop reaches through the disc
   field (`DiscField.bind`, `DepartureField.bind` and its helpers,
   `CueQueue.deathPending`, the lane functions) and rejects every allocating
   construct a grep can see — `new`, array and object literals, spreads,
   closures, template strings, `for…of` and `.values()` iterators — with the
   junk lines that must be caught spliced into every body as it runs. Extend its
   body list when the frame loop grows.
6. **Bloom is the one post pass, and it is lazy** (**D61**). `scene/Post.tsx` is
   imported only when bloom is first on (its own `Post` chunk); a liveness clause
   keeps it lazy and the only pass. `BLOOM_DEFAULT` lives in `arena/perf.ts`, not
   beside the component, so reading the default never loads `postprocessing`.
   `?bloom=0|1` sets where it starts, the cue strip carries the checkbox, and the
   DPR governor's rung below its floor turns it off on a machine still late at
   0.6. **With bloom on, `gl.info.render` counts one call** (the composer's last
   pass) — read draw calls with it off.

Two more things worth knowing. **Every performance number must say what drew
it.** T7 found that headless Chromium reaches this machine's GTX 1080 through
ANGLE (`tools/arena-bench.mjs --gpu gl`, and the report prints WebGL's unmasked
renderer); SwiftShader is still the default and the lower bound, and neither is
a headed browser on the user's desktop or an integrated GPU. The bench frame is
**`g1.jsonl` at transport index 316** (`--index 316`, 11 modelled figures) —
**not** `human-sideboard-7`, whose 21-creature frame is all probe-deck beasts on
discs. And **headless Chromium parks on `frameloop='demand'` exactly as the
browser pane does**: `queue.advance(ms)` moves the virtual clock without asking
for a repaint, so every mid-cue reading in the evidence was taken by pumping
fiber's own `advance()` — imported from the app's **pre-bundled** instance
(`/node_modules/.vite/deps/@react-three_fiber.js`; a second copy has its own root
registry and advances nothing) — a few frames after each `queue.advance()`.
(Slice 2's refinement: headless Chromium, unlike the pane, **does** run
`requestAnimationFrame`, so a camera move or a batch that keeps the loop awake
plays out with no pump at all — the camera track needed none. It is only a
*paused* queue stepped by hand that needs the pump. When counting what was drawn,
hook `gl.render`; a separate rAF sampler runs out of order with fiber's own
callback and reports a phantom one-frame gap.)

## The conventions Tier 2's slice 2 added — the camera views

Five, and the thesis is the arena's own sentence applied to the lens: **a camera
view is a POSE and the director is a PURE FUNCTION** — the camera decides what
you look at, never what happened. Slice 2 (T8) built five named views, spectator
mode and an auto director; **D69–D71** and **D74** are the decisions,
`docs/evidence/m7-tier2-slice2.md` is what was measured, and report 09 §8's seven
camera rules still hold under all of it.

1. **A view is a row of data in `camera.ts`'s `VIEWS`, and `camera.ts` is still
   pure.** Each `ViewSpec` is a position and a target (`orbitFromPose` gives the
   orbit), a key and a `seatSafe` literal — no three, no React, no DOM, no
   storage and no clock of its own (the cue engine only as a type), which a
   liveness clause asserts. **The chosen view is `CameraDirector.home`**, so a
   cue's swoop is an excursion from it that comes back to it — the camera's
   version of **D50**'s offset that decays to identity; there is no second
   "rest pose". Only `scene/CueRunner.tsx` calls `director.tick`, `applyView` or
   `request` (liveness). A view change is an ease (650 ms at a seat, 1,400 ms for
   a spectator) and a **cut** under reduced motion. Add a view as a row, with its
   `seatSafe`, and let `camera.test.ts` recompute the flag.
2. **A view is usable at a live seat iff `keepsSeat`** (**D69**) — inside
   `ORBIT_CLAMPS`, the hand and battlefield anchors framed (§8 rule 6's
   `framesSeat`), **and no point of the seat's own land and creature rank lines
   covered by a seven-card hand fan** (`ranksUncovered`, the verification pass's
   addition: rule 6 alone had let the fan cover most of the land rank) — at every
   aspect in `LIVE_ASPECTS`, against `layout.ts`'s own geometry. `seatSafe` is a
   literal so the switcher needs no anchors to grey a button, and the test
   recomputes it, so it cannot drift. **A view that fails is spectator-only —
   never "allowed with a DOM hand strip"**, which would be a second card renderer
   beside `CardPlane` (M7 convention 2) and a second place to click the same
   card. **Spectator mode** is on by itself in a replay and from the moment a live
   game ends, never while a seat is live.
3. **The auto director is `directShot(beats, shot, now)` and `beatsOf(events,
   lookup)`, both pure** (**D70**). A beat reads player ids, a card's public
   `controller` and the previous frame's `stack[].target*Ids` — **never a name**
   (hard rule 8's renderer half) — and the director is fed the same batch the
   queue is, at the same moment. Its three numbers live in `DIRECTOR`: a 2.4 s
   minimum shot, a 4.8 s cooldown that **combat and the outcome are exempt from**
   (never from the minimum shot), and a 1.6 s held beat. Cuts are cuts, never
   eases, and nothing cuts within 5 s of the user's last drag.
   `camera.test.ts` runs the director over every batch of all 19 committed
   recordings at two paces and asserts both numbers on every cut (596 cuts; the
   evidence re-ran it with both at 0 and it found 632 short shots and 309
   cooldown violations, so the assertion has teeth — re-run that control when a
   number moves).
4. **Rule 5 is about a live SEAT, `change` is the user's only under their hand,
   and the choice lives in this browser** (**D71**). The camera applies "do not
   move while the engine waits on the human" only in live mode — a replay's
   recorded `input` is history. `OrbitControls`' `change` counts as the user's
   only between `start` and `end` plus `USER_TAIL_MS` (1.5 s) of damping tail,
   because its first update after a programmatic move fires a stale `change`.
   The choice persists under `localStorage` `mtg-table.arena.camera` — **every
   access in `Arena.tsx`, inside `try`** (liveness), the table when nothing valid
   is stored — and a stored spectator-only view shows the table at a live seat.
5. **The camera keys are keymap rows, and on the board they are `inert`**
   (**D74**, M4 convention 4). `1`–`5`, `6`/`0` and `O` are three of `keys.ts`'s
   26 rows; `keys.ts` may not import `arena/` (**D49**), so it spells the ids as
   `CAMERA_KEYS` and `keys.test.ts` holds the two maps together. On the board each
   plans an `inert` whose reason names `V` — never a `view`, which `Board.tsx`'s
   silent `default:` would swallow.

Two things the camera track changed that a reviewer should know are deliberate:
**`reset()` and `K` snap the camera home** (a scrub used to abandon it mid-swoop),
and because rule 5 now waits for a live seat, **camera cues play in replays of
human games** where they used to be dropped on every frame whose recorded OK was
enabled.

## The conventions Tier 2's slice 3 added — per-card identity

Six, and the thesis is one sentence: **a card reads as ITSELF through data, and
every piece of that data is a pose.** The user's verdict on slice 2 was
"everything still looks very generic" — five bodies in a colour — and slice 3
(T9–T12) answered it without a model per card. **D75–D81** are the decisions
(**D82–D87** its second verification pass's, **D88–D89** written up by its
documentation pass), `docs/evidence/m7-tier2-slice3.md` is what was measured,
PLAN.md's *Slice 3* has the status and the fourteen follow-ups, and README's *Tier
2, slice 3 — every card reads as itself* is how to give a card its identity.

1. **Identity is `figures/traits.json`, validated like `cues.json`** (**D75**).
   `figures.json` says which BODY a card stands in; `traits.json` says what makes
   it that card — `scale`, `hover`, `idle`, `tint`, `accent`, `shade`, `turn` +
   `turnedRatio`, `props`, `swarm` + `formation`, `silhouette`, `shrink`. The
   ladder is default ⊕ subtype rungs (least specific first) ⊕ the card's row;
   `props` is replaced, never appended. A bad row is dropped and the ladder falls
   through; `traits.test.ts` fails on any error and prints the census (which card
   got which rungs and props over 3,679 board frames) every run, and its "task
   list" reads each deck card's identity back off the census — extend it when you
   add a row.
2. **A prop is a SHARED KIND from `figures/props.ts`'s closed kit, procedural and
   instanced — one draw call per kind on the table, never per figure.** The
   nameable kinds are `PROP_KINDS` (the second verification pass added `visor`,
   Lane BODIES `coatTails`, `cape` and `sidearm`) and the derived ones
   `DERIVED_KINDS` (`squad`, `swarmBee`, `carrier`, and since Lane BODIES the
   faces and the hair), each with a blend, a colour role
   (`accent` / `tint` / a fixed hex) and anchors per body family (since slice 4
   the table is in the last section below; at slice 3 it was: the three Kenney
   bodies share one 7-joint rig); a kind may have more than one anchor (the
   badge's chest and back). Every kind is open to every row (Bold Biochemist's lab
   coat is Fury's `coat`). **Size is identity, and so is the side it is on**: a
   figure is 45–75 px tall in the table view at 1600 × 1000 (the chibis; slice 4's
   proportioned bodies stand their full height, 60–100 px), and **the opponent's
   figures show that view their BACKS** (D81) — both verification passes found
   props judged only on the viewer's own figures. `traits.test.ts` now rasterises
   every deck card's props through the table camera on BOTH seats, standing and
   kneeling, with the real `figures.glb` and the real `PropField`
   (`web/test/prop-raster.ts`, **D83**): every identity prop ≥ 48 px on both
   seats, except a documented ONE-SIDED detail (`tie`, `laserEye`, `exhaust`, and
   since slice 4 `eyepatch`, **D98**)
   whose partner carries the card on the other side. Extend that list only with a
   reason; judge a new prop at 1× from views 1 and 4 as well. A new kind needs a
   `LOOKS` entry, a `buildKindGeometry` case (≤ 1,200 triangles, asserted) and an
   anchor; nothing is ever a model used by exactly one card (report 13 §12).
   **Several bodies are still one pose** (**D88**): a `swarm` is instances of ONE
   derived kind round the card's one rig — the Air Force's five procedural bees
   round an insect rig that is kept for the clip lane and never drawn, the Agents'
   followers baked once from the library and riding the leader's root — clamped
   as a whole formation (`swarmSpan`, D65 strict). Never a figure per member: the
   engine names one card, so the cue layer gets one body.
3. **The prop field rides the one frame loop** (**D78**). `scene/props.ts`'s
   `PropField` is built, installed and committed only by `FigureLayer` (once per
   snapshot, after the rigs and the departing bodies), bound only from
   `DiscField.bind`, and its frame-loop body is in liveness's allocation scan. A
   dying figure keeps its props (`DepartureField.bodies()`), and the field follows
   `prefers-reduced-motion` live. **Hard rule 8:** an anonymous figure gets no
   prop, no hover, no swarm, no silhouette and no trait rung (asserted over 1,179
   corpus instances); a prop carries a kind and a colour, never a name, and takes
   no click.
4. **ONE definition of a figure's front** (**D81**). Figure space faces **+Z**
   (`layout.ts`'s `FIGURE_FRONT_Z`); `seatFacingY` is which way a seat's figures
   stand; `figurePointInto` / `figureAnchorOf` are the only resolution of a beat's
   `fwd` / `side` (right = front × up). A cue that lands a beat ON a prop derives
   its anchor from the prop's own point (Agent 13's muzzle flash from
   `PISTOL_MUZZLE`). `facing.test.ts` resolves every front-anchored beat against
   its prop for both seats. **Since D143 a seat's figures face the OPPONENT** (the
   user's answer to PLAN question 13; D81 had your figures face you): it was one
   line in `seatFacingY` and everything else followed. **An attacker FACES its defender while it
   attacks** whichever way it rests (**D82**): the offset's **`dRotY`** is the
   figure's own vocabulary (a card ignores it, as a figure ignores `dRotZ`), and a
   cue gets the angle from `Stage.yawTo` — `layout.ts`'s answer, never a yaw of
   its own — times its lunge envelope, so it decays to 0. Every consumer of a
   figure's facing adds it: the rig, the prop field's root props and the `figure`
   anchor.
5. **A beat is drawn on the BODY, and every cue param is closed** (**D79**). The
   `figure` anchor is resolved only by `scene/effects.ts`'s `#figurePoint` (the
   camera can never be handed one); `cues/validate.ts`'s `PARAM_SPECS` is the
   whole param vocabulary — an unknown name, an out-of-range value or an event
   fact (`beamTo`, `strikeCard`, …) is an error. Add a param as a row there, with
   its range, and to `cues-exhaustive.test.ts`'s all-params-on sweep. **An aim is
   the stack's, or nothing** (**D89**): Quake's shockwave keys off her trigger
   RESOLVING and reaches a target only when the previous frame's stack names one
   (4 of 13 in the corpus); pairing the batch's `tap` events to her would close the
   gap and is the heuristic that stays declined — the engine never says which card
   caused a tap. An unaimed beat plays on its own card and the census says so.
6. **Overhead and beside things cover nothing from the table view, and nothing
   goes under the HUD** (**D77**, **D80**, **D85**). Your carrier flies over your
   rank at `SILHOUETTE_ALTITUDE` (2.05), 1.5 long; the OPPONENT's over the table's
   centre line, low and a fifth smaller (`silhouettePlacementOf`) — over their
   rank it was either under the arena's chrome or over their figures. The chrome
   is `layout.ts`'s `HUD_TOP_PX` (128 CSS px over the canvas top, fixed), a
   keep-out band `figure-pose.test.ts` holds every carrier out of at every live
   aspect. A station (Strategic Intervention's console, Web Up's cocoon) stands
   figure-sized at its own slot's stand point. `figure-pose.test.ts` and
   `attach.test.ts` project every carrier, station and figure through the table
   view's camera and assert a cover under 5% (negative-controlled). The attachment
   looks (`shell`, `glints`, `circuit`) are per-name rows in `figures.json` — if a
   test lays data over the committed file, it proves the pipeline and not the game.
   **An attachment's card lies UNDER its host** (`ATTACH_DY` −0.002, **D86**), so
   the click order is the drawing order: `attach.test.ts` raycasts `HitProxy`'s
   planes from the three seat-safe views and every host-centre click hits the host.
   Never "route" a click to a host instead — that is gating on `selectable`.

## The conventions Tier 2's slice 4 added — bodies, costumes and duelists

Five, and the thesis is one sentence: **a person is a costume painted on a shared
body, and a duelist is a seat's pose.** The user's verdict on slice 3 was *"the
avatars are still pretty generic"*. Slice 4 answered it with two proportioned CC0
bodies, a costume palette and a full duelist per seat — no model per card, no
texture, no second program. **D95–D101** are the decisions (**D90–D94** are
`main`'s card library, which landed on `main` first),
`docs/evidence/m7-tier2-slice4.md` is what was measured, PLAN.md's *Slice 4* has
the status and the follow-ups, and README's *Tier 2, slice 4 — people in
costumes, and a duelist at each end* is how to dress a card and change a
duelist.

1. **A costume is a SLOT per vertex and a PALETTE per figure, written at
   COMMIT** (**D97**). The slot is a per-vertex attribute: the build writes
   `_REGION`, and `scene/models.ts` renames it once, at load, to
   `costumeRegion`. The palette is a **per-material uniform array**,
   `uCostume[8]` plus `uCostumeOn`, on each figure's own `HoloMaterial`. Every
   figure is a `SkinnedMesh` clone with its own material instance, all built
   from one source, so all of them share **one program**. The costume is **not**
   a vertex colour, **not** a texture (**D67**) and **not** an instance
   attribute — nothing here is instanced — so do not add one.
   `figures/props.ts`'s `COSTUME_SLOTS` order (`skin`, `hair`, `top`, `shirt`,
   `legs`, `shoes`, `gloves`, `belt`) **is the contract**: the build imports it,
   the shader indexes by it, and `traits.test.ts` holds the two together — never
   reorder it without a rebuild.

   **Only `holoMaterial.ts`'s `applyCostume` writes a costume colour**, and only
   at commit (`FigureLayer`'s and `DuelistLayer`'s layout effects, keyed so the
   strings are parsed once a game). A liveness clause forbids any `applyCostume`
   or `uCostume` write in `CueRunner.tsx`, `DiscField.bind`, `DepartureField.bind`
   or `PropField.bind`, negative-controlled, and the shader reads no clock. What
   the frame loop MAY write is a number: `uDrain`, a dying body's fade toward
   `uDrainTo`, which reaches every slot.

   The data is `traits.json`'s `costume`, merged slot by slot down the ladder;
   `figures/pose.ts`'s `costumeOf` is the one place a missing slot is filled.
   Skin is one tone for every card on purpose — a costume is identity data, a
   complexion is not. **Hard rule 8**: an anonymous figure wears nothing
   (asserted over 1,179 corpus instances), exactly as it carries no prop.
2. **A body belongs to a FAMILY, and every prop kind is fitted per family**
   (**D95**, **D98**). `familyOf` reads a humanoid's family off the manifest's
   rig (`ubc`, `kenney-mini`), so a new body on either rig needs no code; the
   drone and the insect are named by id. Each `PROP_KIT` kind carries
   anchors per family, in that family's figure space — one unit tall, feet at
   y = 0, facing +Z (**D81**) — and a family with no row draws nothing of that
   kind. `root` (the whole figure, lunge included) and `stand` (the stand point,
   ignoring the cue offset) are open to every family.

   | family | models | rig | joints the kit anchors to |
   |---|---|---|---|
   | **`human`** — the default | `agent` (the man), `hero` (the woman); `scientist` is `agent`'s node | `ubc`: the animation library's own 65-joint Unreal-named rig | `Head`, `spine_03`, `hand_l`, `hand_r`, `lowerarm_l` |
   | **`humanoid`** — the chibi fallback | `agent-chibi`, `hero-chibi`, `scientist-chibi` | `kenney-mini`, 7 joints | `head`, `torso`, `arm-left`, `arm-right` |
   | **`drone`** | `drone` | its own | `Head`, `Eye` |
   | **`insect`** | `insect` | its own | `Head`, `Head3` |

   The `human` anchors are written in the body's **bind (T-)pose** against the
   landmarks `figures/props.ts` prints — unless `PropAnchor.pose` names a clip
   and a phase. That is how Agent 13's pistol sits in her hand in her aim, and
   how `PISTOL_MUZZLE` stays on it for the cue's flash (`facing.test.ts`). Only
   `human` and `humanoid` wear a costume (`wearsCostume`). A new kind needs an
   anchor for `human` at least, and is judged by the raster test from both seats
   like every other (slice 3 convention 2); a one-sided detail has a named
   partner.
3. **The library is rebuilt by measurement, and the chibi is a FLAG** (**D95**,
   **D96**, **D98**). The per-model triangle targets live in
   `tools/assets-manifest.json` (a body 1,400, the drone 1,900, the bee 1,700),
   chosen against `g1`@355, not a guess. A body is simplified WITH its costume
   slots, and the shirt and belt are locked. The clips are retargeted by
   **world-space delta** over the 22 joints the manifest names, never by copying
   local rotations (the rigs' rest orientations differ). A clip written
   `ual:A+B` is composed: A's legs and hips (their turn removed) under B's upper
   body — the tapped kneel. Every clone starts at its **idle's first frame**
   (`instantiateFigure`'s `pose: 'rest'`); `PropField` asks for `pose: 'bind'`
   because its anchors are written in it. So **a humanoid model must have an
   `idle`**, or its bind pose shows whenever a clip's weight ramps (PLAN.md's
   slice-4 follow-up 8). `"body": "chibi"` in `traits.json` stands a card in
   `<model>-chibi`; `figures.test.ts` requires every `-chibi` model to be the
   fallback of a body the ladder reaches, so a fallback cannot rot unnoticed.
   The budget is the manifest's (Lane BODIES convention 5, **D161**) and the
   triangle headroom at `g1`@316 is gone (Lane BODIES, below), so a new body or
   clip is measured against both before it is committed.
4. **A duelist is a SEAT's pose, and its gestures are cues** (**D99**,
   **D101**). `figures/duelists.json` is the data, validated like `cues.json`
   (unknown keys are errors; a bad look drops its seat to the bust), and
   `figures/duelists.ts` is pure (no three, React, DOM or clock). **A seat, never
   a player**: nothing reads `PlayerState.name`, a pose carries a seat, an id,
   colours and numbers (asserted over every board frame), and a duelist takes no
   click (`raycast` cleared). **The stance is a pose from `board.gameOver`
   alone** (`ready`, `won`, `lost`), so skip, scrub, `resync` and a new `gameId`
   need no history.

   **A gesture is a `gesture` PARAM on an existing cue, never a new cue id**
   (`cast`, `flinch`, `outcome`, `none`; `cues/validate.ts` knows it). It plays
   on the clip lane at **`duelistLane(player)` = −1,000,000 − player**, a
   reserved id no card can have. A cue's `end()` releases only its own request
   (`Stage.clipOf`, OPTIONAL), so the decay assertion covers the duelists with no
   line of its own. `queue.ts`'s rules 5b (an absorbed `cast` hands its gesture
   to the arrival) and 8 (one flinch per player per batch) are the queue's
   vocabulary, and `gesturePending` is its one indexed query, which `stanceEntry`
   uses so the end does not blink.

   **`scene/DuelistLayer.tsx` is THE duelist renderer**: one `SkinnedMesh` per
   seat with its props **baked** into the mesh (never instanced — the prop field
   stays `FigureLayer`'s, **D78**), built and disposed in **one layout effect**
   (a split cleanup once brought the busts back mid-game). `DuelistField.bind`
   is reached **only** through `BustField.bind`, which `CueRunner` calls once a
   frame; it calls `mixer.update(0)` and aims bones after it. Breathing reads the
   queue's virtual clock (`queue.now`), so an idle table still renders nothing.
   Liveness holds all of it and scans the bind bodies for allocation.
5. **Where a duelist stands is MEASURED against the camera, and the camera never
   moves for it** (**D100**). `duelistStand` takes `layout.ts`'s anchors
   (`playerAnchorFor('you')`, `anchorsFor('opp').creatures`) plus four offsets
   declared in `figures/duelists.ts` — **the one coordinate outside
   `layout.ts`** (Tier 2 convention 2), pure and held by `camera.test.ts`;
   moving the offsets into `layout.ts` changes nothing else (PLAN.md's slice-4
   follow-up 19). The duelists are **never** in the camera solver's required
   set: no view, clamp or solver rule may change to frame them. `camera.ts`'s
   three pure checks — `keepOutTop` (the chrome band), `clearOfHand` (a body's
   hull against every card of a seven-card fan) and `visibleShare` — are
   asserted at every seat-safe view and live aspect, with slice 1's bust anchors
   as the negative controls. **Anything placed at the far end of the table is
   under the chrome** from every seat-safe view; measure a stand point with
   these three before you move one. **The seat plates are keep-outs too** (the
   2026-09-27 hardening pass, slice-4 follow-up 3): `camera.ts`'s
   `PLAYER_PLATES` and `visibleShareOnCanvas` put both HUD plates over the canvas
   in real pixels, `camera.test.ts` holds their rectangles to `styles.css`, and
   **the opponent's plate never leaves the `HUD_TOP_PX` band** — asserted, not
   printed. That holds because **a plate is four rows and every row is one
   line** (`DecisionLayer.tsx`'s `SeatPlate`): the name is ellipsised with the
   whole name in its `title` (a long `--ai-name` is cut, never wrapped), the
   opponent's name row cannot wrap, and match setup's deck name and profile and
   any player counters ride the life row. Match setup's first plate put the deck
   on a line of its own and the profile in the name row's tags, which took the
   opponent's plate to 143–162 px down and hid enough of the opponent's duelist
   in the shoulder view to fail `camera.test.ts`'s own threshold (60% and 44%
   against 70% at 745 px) — those plates are the test's negative controls now.
   **A new line on a plate is a new row**: put it on an existing row, or measure
   `PLAYER_PLATES` again and show the duelist still reads. `arena-hud.test.tsx`
   holds the markup to the four rows.

## The comic look — the conventions Lane LOOK added (D137–D146)

Five, and the thesis is one sentence: **the look is a number written at commit,
and the comic look is the hologram's program painted, not a second renderer.**
The user approved report 15's direction (`docs/research/15-art-direction.md`),
and since Lane LOOK (branch `look`, 2026-09-28) every figure, dying body, duelist
and painted prop is drawn in the comic look by default — three cel bands from a
lens-fixed key (**D138**), halftone in the core shadow, a specular dot, a rim in
the card's colour, an ink line (**D139**), a contact shadow (**D140**) and a
mid-value stage (**D141**) — and `?look=holo` restores **D53**'s hologram
(**D137**). `docs/evidence/look.md` is what was measured; PLAN.md's *Lane LOOK*
has the status and the follow-ups, several of them edits owed by Lanes MOTION
and BODIES in files LOOK does not own. **D146** is the verification pass's: the
ink marks what is painted and rides bloom only. **D137–D146 were written as
D120–D129** in the lane's reserved range and renumbered contiguously when the
branch was rebased onto the undo race's `f6bad35` (2026-09-28), where `main`
had already taken D120–D136; Lanes MOTION and BODIES number theirs after D146.

1. **One program, one number, and `look.ts` holds every number** (**D137**).
   `scene/figureMaterial.ts` (`holoMaterial.ts` until this lane — a re-export is
   left for one release, and `scene/models.ts` still imports through it) draws
   both looks, mixed by `uLook`. The comic block is shared GLSL
   (`COMIC_VERTEX_GLSL`, `COMIC_FRAGMENT_GLSL`) with `scene/propMaterial.ts` —
   Lane LOOK's since its first commit; `scene/props.ts`'s geometry and its
   `LOOKS` table (one `PROP_LOOK` preset per kind) are Lane BODIES' — and its
   numbers are ONE set of uniform value objects (`COMIC_UNIFORMS`). Add a comic
   number to `look.ts`'s `COMIC`, then as a uniform; never as a GLSL literal. A
   model that brings vertex colours or a texture compiles its own variant through
   the **paint input path** (`makeFigureMaterial`'s `PaintInput`, **D144**); the
   committed bodies carry neither and stay one program. **Black is blue with blue
   highlights**: a dark paint's LIT band is lifted to `COMIC.darkLift`'s target,
   its hue kept, so a navy suit keeps three bands on the mid stage.
2. **The look is written at commit, never in the frame loop** (**D145**).
   `uLook` has two writers (`applyLook`, `applyPropLook`), the shared uniforms
   one (`applyComicGlobals`), and their callers are layout effects and
   commit-time methods. `liveness.test.ts`'s Lane LOOK clause holds it and
   splices eight junk writes into every frame-loop body (the painted mark's two
   among them). **A cue that animates the
   look writes `uMaterialize`**, the figure material's identity-1 multiplier —
   Lane MOTION's summon — never `uLook`. That one number IS written per frame,
   as `uOpacity` and `uDrain` are, since the lanes merged: by `CueRunner`'s
   `applyMaterialize` (a living figure) and `DepartureField.bind` (a falling one),
   and by nothing else — the motion lane's liveness clause holds both (**D148**). `look.ts` is pure and imports
   `colour.ts` and `perf.ts` only; `main.tsx` hands the arena the look's query
   keys as a string and imports nothing under `arena/` (**D49**).
3. **What is not yet real stays a hologram** (**D142**). `look.ts`'s
   `figureLookOf` / `paintsFigure` — the one decision, a pure function of the
   pose — keep the anonymous face-down figure and the ghosted creature spell in
   the hologram, with no shadow and no ink, and draw a summoning-sick figure
   (`stance` `sick`) HALF hologram (`COMIC.sickLook`), still shadowed and inked.
   `look.test.ts` sweeps the corpus (6,781 painted — 1,487 of them sick — 1,179
   anonymous, 87 ghosts). A new treatment for a pose goes there, as a pose.
4. **The ink is bloom's, it inks only what is PAINTED, and the composer must
   not rebuild** (**D139**, **D146**). `Post.tsx`'s `InkEffect` reads depth inside
   bloom's own `EffectPass` (+0 calls) and is drawn **only with bloom** —
   `wantsInkPass(look, bloom)`; with bloom off there is no composer and no line
   (`?ink=always` draws one for measurement). A painted figure, prop kind or
   duelist writes **alpha 0** as the ink's mark (`figureMaterial.ts`'s
   `markPainted`: blend state, not a define — called only from `applyLook` and
   `applyPropLook`), and the ink draws only where one of its five samples is
   marked, so **no card, tile or table edge is ever inked**; it writes alpha 1
   back, stays FIRST in the composer's list, and is **not** `CONVOLUTION` (R3F's
   composer gives a convolution effect a pass of its own). Both canvases are
   opaque (`alpha: false`). The line's outer half samples `COMIC.inkCssPx` away
   and its inner half, on the paint, `COMIC.inkInnerCssPx`; a light (past paper
   white in the half-float buffer) burns through it. `traits.test.ts` measures what
   the ink and the halftone leave of every identity prop (`prop-raster.ts`'s
   `comicVisibility`). The floor rung drops bloom and the ink with it (`postOnFloor`).
   `EffectComposer` rebuilds every pass when its `children` change identity, so
   `Post` is `memo` and its children are memoised on the two switches — the
   unmemoised composer relinked a program mid-game and put the GTX 1080's p95
   at 35.5–39.1 ms against the hologram's 8.5–10.3. **A mount-time prime compiles
   for the target the frames are drawn into** — `scene/prime.ts`'s `compileFor`,
   handed `bloom || ink` — because three compiles a program per output colour
   space and the composer draws into a render target; a bare `gl.compile` in a
   scene layer warms the canvas variant nothing draws (a liveness clause). There
   is no inverted hull; it was measured over both of report 13 §8.2's lines and
   deleted. (Since D146 only `FigureLayer` and `DuelistLayer` prime: the combat
   burst is painted into the ground's texture, not a mesh.)
5. **A seat's own figures face the opponent** (**D143**, PLAN question 13,
   answered). `seatFacingY` is π for `you`, 0 for the opponent; you see your
   figures' backs. Every identity prop reads from both seats at ≥ 48 px except
   the one-sided details, which now include the Doombot's `jetpack` (its `visor`
   is the front partner); `traits.test.ts` finds the seat seen from behind by
   `seatFacingY`, never by name. The workshop's facing toggle defaults to the
   arena's facing; *faces its player* previews the old one. **The workshop opens
   on `1× front`** (`framing.ts`'s `frontPose`: view 1's distance and elevation,
   from the side the figure faces), because from your own seat a figure now shows
   its back; `1× from your seat` is view 1's direction.

The stage is data painted once and posed (**D141**): the ground's light is one
canvas per page and the seats' colours are its vertex colours, from the WUBRG of
what each seat has SHOWN (public zones, face-up cards only — hard rule 8); the
backdrop is one inside-out cylinder on the ground's program; the combat burst is
a pose of `state.combat`, painted into a second copy of the ground's light and
swapped in as its `map` (+0 draw calls), both textures uploaded at mount.
**The look's own budget is its evidence's** (`docs/evidence/look.md`, measured
at its merge: one program for every figure and both duelists, +1 program cached
with bloom off); the arena's current draw calls and triangles are Lane BODIES'
(below), which added props on top of it.

## The comic motion lane — the conventions D147–D155 added

Five, and the thesis is one sentence: **a comic's motion is still a cue — a pure
function of its own `t` that decays to identity — and "off" is the film before
it.** Report 15's Lane MOTION (`docs/research/15-art-direction.md` §5, §9.2) gave
the cues impact stars, lettering, ink splats, halftone dots, speed lines, the
hologram-to-ink summon, impact shakes and on twos, on branch `motion`
(**D147–D155**; `docs/evidence/motion.md` is what was measured, its merge section
first). README's *The comic motion lane* is how to give a card a word, and PLAN.md's
*The comic motion lane* has the status and the follow-ups. **D147–D155 were
written as D130–D138** in the lane's reserved range and renumbered contiguously
when the branch was rebased onto Lane LOOK's merged tip `4c76785` (2026-09-28), the
second of report 15's three lanes to land; Lane BODIES numbers its after D155.

1. **Comic FX is a switch stamped at enqueue, and off is op-for-op the old film**
   (**D152**). `CueContext.comic` comes from the queue (`?fx=classic|comic`, the
   cue strip, the workshop's queue bar) as `reducedMotion` does; every lane beat is
   behind it, a cue's comic-only effect keys are declared in `CueDef.comic` (which
   `end()` releases only for a comic cue), and the lane's helpers emit NOTHING with
   it off. `motion.test.ts` holds the corpus to "no comic op with comic FX off"
   and PINS the digest of that film (comic FX off AND on twos off — on twos steps
   the timing) to the pre-lane engine's, 310,369 ops; a new beat that writes an op
   outside the switch breaks the A/B the user judges with, and a deliberate change
   to a classic cue re-derives the pin with a reason. **Default on.**
2. **Ink is a shape, and the kit grew by one kind** (**D147**, **D150**). `burst`,
   `splat` and `dots` are textures on the existing slots, blended NORMALLY
   (`isInkShape`; blending is render state, never a program); `streak` is the one
   new kind, four slots, counted against the eight-slot cap — the pool is **49**.
   The words are the CLOSED `COMIC_WORDS` (POW, BLAM, KRAK, ZZAK, WHOOSH), reached
   only through the `burst` param and lettered ON the star (`Effect.word`), never a
   `text` effect; `replay-cues.test.ts` nets every word and every text. A new
   shape needs a `drawShape` case and a row in `INK_SHAPES` if it is ink; a new
   word is a decision. Speed lines lie along the motion's own vector (`from → to`)
   — "body → anchor" flips once a body has passed its anchor — and **beside the
   body, never across its card** (**D147**, amended at merge): a card moves with
   its figure's lunge, so straight behind a dashing body is always its own card.
   The lines are two bands down the quad's edges (`STREAK_CLEAR`), and
   `EffectPool.#streakClear` sizes and places the lane between them to hold the
   body's axis and the card's live corners, each carried along its own view ray
   onto the quad's plane — so `setFigures` takes the frame's layout, and
   `motion.test.ts` projects every figure of `g1`@355/@359 from all five views (345
   dashes, no band on a card or a body). **On the frame loop
   a texture is a LOOKUP** (`burstTexture` keyed by the word itself, `shapeTexture`
   by its constant name), and the drawing is each lookup's miss path, which
   `EffectPool.prime` takes for all eight ink textures at mount; the liveness
   clause scans both lookups — it once stopped one call short of a
   `burst:${word}` string built per star per frame. The splat is an ink body with
   a paper rim (**D155**): the tint reaches only the rim and the gloss.
3. **The summon is an offset; the look is LOOK's** (**D148**). `Offset.materialize`
   (identity 1, a product) ramps 0 → 1 on every arrival (the zone event's own
   `toZone`/`fromZone`) and `zone.dissolve` ramps a battlefield death's 1 → 0. It
   reaches the shader as LOOK's `uMaterialize` (`uLook * uMaterialize`) from
   exactly two frame-loop writers, each a NUMBER: `CueRunner`'s `applyMaterialize`
   on a living figure and `FigureLayer`'s `DepartureField.bind` on a falling body.
   The spike's `uLook` fallback went at the merge; the liveness clause holds the
   two writers and nothing else naming the uniform, negative-controlled. **An
   arrival is summoning-sick, which LOOK draws half hologram (D142), so a summon
   resolves from hologram to HALF ink**; the snapshot that says it can act paints it
   whole (PLAN question 28 asks about an overshoot). The prop field's look is per
   KIND, so a summoning figure's props do not ink in with it (PLAN follow-up 3).
4. **On twos is a quantisation of each cue's progress in the queue** (**D149**):
   `cues/motion.ts`'s `onTwos`, twelve drawings a second of SCREEN time (× speed),
   at least four per cue, `t = 1` exact, and the cue still ends on its real
   progress. Off under reduced motion; the camera and the breathing are not cues and
   stay on ones. Never a timer.
5. **An impact shake is `camera.ts`'s own, shake-only, priority 0, one per cue**
   (**D151**). It never preempts a move and the director drops it under reduced
   motion, while the engine waits and within five seconds of the user's drag;
   `CameraRequest.key` is read for a shake-only request and nothing else. Every
   word, star, splat and shake lands on the body the event NAMES (**D153**,
   `cues.json`'s rule): an attacker's word is its own flourish, never a hit on its
   defender. **And a star never hides that body** (**D154**): at a `figure`
   anchor it carries `Effect.aside` (the card's rest slot), and the pool pushes it
   in SCREEN space beside the body toward the screen's centre, then toward the lens
   and shrunk by the same ratio (in front of the body, the same footprint) —
   `besideAttacker` clear of the head, `besideStruck` on the body's edge.
   `motion.test.ts` projects every figure of `g1`@355/@359 from all five views
   through the real cue and the real pool (345 stars, 0 over a head; centred, 345
   of 345 were).

The lane's tests: `motion.test.ts` (13), and additions to `cues-exhaustive`,
`replay-cues`, `liveness` (one appended test: the lane's bodies allocate nothing,
the texture lookups and the streak's lane included, the ink drawn at mount, the
look's two `uMaterialize` writers, the pool at 49), `camera` and `workshop`.

## Lane BODIES — the conventions D156–D165 added

Five, and the thesis is one sentence: **a card's attitude, head and cloth are
shared data on the shared bodies, and its art lends colour only where no row
speaks.** Report 15 §9.3 is the brief, `docs/evidence/bodies.md` what was
measured (its *At merge* section first), PLAN.md's *Lane BODIES* the status and
follow-ups. Every earlier arena convention holds; these are what a change here
must also keep. **D156–D165 were written as D140–D149** in the lane's reserved
range and renumbered contiguously when the branch was rebased onto Lane MOTION's
merged tip `e2aee03` (2026-09-28), the third of report 15's three lanes to land;
the renumbering read each line's commit, because on every line Lanes LOOK and
MOTION wrote, D140–D149 are theirs.

1. **A resting pose is a model VARIANT, derived at load** (**D156**).
   `figures/rests.ts` is the closed table (`stand`, `folded`, `ready`, `aim`,
   `highReady`, `akimbo`, `clasped`, `braced`, `working`, `atEase`): a frame of a
   library clip,
   joint aims written as figure-space directions, and a breathing clip.
   `scene/models.ts`'s `deriveRestClip` SAMPLES it — never a mixer, never a
   ticked clock (liveness holds both) — into the `idle` of `<body>@<pose>`, the
   `modelId` `figurePose` names. Anything that reads `models.json` by id goes
   through `baseModelOf` (the prop field's binds, the squad's followers, the
   manifest's widths); a new pose is a row in `REST_KIT`, and `clips.test.ts`
   holds its clips and joints to the rig. Never a new cue id, and never a pose
   estimated from card art. **Judge a pose from above** (**D165**): the table
   view and the workshop's 1× look down on a figure, so a barrel pointed at the
   lens shortens to a stub, a hand in front of the belly draws low and an elbow
   behind the back draws high — Agent 13 rests at `highReady`, and `atEase`,
   `clasped` and `braced` were re-aimed for it. **A lean bends the spine from the
   waist**, not the chest alone: the coat's body rides `spine_01`, and `working`
   leaning only at `spine_03` stood the coat upright beside a leaning chest. **A
   figure that mounts in a held stance lands in it** (**D156**, amended at the
   lanes' merge): `FigureLayer`'s `mountRestLane` starts the rest lane's idle and
   `newFigureRig` hands that action to the clip lane as `rest`, so the first pass
   stops it — a rig registered with `rest: null` kept the signature pose blended
   50/50 into a tapped mount's kneel for life (`clip-lane.test.tsx`,
   negative-controlled).
2. **A head is props** (**D157**, **D158**). Hair and the face are derived kinds
   rigid on `Head`, written in figure units round the measured head
   (`HEAD_SHAPE`), one draw call per kind on the table. The bodies are drawn bald
   (`carveHair`, at load); a row with no `hair` keeps its body's own
   (`BODY_HAIR`); hair wears the costume's `hair` slot. `face` is `on`,
   `patched` (no eye under an eyepatch) or `none`. The face identifies no card,
   so it is held to its own bar, not the identity raster's 48 — restated at the
   lanes' merge for **D143**, which put every face the arena shows on the FAR
   seat: ≥ 4 px at the table view and over the shoulder on the seat whose
   figures face the lens (a patched face with its patch), ≥ 32 in the workshop's
   `1× front`, where a face is seen close (**D158**, amended). **A thing worn
   round the skull fits the head it is on**: a kit anchor may be `bald: true` or
   `false` (`PropAnchor.bald`, picked by `anchorsOf(kind, family, bald)` from the
   pose's `hair`), and the eyepatch's strap is a band pushed onto the head's own
   ellipsoid (`onHeadSphere`), so on bald Fury it hugs the skull (**D157**,
   amended). **An expression
   is a pose** (**D165**): `expressionOf(stance)` sets the jaw — `faceGrit` /
   `facePatchedGrit` while the snapshot says the figure kneels, attacks or blocks —
   and pain on a hit is a cue, lane MOTION's. **Hard rule 8**: an anonymous figure
   has no rest pose, no hair, no face and no art colour (asserted over 1,179
   corpus instances, with a palette map that answers every name).
3. **Cloth drapes as a chain of rigid panels on joints** (**D159**, amended by
   **D162**) — no simulation, no clock, no rigid shell below the chest. `coat` is
   the yoke on `spine_03`; `coatTails` is the body on `spine_01` and a two-link
   skirt; `cape` hangs down the back. **A skirt link never rides a leg bone
   outright**: it hangs from the pelvis and `follow`s its thigh part-way
   (`SKIRT_FOLLOW`, a two-joint blend of the same anchor), and its lower link
   `hang`s from the upper one toward the upright. The anchor's `joint` is the
   STEADY bone, because the duelists' baker ignores `follow` and `hang` and keeps
   a panel rigid on `joint`. The first cut rode the calf, and a kneeling Fury
   trailed an edge-on sliver across his card: `traits.test.ts`'s drape test
   samples six clips at eleven phases and fails that design (a lower link 87°
   from hanging, against the kit's 6°). New cloth is more `COAT_PANEL` anchors,
   judged in the workshop at ready, kneeling, attacking and blocking. A kind's
   buffer holds `PROP_CAPACITY` = 64 instances — a coat is fourteen, and the
   default mirror can put four on the table (a test holds it). **A coat is cut
   to the body it is on** (**D163**): its axis is the body's, every hem within
   0.2 of a height of the pelvis at rest, open down the front — `traits.test.ts`'s
   fit test, with the D162 bell as its negative control — **and so is the yoke**:
   `scene/props.ts`'s `YOKE_CUT` tapers it to the body link it overlaps, whose
   top (`COAT_CHEST`, 0.70) sits above the yoke's pitched hem; the yoke-seam test
   holds the step under 0.025 of a height, never inside by more than 0.012 and
   never a gap, with D163's flared yoke as its control. **Cloth is LINED**: a
   `coatTails` or `cape` geometry carries a reversed, inset second sheet unless
   the caller asks `{ lining: false }` — the prop field does (it is `DoubleSide`),
   the duelists' `FrontSide` bake does not, and that is what makes a duelist's
   coat a coat from behind and his cloak a cloak from the front.
4. **The art palette is the LOWEST rung, runtime only, face up only** (**D160**).
   `arena/art.ts` is the only arena module that reads pixels, and
   `paletteNamesOf` its only entry point (it skips every back and every redacted
   stub); nothing in `scene/`, `cues/` or `figures/` imports it; `figures/palette.ts`
   is the pure k-means. Palettes reach `figurePose` and `tilePose` as a map at
   commit, never in the frame loop, and a palette map is read in exactly two
   places — `pose.ts`'s `paletteFor` and `tilePose`'s land lookup — each with its
   own gate (liveness holds both, and `palette.test.ts`'s HOSTILE corpus hands
   every back and every stub a real name, so removing any one gate fails it). A
   palette never paints a costume, a hand-written row always wins, `palette: off`
   turns it off, and **nothing derived from card art is committed** —
   `palette.test.ts`'s pixels are synthetic. **The costume never takes the art
   rung**: `figurePose` dresses the body in the tint without it (a hand-written
   tint, else the colour identity), held by a row-less-person test rather than by
   the data. **It is drawn since the lanes' merge** (**D164**, amended): the
   pass-through `paletteNamesOf(placed)` → `useArtPalettes` → `figurePose` /
   `tilePose` is in `Arena.tsx` and `workshop/Pedestal.tsx` (lane LOOK's files; the
   merge pass applied the lane's follow-up 13 as written), so the arena and the
   pedestal draw the rung at once. Liveness holds the hook's callers: `Arena.tsx`
   and `Pedestal.tsx` EXACTLY once each, fed only by `paletteNamesOf` and handing
   the map to both pose functions (negative-controlled), and the tuning panel (its
   own face-up card's, for the swatches and the framing's poses); no other file.
   **Each gate has a hostile case only it stops** — a named back, a named stub in
   a face-up slot, a face-up card with the face-down empty name — so removing any
   one of the gates in `paletteNamesOf`, `paletteFor` or `tilePose` fails
   `palette.test.ts` (the merge ran all nine removals, `docs/evidence/bodies.md`).
   The accent is the vivid cluster with the best
   `share × (0.3 + saturation) × (0.4 + value)`.
5. **The library's budget is the manifest's** (**D161**): `budget.libraryBytes`
   460,800 and `budget.triangles` 30,000 in `tools/assets-manifest.json`, read by
   `tools/build-figures.mjs` (still the only writer of `models.json`) and pinned
   by `figures.test.ts`. The Universal Base Characters zip is not re-downloaded
   without the user's approval in chat (PLAN.md's lane BODIES follow-up 2).

The lane's tests: `palette.test.ts` (new — the hostile corpus is the one that
proves the gates), liveness's lane BODIES clause (now also every caller of
`useArtPalettes`), and new cases in `traits.test.ts` (the task list of poses and
hair, the face raster, kind triangle budgets, the drape test with the first cut
as its negative control, the drape rule's form, the prop capacity, the coat's fit
with the D162 bell as its control, the yoke's seam with D163's yoke as its
control, the lining, grit over the corpus, and a palette that never paints a
costume),
`clips.test.ts` (every pose's clips and joints, the bald body), `facing.test.ts`
(the face on the front, the patched eye on the patch's side, the coat open at the
front) and `figures.test.ts` (the budget); and, at the merge, `clip-lane.test.tsx`'s
tapped mount and the polish lane's poll clause in liveness's follow-mode test
(a `setTimeout(`, `setInterval(` or `requestIdleCallback(` under `web/src/arena/`
fails unless its line says `// ALLOW timer: <reason>` — the art rung's two
one-shots are the only two). The identity raster runs on Lane LOOK's
seats and ink since the merge: Peggy's shield, the Agents' parted hair and Wasp's
bob are details with partners (**D165**, amended; each `ONE_SIDED` row names the
side it reads on and the partner for the other, and the two hairs are details by
measurement, not by nature — PLAN.md's Lane BODIES follow-up 29), the sidearm is the pistol at
70%, Coulson's chest badge 0.075, and `SHORTFALL` is empty. The lane added no gate
step. **Headroom is gone at @316**: merged, the worst `g1`@316 sample (SwiftShader,
bloom off) draws **90 calls and 29,521 triangles** — ON report 13 §8.2's 90-call
line and 479 under its 30,000 (the GTX 1080 86 and 26,339); `g1`@355, bloom off,
is 87–88 and 26,539–26,541 on both (`docs/evidence/bodies.md`'s *At merge*, and
its re-measure on `a08c15f`). The lane's own number, 88 and 29,397, was the branch
before the merge. So measure (`tools/arena-bench.mjs`) before the next kind — and bench base and branch in interleaved pairs, reporting
the spread: on a loaded machine one pair is noise.

## The status layer — the conventions D210–D212 added

Four, and the thesis is one sentence: **a creature's status is a pose drawn in
one call, and a concealed card has none.** The owner asked for a Final Fantasy
XIII reading of the table: keyword icons, a bar of what is left of the toughness,
a pip per counter and a mark per attachment over each creature, and a turn-order
bar. Amendment **M49** put the keywords on the wire (`docs/protocol.md`);
`docs/evidence/status-layer.md` is what was measured, PLAN.md's *The status
layer* the status and the follow-ups.

1. **One decision, two renderers, a pose.** `web/src/status.ts` (pure: no React,
   three or DOM) is the glyph kit, the keyword mapping and `cardStatus(card)`, and
   the board's `CardTile` and the arena's `figures/status.ts` both draw from it.
   Keywords are read through `protocol.ts`'s `keywordsOf` and nothing else. The
   strip remembers nothing — the bar is the snapshot's damage (D211: a picture of
   `toughness − damage`, never a verdict) — so a skip, a scrub and a `resync` draw
   it with no history. A drain that animates would be a cue, through an offset
   that decays, measured against `motion.test.ts`'s pinned film first.
2. **Hard rule 8 on the strip.** `figures/status.ts`'s `strippable` gives no
   strip to an anonymous figure, a ghost, an uncrewed Vehicle or a back, and
   `cardStatus` answers `null` for a stub and for EVERY face-down card, whatever
   it carries. `status.test.ts` sweeps the corpus and a hostile copy of it (every
   card handed keywords) with an ungated layout as the negative control; a new
   surface that draws status goes through `cardStatus`, or it is how a fact about
   a concealed card gets on screen.
3. **`scene/status.ts` is ONE mesh, and a pose layer on the one loop** (D212):
   one `InstancedMesh`, one material, one texture — one draw call for every strip
   on the table, because the budget had none to spare (`g1`@316 went from 90 to
   91 on SwiftShader, @355 is 88/89). Built, installed and committed by
   `FigureLayer` from `statusLayout`, bound only from `DiscField.bind`, allocation
   free (liveness's body list names `StatusField.bind` and `.track`). A new kind
   of status is a new atlas cell in the same mesh, never a second mesh.
4. **A billboard in pixels, above the head by measurement.** A quad is CSS pixels
   from a world anchor (`layout.ts`'s `statusAnchorOf`: the standing height plus
   `STATUS_LIFT`), against the viewport the renderer is drawing into (read per
   draw, so the workshop's split view and the composer's target hold). An icon is
   16 px — the owner's floor is 14 — and the strip's lowest pixel is 8 px above
   the anchor; it stays upright when its figure kneels. `status.test.ts`
   rasterises every figure pose of a corpus sample through the table view's
   camera and the real `figures.glb` and holds the strip above every head and
   what it wears, with a no-lift control: move the anchor or the lift and it
   says where it fails.

The turn-order bar is `DecisionLayer.tsx`'s `TurnOrderBar`: it reads what the
board's `PhaseStrip` reads and sends the same `setPhaseStop`, so it is a second
drawing of one control, not a second control; its `.arena__phases` class is in
liveness's widget table with its `pointer-events: auto` rule.

## The personal tier — the conventions D194–D198 added

Five, and the thesis is the tier's own sentence (**D190**): **a personal model is
a statement about what a card is, and it is drawn from the dev server alone.** The
user's own models (`personal/models/`, gitignored, never published) dress the
cards and the seats their manifests name, on this machine; `tools/CLAUDE.md`'s
*The personal tier* is the pipeline that makes them, `docs/guides/personal-tier.md`
the manual, `docs/evidence/personal-tier.md` §16–§18 what was measured.

1. **One reader, one lookup, one dressing — pure** (**D195**). `arena/personal.ts`
   imports no three, no React, no DOM and no clock (`liveness.test.ts`).
   `personalOverlayOf` is THE reader of the dev route's index: ids are OPAQUE
   (`p0`, `p1` — never a slug, so none can reach an op log, a label or the wire),
   a model path is same-origin and relative or the entry is dropped, and the caps
   apply. `personalChoicesOf` is THE lookup and hard rule 8's renderer half for the
   tier: the pose's gates (a named, modelled figure — not anonymous, not a swarm,
   not a silhouette) and the placement's (face up, not a stub) are decided BEFORE
   the name is read. `personal.test.ts` sweeps the corpus three ways, hostile
   included, and each gate removed by hand fails it. `dressPoses` dresses a choice
   only once its model has LOADED — so a failure is the CC0 figure with its props —
   with no props, no costume, no hair and the height refitted to the model's own
   resting width (D65 strict). Call both only from `Arena.tsx` (and the workshop's
   pedestal, as the arena does).
2. **Dev only, one loader** (**D195**). `scene/personalModels.ts` names
   `personal/index.json` behind `import.meta.env.DEV` on its own line — a build
   carries no address of the route (`personal.test.ts` greps `dist`) — and reads it
   with three's `FileLoader`, once a page, never a poll. A model loads through
   `scene/models.ts`'s `loadPersonalModel` (its own `GLTFLoader` and
   `MeshoptDecoder`, never drei's), which builds the base and its resting-pose
   variants from the clips the file carries: nothing is retargeted in the arena.
   A same-origin load path in arena code is in liveness's `PATH_ALLOW`, beside the
   URL clause's `URL_ALLOW`.
3. **The model-source choice is one function** (**D195**). `FigureLayer`'s
   `modelOf` — a dressed pose's personal model (its variant, else its base), else
   the CC0 library's — serves the living figure and the departing body; the rest of
   the layer is unchanged, the status strip included: `statusLayout` reads the
   DRESSED poses, so a dressed figure's strip stands over its model's refitted
   height and is gated by `strippable` like any other (the status layer's
   convention 2). `DuelistLayer` builds a seat's duelist from a model that
   dresses the seat: its own props in it, ours not baked in, the gestures on our
   clip lane, the stance rules unchanged. Neither takes a click (`raycast` cleared).
4. **Own colours, ONE material a figure** (**D196**, **D240**). A personal map is
   the model's OWN colour (`uPaintOwn` 1): the comic look paints the texture as it
   is, the hologram tints its values; a cutout paint discards under 0.5 alpha.
   Since D240 a prepared model is one skinned primitive under one paint (prepare's
   atlas, `tools/CLAUDE.md`'s *The personal tier*), so `dressFigureMeshes` puts ONE
   material on every mesh — D196's sibling material for a second paint is gone, and
   the frame loop writes one material per figure, as ever. **"Black is blue"
   is the CC0 palette's rule, never a model's** (**D198**): `comicPaintOwn` lifts a
   dark own texel in value from `COMIC.ownFloor` with its own hue (a neutral stays
   neutral), and prepare has already exposed a texture too dark to read unlit.
5. **The budget is a sum, and it is in `perf.ts`** (**D195**, **D197**).
   `PERSONAL_TRI_CAP` (8,000 triangles) and `PERSONAL_CALL_CAP` (ONE draw call a
   figure since **D240** — the dev route counts the primitives in the very
   `model.glb` it serves) refuse a model, in the dev route and in the reader; `PERSONAL_MAX_FIGURES` (4) dresses
   at most four creatures; and `PERSONAL_TABLE_TRIS` (36,000) is the most personal
   triangles on the table at once, which `personalChoicesOf` spends — the seats'
   models first (`seatTriangles`), then the creatures in placement order, one that
   would cross it keeping its CC0 figure. Report 13 §8.2's 30,000 stays the CC0
   table's line; the personal tier's is added to it. The worst case (six two-paint
   models filling the sum at `g1`@316) is 50,225 triangles and 90 calls on the GTX
   1080 with p95 unchanged, 53,407 and 95 on SwiftShader with the median 4 ms
   slower — and on the status layer, whose strip is one call more, 91 calls and
   50,305 triangles on the GTX 1080, 95 and 53,297–53,421 on SwiftShader, where
   the CC0 table reads 87 and 89 (evidence §19); since D240 a dressed figure is one
   call, and over every frame of `villain-doom-248` the tier on draws no more calls
   than the tier off (`docs/evidence/arena-personal-polish.md`). Measure with `tools/arena-bench.mjs --personal` against the DEV server
   (`?personal=0` for the A/B, `MTG_TABLE_PERSONAL_DIR` for a scratch tier) before
   moving any of the four.

## Villain identity — the conventions D220–D222 and D230–D233 added

Seven, and the thesis is D75's: **a villain reads as itself through data on the
shared kit.** The Doom Legion — the deck a bare `./scripts/play.sh` seats against
you — has a committed recording (`fixtures/games/villain-doom-248.jsonl`, D220)
and an identity for every creature it names (D221); its crowded last turns are
over the bench's lines before any identity is drawn (D222). The second lane
(D230–D233) did the same for the three other AI decks — the Masters of Evil, the
Hulk family and Wakanda, a recording each (`villain-masters-of-evil-33`,
`villain-hulk-family-261`, `villain-wakanda-232`) and fifty rows — and added
conventions 4–7 (its fix pass D232–D233: nine rows re-dressed at the table's
distance, and the triangles). `docs/evidence/villain-identity.md` is what the first lane
measured, and its §3 has every corpus count quoted in this file that moved when
the corpus went from 19 recordings to 20; `docs/evidence/more-villain-identity.md`
§3 has them again for 20 to 23. PLAN.md's *Villain identity* and *More villain
identity* have the status and the follow-ups.

1. **A Villain is a person, and the rows dress it.** `figures.json`'s
   `creature/subtype:villain` rung (the man's body) comes after robot, scientist,
   spy, hero and soldier in `SUBTYPE_ORDER`, so it stands every Villain no earlier
   rung claims — before it a black Human Villain had no rung and stood as a glow
   disc. The rows in `traits.json` and `cues.json` say who each one is; a new AI
   deck's villains start from the rung.
2. **A mask is a face, and a cowl carries it from behind.** `mask` (a prop kind,
   colour `tint`, in unit-head space like the eyepatch) and the `cowl` hairstyle
   (`hairCowl`, the hair slot, a hood with a mantle to the shoulders) are shared
   kinds. The mask tucks under the cowl's brow, and the raster's `ONE_SIDED`
   names the cowl as its partner, so a masked row wears one. A row that wants its
   cloth and its face in two colours puts the face on the tint. The raster's
   cloak and tunic rows are Doom's alone (`only`): every other wearer's cloak and
   coat must read from both seats.
3. **A row the corpus cannot reach is named, never kept in silence.**
   `traits.test.ts`'s `OFF_THE_TABLE` lists the Doom Legion rows no recording
   puts on the table, each with why, reads their identity off a pose built from
   the workshop catalog's facts, and fails the day a recording reaches one. Its
   `OVER_THE_LINE` holds a recording whose crowded table is over the lines before
   any identity (D222: `villain-doom-248`'s 49 battlefield cards, 124 calls on the
   base tree at its worst frame) to its own measured prop kinds — at once, and on
   its most crowded frames — while every other recording keeps the 17. Each kind
   a villain row adds is a draw call on that table, so a new row reuses a kind the
   table already draws where the look allows. Find a recording's worst frame by
   sweeping every frame: `tools/arena-bench.mjs` reads its counters at the end of
   a five-second sample at 4×, fifty frames past its `--index`.

4. **A Human is a person, and a skin is a costume only when the body is
   transformed** (D231). `figures.json`'s `creature/subtype:human` rung stands a
   Human no earlier rung claims in the man's body — before it a green or red Human
   stood as a glow disc. Every person wears the one skin tone; a row paints the
   costume's `skin` slot only where the skin IS the costume (a gamma body, lava, a
   radioactive glow, a shark's hide, a cat's fur), and `traits.test.ts`'s
   `TRANSFORMED_SKIN` is the whole list — a row that paints a skin and is not on it
   fails. A dark paint is lifted to navy by the comic look, so a hair colour that
   must not read as a blue cap (the Hulks') sits over `COMIC.blackAt`.
5. **Reuse first, and a new kind carries its measured cost** (D231). The kit's
   one new kind for the three decks is the `spear` — planted at the right side on
   `root`, so it holds in every rest and every kneel — admitted with its call
   measured at Wakanda's worst frames (+1) and paid for on the same table by a
   reuse (T'Chaka's cloak for a two-kind robe). A person's `visor` stands outside
   the head's outermost shell, and a person's `wings` hang low enough to keep their
   tips under the status strip; a squad over the figure budget is a disc with no
   swarm. `OVER_THE_LINE` holds each villain recording to its own measured kinds.
6. **The corpus's late and odd frames are named, not smoothed** (D230). A
   snapshot that runs ahead of its own zone event (Web Up exiling Moonstone: the
   death is queued a batch after the departure is decided) is held to its one in
   `clips.test.ts` — and it is a **flush-timing race**, not the engine's order: of
   six re-records one put the two in the same frame, so a re-record can move the
   count, and the arena waiting a batch for a death is the fix. A token sacrificed
   for its own ability is backed by the frame before and no further
   (`fixtures.test.ts`'s `unbackedNames`, which reads the wire's `token` field,
   never the name); the Monarch's draw is the stack's second `orb` type line. A
   card's arrival and another event's cue of the same id play once — the arrival
   (the queue's rule 6b). The terrain's cap is **32** since D230: the corpus's
   busiest table PLACES 25 lands (`villain-wakanda-232@525`–`@532`), past the old
   24, and `tiles.test.ts` counts lands placed apart from tiles laid.
7. **A look is judged at the table's distance, and the part identity owns of
   the triangles is held** (D232, D233). A row is read against its neighbours on
   the same table, not against its card alone: the green bodies of the Hulk
   family differ pairwise in skin, top or trousers (`traits.test.ts` holds it),
   and a squad's followers wear the leader's `top`, which is how the Masters of
   Evil stand two figures in shadow behind Zemo. The census holds every row of the
   three decks to its own `card` rung, and a face-down control turns every
   dressed name face down (the three recordings carry no concealed battlefield
   card, so the corpus sweeps say nothing about them). Report 13 §8.2's 30,000 is
   **not met** on the Doom Legion's, the Masters of Evil's and Wakanda's crowded
   tables; D222 and D233 accept each with its numbers, and `traits.test.ts`'s
   `FIGURE_TRIS_HELD` holds the figure layer — bodies and props, the part identity
   owns — to each villain recording's measured worst and every other recording to
   theirs (`g1`@342), within 5%. A row that adds triangles to one of those tables
   moves a held number, with its measurement. A person's skin is still the one
   tone; PLAN.md's owner question 31 asks whether it should follow the card.

Three arena fixes came with the first recording (D220), each a defect it was the first
to show: the queue's rule 6 plays a land's two arrival events — its `zone` event
onto the battlefield and its `land` event — as one arrival (every land with no
row of its own rose twice); a wrapped rank's back row takes clicks at its card's
own depth (`layout.ts`'s `proxySizeOf`, which `HitProxy` reads), so a click on a
front card's centre is the front card's; and a back-row figure steps ±0.035 aside
when every step back is covered, with `figure-pose.test.ts` telling a figure
*boxed in* — nowhere clear on its card — from one standing on another card.
The workshop's relief window (D225–D228; `web/CLAUDE.md`'s *The relief window*)
is the personal tier's inspect backdrop, and it is not a card: nothing under
`arena/` draws or reads it, `CardPlane` stays the one card renderer, and only its
four numbers live here, in `perf.ts` (`RELIEF_DEPTH`, `RELIEF_GRID`, since its two
layers `RELIEF_CLIFF` — `tools/personal/relief.mjs` reads those two too, and
changing either makes every map stale — and, since its keep mask,
`RELIEF_MAP_VERSION`, which `relief.mjs`'s `RECIPE_VERSION` must equal). The arena's own card zoom has
no window yet — PLAN.md's relief-window follow-up names where one would mount.

**Inspect from the table** (**D241**) is navigation, not a renderer:
`arena/inspect.ts`'s `inspectTargetOf` is THE planner of what the `I` row
(`keys.ts`'s `inspectCard`) and the `.arena__inspect` chip under the art credit
open — the workshop's inspect view, `#workshop?card=<name>&view=inspect` — for the
card under the pointer, else the last clicked, else the last pointed at. It is
pure (liveness), `Arena.tsx` is its one caller, and it reads a name only after
the placement's gates: a face-down, hidden or redacted card is `inert` with its
reason and never named (`inspect.test.ts` sweeps the corpus made hostile, with an
ungated control). The arena answers the plan with a hash and nothing else — no
act — and the workshop's ▣ arena link comes back to the same frame.

## Sound — the conventions D250–D252 added

Four, and the thesis is one sentence: **a sound is a cue param, timed by the queue
and played by the one loop, and a concealed card sounds like any card.** README's
*Sound* is how to use it, `docs/evidence/sound-cues.md` what was measured, PLAN.md's
*Sound cues* the status and the follow-ups.

1. **A sound is three params, and the queue fires it** (**D250**). `sound` (a clip
   from `cues/sound.ts`'s closed `SOUND_IDS`, or `none`), `soundAt` and `soundGain`
   are rows in `validate.ts`'s `PARAM_SPECS`; `defaults.ts`'s `DEFAULT_SOUNDS` is the
   small default set by selector (`outcome:won` / `lost` / `draw` are the viewer's
   side of the result), and a row's key falls through to it one key at a time. No
   cue implementation touches sound: the queue stamps each cue's decided sound at
   enqueue and calls `Stage.playSound` once, when the cue's REAL progress crosses
   `soundAt` in `#drive`, so it rides the virtual clock and needs no timer. **A snap
   is silent** — `flushAndSnap`, `skipCurrent`, `stepBatch`, a cue compressed to no
   length — and each of them, and a pause, calls `Stage.stopSounds`; `clearAll` does
   not, because it is also every batch's natural end. `playSound` is not an op in
   `NullStage.ops`, so the pinned film (`motion.test.ts`) never sees a sound.
2. **Hard rule 8: a concealed card plays only its event's DEFAULT** (**D250**). A
   per-card sound is a name by another spelling. `sound.ts`'s `soundFor` reads no row
   — not its clip, moment or gain — for a stub or any face-down card (`isConcealed`,
   the flags, never the name), and `resolve.ts` writes the decided sound over the
   row's. `replay-cues.test.ts` sweeps the corpus made hostile, with an ungated
   control; `sound.test.ts` and the workshop's test hold the same line on a named stub
   and on the pedestal's concealed shapes.
3. **`scene/audio.ts` is THE audio module, bound from `CueRunner`** (**D250**, D251).
   It imports only the sound vocabulary — no three, no React, no timer, no
   `fetch` (the clips come through the loader it is handed, `models.ts`'s
   `loadAssetBytes`), no storage (the choice is `Arena.tsx`'s, in `try`, under
   `mtg-table.arena.sound`). `SceneStage` collects a frame's sounds in a fixed
   `PendingSounds`; `CueRunner`'s loop calls `audio.bind(stage.sounds, soundPan)`
   after the tick. `play` takes a free voice's armed source — no node, no object; a
   ninth sound is dropped. Liveness holds the shape, the one caller, the queue as the
   only firer, and the play path's bodies in the allocation scan.
4. **Muted by default, and nothing before a gesture** (**D251**). `SOUND_DEFAULT` is
   `false`; `unlock()` builds the context and is called only from a gesture's handler
   (the strip's checkbox, `M`, the first press after a stored ON); an explicit ON is
   heard under `prefers-reduced-motion`. `sharedAudio` is the page's one instance, the
   arena's and the pedestal's.

**The clips are data too** (**D252**): eleven Ogg Opus files under
`web/public/audio/`, the repository's own (`tools/build-sounds.mjs`), each with its
bytes and sha256 in `tools/assets-manifest.json`'s `procedural.soundClips` —
`sound.test.ts` fails on a stale row, a file no id names, or a total over 100 kB. A
new clip is an id in `SOUND_IDS`, a path in `SOUND_FILES` (liveness allows the shape
`audio/<id>.ogg` in that file alone), a file and a manifest row. A pack clip replacing
one keeps its path and gets a `packs` entry with its provenance. After changing any
rule line above, regenerate the rules manifest:
`CLAUDE_MD_RULES_WRITE=1 node --test web/test/claude-md.test.ts`.
