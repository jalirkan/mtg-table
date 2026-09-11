# 09 — Arena mode, Tier 1: the technical plan for M7

Status: plan, 2026-09-11. Written so M7 Tier 1 can start the evening M6 ships.
Scope: **Tier 1 only** — the 3D table, cards as textured planes, no models, no avatars.

Inputs: `docs/ideas/arena-mode.md` (the idea, the tiers, the per-card cue table),
`PLAN.md` M7, `docs/protocol.md` §3.2 / §3.6 (the `Card` shape and the `events`
list), `docs/research/05-architecture-synthesis.md` §2/§3/§4/§7 (the spec),
`docs/research/03-scryfall-card-library.md` (art resolution), `CLAUDE.md`.

Everything in §1 was verified live today against `registry.npmjs.org`,
`api.github.com`, `threejs.org`, `api.scryfall.com` and `cards.scryfall.io`, or
measured by building real bundles in a scratch project. Everything in §2 onwards
is design; where a design point rests on a verified fact the citation is inline.
Forge claims are cited as `javap` output against
`/home/justin-a/forge/forge-gui-desktop-2.0.14-jar-with-dependencies.jar`.

**This document writes no code and touches nothing under `web/`, `bridge/`,
`tools/`, `fixtures/` or `var/`.** Those belong to the M0–M6 workflow.

---

## 0. The one-paragraph version

The arena is a second `render(state)` for the same `ClientState` the 2D board
already gets, lazily code-split so the 2D app pays nothing for it (**measured: the
non-arena entry chunk stays at 46.3 kB gzip; the entire 3D stack lands in a
separate 241 kB gzip chunk fetched only when you open the arena**). Cards are
unlit textured planes built from the Scryfall `normal` JPEG we already fetch;
`cards.scryfall.io` sends `access-control-allow-origin: *`, so `THREE.TextureLoader`
can upload them to WebGL directly. The authoritative pose of every object is a
pure function `layout(state)`; animation cues contribute only *transient offsets*
that decay to identity, which is what makes them skippable, interruptible and
structurally incapable of blocking input. Clicks raycast against invisible static
hit proxies parked at the resting pose, so a card being animated is never a moving
target. Six evenings, five of them testable headlessly with `node --test`.

---

## 1. Dependencies — verified live, 2026-09-11

### 1.1 The three packages

| Package | Latest stable | Licence (npm + GitHub) | Repo activity |
|---|---|---|---|
| `three` | **0.186.0** | MIT (`registry.npmjs.org/three/latest` → `"license":"MIT"`; `github.com/mrdoob/three.js` → `spdx_id: MIT`; `LICENSE`: "The MIT License / Copyright © 2010-2026 three.js authors") | `pushed_at 2026-09-11`, 115,409 stars, not archived |
| `@react-three/fiber` | **9.7.0** (2026-07-31) | MIT (npm + GH `spdx_id: MIT`) | `pushed_at 2026-09-08`, 32,248 stars, 74 open issues |
| `@react-three/drei` | **10.7.8** (2026-08-05) | MIT (npm + GH `spdx_id: MIT`) | `pushed_at 2026-09-07`, 9,863 stars, 139 open issues |

Weekly downloads (`api.npmjs.org/downloads/point/last-week`, 2026-09-04 → 09-10):
three 12,123,869; fiber 3,974,625; drei 3,005,225. All three are load-bearing
infrastructure, not hobby projects.

**Licence compatibility.** MIT is permissive and GPL-compatible in both
directions. Bundling MIT JavaScript into a GPL-3.0-or-later work is fine; the only
obligation is to preserve the copyright notices, which Vite does not strip from
license comments by default but which we should make explicit by adding three,
react-three-fiber and react-three-drei to `NOTICE` when M7 starts. This does not
disturb decision D11 and adds no AGPL exposure.

### 1.2 React 18 vs React 19 — the one real fork in the road

**`web/` uses React 18. `@react-three/fiber@9` requires React 19.** From the
project's own README (`raw.githubusercontent.com/pmndrs/react-three-fiber/master/readme.md`):

> Three-fiber is a React renderer, it must pair with a major version of React,
> just like react-dom, react-native, etc. @react-three/fiber@8 pairs with react@18,
> @react-three/fiber@9 pairs with react@19.

Verified peer ranges:

| Package + version | `react` peer | `three` peer | `@react-three/fiber` peer |
|---|---|---|---|
| `@react-three/fiber@8.18.0` | `>=18 <19` | `>=0.133` | — |
| `@react-three/fiber@9.7.0` | `>=19 <19.3` | `>=0.156` | — |
| `@react-three/drei@9.122.0` | `^18` | `>=0.137` | `^8` |
| `@react-three/drei@10.7.8` | `^19` | `>=0.159` | `^9.0.0` |
| `@react-three/postprocessing@2.19.1` | `^18.0` | `>= 0.138.0` | `^8.0` |
| `@react-three/postprocessing@3.1.1` | `^19.0.0` | `>= 0.156.0` | `>=9.7.0` |

Two facts that decide how to read that table:

1. **The React-18 line is frozen.** `@react-three/fiber@8.18.0` and
   `@react-three/drei@9.122.0` were both published **2025-02-19** — the same day
   `fiber@9.0.0` (13:25Z) and `drei@10.0.0` (13:43Z) shipped. Nineteen months
   later there is still no 8.x release and **no `v8` maintenance branch on
   `pmndrs/react-three-fiber`** (branch listing fetched today: `master`, `v10`,
   and ~25 feature branches — no `v8`), and no `v9` branch on `pmndrs/drei`. The
   React-18 line will not get a fix for a future `three` regression.
2. **React "latest" is already outside `fiber@9.7.0`'s range.** `react`'s
   `dist-tags.latest` is **19.3.0**, and `fiber@9.7.0`'s peer is `>=19 <19.3`
   (tightened from `^19.0.0` at 9.5.0). If we go React 19 we must pin
   **19.2.8**, not `latest`.

**Do the two frozen packages actually work with today's `three`?** Measured, not
guessed. In a scratch project (`react@18.3.1`, `react-dom@18.3.1`,
`three@0.186.0`, `@react-three/fiber@8.18.0`, `@react-three/drei@9.122.0`,
`@types/three@0.185.4`, `vite@5.4.11`, `typescript@5.6.3`):

- `npm install` resolved with **no peer conflict**.
- `vite build` succeeded.
- `tsc --strict --noEmit` exited **0**.
- A script that imports `three@0.186.0`'s ESM build and checks every
  `THREE.<Name>` identifier appearing in fiber 8.18.0's dist found
  **20 names referenced, 0 missing**.
- The same check across all of `@react-three/drei@9.122.0` found 105 three names
  referenced and exactly **two missing: `Event` and
  `WebGLProgramParametersWithUniforms`** — and both are *type-only*:
  `WebGLProgramParametersWithUniforms` appears only inside `// FIXME` comments
  (`drei/core/MeshDistortMaterial.js:22`, `MeshWobbleMaterial.js:18`,
  `useBoxProjectedEnv.js:51`) and does exist in `@types/three@0.185.4`
  (`src/materials/Material.d.ts:22,588`); `THREE.Event` appears only in
  `TrackballControls.d.ts` / `DeviceOrientationControls.d.ts` and a comment in
  `web/Select.js` — components Tier 1 does not use. There is **no runtime API gap**.
- Fiber 8.18.0 touches none of three's removed colour APIs: `useLegacyLights`,
  `physicallyCorrectLights`, `outputEncoding`, `LinearEncoding`, `sRGBEncoding`,
  `WebGL1Renderer` — 0 occurrences each in its dist (and 0 in three 0.186 too).

One real wart: `npm install` prints
`npm warn deprecated three-mesh-bvh@0.7.8: Deprecated due to three.js version
incompatibility. Please use v0.8.0, instead.` — drei 9.122 pins
`three-mesh-bvh@^0.7.8`. Tier 1 does not use drei's `Bvh`/`useBVH` (accelerated
raycasting for huge meshes; 40 quads do not need it), so this is cosmetic. Silence
it with an `overrides` entry if it annoys, and never import `Bvh`.

**Recommendation: build Tier 1 on the React-18 line, pinned to exact versions.**

```jsonc
// web/package.json — exact, no carets
"three": "0.186.0",
"@react-three/fiber": "8.18.0",
"@react-three/drei": "9.122.0",
"@types/three": "0.185.4"       // devDependency; three ships NO types of its own
```

Rationale: it is a ten-minute install that changes nothing about the 2D board at
exactly the moment we are introducing a whole new renderer, and today's evidence
says it builds and typechecks clean against the newest `three`. **Exact pins are
not optional** — `fiber@8`'s `three` peer is `>=0.133` with no upper bound, so a
floating `^` would happily install `three@0.200` in a year and break a library
that can no longer be fixed.

**The named trip-wire.** Switch the whole of `web/` to React 19 + `fiber@9.7.0` +
`drei@10.7.8` + `react@19.2.8` the first time any of these is true:

- the E1 spike (§11) shows a **runtime** break on the v8 line that a pin to
  `three@0.173.0` (the last `three` released before fiber 8.18.0, 2025-01-31) does
  not fix;
- Tier 2 needs a drei or fiber feature that exists only in v10 / v9;
- we want `@react-three/postprocessing` (real bloom) and decide v3 is worth it.

The upgrade is small and should be costed honestly now so it is never scary later:
`createRoot` is unchanged, plain hooks are unchanged, and a two-week-old codebase
using neither `ReactDOM.render`, string refs, `propTypes` nor `defaultProps` on
function components has essentially nothing React 19 removed. The measurable cost
is bundle size on the *2D* path: **React 19 baseline measured 193.41 kB / 60.43 kB
gzip vs React 18's 142.50 kB / 45.76 kB gzip** — +15 kB gzip on every page load,
arena or not. The 3D stack itself costs the same either way (§1.3).

### 1.3 Bundle size — measured, not estimated

All figures from `vite@5.4.11` production builds (`reportCompressedSize: true`) in
a scratch project. "min" = minified bytes, "gz" = gzip.

| Build | min | gzip |
|---|---:|---:|
| React 18 only (button + `useState`) | 142.50 kB | **45.76 kB** |
| React 19 only | 193.41 kB | **60.43 kB** |
| + `three@0.186` + `fiber@8.18` (40 plain planes, `useFrame`) | 1,021.26 kB | **280.71 kB** |
| + `drei@9.122` — `OrbitControls`, `useTexture`, `Html`, `PerspectiveCamera` | 1,048.71 kB | **289.35 kB** |
| + `drei` `<Text>` as well (pulls `troika-three-text`) | 1,168.84 kB | **333.55 kB** |
| React 19 + `fiber@9.7` + `drei@10.7.8`, same "drei-lite" scene | 1,127.22 kB | **311.90 kB** |
| React 19 + `fiber@9.7` + `three/webgpu` (WebGPURenderer) | 1,690.46 kB | **468.25 kB** |

Reading:

- **The 3D stack costs ~244 kB gzip**, and it costs the same on either React line
  (289.35 − 45.76 = 243.6 gz on v8/18; 311.90 − 60.43 = 251.5 gz on v9/19). The
  React-major choice is a ~15 kB gzip question, not a 3D question.
- **drei is genuinely à-la-carte.** Four components cost +8.6 kB gzip over bare
  fiber. `<Text>` alone costs **+44 kB gzip** because it drags in
  `troika-three-text`. Tier 1 should render life totals and damage numbers with
  `<Text>` anyway — it is worth the 44 kB for crisp SDF text in 3D — but that is a
  conscious purchase, and the alternative (DOM numbers in a sibling layer) is free.
- **`three/webgpu` is +179 kB gzip over `three`** (468.25 vs 289.35 for comparable
  scenes). That alone settles §1.4.

**Route-level code splitting works and should be mandatory.** With
`const Arena = lazy(() => import('./arena/Arena'))`, the same project built to:

```
dist/assets/index-….js   143.73 kB │ gzip:  46.32 kB   ← the 2D app, unchanged
dist/assets/Arena-….js   898.02 kB │ gzip: 241.01 kB   ← fetched only on /#/arena
```

The 2D board pays **0.56 kB gzip** for the arena's existence. Over loopback the
241 kB chunk loads instantly; on the first arena open it is one request.

Note: `three@0.186.0` **ships no TypeScript types** (`"types": null`,
`"typings": null` in its package metadata) — `@types/three` is required, and its
latest (**0.185.4**) lags `three` by one minor. That is normal and harmless;
`skipLibCheck: true` (the Vite React template default) absorbs the drift, and our
strict typecheck passed with exactly that pair.

### 1.4 WebGL vs WebGPU — use WebGL for Tier 1

- `three@0.186.0` exposes `./webgpu` as a real export
  (`"./webgpu": "./build/three.webgpu.js"`), and the docs say WebGPURenderer
  "tries to use a WebGPU backend if the browser supports WebGPU. If not,
  `WebGPURenderer` falls backs to a WebGL 2 backend" (threejs.org/docs →
  WebGPURenderer), with a `forceWebGL` constructor option.
- three's classic `WebGLRenderer` is **WebGL 2 only** in 0.186: there is no
  `WebGL1Renderer` anywhere in the build (0 occurrences), and the source says
  "This renderer uses WebGL 2 to display scenes."
  (`three/src/renderers/WebGLRenderer.js:59`).
- WebGPU is not deprecating WebGL on any published schedule; three has no
  announced WebGLRenderer removal.

**Decision: Tier 1 uses the default `WebGLRenderer`** — i.e. R3F's plain
`<Canvas>` with no custom `gl` factory. Reasons, in order: it is +179 kB gzip
cheaper; a 40-quad unlit scene is nowhere near WebGL2's limits, so WebGPU's
advantages (compute, lower draw-call overhead, bindless-ish resource handling) buy
us literally nothing; and WebGPU's node-material system (TSL) is a different
shading language from the GLSL we will write for the one dissolve shader.

The escape hatch is one line if we ever want it, because R3F accepts a renderer
factory:

```tsx
<Canvas gl={(props) => new WebGPURenderer(props)}>   // Tier 3+, not now
```

Revisit only if Tier 2/3 introduces hundreds of skinned meshes.

### 1.5 Vite

`vite` latest is **8.3.0**; `@vitejs/plugin-react@6.1.1` peers `vite: ^8.0.0`.
Whatever Vite major `web/` settled on in M1 is fine — R3F and drei are plain ESM
with no bundler plugin, no loader, no WASM and no worker requirements in Tier 1.
Nothing in this plan constrains the Vite version. (The measurements above used
`vite@5.4.11` purely because it was convenient; bundle composition is not
Vite-major-sensitive here.)

---

## 2. Where the arena lives, and how it shares `reduce.ts` and the transports

### 2.1 The seam: one state, two renderers, zero transport knowledge

The architecture already gives this away for free (synthesis §2.1, §4; D6, D8):
`web/` is `render(reduce(frames))`, the reducer merges `input` into one
`ClientState`, and there are two transports behind one interface. The arena is
another `render`.

```
main.tsx
  └── App                        owns: Transport (ws | replay), reduce(), ClientState
        ├── DecisionLayer        plain DOM, above the canvas. PromptPanel + the 12
        │                        ask modals from M5. Reads state.input ONLY.
        └── ViewSwitch
              ├── <Board  state onAct />      (M4/M5, unchanged)
              └── <Suspense><Arena state onAct /></Suspense>   (lazy chunk)
```

Hard rules, and they are the whole reason this is cheap:

1. **`Arena` receives exactly the props `Board` receives**: `state: ClientState`
   and `onAct(act: Act): void`. It never imports `transport/`, never imports
   `reduce`, never calls `fetch`.
2. **The decision UI is not re-implemented.** The M5 prompt panel and the twelve
   `ask` modals live in a **plain DOM sibling layer stacked above the `<canvas>`**
   (absolutely positioned, `pointer-events: none` on the container,
   `pointer-events: auto` on the widgets). Not drei `<Html>` — `<Html>` reprojects
   per frame and couples the modals to R3F for no benefit. This means the arena
   inherits every one of M5's twelve ask kinds on day one, and M5's "nothing
   dead-ends" exit criterion keeps holding.
3. **Both renderers are stateless with respect to the game.** Anything the arena
   remembers between frames (cue queue, transient offsets, camera rest pose) is
   presentation, is derivable-or-discardable, and is flushed on `resync`,
   scrub, or a `seq` discontinuity.

### 2.2 The route / toggle

No router dependency (decision D9 is "React with plain hooks"). Use the hash:

```ts
// web/src/useView.ts
export type View = 'board' | 'arena'
export function useView(): [View, (v: View) => void] { /* location.hash, hashchange */ }
```

- `#/board` (default) and `#/arena`.
- A keyboard toggle (`V`) that swaps the hash — deliberately *not* a key Forge
  uses (M6 mirrors Forge's `SHORTCUT_*`: Y/N/P, space, Esc).
- Switching views never touches the transport, never re-reduces, never drops a
  frame. The board and arena are both pure functions of the same live object.

Commands, matching `PLAN.md` M7:

```bash
npm run dev:arena -- fixtures/games/g1.jsonl   # = dev:replay with --open '/#/arena'
./scripts/play.sh --arena                      # passes --open '/#/arena' through to vite
```

### 2.3 The one thing the arena needs from `reduce.ts`

The arena must see **every** `events` batch in engine order, and must know when the
stream jumped (replay scrub, `resync`, reconnect). `ClientState` therefore needs
two fields, which M1 may already have shipped:

```ts
events: Event[]     // §3.6 batch from the last applied `state` frame
eventSeq: number    // that frame's envelope `seq`
```

If M1's `ClientState` already carries `events` (PLAN.md M1: "The text board lists
them"), the only change is `eventSeq`, which is two lines in `reduce()`. **Check
what M1 actually shipped before writing any arena code; do not duplicate it.**

The arena then consumes batches with no subscription of its own:

```ts
const lastSeq = useRef(0)
useEffect(() => {
  const s = state.eventSeq
  if (s === lastSeq.current) return
  if (s !== lastSeq.current + 1) queue.flushAndSnap()   // scrub / resync / reconnect
  else queue.enqueueBatch(state.events, state)
  lastSeq.current = s
}, [state.eventSeq])
```

`flushAndSnap()` clears the queue and zeroes all offsets; because offsets are
transient (§5.1) the scene is then *exactly* `layout(state)`. Scrubbing backwards
in a replay is therefore correct by construction, not by special-casing.

### 2.4 File layout

Annotated with the property that makes the test strategy (§10) work:

```
web/src/arena/
  Arena.tsx              <Canvas>, rig, stage wiring                [three]
  layout.ts              pure (ClientState) => Map<id, Placement>   [NO three]
  colour.ts              pure manaCost "{2}{W}{U}" => ColourId      [NO three]
  archetype.ts           pure (Card) => archetype key               [NO three]
  scene/
    Table.tsx  PlayerArea.tsx  StackColumn.tsx  HandFan.tsx         [three]
    CardPlane.tsx  HitProxy.tsx  Glow.tsx  Beam.tsx  Ring.tsx       [three]
    useCardTexture.ts    art.json -> Texture cache                  [three]
    textFrame.ts         Card -> CanvasTexture fallback             [three, canvas]
  cues/
    types.ts             Cue, CueSpec, Selector, EVENT_KINDS        [NO three]
    resolve.ts           pure ladder name -> archetype -> default   [NO three]
    queue.ts             pure steps/clock/skip/budget               [NO three]
    validate.ts          pure                                       [NO three]
    cues.json            the data                                   [data]
    stage.ts             interface Stage + NullStage                [NO three]
    registry.ts          cue id -> CueImpl (drives a Stage)         [NO three*]
  camera.ts              pure pose math + choreography rules        [NO three*]
  perf.ts                dpr/frameloop policy                       [three]
```

`*` `registry.ts` and `camera.ts` compute plain numbers (`{x,y,z}`, quaternion
components) and hand them to a `Stage`; only `Arena.tsx` and `scene/*` turn those
into `THREE.Object3D` mutations. Everything marked `[NO three]` is importable in
bare Node, which is why §10's whole suite runs under `node --test` with no browser.

---

## 3. The scene graph

### 3.1 Units and orientation

- **1 world unit = 1 card height.** A card is `w × 1.0` where `w` is the loaded
  texture's `image.width / image.height`; before load, `w = 63/88 = 0.715909`
  (physical Magic card). Measured Scryfall aspects: `normal` 488×680 = **0.717647**,
  `large` 672×936 = 0.717949, `png` 744×1040 = 0.715385.
- **Y is up. The table is the XZ plane at y = 0.** Permanents lie flat:
  `rotation = [-π/2, 0, θ]`, so `θ` is the in-plane spin and **tap is `θ += π/2`** —
  one scalar, trivially tweenable, and it composes with cue offsets without
  quaternion gymnastics.
- **You sit at +Z, the opponent at −Z.** Camera looks down −Z from above.
- Each zone gets a small `y` lift (`0.001 × rowIndex`) to kill z-fighting with the
  table quad; card shadows are faked (§9), so nothing else needs depth separation.

### 3.2 Anchors

An **anchor** is a named `{ position, rotation, spread, maxPerRank }` record, one
per (player, zone). `layout()` reads anchors and emits placements; nothing else in
the codebase knows a coordinate. Cue camera targets are expressed *relative to
anchors*, never as absolute positions (§8), so changing the table size never
breaks a cue.

```
                     ── opponent (player id = 1, seat B) ──
   z = -5.4   opponent hand      fan of backs, tilted away, small
   z = -3.4   opponent lands     rank, left→right
   z = -2.3   opponent creatures rank, left→right
   ------------------------------ y=0 table -----------------------------
   z = -0.9   opponent combat lane   (attackers translate here)
   x = -4.8   graveyard (both, stacked, z = ∓1.5)
   x = -4.8   exile     (both, stacked, z = ∓2.8)
   x = +4.8   STACK COLUMN  z = 0, items climb in +y, newest highest
   z = +0.9   your combat lane
   ------------------------------------------------------------------
   z = +2.3   your creatures     rank, left→right
   z = +3.4   your lands         rank, left→right
   z = +4.7   YOUR HAND          fan, tilted up toward camera, y = +0.36
              command zone: x = -4.8, z = 0 (empty in Constructed; anchor exists)
```

- **Rank layout**: cards centred on `x = 0`, pitch = `cardWidth + 0.08`. Above
  `maxPerRank = 9`, wrap to a second rank at `z ± 1.15` (away from the table
  centre) and shrink pitch to `cardWidth + 0.04`. Deterministic ordering: by card
  `id` ascending, so a card never jumps rank because the engine reordered a list.
- **Tapped cards keep their slot** — the rotation is the only change. This is a
  rule, not an accident: a board that reflows on every tap is unreadable.
- **Attachments** (`attachedToId`, §3.2 of the protocol) do not take a rank slot.
  They are placed at `host + (0.20, +0.002, +0.14)` and drawn *behind* the host
  (lower `renderOrder`), overlapping like a real table. Multiple attachments fan by
  `+0.10` in x each.
- **Summoning sickness** (`sick`) is a subtle desaturation + a 0.015 y-drop, not a
  tint overlay — this is state, not a cue, so it survives skipping.

### 3.3 The hand fan

Pure function, in `layout.ts`, no three:

```
fan(n, i):
  total = min(7.5° * n, 48°)            // clamps at ~7 cards
  a     = -total/2 + total * (i/(n-1))  // n==1 → a = 0
  R     = 6.2                           // arc radius, centred below the camera
  x     =  sin(a) * R
  z     =  anchor.z + (1 - cos(a)) * R * 0.35
  y     =  anchor.y + cos(a) * 0.05
  spin  =  a * 0.55                     // cards tilt with the arc
  pitch = -1.15 rad                     // tilted up toward the camera, not flat
  order =  i                            // renderOrder; right card overlaps left
```

- Hover raises a card `+0.25 y`, scales `1.12`, and pulls it `−0.10 z` (toward the
  viewer) with a 120 ms ease. Hover is **not** a cue; it is immediate-mode UI state
  in a ref, because a 120 ms hover must never queue behind a 700 ms cast cue.
- The opponent's hand is the same function with `pitch = +1.15`, `R = 5.0`, a
  tighter total angle, the shared card-back texture, and no hover.
- The fan must always be inside the frustum — the camera clamp in §8 enforces it.

### 3.4 The stack column

`state.stack` is ordered **bottom first; the last element resolves next**
(protocol §3.1). Render it as a climbing column at `x = +4.8`:

```
item i of n:  y = 0.03 + i * 0.20,  z = -i * 0.13,  pitch = -0.95 rad
top item (i = n-1): scale 1.10, a faint additive rim, and the only one with text
```

Targets get a `QuadraticBezierLine` (drei `Line`, present in 9.122) from the stack
item to each `targetCardIds` / `targetPlayerIds` anchor, additive, ~0.02 thick,
fading at both ends. This is the 3D analogue of M5's `perfect-arrows` SVG and reads
from exactly the same fields.

### 3.5 The camera rig

Three nested objects, so every effect composes without fighting:

```
rigRoot            (position = table centre; never moves)
 └── rigOrbit      (azimuth/polar/distance — the resting pose, and the user's
                    OrbitControls target; damped spring toward `restPose`)
      └── rigShake (additive high-frequency offset; amplitude ≤ 0.02 units,
                    zeroed within 300 ms, always)
           └── camera  PerspectiveCamera, fov 40, near 0.1, far 60
```

Rest pose, framing both battlefields and your hand: `position ≈ (0, 4.2, 4.6)`,
looking at `(0, 0, 0.3)`. (Empirically the framing that fit 40 cards in the probe
scene.) Everything in §8 moves `rigOrbit`'s *target*, never the camera directly,
so a cue can be cancelled mid-flight and the spring simply re-aims.

`OrbitControls` (or `MapControls`) is enabled but clamped: polar 20°–75°, azimuth
±25°, distance 0.7×–1.4× rest, `enableDamping`, `enablePan: false`. Any user drag
sets `userOverride = true` for 5 s, during which cue camera requests are dropped
(not queued). Never fight the user for the camera.

---

## 4. A card becomes a textured plane

### 4.1 Geometry: one shared plane, scaled

```tsx
// module scope, created once for the whole app
const UNIT_PLANE = new THREE.PlaneGeometry(1, 1)
```

Every card mesh uses `UNIT_PLANE` and sets `mesh.scale.set(w, 1, 1)` where `w`
comes from the texture. 40 cards → **1 geometry, 1 vertex buffer, 40 draw calls**.
Never call `new PlaneGeometry` per card; that is 40 buffers and 40 uploads for an
identical quad.

### 4.2 The texture pipeline

`art.json` (from `tools/fetch-art.ts`, synthesis §7) maps **card name** →
`{front, back, artist, setCode, collectorNumber}` of `cards.scryfall.io` URLs.
The arena keys its cache by **URL, not by card id**, so seven `Plains` share one
texture.

```ts
const texCache = new Map<string, Promise<THREE.Texture>>()

async function load(url: string, gl: THREE.WebGLRenderer) {
  const tex = await new THREE.TextureLoader().loadAsync(url)
  tex.colorSpace   = THREE.SRGBColorSpace                    // REQUIRED — see below
  tex.anisotropy   = gl.capabilities.getMaxAnisotropy()      // REQUIRED — see below
  // generateMipmaps=true, minFilter=LinearMipmapLinearFilter are already defaults
  tex.needsUpdate  = true
  gl.initTexture(tex)                                        // upload now, not at first draw
  return tex
}
```

Four non-obvious points, each verified in the installed `three@0.186.0`:

1. **`colorSpace` must be set by hand.** `Texture`'s constructor defaults
   `colorSpace = NoColorSpace` (`three/src/textures/Texture.js:48`, assigned at
   `:299`; `NoColorSpace = ''` at `src/constants.js:1301`) and **`TextureLoader`
   never sets it** (`grep colorSpace src/loaders/TextureLoader.js` → no hits).
   Forgetting this is the classic "why does my card art look washed out / too
   dark" bug. Set `THREE.SRGBColorSpace` on every card texture and every
   `CanvasTexture`.
2. **Mipmaps are already on and NPOT is legal.** `Texture` defaults
   `generateMipmaps = true` (`Texture.js:257`) with
   `minFilter = LinearMipmapLinearFilter` (`Texture.js:48`) — i.e. trilinear.
   488×680 is not a power of two, which in WebGL 1 would silently disable
   mipmapping; `three@0.186`'s `WebGLRenderer` is **WebGL 2 only** (no
   `WebGL1Renderer` in the build at all; `src/renderers/WebGLRenderer.js:59`: "This
   renderer uses WebGL 2 to display scenes"), and WebGL 2 supports NPOT mipmaps.
   **No power-of-two resize, no `NearestFilter` hack, nothing to do.**
3. **Anisotropy is the single biggest visual win and is off by default.** The
   table camera views cards at roughly 50° from their normal — the exact case
   trilinear mipmapping blurs. `Texture`'s default is `Texture.DEFAULT_ANISOTROPY`
   (= 1, `Texture.js:48,161`); set it to
   `gl.capabilities.getMaxAnisotropy()` (`src/renderers/webgl/WebGLCapabilities.js:8,121`).
   Typically 16. Costs nothing at 28 textures.
4. **`gl.initTexture(tex)`** (`WebGLRenderer.js:3595`) uploads immediately instead
   of on first draw, avoiding a frame hitch when a card enters the battlefield
   mid-cue. drei's own `useTexture` does exactly this for the same reason
   (`drei/core/Texture.js`, with the comment citing three issue #22696).

**CORS is fine — verified live today.** `GET` on
`https://cards.scryfall.io/normal/front/1/3/1383e587-….jpg` with
`Origin: http://localhost:5173` returned:

```
HTTP/2 200
content-type: image/jpeg
content-length: 73417
access-control-allow-origin: *
access-control-allow-methods: GET, OPTIONS
cache-control: public, max-age=31556952
etag: "fd6068f2c846ba772cce1a4f43e4e82e"
```

This matters because `three`'s `Loader` sets `crossOrigin = 'anonymous'` by default
(`three/src/loaders/Loader.js:32`, applied at `TextureLoader.js:51`), so a texture
from a host without `Access-Control-Allow-Origin` would fail to upload to WebGL
entirely (not merely taint a 2D canvas). `cards.scryfall.io` sends `*` and caches
for a year. **Decision 5 in `PLAN.md` ("hot-link in v1") is safe for the arena
too** — no proxy needed. Which variant: `normal` (488×680, 73 KB) — see §9 for why
not `large`.

### 4.3 The material

```tsx
<meshBasicMaterial map={tex} toneMapped={false} alphaMap={CORNERS} transparent />
```

- **Unlit (`meshBasicMaterial`), not `meshStandardMaterial`.** Card art is already
  a lit painting; re-lighting it with scene lights double-lights it and looks
  muddy. Unlit also means **zero lights in the scene**, which removes the single
  most common integrated-GPU cost.
- `toneMapped={false}` so the art is shown exactly as Scryfall drew it.
- **Rounded corners without paying for the PNG.** The `normal` JPEG has square
  corners; Scryfall's `png` variant (744×1040) has a real rounded-corner alpha but
  is **605,487 bytes vs 73,417** — 8.2× the bytes and ~2× the VRAM. Instead
  generate **one shared 256×256 rounded-rect alpha texture** on a `<canvas>` at
  startup (~15 lines) and use it as `alphaMap` on every card. One asset, correct
  silhouette, no per-card cost.
- **Back face**: `side: THREE.FrontSide` plus a second quad 0.004 behind carrying
  the card back, so a flip animation reads correctly. Cheaper alternative for Tier
  1: `side: DoubleSide` on a single quad and a `<CardBack>` mesh only where a back
  is actually shown (opponent hand, library). Prefer the latter — fewer objects.
- **The card back is drawn procedurally.** Wizards' printed card back is
  trademarked artwork; do not ship a scan. A dark rounded panel with a subtle
  radial sheen, drawn to a 256×358 canvas once, satisfies both the Fan Content
  Policy posture in `NOTICE` and the eye.

### 4.4 The text-frame fallback material

Needed for four real cases, all of which will happen in the first ten games:

1. **Tokens.** Mid-game tokens have no deck entry and therefore no `art.json`
   entry (report 03's known gap). Nick Fury and Ant-Man's Air Force make tokens.
2. **An `art.json` miss.** Report 03's ladder (`msh` → `msc` → exact → fuzzy) has
   a visible miss list; a miss must be cosmetic, never a blocker (synthesis §7).
3. **A network failure / 404 on the image itself.**
4. **A face-down card** (`faceDown: true`) that is still *ours* to see the back of.

The fallback draws a card frame to a `CanvasTexture` at 488×680 — deliberately the
same pixel size as `normal`, so the aspect, the mip chain and the VRAM accounting
are identical and nothing downstream branches:

```
web/src/arena/scene/textFrame.ts
  renderTextFrame(card: Card): THREE.CanvasTexture
```

Everything it draws is already in the protocol's `Card` (§3.2) — `name`,
`manaCost`, `types`, `power`, `toughness`, `loyalty`, `counters`,
`abilities[].text`. Layout: colour-identity-tinted border (colour from the
`manaCost` pips, §7.3), name bar with the mana cost right-aligned, an art box left
as a flat tint, a type line, a rules-text box (word-wrapped, font auto-shrinking
20px → 12px until it fits), and a P/T or loyalty box. Cache by
`` `${name}|${types}|${power}/${toughness}` `` so a token re-entering the
battlefield does not redraw. Same `colorSpace` / `anisotropy` / mipmap treatment as
a real texture.

**A redacted card is not this.** `{id, zone, controller, hidden:true}` (protocol
§3.3) carries no `name` and must never reach `renderTextFrame` — it gets the shared
card back. Enforce with an explicit branch at the top of `CardPlane`, and test it
(§10.4).

If M4 built a shared card-frame layout module for its DOM text card, reuse its
constants rather than inventing a second set of proportions.

---

## 5. The animation system

### 5.1 The load-bearing idea: cues own offsets, never truth

```
finalTransform(card) = layout(state)[card.id]   ⊕   offsets[card.id]
```

- `layout(state)` is pure and authoritative. It is the resting pose.
- `offsets[id]` is a transient `{ dPos, dRotZ, scale, tint, glow, opacity }` that
  **starts at identity, is written by running cues, and returns to identity when
  every cue touching that card has finished.**
- Nothing else writes a card's transform. Ever.

Four properties fall out of this for free, and each is otherwise a hard problem:

| Property | Why it is free |
|---|---|
| **Skippable** | Set every running cue's progress to 1 and drain. Offsets go to identity; the scene equals `layout(state)`, which is correct by definition. |
| **Interruptible** | A new batch arriving mid-cue does not need to reconcile. Worst case: flush → snap → play the new batch. |
| **Scrub-safe** | A replay jump is `flushAndSnap()`. No per-cue rewind logic exists. |
| **Cannot block input** | The input path reads `state.input` and the hit proxies (§5.5). There is literally no code path from the queue to `onAct`. |

One deliberate exception: **persistent presentation**. "S.H.I.E.L.D. Helicarrier
flies in overhead and hovers above the board for the rest of the game" is not a
cue — a cue decays. It is a **layout rule**: a `presence` entry in the cue file
(`{"presence": {"hoverY": 0.9, "bobAmp": 0.03}}`) that `layout()` consults. Cues
animate transitions; `presence` changes the resting pose. Keeping these separate is
what stops the Helicarrier from sinking back into the rank the first time someone
presses skip.

### 5.2 The queue

```ts
type Cue = {
  id: string                  // registry key, e.g. 'zone.toGraveyard'
  targets: number[]           // card ids (may be empty: HUD/camera-only cues)
  ms: number                  // nominal duration
  lane: 'card' | 'hud' | 'camera' | 'particle'
  params: Record<string, number | string>
}
type Step = { cues: Cue[]; staggerMs: number; ms: number }   // ms = max(cue.ms) + stagger tail
```

- **Steps preserve engine order.** `enqueueBatch(events, state)` walks the batch in
  order, resolves each event to a `CueSpec` (§7), and appends. This is why §3.6's
  guarantee that `events` is "in engine order" matters.
- **Consecutive same-kind events coalesce into one step, staggered.** Eight `tap`
  events from one mana ability become one step of eight cues at 40 ms stagger
  (capped at 240 ms total), not 8 × 180 ms serialised. Without this rule, tapping
  five lands takes a second and the game feels broken.
- **Steps overlap by `overlap = 0.35`**: step *n+1* starts at
  `0.65 × step[n].ms`. Cinematic, and it roughly halves total batch time.
- **Batch budget.** `natural = Σ step.ms × 0.65 + last.ms`. If
  `natural > budgetMs`, **time-compress**: scale every duration by
  `budgetMs / natural`, floored at `0.25×`. Below the floor, swap each cue for its
  registry-declared `snap` variant (usually `ms: 0`). Compressing rather than
  dropping means nothing ever silently vanishes, which is what makes the fixture
  coverage test in §10.3 meaningful.
- **Budgets**: replay `2500 ms`, live-while-engine-busy `1200 ms`,
  live-while-awaiting-human `250 ms` (§5.3).
- **Queue cap.** Hard cap at 24 pending steps; beyond that, `flushAndSnap()` and
  log once. A pathological turn must degrade to "the board just updated", not to a
  three-minute cutscene.

The clock is injected (`now(): number`), which is the entire reason the queue is
testable in `node --test` with no browser and no timers.

### 5.3 Never block input — the liveness rule, made concrete

From `docs/ideas/arena-mode.md`: "Live games must feel snappy: cues over ~1.5 s
only fire when the engine is not waiting on the human." Made operational:

```ts
// pure, in queue.ts — no three, no DOM
export function awaitingHuman(state: ClientState): boolean {
  if (state.pendingAsk != null) return true                       // a blocking `ask` (§5 of protocol)
  const i = state.input
  if (!i) return false
  return i.buttons.ok.enabled
      || i.buttons.cancel.enabled
      || i.selectable.cardIds.length > 0                          // protocol §4.2!
}
```

Note `selectable.cardIds.length > 0` explicitly: protocol §4.2's invariant is that
**a disabled OK button with a non-empty selectable list means the engine wants a
card click** — precisely the state where a 2-second cue would feel like a hang.

The rule:

- `awaitingHuman(state) === true` → the batch budget is **250 ms** and the
  *remaining* queue is re-time-compressed to fit inside 250 ms as well. The cues
  keep playing, over a board that is already fully interactive.
- `awaitingHuman(state) === false` (AI thinking, spells resolving, upkeep) → the
  full 1200 ms live budget.
- In replay there is no human seat, so the 2500 ms budget always applies.

And the structural guarantee, which is stronger than any budget: **the decision
layer and the hit proxies read `state` only.** They do not know the queue exists.
A source-level test asserts no module under `web/src/arena/cues/` is imported by
the decision layer, and that no module under `web/src/arena/` imports `transport/`
(§10.5).

### 5.4 Frameloop: render only when something is happening

R3F 8 exposes `frameloop: 'always' | 'demand' | 'never'`, `invalidate(frames?)`
and `setFrameloop()` (verified in
`@react-three/fiber/dist/declarations/src/core/store.d.ts:104,114,128`).

```
queue empty  &&  no pointer drag  &&  no hover transition  →  frameloop = 'demand'
anything running                                          →  frameloop = 'always'
```

A card game is static most of the time — while the AI thinks, the correct number
of rendered frames is zero. This is the single largest power/thermal win and it is
four lines. `invalidate()` on every `ClientState` change guarantees a static board
still repaints when state moves.

### 5.5 Hit proxies — why a moving card is still clickable

Cue offsets move meshes. A moving mesh is a moving click target, which is
infuriating. Solution: every card also gets an **invisible mesh parked at
`layout(state)`**, carrying `userData.cardId`, and *that* is what receives pointer
events.

This works because of an asymmetry in three, verified in the installed 0.186.0:

- the renderer **skips invisible objects**:
  `if ( object.visible === false ) return;` in `projectObject`
  (`three/src/renderers/WebGLRenderer.js:1862`) — so a hit proxy costs **zero draw
  calls**;
- the raycaster **does not check `visible`**: `intersect()` tests only
  `object.layers` before calling `object.raycast()`
  (`three/src/core/Raycaster.js:240-252`; `grep visible src/core/Raycaster.js` →
  no hits) — so a hit proxy is fully clickable.

Hit proxies are also 10% larger than the card, which makes the fanned hand
forgiving to click. Selectability highlighting (`input.selectable.cardIds`,
`input.highlighted`) is rendered on the **visible** card via drei `Outlines`
(present in 9.122) and a tint — state-derived, so it survives every skip and
flush.

---

## 6. Event kind → default cue

All 21 kinds from `docs/protocol.md` §3.6. Every one is Tier-1 feasible with the
primitive set in §12.1. Durations are nominal (replay); live budgets compress them.

| `kind` | Default cue | ms | What moves |
|---|---|---:|---|
| `cast` | `cast.rise` | 700 | Card lifts `+0.5 y` toward the stack column, spins to face camera, an additive glow quad in its colour-identity colour fades in and out; a `Beam` from the source to each `stack[].targetCardIds` anchor. |
| `zone` `hand→stack` | (folded into `cast`) | 0 | Suppressed when a `cast` for the same `cardId` is in the same batch — otherwise the card animates twice. |
| `zone` `*→battlefield` | `zone.enters` | 450 | Drops from `+0.6 y` with a slight overshoot, 1.15 → 1.0 scale, a short dust ring at the landing point. |
| `zone` `battlefield→graveyard` | `zone.dissolve` | 650 | Noise-mask dissolve (one GLSL shader, §12.1), card sinks `−0.25 y`, drifts toward the graveyard anchor, fades to 0. |
| `zone` `*→exile` | `zone.exile` | 600 | Scale → 0 about its centre with an additive white flash; sound of a point of light. |
| `zone` `library→hand` | `zone.draw` | 380 | Card slides from the library anchor into its fan slot; the fan re-lays out around it. |
| `zone` other | `zone.slide` | 300 | Straight tween from the old anchor to the new. |
| `resolved` | `resolved.pop` | 320 | Stack item flashes and pops; `fizzled` → it greys and shrinks instead. |
| `unstacked` | `unstacked.shatter` | 380 | Stack item cracks (a quick scale-x squash + fade), no flash. |
| `attackers` | `attack.lunge` | 850 | Each attacker translates to its combat lane and tilts `12°` toward its defender; camera swoop (§8). Staggered 60 ms per attacker. |
| `blockers` | `block.interpose` | 600 | Each blocker slides in front of its attacker, a brief impact ring between them. |
| `damage` (card) | `damage.hit` | 500 | Target jolts along the damage vector, a red rim flash, a `<Text>` number rises `+0.4 y` and fades. Lethal (`amount ≥ toughness − damage`) adds a `damage.lethal` shake. |
| `damage` (player) | `damage.player` | 550 | HUD panel flashes red, the number flies toward the life total, camera shake `0.35` if `combat`. |
| `life` | `life.tick` | 400 | Life total counts from `from` to `to`; green pulse on gain, red on loss. Fires *after* `damage` in the same batch, so the number and the counter agree. |
| `poison` | `poison.tick` | 400 | Same, green-black, with a poison pip. |
| `tap` | `tap.rotate` | 180 | `θ += π/2` (or `−π/2` on untap), ease-out-back. Staggered 40 ms when several tap together. |
| `counters` | `counters.pop` | 420 | A `<Text>` pip (`+1/+1`, or the `CounterType` name) pops at the card corner and settles; the card scales 1.06 → 1.0. Removal plays it reversed and grey. |
| `attach` | `attach.snap` | 500 | Equipment plane flies from its rank slot to the host offset and "snaps" with a small ring; `to: null` (unattach) plays it backwards. |
| `sacrificed` | `sacrifice.crush` | 520 | Downward squash into the table, then the `zone` event's dissolve takes over. |
| `land` | `land.rise` | 550 | The land tile rises from *under* the table (`−0.4 y` → rest) with a terrain-ripple ring. |
| `stats` | `stats.flash` | 260 | A brief white rim on every `cardIds` entry; `transform: true` plays a 400 ms flip instead. |
| `turn` | `turn.banner` | 700 | A `<Text>` banner ("Turn 17 — Opponent") sweeps across; camera returns to rest. |
| `phase` | `phase.strip` | 0 | HUD only. **Zero duration and never queued** — §3.6 warns phase events fire on every step, so a queued phase cue would dominate the queue. |
| `combat_end` | `combat.return` | 450 | All attackers/blockers ease back to their ranks. |
| `shuffle` | `shuffle.riffle` | 500 | Library stack riffles; skipped entirely if the library anchor is off-screen. |
| `mulligan` | `mulligan.sweep` | 600 | Hand sweeps off-screen and a new fan deals in. |
| `outcome` | `outcome.finish` | 1600 | Camera pulls back to a wide shot, the losing player's side desaturates, a result banner. Uncompressible (exempt from the live budget — the game is over, nothing is waiting on the human). |
| *unknown* | `NO_OP` | 0 | Logged once per kind, never thrown. Protocol §3.6 rule 3. |

**Cross-check against the jar.** All the Forge event classes §3.6 maps from exist
in `forge-gui-desktop-2.0.14-jar-with-dependencies.jar`, with the accessors the
mapping needs (`javap`, today):

- `GameEventCardChangeZone.card()/from()/to()`, and `ZoneView.player()/zoneType()` — `zone`;
- `GameEventSpellAbilityCast.sa()/si()/stackIndex()/targetDescription()`, where
  `StackItemView.getSourceCard()/getText()/getActivatingPlayer()/getTargetCards()/getTargetPlayers()`
  supplies the `cardId`/`controller`/`text` §3.6's `cast` body promises — `cast`;
- `GameEventSpellResolved.spell()/hasFizzled()`, with
  `SpellAbilityView.getHostCard()` → the `cardId` — `resolved`;
- `GameEventAttackersDeclared.player()/attackersMap()`,
  `GameEventBlockersDeclared.defendingPlayer()/blockers()`;
- `GameEventPlayerDamaged.target()/source()/amount()/combat()/infect()`,
  `GameEventCardDamaged.card()/source()/amount()/type()`;
- `GameEventPlayerLivesChanged.player()/oldLives()/newLives()` (note: **`oldLives`/
  `newLives`**, not `from`/`to` — the JSON field names in §3.6 are ours, the
  accessors are Forge's);
- `GameEventCardTapped.card()/tapped()`,
  `GameEventCardCounters.card()/type()/oldValue()/newValue()`,
  `GameEventCardAttachment.equipment()/oldEntity()/newTarget()`,
  `GameEventLandPlayed.player()/land()`,
  `GameEventCardStatsChanged.cards()/transform()`,
  `GameEventCombatEnded.attackers()/blockers()`,
  `GameEventTurnBegan.turnOwner()/turnNumber()`,
  `GameEventTurnPhase.playerTurn()/phase()/phaseDesc()`;
- `GameEventGameOutcome.lastTurnNumber()/outcomeStrings()/winningPlayerName()/matchSummary()`
  — and note there is **no** player-id accessor, which is why §3.6 correctly says
  to map `winningPlayerName()` to an id by name. That mapping is the bridge's job,
  not the arena's.

Nothing in this cue table asks the bridge for a field §3.6 does not already
promise. **M7 needs no protocol change.**

---

## 7. Per-card cue data

### 7.1 One file, not many

`docs/ideas/arena-mode.md` offers `cues/<card-name>.json` *or* one `cues.json`.
**Take the single file.** 28 distinct cards; one file is one fetch, one parse, one
validation pass, one diff in review, and no filename-escaping problem for names
containing `.`, `,`, `'` and `/` (`A.I.M. Scientists`,
`S.H.I.E.L.D. Spy Kit`, `Quake, Agent of S.H.I.E.L.D.`).

**Import it statically** (`import cuesData from './cues/cues.json'`) rather than
`fetch`ing it: Vite bundles and type-checks it, there is no runtime 404 path, and
it costs ~4 kB in the already-lazy arena chunk. Add a dev-only `?cues=<url>`
override so a cue can be iterated without a rebuild.

### 7.2 Schema

```jsonc
{
  "version": 1,
  "cards": {
    "Quake, Agent of S.H.I.E.L.D.": {
      "tap":                        { "cue": "fx.shockwave", "ms": 700,
                                      "params": { "colour": "#7fd4ff", "shake": 0.35 } },
      "zone:*>battlefield":         { "cue": "zone.enters", "ms": 600,
                                      "params": { "impact": 1.4 } }
    },
    "S.H.I.E.L.D. Helicarrier": {
      "zone:*>battlefield":         { "cue": "fx.flyIn", "ms": 1400,
                                      "params": { "from": "sky", "camera": "followHigh" } },
      "presence":                   { "hoverY": 0.9, "bobAmp": 0.03, "bobHz": 0.25 }
    },
    "Ant-Man, Reformed Rogue": {
      "attackers:alone":            { "cue": "fx.scaleTo", "ms": 600, "params": { "scale": 0.18 } },
      "damage":                     { "cue": "fx.scaleTo", "ms": 300, "params": { "scale": 1.0 } }
    }
  },
  "archetypes": {
    "creature/W":  { "zone:*>battlefield": { "cue": "zone.enters", "params": { "glow": "#f6f0d8" } } },
    "creature/U":  { "zone:*>battlefield": { "cue": "zone.enters", "params": { "glow": "#9ec7f0" } } },
    "land/*":      { "zone:*>battlefield": { "cue": "land.rise" },
                     "tap":                { "cue": "fx.ripple", "ms": 220 } },
    "equipment/*": { "attach":             { "cue": "attach.snap" } },
    "instant/*":   { "cast":               { "cue": "cast.rise", "params": { "speed": 1.3 } } }
  },
  "defaults": { /* the §6 table, verbatim */ }
}
```

### 7.3 The resolution ladder

`resolve(event, card, data) → CueSpec` — pure, no three, exhaustively tested:

1. `data.cards[card.name]?.[selector]`
2. `data.cards[card.name]?.[kind]` (the unqualified kind)
3. `data.archetypes[archetypeKey(card)]?.[selector]`, then `?.[kind]`
4. `data.archetypes[looserArchetypeKey(card)]?.[…]` (`creature/*`, then `*/W`)
5. `data.defaults[selector]`, then `data.defaults[kind]`
6. `NO_OP` — **never throws, never returns undefined**

Selector grammar, deliberately tiny:

```
selector := kind [ ':' qualifier ]
qualifier := zone transitions   'hand>battlefield' | '*>graveyard' | 'battlefield>*'
           | 'alone'            (attackers with exactly one attacker)
           | 'lethal'           (damage ≥ remaining toughness)
           | counter name       'P1P1' | 'P1P1+' | 'P1P1-'
           | '*'
```

**`archetypeKey(card)`** is `"<primaryType>/<colourId>"`, both derived from fields
the protocol already ships:

- primary type from `card.types` (protocol §3.2 gives the whole type line as one
  string, e.g. `"Legendary Creature — Human Spy Hero"`): first match of
  `creature | land | instant | sorcery | artifact | enchantment | planeswalker |
  battle`, lowercased. Equipment is detected from the subtype after the em dash.
- **colour identity from `manaCost`, because `Card` has no `colors` field.** This
  is the one place the arena parses a string, so it lives in its own pure module
  with its own test: `{1}{W}` → `W`; `{U/B}` → `UB`; `{2/W}` → `W`; `{X}{G}{G}` →
  `G`; `{W}{U}` → `WU` (rendered as the gold archetype); `""` or a land → `C`.
  Multi-colour falls back to `creature/*` before `*/C`.

Nothing in the ladder can fail: every step is a lookup with a fallback, and the
final fallback is a zero-duration no-op. This is the arena's version of the "a
missing image renders a text card and never blocks a click" rule.

### 7.4 Validation

Hand-written (`validate.ts`), no `ajv` — consistent with decision D4 (hand-written
types on both ends, no codegen) and adds zero dependencies:

```ts
validateCues(raw: unknown): { data: CueData; errors: Problem[]; warnings: Problem[] }
```

- **error** — `version` missing or ≠ 1; a `cue` id not in the registry's key set;
  `ms` outside `[0, 4000]`; a malformed selector; a `params` value of the wrong
  primitive type.
- **warning** — a card name in `cards` that is not in `decks/pacho-shield.dck`
  (this catches the "Peggy Carter" vs "Peggy Carter, Secret Agent" class of typo,
  which report 03 already proved is a real hazard for this deck); an archetype key
  no card in the deck produces; a selector that no event kind can ever emit.
- **Runtime behaviour**: errors drop *that entry only* and the ladder falls
  through. The arena never throws because a cue file is wrong.
- **Build behaviour**: `node --test` fails on any error and prints warnings
  (§10.2). A dev-only overlay lists both in the browser.

---

## 8. Camera choreography

Seven rules. They exist because an over-eager camera is the fastest way to make a
beautiful renderer unusable.

1. **The camera has a rest pose and always returns to it.** Every move is a
   *temporary* re-aim of `rigOrbit`'s spring target; the spring's default target is
   rest. Camera state is therefore never "stuck".
2. **One camera lane, and it never queues.** At most one camera cue is live. A new
   request with strictly higher `priority` preempts; equal or lower is **dropped**,
   not queued. A queued camera backs up; a dropped one is invisible.
3. **Targets are anchor-relative, never absolute.** A cue asks for
   `{ frame: ['attacker:12', 'defender:player:1'], padding: 0.25, tilt: -0.15 }`
   and `camera.ts` solves a pose that frames those anchors. Change the table
   dimensions and every cue still aims correctly.
4. **Dwell limits.** Live: ≤ 900 ms away from rest. Replay: ≤ 1800 ms. Return to
   rest within 600 ms of the last camera cue ending, always.
5. **The camera does not move while `awaitingHuman(state)`.** If a camera cue is
   live when the engine starts waiting, it snaps back to rest over 200 ms. Moving
   the camera while the player is trying to click a card is the single worst
   failure mode available to us.
6. **The hand stays framed.** After solving any pose, clamp it so the own-hand
   anchor projects inside the lower 30% of the viewport and the own-battlefield
   rank is fully visible. If the clamp cannot be satisfied, the move is dropped.
7. **Shake is bounded and optional.** Additive on `rigShake`, amplitude ≤ 0.02
   world units, ≤ 300 ms, one axis pair, decaying. `prefers-reduced-motion:
   reduce` disables shake entirely and scales all cue durations to 30% — that
   media query is one `matchMedia` call and it is not optional for a renderer that
   swoops and shakes.

Plus the user-override rule from §3.5: any `OrbitControls` interaction suppresses
cue camera moves for 5 s.

The only cues that *should* request the camera in Tier 1: `attackers` (a low
swoop down the combat lane), `outcome` (a slow pull-back), `turn` on the human's
turn (a 300 ms settle back to rest, no move), and the Helicarrier fly-in. Four.
Resist adding more; the temptation is enormous and the result is nausea.

---

## 9. Performance budget

**Target: a locked 60 fps (16.7 ms/frame) at 1920×1080 with 40 card planes on
integrated graphics.**

A note on honesty: the dev box has a **GeForce GTX 1080 (8 GB)** *and* an AMD
integrated GPU (`lspci`: `NVIDIA GP104 [GeForce GTX 1080]` plus
`AMD/ATI Device 13c0`, the Ryzen 7 9700X's iGPU). So the dev machine is **not**
the target and will lie to us. Frame times below are a *budget*, not a
measurement — measuring is E6's job (§11), with the method in §9.4.

### 9.1 The budget

| Resource | Budget | Basis |
|---|---:|---|
| Draw calls | **≤ 120** | 40 cards + ~14 backs/stack + 1 table + ~12 `<Text>` + ≤ 8 effect quads + ≤ 4 particle systems. Hit proxies cost **0** (`WebGLRenderer.js:1862` skips invisible objects). |
| Triangles | ≤ 2,000 | 40 quads = 80 tris. Everything else is quads and SDF text. |
| Geometries | ≤ 12 | One shared `PlaneGeometry(1,1)` for all cards (§4.1). |
| Materials | ≤ 40 + 8 | One per distinct texture, not per card instance. |
| Texture VRAM | **≤ 96 MiB**, expected **~50 MiB** | 488×680 RGBA8 = 1,327,360 B = 1.266 MiB; ×4/3 for the mip chain = **1.688 MiB**; × **28 distinct names** in `pacho-shield.dck` = **47.3 MiB**. Plus card back, table, corner alpha, any text-frame fallbacks. |
| First-load image bytes | ~2.05 MB | 28 × ~73 KB, then browser-cached for a year (`cache-control: public, max-age=31556952`, verified). |
| JS (arena chunk) | 241 kB gzip | Measured (§1.3), lazy. |
| CPU per frame | ≤ 2 ms | ≤ 40 objects × plain float math in one `useFrame`. |
| GPU per frame | ≤ 10 ms | Unlit quads, no shadow maps, no post FX, MSAA at dpr ≤ 1.5. |
| Idle frames | **0** | `frameloop='demand'` when the queue is empty (§5.4). |

### 9.2 The rules that keep us inside it

1. **`normal`, never `large`.** `large` (672×936) is 2.399 MiB raw → **3.199 MiB
   with mips → 89.6 MiB for 28 cards**, nearly double, on a GPU that shares system
   RAM. `normal` at 488×680 is more than enough at a table camera distance; the
   anisotropy setting (§4.2) buys back far more perceived sharpness than the extra
   pixels would.
2. **Texture cache keyed by URL.** Seven `Plains` → one texture. Never key by card id.
3. **No lights, no shadow maps.** Unlit `meshBasicMaterial` (§4.3). Contact shadows
   are a single pre-baked radial-gradient alpha quad under each card — 40 extra
   quads, no render target, no per-frame cost. Explicitly **do not** use drei
   `ContactShadows` at default settings (it re-renders the scene into a render
   target every frame) or `AccumulativeShadows`.
4. **`dpr={[1, 1.5]}`** with `antialias: true`. MSAA on a 100-quad scene is
   essentially free; a 4K display at dpr 2 is not.
5. **No postprocessing in Tier 1.** Glow is an additive sprite (§12.1). Real bloom
   is `@react-three/postprocessing@2.19.1` (MIT, the React-18 line) and is an
   opt-in toggle at Tier 1.5, defaulting off.
6. **Zero allocation in `useFrame`.** Pre-allocate scratch `Vector3`/`Quaternion`/
   `Color` at module scope. A `new Vector3()` per card per frame is 2,400
   allocations/second and a GC sawtooth.
7. **No React state updates from `useFrame`.** Cue offsets live in a `useRef`
   `Map`; the runner mutates `object3d` directly. React re-renders only when
   `ClientState` changes — measured at ~605 observable states per game
   (synthesis §2.4), i.e. roughly once per second.
8. **Memoise `CardPlane` on `(id, textureUrl, hidden)`.** Placement changes are
   applied imperatively, not through props.
9. **Degrade, don't stutter.** drei's `PerformanceMonitor` + `AdaptiveDpr` (both
   present in 9.122) drop dpr to 1.0 and then disable particles if the frame time
   regresses. `<Canvas performance={{ min: 0.5 }}>`.

### 9.3 What will actually bite first

Not the 40 quads — they are nothing. In descending order of risk:

1. **Transparency overdraw.** Additive glow quads, rings, beams and particles are
   all blended and all `depthWrite: false`. Ten full-screen-ish additive layers is
   how you turn an iGPU into a space heater. Cap: **no effect quad may exceed 25%
   of the viewport**, and no more than **8 blended effect objects alive at once**
   (the queue enforces it; excess cues render without their particle layer).
2. **`<Text>` re-layout.** troika re-tessellates SDF glyphs when a string changes.
   Damage numbers and life totals change often. Fix: pre-create one `<Text>` per
   HUD slot and mutate `.text`, never mount/unmount per damage event.
3. **First-frame texture upload.** 28 JPEG decodes + uploads in one frame is a
   visible stall. Fix: `gl.initTexture()` (§4.2) plus staggered preloading during
   the mulligan, driven by `art.json` keys rather than by what is on the table.

### 9.4 How to measure it (E6)

Not done today — Chromium on this box is a snap and cannot be given a profile
directory the sandbox can reach. The method, for when it is:

```bash
# build the arena, serve dist, then:
chromium --headless=new --use-gl=swiftshader --enable-unsafe-swiftshader \
         --remote-debugging-port=9223 --window-size=1920,1080 \
         --user-data-dir="$HOME/.cache/mtg-table-bench" about:blank
```

Drive it over CDP (Node 24 has a global `WebSocket`, so no `ws` dependency), load
`/#/arena` against a fixture scrubbed to its busiest frame (a full combat), sample
`useFrame`'s delta for 5 s, and assert **p95 ≤ 20 ms and max ≤ 50 ms**.
SwiftShader is a *software* rasteriser, so it is a hard lower bound and a fair
proxy for weak integrated graphics; also run it once non-headless on the iGPU
(`DRI_PRIME=1`) for the real number.

---

## 10. Test strategy

Everything below runs headlessly with **`node --test`** and no browser. Verified
today on Node v24.20.0: a `.ts` test importing a `.ts` module by explicit `./x.ts`
specifier runs directly via type stripping — `✔ … 1 pass 0 fail`. No build step,
no Vitest, no jsdom, no `headless-gl`. This is the payoff for the `[NO three]`
annotations in §2.4.

### 10.1 `cues-exhaustive.test.ts` — every kind maps to a cue

```ts
import { EVENT_KINDS } from '../cues/types.ts'          // the 21 kinds of protocol §3.6
for (const kind of [...EVENT_KINDS, '__unknown__', '']) {
  const spec = resolve(synthEvent(kind), synthCard(), CUES)
  assert.ok(spec && typeof spec.cue === 'string')       // never undefined
  assert.ok(REGISTRY.has(spec.cue))                     // the cue id exists
  assert.ok(spec.ms >= 0 && spec.ms <= 4000)
}
```

`EVENT_KINDS` is a `const` array in `cues/types.ts` that is *also* the source of
the TypeScript union, so adding a kind to the protocol and forgetting the cue
table is a compile error plus a test failure.

### 10.2 `cues-data.test.ts` — the data file is sane

- `validateCues(cuesJson).errors.length === 0`.
- Every `cue` id referenced exists in the registry.
- **Every card name under `cards` appears in `decks/pacho-shield.dck`** (parse the
  28 lines; ~10 lines of code). This is the typo net, and given report 03's
  findings for this exact deck it will earn its keep.
- Every `archetypes` key is producible by `archetypeKey()` for some real card.

### 10.3 `replay-cues.test.ts` — the fixture sweep (the important one)

For each `fixtures/games/*.jsonl`:

1. Replay every line through the **real** `reduce()`.
2. For each `state` frame, feed `events` to a real `CueQueue` built with an
   injected clock and a **`NullStage`** that records ops instead of touching three.
3. Advance the clock past the batch.

Assertions:

- **No throw, anywhere, ever.** This is the headline assertion PLAN.md's M7 brief
  asks for.
- **Coverage.** Collect the set of event kinds the fixture actually emitted and
  print a table: kind → count → resolved cue id. Fail if any emitted kind resolved
  to `NO_OP` *unless* it is on an explicit `EXPECTED_NO_OP` allowlist (currently
  just `phase`). This turns "did we handle everything?" from a hope into a diff.
- **Decay.** After draining each batch, `queue.length === 0` and the offsets map is
  **empty**. This is the mechanical proof of §5.1 — that cues return the scene to
  `layout(state)` — and it is what makes skip, scrub and flush correct.
- **Resolution.** Every card id a cue targets either resolves against that same
  frame's `players[].zones` / `stack`, or is explicitly classified as
  "unresolvable ⇒ hidden" (protocol §3.6 rule 1 says an unresolvable id is correct,
  not a bug). Fail on any *third* outcome.
- **Budget.** With `awaitingHuman()` forced true, `queue.totalRemainingMs() ≤ 250`
  for every batch in every fixture. This is §5.3 as an executable assertion.
- **Redaction, again.** Assert no cue's `params` and no recorded `NullStage` op
  contains a card `name` for a card the frame marked `hidden` — a second net under
  the M1 redaction checker, since the arena is a new consumer of the same data.

### 10.4 `layout.test.ts` — the resting pose is a pure function

- Same `ClientState` → byte-identical placement map (run it twice, deep-equal).
- Every card in every visible zone gets exactly one placement; no card gets two.
- Battlefield ranks: no two placements within `0.5 × cardWidth` in x on the same z rank.
- Hand fan stays inside its anchor's bounds for n = 0…12.
- A `hidden: true` card produces a placement and is routed to the card back, and
  `renderTextFrame` is never called for it (spy on the module).
- A `presence` entry (Helicarrier) changes the resting pose and **survives**
  `flushAndSnap()`.

### 10.5 `liveness.test.ts` — the invariant, as source and as behaviour

- **Source**: read the files under `web/src/arena/` and assert none imports
  `../transport/` or `../reduce`; assert the decision-layer module imports nothing
  from `arena/cues/`. Crude, and exactly the kind of crude that keeps holding for
  years.
- **Behaviour**: build a state with `input.selectable.cardIds = [12]` and
  `buttons.ok.enabled = false` (protocol §4.2's stall case) and assert
  `awaitingHuman(state) === true`, and that `selectableIds(state)` is unchanged
  whether the queue is empty or mid-cue.

### 10.6 `colour.test.ts` — the one string parser

`{1}{W}`→W, `{U/B}`→UB, `{2/W}`→W, `{X}{G}{G}`→G, `{W}{U}`→WU, `""`→C,
`{C}`→C, `{W/P}`→W. Eight cases, thirty seconds to write, and it is the input to
every archetype lookup.

### 10.7 Not automated, and honest about it

Pixels. A cue *looking right* is not testable here. Ship a dev route
`/#/arena?cue=fx.shockwave` that loops one cue on a dummy card against a neutral
table — that is the iteration loop for E5, and it is worth an evening's third of
time on its own.

---

## 11. Tier 1, broken into six evenings

Each evening has one command and something to look at, matching `PLAN.md`'s style.
Evenings 1–5 need **no JVM** — they run entirely against `fixtures/games/*.jsonl`,
which is exactly what decision D6 bought us.

### E1 — The dependency spike and an empty table

```bash
cd web && npm i -E three@0.186.0 @react-three/fiber@8.18.0 @react-three/drei@9.122.0 \
                  -D @types/three@0.185.4
npm run dev:arena -- fixtures/games/g1.jsonl
```

- Confirm `ClientState` already carries `events`; add `eventSeq` if missing (§2.3).
- `useView()` hash routing + the lazy `Arena` chunk; assert with `npm run build`
  that the non-arena entry chunk did **not** grow (§1.3: it should stay ~46 kB gz).
- `<Canvas>`, the camera rig, the table quad, `OrbitControls` with the §3.5 clamps,
  a debug grid, and drei `<Stats>`.
- **The go/no-go on the frozen v8 line**: if anything throws at runtime, try
  `three@0.173.0`; if that also fails, switch the whole app to React 19.2.8 +
  fiber 9.7.0 + drei 10.7.8 (§1.2) and carry on. Budget 45 minutes for this
  decision; do not let it eat the evening.
- Add three / react-three-fiber / react-three-drei to `NOTICE`.

**Deliverable**: an empty 3D table you can orbit, in a lazily-loaded route, with
the 2D board untouched.

### E2 — Cards on the table

- `layout.ts` (pure) with all anchors, rank layout, hand fan, stack column,
  attachments, tapped-keeps-its-slot.
- `useCardTexture.ts` with the full §4.2 pipeline (sRGB, anisotropy, `initTexture`,
  URL-keyed cache) and the shared rounded-corner alpha map.
- `CardPlane`, `CardBack`, `HitProxy` (invisible, clickable — §5.5).
- `textFrame.ts` fallback and the procedural card back.
- Click a card → `onAct({action:'clickCard', cardId})`; `input.selectable` renders
  as an `Outlines` rim.
- `layout.test.ts` + `colour.test.ts`.

**Deliverable**: scrub `g1.jsonl` and watch the real board appear in 3D, in real
card art, with correct taps, attachments and hands. **This is the screenshot
moment.** No animation yet — every change snaps.

### E3 — The cue engine

- `cues/types.ts`, `queue.ts`, `stage.ts` (+ `NullStage`), `registry.ts` skeleton,
  `resolve.ts` ladder, `validate.ts`.
- The offset model (§5.1) wired into `CardPlane` via a ref map and one `useFrame`.
- Batch intake with the `eventSeq` discontinuity rule (§2.3).
- Time-compression, stagger/coalescing, overlap, the 24-step cap, skip/flush.
- `frameloop` demand↔always switching (§5.4).
- Exactly three cues implemented, to prove the shape: `tap.rotate`, `zone.slide`,
  `life.tick`.
- `cues-exhaustive.test.ts` and the first pass of `replay-cues.test.ts`.

**Deliverable**: taps rotate, cards slide between zones, life totals tick, and
`node --test` is green across every fixture.

### E4 — The whole default cue table

- All 21 kinds from §6, plus the `zone` sub-selectors.
- The Tier-1 primitive kit (§12.1): additive glow sprite, ring, beam, `<Text>`
  numbers, the one dissolve shader, a `Points` particle burst.
- Replay controls wired to the queue: play / pause / step-one-batch / speed
  0.5×/1×/2×/4× / **skip cue** / **skip all**.
- `replay-cues.test.ts` coverage assertion now required to pass with only `phase`
  on the allowlist.

**Deliverable**: `npm run dev:arena -- fixtures/games/g1.jsonl` plays a whole
recorded AI-vs-AI game as a cinematic, with nothing snapping and nothing hanging.
**This is `docs/ideas/arena-mode.md`'s stated M7 milestone.**

### E5 — Camera choreography and the S.H.I.E.L.D. cues

- `camera.ts`: the seven rules of §8, anchor-relative pose solving, the framing
  clamp, dwell limits, `prefers-reduced-motion`.
- The four camera cues (attack swoop, outcome pull-back, turn settle, Helicarrier).
- `cues.json`: archetypes for `creature/W`, `creature/U`, `land/*`,
  `equipment/*`, `instant/*`, plus per-card entries for the Tier-1-feasible rows
  of §12.2 — Quake, Peggy Carter, Coulson, Ant-Man, Wasp, Pym Particles, Quantum
  Reduction, Ant-Man's Air Force, Helicarrier (+`presence`), Helicarrier Strike,
  Spy Kit / Super Suit, the lands.
- `cues-data.test.ts` including the deck-name check.
- The `?cue=<id>` dev loop route.

**Deliverable**: the S.H.I.E.L.D. deck's signature cards look like themselves.

### E6 — Live mode and the performance pass

```bash
./scripts/play.sh --arena
```

- `awaitingHuman()` budgets (§5.3) against a live `WsTransport` game; `resync` and
  reconnect flush-and-snap.
- The decision layer (M5's prompt panel and twelve ask modals) mounted as a DOM
  sibling above the canvas; play a full game to a win or a loss **in the arena**.
- The §9.4 measurement, with p95 ≤ 20 ms and max ≤ 50 ms as the gate. Apply §9.2's
  rules until it passes; `PerformanceMonitor`/`AdaptiveDpr` as the safety net.
- `liveness.test.ts`.
- A `?arena=off` kill switch and a one-line README paragraph.

**Deliverable**: a full live game against the Forge AI, played entirely in the 3D
arena, at 60 fps, with the 2D board still one keypress away.

**Total: 6 evenings.** E1–E2 and E4 are the ones most likely to overrun; E3 is
mostly pure TypeScript with tests and tends to land on time.

---

## 12. Tier 1 vs Tier 2 for the `arena-mode.md` cue table

### 12.1 The Tier-1 primitive kit (no models, no rigs, no external art)

| Primitive | Implementation | Cost |
|---|---|---|
| **Transform** — translate, rotate, scale, squash | Offsets on the card plane (§5.1) | free |
| **Tint / desaturate / rim flash** | `material.color` + a thin additive rim quad | 0–1 draw call |
| **Glow** | An additive billboard quad behind the card with a runtime-generated radial-gradient alpha, `AdditiveBlending`, `depthWrite:false` | 1 draw call |
| **Ring / shockwave** | An expanding textured ring quad flat on the table | 1 draw call |
| **Beam** | A stretched, additively blended quad between two anchors; drei `Line`/`QuadraticBezierLine` for curved ones | 1 draw call |
| **Numbers / banners** | drei `<Text>` (SDF, troika) — +44 kB gz, bought once | 1 draw call each |
| **Particles** | `THREE.Points` with a soft sprite, or drei `Sparkles` (present in 9.122) | 1 draw call per system |
| **Dissolve** | drei `shaderMaterial` (present) + a runtime-generated noise texture; ~30 lines of GLSL — **the only shader Tier 1 writes** | free |
| **Camera** | Rig springs, swoop, dolly, bounded shake (§8) | free |
| **Outline** | drei `Outlines` (present) | 1 draw call |
| **HUD overlays** | Plain DOM above the canvas | free |

What Tier 1 **cannot** do without Tier 2: anything requiring a *shape that is not
a card* — a creature silhouette, a pose, a gesture, a rigged animation, a physical
prop (a web, a drone, a lab bench, an ant). Also: true bloom (a post pass), and
volumetric light shafts.

### 12.2 Row-by-row verdict on `docs/ideas/arena-mode.md`'s cue table

| Card | Verdict | Tier 1 realisation (or what is missing) |
|---|---|---|
| **Ant-Man, Reformed Rogue** — shrinks/grows | **Tier 1, fully** | Scale the plane: 1.0 → 0.18 on `attackers:alone`, back on `damage`. |
| **Wasp, Shrinking Savior** — hovers, stings, shrinks target | **Tier 1, mostly** | Persistent `presence.hoverY` + bob; on `cast`, a beam to the target and the target scales down. The *sting* is a pose → Tier 2. |
| **Giant-Sized Flying Ant** — oversized insect + rider, wing hum | **Tier 2** | Tier-1 substitute: enters at 1.4× scale with a high-frequency y-flutter. The insect is a model. |
| **Ant-Man's Air Force** — ant swarm | **Tier 1, fully** | `Points` particle swarm sweeping the table on `cast`/`resolved`. |
| **Pym Particles** — beam, target scales | **Tier 1, fully** | Beam quad + target scale keyed on `counters`/`stats`. |
| **Quantum Reduction** — collapse to a point of light | **Tier 1, fully** | Scale → 0 + additive flash sprite + `zone.exile`. |
| **Quake** — seismic ring, camera shake | **Tier 1, fully** | Ring quad + bounded shake on her `tap` trigger. |
| **Nick Fury, Spymaster** — radio call, agents materialise | **Tier 1, partly** | The created card fades in *from Fury's position* (the `zone`→battlefield event already names it). The radio-call gesture needs a model → Tier 2. |
| **Agent Phil Coulson** — points; badge flash on Heroes | **Tier 1, partly** | Badge flash = additive pip + rim on every card that got a counter. The *pointing* is a pose → Tier 2. |
| **Peggy Carter** — shield-glow aura when attacking alone | **Tier 1, fully** | Additive halo quad on `attackers:alone`. |
| **Agent 13, Sharon Carter** — pistol-draw pose | **Tier 2** | Tier-1 substitute: a fast lunge plus a muzzle-flash sprite. The pose is the point, and the pose is a model. |
| **Agents of S.H.I.E.L.D.** — squad steps forward, spotlight on the lone attacker | **Tier 1, fully** | Group translate on `attackers` + a brightened soft-ellipse quad under the lone attacker. |
| **S.H.I.E.L.D. Helicarrier** — flies in, hovers for the game | **Tier 1, partly** | The *card* flies in from above and keeps a permanent `presence.hoverY` (§5.1 — a layout rule, not a cue). An actual carrier silhouette is Tier 2. |
| **Helicarrier Strike** — reticle from above, strike beam | **Tier 1, fully** | Reticle quad + vertical beam + impact ring. |
| **S.H.I.E.L.D. Spy Kit / Super Suit** — snap on with a HUD flourish | **Tier 1, fully** | `attach.snap`: fly to the host offset, ring, then layout parents it. |
| **Strategic Intervention** — freeze-frame, "mission control" overlay | **Tier 1, fully** | Pause idle motion + a DOM overlay in the sibling layer. |
| **Web Up** — wrapped in webs, lifted off the table | **Tier 1, partly** | Lift + a web-pattern alpha overlay quad + `zone`→exile. Actual webbing geometry is Tier 2. |
| **Aerial Doombot** — hovering drone, laser-eye idle, jet exhaust | **Tier 2** | All three are model-bound. Tier-1 substitute: hover offset + a tiny additive eye dot. |
| **A.I.M. Scientists / Bold Biochemist** — hologram lab bench, glowing vials, cards fly to hand | **Split** | "Cards fly to hand" is **Tier 1** (`zone` library→hand already animates it) and "vials glow" is **Tier 1** (additive tint pulse). The lab bench is **Tier 2**. |
| **Robotics Mastery / Depower** — circuit-trace glow / lights flicker out | **Tier 1, fully** | One hand-made generic 512² circuit-mask texture (a *generic* asset, not card art) animated as an additive overlay; Depower is the same mask fading with a flicker curve. |
| **Thriving Heath / Isle, Plains, Island** — terrain tiles rise, mana taps ripple | **Tier 1, fully** | `land.rise` + `fx.ripple` on `tap`. |
| **Duelist avatars at either end** | **Tier 2** | By definition. |
| **Creature manifestations between the duelists** | **Tier 2** | By definition — this *is* Tier 2. |
| **True bloom on glows** | **Tier 1.5** | `@react-three/postprocessing@2.19.1` (MIT, React-18 line), off by default. |

**Score: 15 of 21 card rows are fully or mostly deliverable in Tier 1 with no art
assets.** Four need Tier 2 for their defining beat (Flying Ant, Agent 13, Aerial
Doombot, A.I.M.'s lab bench) and have honest Tier-1 substitutes; two are partly
deliverable (Fury, Coulson). That is a strong enough hit rate to justify doing
Tier 1 before any modelling work, which is exactly what `arena-mode.md` argues.

---

## 13. Risks

**The frozen React-18 3D stack.** `fiber@8.18.0` and `drei@9.122.0` have had no
release in 19 months and no maintenance branch. Today they build, typecheck and
show no runtime API gap against `three@0.186.0`, but nobody will fix them if that
changes. *Mitigation*: exact version pins on all four packages (including
`three` — its peer range has no upper bound); the E1 go/no-go; the React 19
upgrade fully costed in §1.2 so taking it is a decision, not a crisis.

**Runtime compatibility was not proven, only build compatibility.** Everything in
§1.2 is static analysis and a successful `vite build` + `tsc`. No WebGL context was
created, because the sandbox could not give Chromium a profile directory.
*Mitigation*: E1 opens with exactly this check and has a 45-minute budget and a
named fallback.

**Cue creep.** The per-card cue table is the most fun part of this project and has
no natural stopping point. *Mitigation*: E4's default table is the deliverable and
E5's per-card work is explicitly time-boxed to one evening; anything beyond is a
`cues.json` edit later, which costs no code.

**Camera nausea.** Four camera cues is the budget (§8). A fifth is a discussion,
not a commit.

**Overdraw on integrated graphics.** The 40 quads are nothing; ten stacked additive
effects are not. *Mitigation*: the ≤8-blended-objects cap and the ≤25%-viewport
rule, enforced in the queue, plus `PerformanceMonitor`.

**Duplicating the 2D board's work.** The arena must not grow its own ask modals,
its own art lookup, or its own reducer. *Mitigation*: §2.1's rules, the
DOM-sibling decision layer, and §10.5's source test.

**Protocol drift.** The arena is a second hand-written consumer of §3.6.
*Mitigation*: `EVENT_KINDS` is one `const` that is both the runtime list and the
TS union; the fixture sweep fails on any emitted kind that resolves to `NO_OP`.

**Redaction, from a new angle.** The arena is a new consumer of card data and the
first one that renders per-card *text* into a texture. *Mitigation*: the explicit
`hidden` branch at the top of `CardPlane`, plus §10.3's assertion that no cue and
no stage op carries a hidden card's name.

**Assets and licensing.** Card art stays hot-linked from `cards.scryfall.io` and
is never committed (unchanged from M4). The card back is drawn procedurally rather
than scanned, since the printed back is trademarked. The one hand-made generic
texture Tier 1 needs (a circuit mask) is ours and commits fine. Cue files are
keyed by card *name*, which is text, not art, so `cues.json` belongs in the public
repo. `NOTICE` gains three MIT entries.

---

## 14. Only the user can decide

1. **React 18 (recommended) or React 19?** The plan starts on 18 with the frozen
   3D line and a named trip-wire. Answering "move to 19 now" is legitimate and
   costs ~1 hour plus +15 kB gzip on the 2D path, and buys a maintained 3D stack.
2. **Is `<Text>` worth 44 kB gzip** for in-scene life totals and damage numbers,
   or should all numbers live in the DOM overlay (free)? Plan assumes yes, buy it.
3. **Route (`#/arena`, recommended) or a persistent toggle that remembers?** Plan
   assumes the hash, no persistence, `V` to toggle.
4. **Six evenings before any Tier 2 work**, or stop after E4 (a working cinematic
   replay with default cues, no camera choreography, no per-card cues) and
   reassess? E4 is a genuine, shippable stopping point.
5. **Bloom at Tier 1.5?** `@react-three/postprocessing@2.19.1`, MIT, one more
   chunk, one fullscreen pass. Plan says defer and default off.
