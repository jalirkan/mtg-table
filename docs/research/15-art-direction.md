# 15 — Art direction: from a hologram to a comic page

*Written 2026-09-27 against the arena **as it is in the tree**: `main` at
`bf0392b` (Tier 2 slice 4, the workshop, the card library), in the worktree
`mtg-table-t2i` on branch `art-direction`. Every number below was measured on
this machine that evening unless it is marked otherwise. Every file is cited by
path, and every web fact carries its URL and the day it was read.*

Read first: [`13-arena-tier2-plan.md`](13-arena-tier2-plan.md) (the pose/cue
rule, the clip lane, the budget), [`12-arena-tier2-assets.md`](12-arena-tier2-assets.md)
(the CC0 landscape), [`../evidence/m7-tier2-slice4.md`](../evidence/m7-tier2-slice4.md)
(the bodies, the costume palette, the duelists),
[`../evidence/workshop.md`](../evidence/workshop.md) (the judging tool), and
DECISIONS.md **D53**, **D54**, **D58**, **D61**, **D67**, **D95**–**D104**.

**Evidence convention.** As in report 12, claims come in three kinds:

- **`measured:`** I produced the number: a screenshot, a bench run, or a read
  of this tree.
- **`web:`** read on a live page on 2026-09-27. Two research passes did the
  reading for this report. Neither downloaded anything.
- **`inferred:`** reasoning, and every instance is marked.

The pictures are in `var/art-direction/` (gitignored, local). §10 lists them.

**A spike ships with this report.** It is behind `?look=comic` and a
**holo / comic / hull** switch in the workshop's toolbar, and it is kept in the
tree so the lanes can read it (§10). It leaves every test green: **862
`node --test` + 93 vitest, 0 failures**, and the build has zero errors.

---

## 0. The one-paragraph version

The figures look dull beside the card art because they do the opposite of what
the art does. The art is **ink, flat saturated colour, two or three value bands
and a dynamic pose**. The figures are **a view-angle fresnel glow over one flat
colour per costume slot, no light direction, no line, no face, no ground
contact, and a stock idle**. They stand on a felt of **L\* 7–13**, and several of
them are painted almost the same value (Fury's suit is **L\* ≈ 8**). So the
proposal is to match the art's **style, not its content**:

- a cel-shaded, ink-lined, halftone-screened **comic look** painted over the
  same CC0 bodies;
- one lens-fixed key light computed in the shader, so the scene still has no
  lights and every figure is still **one program** with no clock;
- a depth-edge **ink pass** that rides bloom's existing composer;
- a **contact shadow** under every figure, and a **stage** of mid value.

The spike does all of that. On the GTX 1080 the look costs **+1 draw call and
+22 triangles**, and its p95 stays within ±0.5 ms of the hologram's. The ink pass
merged into bloom costs **+0 draw calls and +0 triangles**, and p95 +0.9–2.6 ms. The hologram is not thrown away:
it becomes the treatment for what is **not yet real** — summoning, the ghosted
creature spell, the anonymous face-down disc. What the art has that the look
cannot give is its content (likeness). A sibling experiment measured that route
tonight (§8): it gives a portrait standee at best, and it needs a new
personal-only decision against **D54**. The recommended first step is in §12.

---

## 1. Diagnosis — why it reads "dull and bare"

### 1.1 What is on screen

`measured:` the workshop, the dev server on port 5183, headless Chromium on the
GTX 1080 (`ANGLE (NVIDIA Corporation, NVIDIA GeForce GTX 1080/PCIe/SSE2, OpenGL
4.5.0)`), 1600 × 1000. The framing is the workshop's default: **1× close**,
*faces its player*, target dummy on, bloom on. The shots were taken from the
**untouched tree**, before the spike:

| file | what is on screen |
|---|---|
| `baseline-fury.png`, `baseline-fury-page.png` | **Nick Fury** seen steeply from above, standing past the card's far edge. A dark, translucent **bell** — the coat prop (`figures/props.ts` `coat`, look `CLOTH`) — reaches from the collar to the table and hides the body. Its rim is a thin pale fresnel line, with slate trim strips down the front and a grey ring at the jaw (the collar). Above it is a brown **hair dome** with a pale skin crescent under it, where the face is. There are no eyes, and the eyepatch is not legible at all. The stand disc is a soft additive halo on the felt. The card beside it shows the same man **mid-leap, coat flying, gun out, against an orange explosion**, drawn in ink. |
| `baseline-coulson.png` | **Agent Phil Coulson**: a navy body with a white shirt V, a gold badge on the chest, a thin dark tie, and a brown hair dome. The body is **evenly lit** all over: the shoulder facing the camera and the thigh turned away are the same navy. The halo disc is blue. The card behind shows four agents in black suits behind cyan glass. |
| `baseline-peggy.png` | **Peggy Carter**: the most legible of the four, because her **red hat** is a saturated shape seen from above and her shield is a red-white-blue roundel. The blue jacket and navy legs are flat. The art shows her **crouched and aiming a pistol** in sepia light. |
| `baseline-doombot.png` | **Aerial Doombot** (the non-humanoid): a translucent green drone with an additive red eye and red visor. Its two thruster arms read, but as glass, not metal. It floats above a green glow disc and is the one figure the hologram flatters, because a robot is allowed to be a hologram. |

The four together say the user's words: the card is *exciting*, the figure is a
*dull and bare* silhouette in a colour.

### 1.2 The measurements

`measured:` computed on the PNGs with a scratch decoder. The figure box is masked
to the pixels that differ from its border, and the art box is the card's art
window.

| | Fury figure | Fury card art | Peggy figure |
|---|---:|---:|---:|
| vivid pixels (HSV S > 0.5, V > 0.25) | **0 %** | 7.5 % | 12.5 % |
| hue families holding ≥ 5 % of the vivid pixels | **0** | 3 | 3 |
| luminance σ (0–1) | 0.141 | 0.222 | 0.250 |
| strong-edge pixels (\|∇L\| > 0.2) | 5.0 % | 5.9 % | 6.1 % |

From the code and the data:

- **The ground is dark.** The felt is `#10161c` rising to `#18222c` at the centre
  (`scene/Table.tsx`), which is **L\* 6.9 → 12.7**, and the background is
  `#0a0d12`.
- **The costumes are close to it in value.** Fury's `top` is `#16181d`
  (**L\* ≈ 8**, `figures/traits.json`) and Coulson's `#1f2c4c` (**L\* ≈ 17**). A
  near-black figure on a near-black felt has only its rim to separate it.
- **The figures are small.** The workshop caption gives the body as drawn in
  view 1 at 1600 × 900: **Peggy 69.3 px, Coulson and Fury 67.8, the Doombot 56.0**
  (`docs/evidence/workshop.md`). A head is about 12 px tall (**D95**).

### 1.3 Ten causes, each with the line that makes it

1. **There is no light direction, so there is no form.** `scene/holoMaterial.ts`'s
   fragment shader computes `fresnel = pow(1 - |N·V|, uRim)` and nothing else.
   Every surface facing the lens gets the same colour, top or bottom, left or
   right. The only 3D cue is a glowing rim, and a glowing rim is how a *ghost*
   reads, not a body. Comic art is the opposite: the value bands **are** the form.
2. **A slot is one flat colour, with no value structure.** **D97**'s palette gives
   eight colours and no shadow side. The core is `body * 0.95` for a costumed
   figure, so a navy suit is one navy.
3. **It is translucent.** Costume core alpha is 0.74 (`holoMaterial.ts`), so the
   felt and the card show through the jacket. "A colour has to read as the cloth
   it is", the shader's own comment says, and at 0.74 it half does.
4. **There is no ink line.** The art's primary information carrier is its line,
   and the figure has none.
5. **There is no face.** `tools/build-figures.mjs`'s `keepBody` drops the eyes and
   eyebrows ("at 60 px a figure's head is 12 px tall"), so the head is a skin
   ball under a hair dome. That is right for the table view and wrong for the
   workshop, the duelists and the shoulder view.
6. **There is no ground contact.** The stand disc (`scene/discs.ts`) is an
   additive glow ring, which lights the table rather than darkening it, so every
   figure floats.
7. **There is no environment.** One felt quad and a near-black clear colour. The
   card art is the only saturated colour on the table.
8. **The pose is stock.** At rest every humanoid plays `Idle_Loop` (**D95**'s clip
   map). The art's pose — Fury mid-leap, Peggy crouched and aiming — appears
   nowhere, and between cues the idle is held, because it advances only while the
   queue is awake (**D58**).
9. **The motion vocabulary is soft light.** `scene/effects.ts`'s kit is glow,
   ring, beam, particles, text, plate and mote, all additive and all radial
   gradients. A comic's motion vocabulary is **graphic shape**: speed lines,
   impact stars, onomatopoeia, smear frames.
10. **The geometry is low detail where it shows.** A 1,400-triangle body (**D96**),
    a rigid bell of a coat (**D97**'s known cost: "a kneeling Biochemist's lab
    coat is a white box to the floor"), and props that are primitives.

**Causes 1–7 are look, and none of them needs an asset.** Only 8–10 need geometry
or motion. That is the order of the lane plan (§9).

---

## 2. The target look — match the art's style, not its content

### 2.1 What the cards are drawn in

`inferred:` from the cards in `decks/pacho-shield.dck` (MSH / MSC). This is
modern American comic-book rendering:

- **bold ink outlines** of varying weight;
- **two or three cel bands** per material, with a crisp terminator;
- **saturated flat colour**, and "black" painted as deep blue with blue
  highlights;
- **halftone or Ben-Day** texture in shadows and backgrounds;
- **dynamic silhouettes**, with **speed lines** and **impact bursts** at the
  moment of action.

Fury's art (Michael MacRae) is black on an orange-and-green explosion. Peggy's is
sepia. Coulson's is black suits on cyan glass.

### 2.2 Why style and not content

- **Content is the one thing this project cannot use.** **D54**: no model from
  card art, and no Mixamo. The likeness routes were measured tonight (§8), and
  their best result is a portrait standee that cannot kneel or play a clip.
- **Style is free.** A cel ramp, an ink line and a halftone screen are about
  thirty lines of GLSL. They carry no provenance, and they apply to every CC0
  body the arena has or will have.
- **Style is what "exciting" is made of in the reference class.** In each of
  these games, low-to-mid-poly geometry reads as illustration because of ramp,
  line and colour, not because of polygons:
  - *The Legend of Zelda: The Wind Waker* — toon ramp, flat colour, simple
    geometry;
  - *Hi-Fi Rush* — cel bands, ink, halftone, comic VFX;
  - *Spider-Man: Into the Spider-Verse* — halftone and Ben-Day, animating "on
    twos", ink hatching, onomatopoeia;
  - *Borderlands* — inked outlines on textured low-poly.

  `inferred:` low-poly geometry **helps** a toon ramp. A band terminator on a
  smooth-normal low-poly body lands in a few clean curves where a detailed mesh
  would break it into noise. The UBC bodies are smooth-shaded, and they read
  cleanly in the spike's shots.
- **The workshop is where the claim can be checked**, and the spike exists so it
  can be. See `after-*.png` against `before-*.png` (§10).

### 2.3 What the comic look supersedes, and what the hologram keeps

**It supersedes D53's "unlit".** The scene still has **no lights** — no
`DirectionalLight`, no `HemisphereLight`, no shadow map (report 13 §8.3 rule 2
holds). But figures and props are now **shaded from a light direction** held in a
uniform (§3.1). The cards are never shaded: they keep `meshBasicMaterial`, and
Scryfall's paintings are not re-lit.

**It does not supersede D67.** The comic look needs **no texture**:

- the ramp is analytic;
- the halftone is procedural in screen space;
- the contact shadow's falloff is computed from the quad's UV;
- the stage is a canvas painted once at runtime, like `effects.ts`'s shapes,
  and it is not an asset.

**One sentence for the record, because it decides Tier 3.** A comic look whose
figure program keeps a **per-vertex colour or texture input** — sampled as
`paint`, so it sits under the same bands, ink and halftone — is what would let a
personal texture-baked model (§8's Route B at 1,400 triangles + 512 px) draw in
colour at all. Without it, the sibling experiment's own finding stands: today's
hologram draws such a mesh as a tinted silhouette.

**What the hologram keeps.** The spike carries the look as **one number per
material** (`uLook`, 0 … 1), not a flag, so these cost nothing:

| where | treatment | why it is right |
|---|---|---|
| **the anonymous face-down figure** | stays the disc and the hologram (hard rule 8; it gets no traits, no costume and no palette) | "a thing whose identity is withheld" is exactly what a hologram says |
| **summoning** (`zone:*>battlefield`) | the figure arrives as a hologram and **resolves into ink** over the cue: `uLook` 0 → 1 driven by a new offset field (§5.3) | the most "Yu-Gi-Oh" moment keeps its hologram, and it decays to identity (**D50**) |
| **summoning sickness** (`sick`) | a pose: `uLook` held at about 0.5, half hologram | "not yet able to act" as "not yet fully real"; it survives a skip, like every pose (**D56**) |
| **the ghosted creature spell** on the stack (report 13 §6.2) | the hologram at 40 % | the spell is not a creature until it resolves |
| **the death dissolve** | the ink drains back to hologram, then fades (`uDrain` already exists) | the reverse of the summon |

That list is a proposal for Lane MOTION (§9.2). The spike implements the switch
and the number.

---

## 3. The shader and pass recipe (three 0.186, fiber 8, postprocessing 6.39)

Everything here is in the spike, and every excerpt is from the tree.

### 3.1 One program, one light direction, no scene light

The comic branch is **inside** the existing `makeHoloMaterial` shader
(`web/src/arena/scene/holoMaterial.ts`), mixed by `uLook`:

```glsl
vec3 paint = mix( uTint, vCostume, uCostumeOn );          // the D97 palette, unchanged
paint = mix( vec3( grey ), paint, uSat );                  // + saturation (1.25)
paint = mix( vec3( 0.022, 0.03, 0.075 ), paint,            // "black is blue"
             smoothstep( 0.0, 0.045, grey ) );
float ndl   = dot( normal, normalize( uKey ) );            // N·L against a CONSTANT
float lit   = smoothstep( 0.28, 0.34, ndl );               // band 1 | band 2
float umbra = 1.0 - smoothstep( -0.20, -0.14, ndl );       // band 2 | band 3
…
colour = mix( holoColour, comic, uLook );
alpha  = mix( holoAlpha, uOpacity, uLook );                // opaque in the comic look
```

**The key light is a view-space constant uniform**, `uKey = (-0.45, 0.72, 0.52)`
(upper left, a little toward the lens; `arena/look.ts`'s `COMIC.key`). `N·L` is
taken against the same view-space normal the fresnel already uses. So:

- **no scene light** and no light uniform to keep in sync: `uKey` never changes;
- **no second program**: the hologram and the comic look are one program
  (`measured:` the program count does not move between `?look=` values in §3.4's
  census);
- **both seats read the same.** The camera sees your figures from behind and the
  opponent's from the front (**D81**), and a lens-fixed light lights both visible
  sides. The light belongs to the *panel*, not to the world, which is also the
  comic convention.

The alternative is a **world-fixed** light, `(viewMatrix * vec4(Lworld, 0)).xyz`
in the vertex shader. It is physically consistent as the camera orbits, but it
lights one seat's visible side and shadows the other's. It is one line and
belongs in the workshop as a toggle, not a decision.

### 3.2 The ramp is three bands and needs no ramp texture

- **Lit**: the painted colour.
- **Mid**: `paint * mix(shadowTone, 1, 0.55)`.
- **Core shadow**: `paint * shadowTone`, with `shadowTone = (0.46, 0.44, 0.66)`,
  darker and cooler, never grey.

The terminators are `smoothstep` over 0.06 of `N·L`, which is enough
anti-aliasing at 1× and still reads as a hard band. A 1-D ramp texture would
allow a hand-painted ramp per card. It is not needed, and it would be a texture
unit and **D67**'s question.

### 3.3 Rim, specular dot, halftone, saturation

- **Rim**: the card's own `uTint` lifted 35 % toward white, applied on the
  shadow side of the silhouette only:
  `smoothstep(0.55, 0.68, 1 − max(N·V, 0)) × 0.6 × (1 − lit)`. This is where the
  hologram's colour identity survives in the comic look.
- **Specular dot**: Blinn half-vector against the same `uKey`,
  `smoothstep(0.986, 0.993, N·H)`, cool white, on the lit band only. The first
  cut used 0.955 and painted a white patch over the whole crown of Fury's head.
- **Halftone**: a 45°-rotated dot screen in **device pixels**
  (`gl_FragCoord.xy / uDotPx`, 5 px cells), darkening the core-shadow band by up
  to 34 %.
  - It is screen-space, so the dots stay put while the figure moves (the
    "shower-door" effect). That is the Spider-Verse convention and reads as
    print.
  - It is a function of position, not time, so **no clock**.
- **"Black is blue"**: below 4.5 % luminance the paint is lifted toward
  `(0.022, 0.03, 0.075)` linear. Without it Fury is a black shape: bands, dots
  and ink all vanish on black (`comic-first-cut-dark-felt-fury.png`).
- **Saturation 1.25** on the palette before shading.

The prop shader (`scene/props.ts`) gets the same three bands, halftone and
specular when its kind is **painted**. Kinds that **emit** — additive, `GLOW`,
`GLASS`, `MEMBRANE` (the muzzle, laser eye, visor, gauntlets, helmet glass,
wings) — stay lights, because a light is not paint.

### 3.4 The ink line — inverted hull against a depth-edge pass, measured

**A — inverted hull** (`inkHullMaterial()` in `holoMaterial.ts`):

- The figure's skinned geometry is drawn a second time on the **same skeleton**,
  `side: BackSide`.
- It is pushed out along the view-space normal by a constant number of screen
  pixels: `uInkPx × uPxPerUnit × −z`.
- It is one shared material, so it adds **one program**. It adds **one draw call
  per figure mesh, and one per painted prop kind** (an instanced hull sharing the
  kind's `instanceMatrix`).
- `measured:` the first cut extruded **inward** and hid the hull inside its body.
  Three flips `transformedNormal` for BackSide materials (`FLIP_SIDED`), and the
  shader now flips it back.

**B — depth-edge post pass** (`InkEffect` in `scene/Post.tsx`):

- It is a `postprocessing` `Effect` with `EffectAttribute.DEPTH`, and it reads
  the depth buffer the scene render already wrote: **no normal pass, no second
  scene render** (report 09 §9.2 rule 3).
- Ink goes where the **Laplacian of 1/z** exceeds a relative threshold (0.012).
  `1/z` is affine in screen space on any plane, so the table, the cards and the
  land slabs get no line. Figures, props, the carrier and the tilted hand cards
  do, at their silhouettes and deep creases.
- `postprocessing` merges every non-convolution effect into **one** `EffectPass`,
  so with bloom on (**D61**'s default) the ink rides the pass bloom already pays
  for.

**Static census.** `g1.jsonl` index 355 (**D96**'s budget frame: 11 figures, 9
prop kinds, 2 duelists), dev build, GTX 1080, 1920 × 1080, dpr 1, one frame with
`gl.info.autoReset` off. The last row is from the production handle
(`?glinfo=1`). "Programs" is three's `info.programs` as read; it counts the
programs cached at that moment.

| look | bloom | draw calls | triangles | programs |
|---|---|---:|---:|---:|
| hologram (today) | off | **79** | **27,416** | 14 |
| comic, no ink | off | 80 | 27,438 | 14 |
| comic, **post** ink | off | 81 | 27,439 | 27 (the composer's variants) |
| comic, **hull** ink, figures only | off | 91 | 44,630 | 14 |
| comic, **hull** ink, figures + painted prop kinds | off | **96** | **47,472** | 16 |
| hologram (today) | **on** | 96 | 27,433 | 29 |
| comic, **post** ink | **on** | **97** | 27,455 | 30 |
| comic, hull, figures only | on | 108 | 44,647 | 31 |

**Frame times** — `tools/arena-bench.mjs`, production build, `vite preview`,
`g1.jsonl --index 316`, 4× replay, warm (`--settle 4000`), 1920 × 1080, dpr
pinned. The load average during the runs was 2–18 (other work on the machine),
so SwiftShader numbers are ± several ms and are given as **p50 / p95** of each
run. Raw output is in `var/art-direction/bench/`.

| rasteriser, dpr, bloom | hologram | comic, no ink | comic + post ink | comic + hull ink |
|---|---|---|---|---|
| **GTX 1080**, 1, off (p95, 3 runs) | 0.6 · 0.6 · 0.6 | 0.9 · 0.7 · 0.6 | 1.1 · 0.8 · 0.8 | 0.7 · 0.6 · 1.4‡ |
| **GTX 1080**, 1, **on** (p95, 3 runs) | 1.0 · 1.2 · 1.6 | 1.4 · 1.2 · 1.1 | 4.0 · 2.3 · 2.0 | 1.2 · 1.3 · 1.2‡ |
| **SwiftShader**, 1, off (run 1 · run 3) | 30.7/48.0 · 28.3/32.0 | 32.7/51.1 · 32.2/50.8 | **47.0/67.1 · 56.3/96.1** | 33.3/50.4 · 33.0/50.8‡ |
| **SwiftShader**, 0.6, off (run 1 · run 3) | 17.1/34.3 · 15.3/32.5 | 18.9/34.8 · 17.6/34.1 | 24.7/30.9 · 22.6/27.4 | 19.1/34.3 · 22.0/33.7‡ |
| **SwiftShader**, 1, on | 104.4/120.4 | 111.7/137.5 | 128.8/152.3 | 111.0/122.6 |
| **SwiftShader**, 0.6, on | 59.2/81.1 | 48.5/65.2 | 50.5/78.3 | 56.8/76.4‡ |

‡ with the prop hulls. Without a ‡, the hull column is figures only.

**What the numbers say:**

- **On the GTX 1080 nothing here matters.** Every variant is inside report 09
  §9.4's gate by an order of magnitude. The comic look without ink is within
  noise of the hologram. Post ink adds p95 +0.1–0.2 ms with bloom off and
  +0.9–2.6 ms with it on.
- **The comic look without ink costs +1 draw call** (the contact shadows) and
  +22 triangles. Under SwiftShader it adds about +2–4 ms p50: the fragment math,
  and the stage's 1024-px felt with anisotropy 4.
- **Post ink with bloom on costs +0 draw calls, +0 triangles and +1 program**
  (96 → 97 calls, and the one is the shadow). It pays in fill: SwiftShader +17 ms
  p50 at dpr 1, in a configuration that already fails the gate fivefold and which
  **D61**'s below-the-floor rung already turns off.
- **Post ink with bloom off costs the whole composer**: SwiftShader +14 to +24 ms
  p50 at dpr 1, and +5 to +6 at the 0.6 floor.
- **Hull ink is cheaper in SwiftShader milliseconds** (+0.2–4.4 ms p50). But it
  costs **+16 draw calls and +20,000 triangles** at `g1`@355: **96 calls and
  47,472 triangles**, over both of report 13 §8.2's lines (≤ 90, ≤ 30,000).
- **Visually the hull is the weaker line** (`after-fury-hull-zoom.png`,
  `after-peggy-hull-zoom.png`):
  - it inks only the silhouette, and only from outside;
  - it **cracks into dashes** on hard-edged props (Peggy's hat);
  - it leaves the shield and the emitters bare;
  - it must be kept in step with every new mesh.

  The post line is **bolder, uniform, and inks every prop, the carrier and every
  interior crease the depth buffer can see**, with no per-object work.

**Choice for the spike, and the recommendation.** "Cheaper" depends on which
budget line is binding:

- **By the lines the project gates on** — draw calls and triangles, with bloom
  on by default — **the post pass is cheaper**, and it is the better line. The
  `after-*.png` pictures use it.
- **By SwiftShader frame time the hull is cheaper.** The spike keeps it behind
  `ink=hull` so the numbers can be re-run.

The recommendation (§9.1):

- **post ink as the look's line**;
- a **governor rung**: below the floor, drop the ink pass together with bloom
  (the bands, shadow and rim still read without ink);
- **delete the hull** unless a measurement on the user's integrated GPU says the
  post pass is the binding cost there.

### 3.5 Contact shadow

The contact shadow is a third `InstancedMesh` in `DiscField` (`scene/discs.ts`,
`shadowMesh`, renderOrder 4, before the discs):

- a flat dark ellipse, flat to 70 % of its radius and then a short edge
  (`smoothstep(0.7, 1.0, r)`);
- **no texture**: the falloff comes from the quad's UV, and the strength rides
  `instanceColor.r`;
- **one draw call for every shadow on the table**;
- written in `DiscField.bind` from the pose and the live offset, so a lunging
  figure's shadow lunges with it;
- on the ground under a flier: height is taken out, and the shadow is smaller
  and fainter the higher the figure is (`fall = 1 / (1 + 2.5·height)`);
- empty, and so not drawn, under the hologram.

Under the comic look the old additive disc drops to 30 % and stays as a faint
ring in the card's colour.

It allocates nothing: `liveness.test.ts`'s scan of `DiscField.bind` stays green.
It is **not** drei's `ContactShadows`, which renders the scene a second time into
a target (report 09 §9.2 rule 3).

### 3.6 How the look reaches the scene

- **Spike**: `?look=comic[&ink=post|hull|none]`, read once by `Arena.tsx` and the
  workshop (`arena/look.ts`'s `lookFromSearch`). The workshop also has a
  toolbar switch: *holo · comic · hull*.
- **At commit, never in the frame loop**:
  - `FigureLayer`'s layout effects write `uLook` on every figure
    (`applyLook`), on the dying bodies (`DepartureField.look`), on the prop kinds
    (`PropField.setLook`) and on the discs (`DiscField.setLook`);
  - `DuelistLayer` writes it on both duelists;
  - `Table` repaints its felt once;
  - `Post` mounts when bloom **or** the ink pass is on.
- **No clock anywhere**, and `frameloop='demand'` is untouched. The halftone is
  screen-space, the ramp analytic, and the stage painted once. An idle table
  still renders zero frames (**D58**, **D72**).

### 3.7 Where a clock would be wanted, and how it stays inside D58/D72

Three comic effects look animated. None needs a clock:

| effect | the tempting clock | the clock-free version |
|---|---|---|
| **animating on twos** (Spider-Verse's stepped motion) | a 12 fps timer | quantise the cue's own `t` inside `driveClips`: `action.time = floor(t × dur × 12) / 12`. A pure function of `t`, so it pauses, scrubs and skips like every clip (**D57**) |
| **line boil** (the ink wobbling a pixel, frame to frame) | `uTime` in `InkEffect` | a noise offset keyed by `floor(queue.now / 83 ms)`, the queue's virtual clock that already drives the duelists' breathing. It advances only while the queue is awake (**D58**), and `InkEffect`'s uniform is written by the frame loop as a number |
| **speed lines scrolling** past a lunge | `uTime` | the cue's `t` as the scroll phase (§5.1) |

`holoMaterial.ts` must keep **no `uTime`** (a liveness clause asserts it), and
nothing above breaks that.

### 3.8 What the spike costs the build

`measured:` `npm --prefix web run build` (gzip), against the workshop's
reconciliation numbers for `main`:

| chunk | `main` | with the spike |
|---|---:|---:|
| entry `index-*.js` | 87.40 kB | **87.40 kB** — none of the spike is in it |
| `arena-scene-*.js` | 347.96 kB | 351.20 kB (+3.24) |
| `Arena-*.js` | 14.34 kB | 14.47 kB |
| `Post-*.js` (lazy) | 16.58 kB | 17.01 kB |
| `Workshop-*.js` | 23.30 kB | 23.64 kB |

---

## 4. Environment — a stage, not a felt

### 4.1 What the spike paints

The spike paints `Table.tsx`'s `comicFeltTexture()`: **one canvas, once**, on the
same quad and in the same `meshBasicMaterial`.

- A vertical gradient: the **opponent's half plum** (`#5a3550`), the **centre
  slate** (`#3d3f63` / `#36486a`), **your half teal** (`#21566a`).
- A warm radial **stage light** at the centre, `rgba(255,236,200,0.22)`.
- A **Ben-Day dot vignette** growing toward the rim.
- The seat lines drawn as a **heavy ink stroke** (`#0e1016`, 0.03 wide).
- The background `#141427`.

**The ground is L\* ≈ 30–38 instead of 7–13.** That is the single change that
makes the ink visible: `comic-first-cut-dark-felt-fury.png` is the comic figure
on the old felt, and its line disappears into the ground.

| cost | value |
|---|---|
| draw calls | **+0** (the same quad) |
| triangles | +0 |
| texture VRAM | ~5.4 MB with mips (1024 × 992) against the old felt's ~1.4 MB |
| SwiftShader | part of the comic look's +2–4 ms p50 (anisotropy 4 on a full-table quad; try 1 before blaming the shader) |
| idle frames | 0 (painted once) |

### 4.2 What Lane LOOK should add, with costs

Each item is a **pose** — it is derived from the snapshot — or a paint-once
texture, never a cue:

| item | how | cost | read of state |
|---|---|---|---|
| **seat colour from the deck** | the two halves' hues from each player's colour identity (`colour.ts`) instead of fixed teal/plum | 0 calls; a repaint at game start | `players[]`'s colour identity, public |
| **backdrop** | one inverted sphere or cylinder behind the table with a vertical gradient and a skyline silhouette band (city, Helicarrier deck, lab), picked per *seat* | +1 call, a few hundred triangles, 1 canvas | none: decoration |
| **ambient motes** | one `THREE.Points` of ~200 dust or rain points, positions a pure function of `queue.now`, advanced only while awake | +1 call; 0 at idle | none |
| **fog** | three's `scene.fog`, on **figures, props and backdrop only** (cards opt out with `fog: false`); needs `#include <fog_*>` in the two custom shaders | +0 calls; a few ALU a fragment | none |
| **a combat stage** | the Ben-Day vignette tightens and a radial action-line burst is painted at the centre while `state.combat` has bands | a second canvas, swapped on the `combat` pose | `state.combat`, a pose (**D56**) |
| **comic panel border** | an ink frame 0.06 wide round the table's edge | +1 call | none |

**Rejected:** a skybox HDRI (Poly Haven's are CC0, but a photographic sky fights
the comic look and costs a big texture), real-time shadows (report 13 §8.3 rule
2), and SSAO (a normal pass).

---

## 5. Motion language — comic VFX as shapes and kinds

The pool (`scene/effects.ts`) is fixed at **45** (glow 8, ring 8, beam 5,
particles 3, text 6, plate 3, mote 12). Most comic VFX are **new shapes on
existing kinds**, which costs no pool growth and no draw call a glow would not
already cost. Only one wants a new kind.

### 5.1 The vocabulary

| effect | implementation | pool | where it fires (default, by event kind) |
|---|---|---|---|
| **impact burst** ("POW" star) | new `EffectShape` `burst`: a jagged 12-point star, drawn once into a canvas like the existing `badge`/`star` | glow (8), no growth | `damage`, `damage:lethal`, `blockers` contact |
| **onomatopoeia** | the `text` kind with a **closed word list** (`POW`, `BLAM`, `KRAK`, `ZZAK`, `WHOOSH`). `Effect.text` already allows "numbers and fixed words only", and the redaction net (`replay-cues.test.ts`) extends to assert every text is a number or a list word | text (6) | lethal damage, a strike resolving |
| **speed lines** on a lunge | **new kind `streak`**: a quad stretched from `at` along the offset's direction, textured with parallel lines, scroll phase = the cue's `t` | new pool: **4**; counted in `MAX_LIVE_EFFECTS` (8) | `attack.lunge`, `attack.jet`, `attack.aegis` |
| **ink splash** on death | new shape `splat` on the `ring` kind (flat on the table), dark, **normal**-blended rather than additive: ring slots need a per-slot blend | ring (8) | `zone.dissolve`, `sacrifice.crush` |
| **halftone flash** | new shape `dots` on `plate`: a dot screen over the struck player's HUD anchor | plate (3) | `damage:player` |
| **camera shake** | **already there**: `camera.ts`'s `SHAKE` (≤ 0.02 world units, ≤ 300 ms, §8 rule 7) and the `shake` param. Use it on impacts; it is already dropped at a live seat while the engine waits on the human, and under reduced motion | — | lethal damage, the outcome |

**Budget.** The pool goes **45 → 49** (4 streaks). `MAX_LIVE_EFFECTS` stays 8 and
`MAX_LIVE_MOTES` 12. Every new shape is a canvas drawn once per page, as in
§12.1 of report 09. A new **blend per slot** (for the splat) is a
`material.blending` write at bind time. That changes the program key only if it
flips `premultipliedAlpha`, so keep it `NormalBlending` against the pool's
`AdditiveBlending` and measure `info.programs` before and after.

### 5.2 A per-card cue, in today's grammar

This is Nick Fury's existing `attackers` entry, `web/src/arena/cues/cues.json`,
with the comic params added. Each new param is **one row in `cues/validate.ts`'s
`PARAM_SPECS`** with its range (slice 3 convention 5), and one line in
`cues-exhaustive.test.ts`'s all-params sweep:

```jsonc
"Nick Fury, Spymaster": {
  "attackers": { "cue": "fx.agents", "ms": 900,
    "params": { "lunge": true, "spread": 1.1, "colour": "#e3c46a", "beams": true,
                "clip": "radioCall",
                "streaks": 1,            // NEW  number [0, 2]: speed-line density on the lunge
                "burst": "pow",          // NEW  enum {none, pow, blam, krak}: the contact star + its word
                "shake": 0.4,            // existing: camera.ts SHAKE-bounded
                "inkFrom": 0.0 } }       // NEW  number [0, 1]: start the figure's look this far toward hologram
}
```

The rule the file lives by holds: **a cue keys off an event about THAT card**.
The burst plays on the defender's figure because the `attackers` band names the
defender (**D82**'s `yawTo` already reads it), not because the renderer decides a
hit landed.

### 5.3 The hologram-to-ink summon (the one new Offset field)

`cues/stage.ts`'s `Offset` gains `materialize: number` (identity **1**, composed
multiplicatively like `scale`). `CueRunner.applyFigures` writes:

```
uLook = pose.look × offset.materialize
```

That is a number written in the frame loop, exactly as `uOpacity` and `uDrain`
already are. `zone.enters` ramps it 0 → 1, and the dissolve ramps it back.

Because it is an **offset**, `replay-cues.test.ts`'s "the offset map is empty
after every batch" covers it with no new line. A skip lands the figure fully
inked. Under reduced motion the ramp collapses with the cue.

---

## 6. Geometry detail — what the CC0 packs actually offer

### 6.1 What "Universal Base Characters" contains

**`measured:` by slice 4's builder, from the zip on its download day**
(`tools/assets-manifest.json`, `quaternius-universal-base-characters`;
`tools/build-figures.mjs`):

- The **Standard** zip, `Universal Base Characters[Standard].zip`, **128,968,391
  bytes**, sha256 `fdbf1804…455f40`.
- **Only the Superhero male and female** of the kit's bodies:
  `Base Characters/Godot - UE/Superhero_{Male,Female}_FullBody.gltf`, plus FBX.
  Both are on the 65-joint UAL rig, T-posed, facing +Z, with 12,566 / 12,812
  triangles.
- **Eight hairstyles** "rigged to head bone" — each weighted 100 % to `Head`, so
  each is **rigid** — under
  `Hairstyles/Rigged to Head Bone/glTF (Godot -Unreal)/`. Two are used:
  `Hair_SimpleParted` and `Hair_Long`. The others' names are not written down
  anywhere in this tree.
- **Eyes and two eyebrow meshes** inside each body glTF. The build drops them
  (`keepBody`).
- **Textures** (skin, eyes, hair), which are never read (**D67**).
- **No outfits, no accessories, and no blendshapes or face shapes** are recorded.

**`web:` the pages today** (a research pass, 2026-09-27). The Quaternius pack
page lists "6 Base models", "20 Hairstyles to mix and match, along with
customizable eye and skin color", a humanoid rig "compatible with retargeting in
any engine", and "Compatible with the Universal Animation Library", all as
CC0. The itch.io captions are narrower:

- **Standard (free)**: "2 base models and 5 hairstyles".
- **Source ($19.99+)**: "All 8 base models, 20 hairstyles … Engine projects …
  with customizable skin, eye, and hair".

The pages disagree with each other (6 or 8 bodies) and with the zip (5 or 8
hairstyles). The eye and skin customisation is a **Source-only shader**. **No
page mentions eyelashes, expressions, shape keys, outfits or accessories.**

**Not re-verified tonight.** The zip is not in this worktree (`var/assets/` does
not exist here). Re-downloading it is a file download and needs the **user's
approval in chat** — the same slice-4 follow-up **D95** records. The download is
`Universal Base Characters[Standard].zip` (128,968,391 B), from
<https://quaternius.itch.io/universal-base-characters> through itch's free "No
thanks, just take me to the downloads" flow. After it:

- run `node tools/build-figures.mjs --verify-only`;
- then list the eight hairstyle names with the build's own zip reader.

**Licence today — `web:` unchanged since the download.**
- <https://quaternius.com/license.html>: QAL v1.0, "Last updated: 8/28/2026".
- A badge census of all **83** pack pages: **82 CC0 and 1 QAL** (the *Bestiary*
  kit), identical to report 12's count on 2026-09-13.
- UBC, UAL, UAL 2 and *Modular Character Outfits – Fantasy* all badge CC0 on
  quaternius.com and "Creative Commons Zero v1.0 Universal" on itch.
- The UBC itch page now carries a `no-ai` tag. `inferred:` that is a signal from
  the author about image-to-3D, worth respecting beside **D54**.

### 6.2 How the build could carry hair, face and outfit pieces

**Hair as a prop kind, not as a body variant.** Each hairstyle is rigid on
`Head`, so it is a prop by the kit's own definition (**D75**, **D98**):

- `tools/build-figures.mjs` exports each hairstyle once as a **static geometry
  node** (`hair:parted`, `hair:long`, `hair:bun`, …) in `figures.glb`, in unit
  head space, with its costume slot `hair`;
- `scene/props.ts` bakes each as a kind anchored to `Head`, as it already bakes
  the squad and the rider from the library;
- the bodies become bald, and `traits.json` gains `hair: "<style>"`, merged down
  the ladder like `costume`, so spy is parted, hero is long, and a card overrides;
- **cost: one draw call per hairstyle on the table**, never per figure. That
  keeps report 13 §12's seam: no model is used by exactly one card, because a
  hairstyle is open to every row.

**A comic face, procedural, no texture.** Eyes at 12 px are two pixels, so the
dropped eye meshes are right for the table view. For the workshop, the duelists
and the shoulder view, a **`face` kind** would do the job:

- a small quad anchored on `Head`'s front;
- the fragment shader draws two eye ellipses, two brow strokes and a mouth line
  analytically from the quad's UV, in the ink colour;
- **no asset and no texture**, so **D67** holds;
- expressions (neutral, grit, pain) as a uniform the pose sets (tapped → grit)
  and the clip lane's `hit` flips to pain for the cue's length.

The eyepatch then becomes a face variant rather than a disc glued on a skin ball.

**Outfits.** *Modular Character Outfits – Fantasy* is CC0 and the only
UBC-compatible outfit pack (`web:` "Compatible with Universal Base Character
heads"). Its **free zip is only the Ranger and Peasant** (280 MB), and they are
fantasy clothing. It is worth one look for a hood and cloak, **after** the user
approves the download. The research pass found **no rigged CC0 coat, cape or
trench coat anywhere** (Poly Pizza's "trench coat" is a trench fortification). So
coats and capes stay **procedural kit geometry**, and the lane's job is to make
them **drape**:

- a 2–3-joint chain on `spine_03` whose angles are a pure function of the
  figure's cue offset (lunge velocity is `d(offset)/dt` over the cue's own `t`)
  and the stance;
- no simulation and no clock.

**Signature rest poses — the cheapest dynamism.** The art's poses are clips the
library already has:
- UAL's `Pistol_Shoot` (a two-handed aim) held at a phase, or composed over
  `Crouch_Idle_Loop` with the build's `A+B` composition (**D95**), is Peggy's
  crouched aim;
- a crouch and a lean is Fury mid-leap.

A `traits.json` **`rest: { "clip": "<key>", "phase": 0–1 }`** would hold a
card's stance at a chosen frame instead of `Idle_Loop` frame 0. It is a pose
(**D56**) and survives a skip, and it is data. **This is how the figure gets the
art's attitude without its content.**

### 6.3 Other CC0 sources that raise detail

From the research pass's table, `web:` 2026-09-27. Every row needs its badge
re-read and recorded on the download day (**D54**):

| candidate | source | licence as read | fit |
|---|---|---|---|
| Blaster Kit (40 files, v2.1) | <https://kenney.nl/assets/blaster-kit> | "Creative Commons CC0" | sidearms for Agent 13, Peggy, Fury; rigid props on `hand_r` |
| Quaternius Pistol (968 tris), Scifi Pistol, Shield | <https://poly.pizza/m/J3i9KDQ3kt>, `/m/uw4B33Mm0d`, `/m/srN1KGAO7f` | "Public Domain (CC0)" on Poly Pizza | prefer the same models from quaternius.com's CC0 pack pages: Poly Pizza badges some Quaternius uploads CC-BY |
| Quaternius Sci-Fi Modular Gun Pack (78 models, glTF) | <https://quaternius.com/packs/scifimodularguns.html> | CC0 | the A.I.M. and S.H.I.E.L.D. armoury |
| KayKit Adventurers 1.0 accessories (9 shields, weapons) | github `KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0` | CC0 1.0 | shields; no cape, no separate helmets |
| Polygonal Mind "Jacket" | <https://poly.pizza/m/eeKk3ObCbf> | "Public Domain (CC0)" | a jacket shell to fit round `spine_03`, unrigged |
| LowPoly Glasses Pack (29 models; FBX/OBJ/Blend, no glTF) | <https://opengameart.org/content/lowpoly-glasses-pack> | CC0 | Coulson's shades, Fury's lenses; needs the FBX path |
| Kenney Particle Pack (80 × 512²), Smoke Particles (70), Splat Pack (30), Light Masks (150) | kenney.nl | "Creative Commons CC0" | sprite sources if the canvas shapes of §5.1 are not enough |
| RenderMan Stylized Presets (hatching brushes, paper) | <https://renderman.pixar.com/stylized-presets> | public domain, CC0 1.0 deed | reference only (a 3.5 GB package) |

**Not committable**, from the same pass: `nidorx/matcaps` (no licence file),
Poly Pizza's CC-BY sunglasses, helmets and masks, the RuneScape cape (CC-BY and
third-party IP), Polygonal Mind's *100Avatars* (rigged with Mixamo), anything
QAL, and Meshy's "CC0" AI cloaks.

`inferred:` **the geometry that raises detail most is not a pack.** It is:
1. hair variety from the pack already downloaded;
2. a procedural face;
3. coats that drape;
4. signature rest poses.

The downloads above are for props, one at a time, when a card asks.

---

## 7. An art-derived palette — every card coloured with no hand-written row

### 7.1 Measured

`measured:` k-means in the page, on the workshop's own card texture (already
decoded for `CardPlane`):
- the art window of the Scryfall `normal` image (488 × 680; x 8–92 %, y 11–55 %);
- every 13th pixel, 9,430 samples;
- k = 6, seeded along the luminance order (deterministic), 12 iterations;
- clusters ranked by share × (0.3 + saturation).

| card | read | k-means | top three by share × saturation |
|---|---:|---:|---|
| Nick Fury | 3.9 ms | 18.5 ms | `#091011` 29 % · `#897748` 18 % · **`#daad6d` 15 %** (the explosion) |
| Peggy Carter | 4.6 ms | 20.2 ms | `#2f2017` 24 % · `#190f09` 19 % · `#838587` 15 % (sepia and grey) |
| Agent Phil Coulson | 4.3 ms | 19.1 ms | **`#0c4858` 18 %** · `#5da8c6` 22 % · `#7ec5e1` 19 % (the cyan glass) |
| Aerial Doombot | 4.4 ms | 17.5 ms | `#4a5052` 25 % · `#63696a` 25 % · `#363c39` 22 % (grey sky) |

**The finding that shapes the design: dominant colour is the BACKGROUND.**
Coulson's palette is his window, not his suit. The Doombot's is the sky, not
Doom green. A raw palette must therefore **never paint a costume**. What it is
good for is **accent and atmosphere**:
- the rim colour;
- an aura's colour;
- the impact burst's colour;
- the seat's stage tint while that card is the focus;
- the mote colour.

The **vivid accent** is the highest share × saturation cluster with S > 0.45:
Fury's explosion orange, Coulson's teal. That is exactly the colour a colourist
would pick for the card's VFX.

### 7.2 Where it fits, and how it stays out of the hot path

- **In the ladder**, below the subtype rungs and only for the non-costume keys:
  `default ⊕ **art** (tint, accent, auraColour, burstColour) ⊕ subtype rungs ⊕
  card row`. A hand-written row always wins. For a new set (Reality Fracture)
  every card gets a distinct accent the day its art is fetched.
- **Computed once per image, at texture load, never per frame.**
  - `scene/useCardTexture.ts` already decodes the image. A `paletteOf(url)`
    cache beside its texture cache runs the k-means in an idle callback after
    the first paint.
  - About 23 ms a card on the main thread measured above. That argues for
    `requestIdleCallback` or a small Worker. Four cards a second is invisible.
  - When a palette resolves, the pose is recomputed at commit (`figurePose`
    takes a `palettes` map as it takes `traits`) and `invalidate()` asks for one
    frame, as a texture arrival does.
- **Pure where it matters.** The k-means itself goes in
  `figures/palette.ts`: `[NO three]`, `[NO DOM]`, a function of a
  `Uint8ClampedArray`. `node --test` can hold it to determinism and to the
  corpus's synthetic pixel sets.
- **Hard rule 8.** A palette is looked up by the name `art.json` resolves, and
  that lookup happens only for a card whose `Placement.back` is false: a
  face-down or redacted card has no art lookup to derive from. The anonymous disc
  stays uncoloured. The rule is the same as `CardPlane`'s, in the same file.
- **Nothing is committed.** A palette is derived from Marvel art. Six hex colours
  are arguably not expression, but the project's line is `art.json`'s: runtime or
  gitignored, never in the repo (report 12 §9).

---

## 8. Tier 3 feasibility — measured tonight, by a sibling experiment

A sibling agent ran the personal-only likeness experiment on this machine this
evening, **on the user's approval in chat** for a personal-only side
measurement. The evidence is `/home/justin-a/code/mtg-table-t2k/docs/evidence/likeness-experiment.md`
and its scripts are `/home/justin-a/code/mtg-table-t2k/tools/likeness/README.md`
(branch `likeness`). Nothing from it is committed. The numbers below are
**theirs, measured**, cited and not re-run.

### 8.1 The setup

- **torch 2.14.0+cu126 runs on the GTX 1080.** `get_arch_list()` carries
  `sm_60`, not `sm_61`. The `sm_60` cubins run on the 1080's `sm_61`: capability
  (6, 1), cuDNN 9.10.2, a 4096² fp32 matmul at **5.26 TFLOP/s**.
- `web:` (the research pass):
  - the CUDA 12.8 and 12.9 builds dropped Maxwell and Pascal from PyTorch 2.8;
  - cu130 wheels need Turing or later;
  - an open RFC (#190385) proposes removing the cu126 builds in PyTorch **2.15**
    (due 28 Oct 2026);
  - driver 580 is the last branch for Pascal (from search snippets only).

  `inferred:` **2.14 may be the last PyTorch this GPU runs**, which argues for
  pinning it in any personal pipeline.
- **The install is 11.4 GiB under `var/likeness/`**, of which about 8.8 GiB is
  needed (a 7.1 GiB venv, 1.7 GiB of weights).
- **Two install findings**: `transformers` 5.x cannot load TripoSR's checkpoint
  (pin `<5`), and `torchmcubes` needs `nvcc`, which this machine lacks, so a CPU
  marching-cubes shim costs 1.3–1.5 s a card.

### 8.2 The two routes

**Route A — Depth Anything V2 Small** (Apache-2.0; Base and Large are
CC-BY-NC-4.0) on the art crop, then a displaced plane or a BiRefNet-cut relief:
- **0.06–0.14 s a card** warm, **254 MiB** of torch VRAM;
- it holds up to **±45° of yaw** and is a sliver at ±70°;
- it keeps the art's own pixels, so faces, emblems and props read.

Verdict: **"usable as a floating portrait"** — a camera-facing standee, not a
figure.

**Route B — TripoSR** (MIT code and weights) on the cut-out figure:
- **~0.8 s forward, ~2.2 s with CPU marching cubes, ~3.2 s of work a card**;
- torch peak 2,379 MiB; process peak 4,156 MiB; whole GPU **4.8 GiB**;
- **43k–122k triangles** raw. Decimated to 1,400 with a **512 px baked texture**,
  it still reads from the table camera (`var/likeness/compare/arena_scale.png`
  in that worktree).
- **Every back is invented** ("a lumpy mass in the costume's average colour"),
  **faces smear**, and the **action pose is baked in**.
- Fury comes out as a slab 0.41 deep; Quake is four pieces.

Verdict: **"a floating statue at most, not a figure"**.

### 8.3 Rigging and licences

**Rigging** is the blocker, and it is the meshes, not the tools:
- there is no Blender on the machine;
- UniRig needs `flash_attn` (no Pascal) and a Python 3.11 `bpy`;
- a crouched, fused, invented mesh cannot play the UAL clips from a T-pose rest.

The sibling estimates "hours of manual work per card" to re-pose, separate,
re-topologise and skin.

**The models not run**: SF3D and SPAR3D sit behind a click-through Stability
licence gate; Hunyuan3D-2 mini's licence is deemed accepted by use and excludes
the EU, the UK and South Korea (a question only the user can answer); TRELLIS
wants 16 GB.

**The integration finding** agrees with §2.3's sentence. Today's one figure
program has **no per-vertex colour and no texture path**, so a likeness mesh
would draw as a tinted silhouette. A colour path is a change to **D53**, **D67**
and **D97**'s territory.

### 8.4 The verdict for this report

Neither route is a *figure* on the clip lane. Both are derivatives of Marvel card
art, so both conflict with **D54** as written. Adopting either, even
personal-only and gitignored, is a **new dated decision** for the user. The
cheapest one worth having is Route A as a **portrait standee**: a new
camera-facing renderer path beside `CardPlane`, for face-up cards only, with hard
rule 8's renderer half argued for it. It is listed in §9.4 as an **optional
personal-only follow-up, not a lane** — *built 2026-09-29 as the personal tier's
second renderer path, **D260**–**D264** (§9.4's note).*

The comic look of §3 is independent of all of it. It would make a personal model
look better, and it does not need one.

---

## 9. The lane plan — three builders, disjoint files

**The rule under all three is the arena's own sentence: the arena is a renderer.**

- Every look is a **pose** or a **number written at commit**.
- Every motion is a **cue that decays to identity**.
- Every body part is **shared kit data**.

The spike is the reference implementation for LOOK and the anchor for the other
two. Each lane starts from this report and the spike's diff.

### 9.1 Lane LOOK — materials, ink, shadows, stage

**Goal.** Ship the comic look as the arena's default **only after the user's go**
(§12). Until then it sits behind `?look=comic`, with the workshop's A/B as the
judging tool. Move it from the spike's quality to production quality.

**Files owned.**
- `arena/look.ts`;
- `scene/holoMaterial.ts` — rename to `figureMaterial.ts` in the same change,
  with a re-export for one release;
- `scene/Post.tsx`, `scene/discs.ts`, `scene/Table.tsx`;
- **the prop shader block of `scene/props.ts`**: LOOK's first commit extracts it
  to `scene/propMaterial.ts`, so that `scene/props.ts`'s geometry belongs to
  BODIES from then on;
- `scene/FigureLayer.tsx` (look plumbing only);
- `scene/DuelistLayer.tsx` (the `look` prop);
- `Arena.tsx` (background, the flag, the `Post` mount);
- `perf.ts` (a `LOOK_DEFAULT`, and the governor rung that drops ink with bloom);
- `main.tsx`'s `arenaFlagsFromQuery` (`look`, moved there from `Arena.tsx`);
- the workshop's toolbar and look state in `workshop/Workshop.tsx`, and
  `workshop/Pedestal.tsx`.

**Work.**
1. Extract the prop shader.
2. Turn the spike's constants into named, documented uniforms: key light, bands,
   halftone cell, ink width, ink threshold, shadow.
3. Make the ink pass's threshold resolution-independent (it is relative already;
   measure it at dpr 0.6 and 1.5).
4. Delete the hull, **or** keep it only for the floor rung, and write the
   measurement that decided which.
5. The contact shadow's squash toward the key light, for grounding.
6. The stage's seat colours from colour identity.
7. The backdrop and the combat stage (§4.2).
8. The pose mapping of §2.3 that is LOOK's: `sick` → `uLook` 0.5, the ghosted
   creature spell stays holo.
9. The prime pass (`EffectPool.prime`'s rule): compile the ink and shadow
   programs at mount, not on first use.

**Budgets** (`g1`@355 and @316, GTX 1080 and SwiftShader, bloom on and off):

| line | value |
|---|---|
| draw calls | ≤ **+2** over the hologram (shadows, backdrop); the ink pass +0 with bloom |
| triangles | ≤ +500 |
| programs | ≤ +2 bloom off, not counting the composer's own variants |
| GPU p95 | ≤ +1.5 ms at @316 |
| SwiftShader p50 at the 0.6 floor | ≤ +3 ms with ink dropped below the floor |
| idle frames | 0 |
| entry chunk | unchanged (87.40 kB gzip) |

**Tests.**
- A new liveness clause: `look.ts` is pure; `uLook` is written only by
  `holoMaterial.ts`'s `applyLook` and only from layout effects, **never** in
  `CueRunner.tsx`, `DiscField.bind`, `DepartureField.bind` or `PropField.bind`
  (mirror the costume clause, negative-controlled). MOTION's `materialize`
  multiply is the one declared exception, written as a number.
- The bloom clause widened: `Post.tsx` stays the only importer of
  `postprocessing`, and `InkEffect` lives there.
- `hooks-order.test.ts` already scans the touched components.
- `traits.test.ts`'s raster, re-run under `uLook` 1, so every identity prop keeps
  ≥ 48 px on both seats. Ink lines add pixels, and halftone must not eat a
  one-sided detail.
- A corpus sweep: the anonymous figure never gets `uLook` > 0 (hard rule 8, the
  hologram is its treatment).

**Workshop toggles** (the A/B the user judges with):
- *holo · comic*;
- ink *post · hull · none*;
- halftone on/off;
- key light *lens · world*;
- stage *comic · felt*;
- shadow on/off.

**Decisions to write** (the next free numbers at merge time; `main` ends at
**D104** and the `match-setup` branch numbers its own):
- the comic look superseding **D53**'s "unlit" (the user's decision);
- the lens-fixed key light;
- ink by a depth-edge pass on bloom's composer, and the floor rung;
- the contact shadow;
- the stage;
- the hologram's new jobs (§2.3).

### 9.2 Lane MOTION — comic VFX, the materialise offset, on twos

**Goal.** A comic motion vocabulary, with the cue engine's rules unchanged.

**Files owned.**
- `scene/effects.ts` (the `streak` kind, the new shapes, per-slot blend);
- `cues/stage.ts` (`EffectShape` += `burst`, `splat`, `dots`; `EffectKind` +=
  `streak`; `Offset.materialize`);
- `cues/defaults.ts`, `cues/registry.ts`, `cues/validate.ts` (the `PARAM_SPECS`
  rows), `cues/cues.json`;
- `scene/CueRunner.tsx` (`applyFigures`: `uLook = pose.look × materialize`;
  `driveClips`: on-twos quantisation behind a flag);
- `scene/SceneStage.ts`;
- `camera.ts` (only to call the existing shake from impacts).

**Budgets.**
- The pool goes 45 → **49**.
- `MAX_LIVE_EFFECTS` stays **8** and `MAX_LIVE_MOTES` 12.
- Nothing is allocated in `bind`: extend the allocation scan to the `streak`
  branch.
- Shake stays inside `SHAKE`.
- Under reduced motion no streak, no shake, and `materialize` snaps to 1.

**Tests.**
- `cues-exhaustive.test.ts`: the new params in the all-params sweep, and the
  pooled compose checked field for field with `materialize`.
- `replay-cues.test.ts`:
  - the offset map is empty after every batch (it covers `materialize` by
    construction);
  - the **redaction net**: every `text` is a number or one of the closed word
    list;
  - no card name in a shape name.
- `camera.test.ts`: the director's short-shot and cooldown assertions with shake
  on impacts.
- `liveness.test.ts`: `effects.ts`'s bind bodies in the allocation scan.

**Workshop.** Every rehearsal already plays through the real queue (**D104**), so
the new beats appear there with no workshop code. The one addition is an
*on twos* switch.

**Decisions**:
- comic VFX as shapes on the fixed pool, plus one `streak` kind;
- the materialise offset (the hologram-to-ink summon);
- on twos as a quantisation of the cue's `t`;
- the onomatopoeia word list as a closed set.

### 9.3 Lane BODIES — hair, face, drape, signature poses

**Goal.** More detail where the camera looks, with no model per card.

**Files owned.**
- `tools/build-figures.mjs`;
- `tools/assets-manifest.json`;
- `web/public/models/figures.glb`;
- `figures/models.json` (generated);
- `figures/figures.json`, `figures/traits.json`;
- `figures/props.ts` (the kit: `hair:*`, `face`, the coat's joints);
- `figures/pose.ts` (`hair`, `rest`, `expression`);
- `figures/validate.ts` (`TRAIT_KEYS`);
- `scene/props.ts` — the geometry builders, once LOOK has extracted the shader;
- `scene/models.ts`;
- the workshop's `TuningPanel` rows for each new trait key (a test already fails
  when `TRAIT_KEYS` names a key the panel does not write).

**Work, in order.**
1. **Signature rest poses** (`rest: {clip, phase}`): data only, the biggest
   read per hour.
2. **Hair as kinds** from the eight hairstyles already in the zip.
3. **The procedural `face` kind** with three expressions.
4. **Draping coat and cape joints**, driven by the offset.
5. Only then, **one CC0 prop at a time** from §6.3, each with its manifest row.

**Budgets.**

| line | value |
|---|---|
| `figures.glb` | re-derive before adding hair: it is **27 kB under 400 kB** today (**D96**); propose ≤ 450 kB, with the measurement |
| triangles at `g1`@355 | ≤ 30,000 (hair kinds are shared geometry: ~200–600 triangles an instance) |
| draw calls | +1 per hairstyle kind on the table |
| `traits.test.ts`'s raster | every identity prop still ≥ 48 px on both seats; the eyepatch's one-sided partner rule (**D98**) moves to the `face` kind |

**Tests.**
- `figures.test.ts`: the committed file equals `models.json`'s record; every
  `hair:*` node exists.
- `traits.test.ts`: the census, the task list read back off the poses, the
  raster, and "no costume, hair, face or rest pose on an anonymous figure"
  (hard rule 8).
- `clips.test.ts`: every `rest.clip` is a clip the body has.
- `facing.test.ts`: the face is on the front.

**Downloads.** Any re-download (UBC, MCO Fantasy, a Kenney or Quaternius pack) is
**the user's approval in chat first**, with the badge read and recorded on the
day (**D54**, **D95**'s follow-up).

**Decisions**:
- hair as shared kinds;
- the procedural face;
- signature rest poses as a pose;
- the drape rule;
- the new `figures.glb` byte budget.

### 9.4 Shared files, conflicts, and the one optional follow-up

| file | owner | the others may… |
|---|---|---|
| `scene/FigureLayer.tsx` | **LOOK** | not edit it. If BODIES needs a hook, it reaches the prop field through `PropField` (already installed there); MOTION writes nothing at commit |
| `scene/CueRunner.tsx` | **MOTION** | not edit it. LOOK's uniforms are written at commit and need no loop change |
| `arena/perf.ts` | **LOOK** | read `LOOK_DEFAULT`, never write it |
| `scene/props.ts` | **LOOK first** (the shader extraction, one commit), then **BODIES** | — |
| `workshop/Workshop.tsx` | split: **LOOK** the toolbar and look state, **BODIES** the `TuningPanel` rows | merge in lane order; the coupling header (`workshop.test.ts`) must name every new arena export |
| `web/test/liveness.test.ts` | append-only, one new `test(…)` per lane at the end | — |
| `DECISIONS.md` | reserve numbers at the start of each lane | — |
| `CLAUDE.md` | written by one documentation pass after the lanes | — |

**Order.** LOOK's extraction commit first, which unblocks BODIES. MOTION can
start at once, but `materialize` needs LOOK's `uLook` (the spike already has it).

**Optional, personal-only, not a lane: the portrait standee** (§8). If the user
wants likeness after seeing the comic look:
- a new dated decision amending **D54** for personal, gitignored output;
- then a camera-facing relief quad per face-up creature, from the sibling's
  Route A, drawn beside the figure or instead of it behind a workshop toggle;
- hard rule 8's renderer half argued for a second card-art surface;
- NOTICE §2's "not distorted or stretched" undertaking revisited.

*Built, 2026-09-29 (branch `standee`, **D260**–**D264**;
`docs/evidence/standee.md`).* The personal tier (**D190**) was the amendment's
home, and the relief cache (**D225**–**D228**) Route A's maps: a face-up creature
no personal model dresses stands as its painting's near subjects, cut from the
cache, where its CC0 body would — dev server only, `?standee=0` the A/B, the
workshop's *personal / repo* toggle the close look. It is turned to the camera
about the vertical on both seats (**D261**, measured against D143's facing), as
tall as its cut under the rank slot's width clamp, kneeling as a painting can
when tapped (**D262**), one draw call (**D263**), and allowed as a second card-art
surface only through `CardPlane`'s own lookup after the gates (**D264**). NOTICE
§2 is unchanged — the standee, like the relief window, is drawn only on the
owner's machine and never in a build or a picture that leaves it; whether NOTICE
should say so is left to the owner (PLAN.md, the personal tier's follow-ups).

---

## 10. The spike, as built

**Files** (all inside `web/src/arena/`, `web/src/workshop/`, `docs/research/` and
`var/`):

| file | change |
|---|---|
| `arena/look.ts` | **new**, pure: `LookSpec`, `lookFromSearch`, `wantsInkPass`, `wantsHull`, the `COMIC` constants |
| `arena/scene/holoMaterial.ts` | the comic branch (`uLook`, `uKey`, `uShadowTone`, `uSat`, `uDotPx`), `applyLook`, `inkHullMaterial` (skinned and instanced) |
| `arena/scene/FigureLayer.tsx` | `look` prop; `uLook` and hull visibility at commit; the hull meshes; look on departures, discs, props; the shadow mesh mounted |
| `arena/scene/discs.ts` | `shadowMesh` (instanced contact shadows), `setLook`, the disc dimmed under the comic look |
| `arena/scene/props.ts` | the prop shader's comic branch, `paintedKind`, `setLook`, instanced prop hulls |
| `arena/scene/Post.tsx` | `InkEffect` (the depth-edge pass); `bloom` and `ink` props |
| `arena/scene/Table.tsx` | the comic stage felt and ink seat lines |
| `arena/scene/DuelistLayer.tsx` | `look` prop, `DuelistField.setLook` |
| `arena/Arena.tsx` | reads `?look=`; background; `Post` mounts for bloom **or** ink |
| `workshop/Workshop.tsx` | the toolbar's *holo · comic · hull*; `?look=` read; coupling header extended |
| `workshop/Pedestal.tsx` | `look` pass-through; `Post` for bloom or ink; the stage |

**What is throwaway:** the URL flag in `Arena.tsx` (LOOK moves it to
`main.tsx`), the hull (pending §3.4's decision), `uPxPerUnit` fixed at a 1000-px
canvas, the stage's fixed seat colours, and the prop hulls' missing prime.

**What holds:** every liveness clause is green — one `useFrame`;
`mixer.update(0)` only, in three files; `.time =` only in the frame loop; the
costume clause and "no clock in the hologram"; the allocation scans of
`DiscField.bind` and the prop field; no off-origin URL; `Post.tsx` the only
`postprocessing` importer; and the workshop's coupling header, lazy route, one
renderer `useFrame` and no timer.

`npm --prefix web test`: **862 `node --test` pass / 0 fail, and 93 vitest in 6
files.** `npm --prefix web run build`: zero errors (§3.8).

**Pictures**, `var/art-direction/` (local, gitignored), all headless Chromium on
the GTX 1080 at 1600 × 1000:

| file | what |
|---|---|
| `baseline-{fury,coulson,peggy,doombot}.png`, `baseline-fury-page.png` | §1.1: the untouched tree, the workshop's default framing |
| `before-{fury,coulson,peggy,doombot}.png` / `after-…png` | the A/B: the same page, `?look=` absent or `comic` (post ink), pedestal crop |
| `before-…-zoom.png` / `after-…-zoom.png` | the same, 2.5× on the figure |
| `after-{fury,peggy}-hull.png`, `…-hull-zoom.png` | the inverted-hull ink, for §3.4 |
| `after-fury-page.png` | the whole workshop with the look switch |
| `before-table-g1-355.png` / `after-table-g1-355.png` (+ `-rank-crop`, `-opp-crop`) | the arena's table view at the budget frame: the real reading size |
| `comic-first-cut-dark-felt-fury.png` | the first cut on the old felt: why the stage matters |
| `bench/` | every `arena-bench.mjs` run behind §3.4's table |

---

## 11. Risks, and what only the user can decide

**Risks.**

- **The look is taste, and the user decided the last one.** **D53** was user
  decision 1. The comic look supersedes it only by a new user decision, and the
  workshop A/B is how the user makes it.
- **Card readability.** The stage is lighter, and a light ground lowers the
  contrast of the cards' white borders. Nothing measured here says a card is
  harder to read, but nobody has played a game on it.
- **The ink pass inks what writes depth.** Tilted hand cards and piles get a line
  (visible in `after-table-g1-355.png`). That reads as comic panels to this
  report's eye; if it does not to the user's, cards need to write depth to a
  layer the pass masks out (one more target — measure first).
- **SwiftShader is still the floor.** With bloom off, post ink is the most
  expensive thing in the spike on a CPU rasteriser. The integrated GPU is still
  unmeasured (report 13 §13 question 3).
- **The next PyTorch may not run this GPU** (§8). That matters only for the
  optional follow-up.
- **Scope creep toward likeness.** The rest-pose trait (§6.2) is where "match
  the art's attitude" could slide into "copy the art's pose per card". A pose
  chosen from the library's clips is data. A pose *estimated from the art* is a
  derivative, and a new decision.

**Only the user can decide.**

1. **Comic, or hologram?** Judge `after-fury.png` / `after-table-g1-355.png` in
   the workshop (`#workshop?card=Nick%20Fury`, switch *holo · comic*). This is
   the decision everything else hangs on.
2. **The hologram's new jobs** (§2.3): summoning as hologram-to-ink, `sick` as
   half hologram, the ghosted spell. Yes, some, or none.
3. **Ink everything that writes depth, cards included, or figures only?**
4. **Downloads.**
   - The UBC zip again (to confirm the eight hairstyles).
   - MCO Fantasy (for a hood or cloak).
   - Any prop pack.

   Each is a chat approval with its filename, source and size.
5. **Tier 3 at all?** The portrait standee is the only measured route that reads.
   It needs a new decision against **D54**, and the UBC page's own `no-ai` tag is
   worth weighing beside it.

---

## 12. The recommended first step

**Put the spike in front of the user as an A/B and ask for the one decision.**
Open `#workshop?card=Nick%20Fury` and `?replay=games/g1.jsonl&look=comic#arena`
beside `?replay=games/g1.jsonl#arena`, switch *holo · comic*, and look at Fury,
Peggy, Coulson and the Doombot at *1× close* and at *table distance*.

- **If the answer is yes**, Lane LOOK's first commit is the prop-shader
  extraction plus the spike's look made the default behind `LOOK_DEFAULT`. The
  new decision supersedes **D53**'s "unlit". MOTION and BODIES start from there.
- **If it is no**, nothing else in §9 is worth building. Delete the spike: it is
  one flag's worth of code and the scene reverts with `uLook` 0.
