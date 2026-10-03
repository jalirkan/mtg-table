
## Cues and attachments (T11 and T12) — the per-card beats, and what each aura looks like

Tier 2 slice 3's second track, built beside the identity track (figures, traits,
props). Report 13 §11's **T11** (the per-card beats `docs/ideas/arena-mode.md`'s
table asks for, which Tier 1 could only substitute for) and **T12** (the remaining
attachment looks, as poses). Everything is on existing cue ids — **no new cue id**
— and every beat is data in `web/src/arena/cues/cues.json`. Nothing on the wire
moved; `bridge/` is untouched.

### What was built

**Four primitives the kit was missing, and nothing else.**

- **The `figure` anchor** (`cues/stage.ts`): `{kind: 'figure', id, at, fwd?,
  side?}` — a point on a card's BODY, `at` in figure heights from its feet. Every
  Tier 1 effect was anchored on a card's REST position, which stays behind while
  the lunge offset carries the card and its figure into the lane, and hangs over
  the art rather than on the body standing 0.52 in front of it; Peggy's shield,
  Agent 13's muzzle, Coulson's badge and the Doombot's exhaust were all drawn where
  the body was not. It is resolved by **the effect binding** (`scene/effects.ts`'s
  `#figurePoint`) against the frame's figure poses, each card's live offset and the
  `presence` bob — `layout.ts`'s `anchorPosition` answers `null` for it, so the
  camera director and `deltaTo` can never be handed one (liveness asserts both,
  and asserts `scene/effects.ts` is the only resolver). A card with no body falls
  back to its card plus its live offset (a wrap follows a card to exile); a
  creature that died in the snapshot resolves to **its departing body's stand**
  (`CueRunner` computes `departureStand` for the bodies that left, at commit — one
  frame of look-behind, D64's rule), so a strike that kills lands on the falling
  body and not on the card the queue has already laid in its graveyard. Rings at a
  figure anchor are drawn on the ground under a flier. `fit: true` sizes a glow or
  ring in the figure's own heights (a shield fits a Quantum-Reduced host, and
  shrinks with Ant-Man).
- **Shapes** (`EffectShape`): `badge`, `shield`, `reticle`, `web`, `circuit`,
  `star`, `hex` — canvas textures drawn once for the page and swapped onto the
  same pooled quads (a map swap between identically initialised canvas textures is
  a uniform change, not a program). Plus `aspect` for a billboard that is taller
  than wide.
- **A travelling particle cloud**: `particles` with a `to` and a `travel` —
  one `Points` system, one draw call — which is how the Air Force sweeps.
- **The effect pool grew once and is still fixed**: 38 → **45** slots (glow 8,
  ring 8, beam 5, particles 3, text 6, plate 3, mote 12). `MAX_LIVE_EFFECTS` did
  **not** move (8): it bounds overdraw.

**Every param is now closed, typed and ranged** (`cues/validate.ts`'s
`PARAM_SPECS`). A name outside the table is an error, so is a value outside its
range — and so is an **event fact** (`beamTo`, `strikeCard`, `defenderId`, `foe`,
…): a cue file that set one would be inventing an aim the wire never stated.
Negative-controlled in `cues-exhaustive.test.ts` (15 shapes of mistake).

**Two new snapshot facts on the ladder** (`cues/resolve.ts`): `strikeGrew` — the
sign of the struck card's P/T change across the resolving transition (two frames,
one card; `0` when either is unknown) — and `foe`, the other seat's id, a
DIRECTION for a sweep and never an aim. `counters` cues now carry their card's
controller off the snapshot (as `tap` does since T4).

**Suppression rule 7** (`cues/queue.ts`): a card whose `cast` and `resolved` name
the same cue in one batch plays it once — the aimed one, else the first. Slice 3
keyed resolutions to per-card cues, and `g1.jsonl` frame 139 (Web Up's spell
resolving and its enter trigger going on the stack in one snapshot) otherwise
lifted Web Up twice. Fires 24× in the corpus.

**T12's poses** (`scene/overlays.ts`, one `InstancedMesh` per KIND — one draw call
per kind on the table, none while nothing wears it):

| kind | the look |
|---|---|
| `shell` | Super Suit: a plated armour capsule around the whole figure, a bright rim and two seams, pulled toward the camera so it reads as glass in front of the body |
| `glints` | S.H.I.E.L.D. Spy Kit: three four-point gadget glints orbiting at hand height, twinkling on the overlay's gated clock |
| `circuit` | Robotics Mastery: bold circuit traces over the body, pulsing |
| `cocoon` | (an attachment of that kind): webbing over the body |

Each keeps the halo ring at the host's feet and replaces the chest glow. **An
anonymous host (a face-down creature) wears the ring and nothing else** (hard rule
8). And the **stations** (`figures/attach.ts`'s `stationsOf`, data in
`cues.json`'s new per-card `station` key): Strategic Intervention's **ops console**
(radar, grid, bar chart, status lights — no words) hangs over its own card while it
is on the battlefield, and Web Up's **cocoon** hangs over Web Up's card. Both are a
pose of the frame — shown in **1,022** and **1,040** of the corpus's 3,679 board
frames — never for a card drawn as a back, a redacted card or an attached one.

### T12's data rows are NOT in `figures.json` — the one thing this track could not do

*(Superseded by the verification fixes at the end of this file: the three rows are
committed, and `attach.test.ts` reads them from the committed file.)*

The attachment ladder's kinds live in `figures/figures.json`'s `attachments`
block, which is the identity track's file. **The three rows T12 needs were not
added**, so in the committed tree Super Suit, the Spy Kit and Robotics Mastery
still resolve through `subtype:equipment` / `subtype:aura` to the halo. The rows
are:

```json
"Super Suit": { "kind": "shell", "metal": true, "strength": 0.9, "_note": "T12: the armour shell." },
"S.H.I.E.L.D. Spy Kit": { "kind": "glints", "metal": true, "strength": 0.95, "_note": "T12: gadget glints at the hands." },
"Robotics Mastery": { "kind": "circuit", "strength": 0.9, "_note": "T12: circuit traces over the body." }
```

`attach.test.ts` lays exactly these over the committed data and proves the
pipeline over the corpus — **944 shrink · 409 shell · 362 glints · 315 circuit**,
the 2,030 of §4.1 with nothing left on the halo — and prints `T12 rows in
figures.json: 0 of 3 (laid over in this test)` until the rows are committed. The
browser photographs below were taken with the same three rows applied **in
memory** through the dev handle (`__mtgArena.figureData.figures.attachments`).

### Web Up, measured before building (report 13 §4.5 and Tier 2 follow-up 15)

Web Up is an **enchantment** (an O-Ring), not an Aura: "When this enchantment
enters, exile target nonland permanent an opponent controls until this enchantment
leaves the battlefield." Over the whole committed corpus, **no card in any exile
zone ever carries an `attachedToId`**, and Web Up's own is `null` in every frame —
`attach.test.ts` asserts `exile cards linked to anything: 0`. So the wire never
relates the exiled card to Web Up, and a cocoon on the exile pile would be the
renderer asserting a link the engine did not state. What ships instead: the
**cocoon station** over Web Up's own card (a pose), and the **wrap** as a cue on
the events that are about it — `cast` (aimed by this frame's stack target) and
`resolved` (aimed by the previous frame's, T6's `strikeCard`): the strands run from
the cocoon to the body, the web closes over it, and the departing body is carried
off wrapped.

### The corpus census (`replay-cues.test.ts`, printed every run)

```
slice 3 per-card beat                                     fired  aimed
  A.I.M. Scientists · power-up (1 to hand)                    4     0
  Agent 13 · attack.lunge (muzzle)                            2     0
  Agents · attack.lunge [attackers]                           3     0
  Air Force · fx.swarm sweep [cast]                          19     9
  Air Force · fx.swarm sweep [resolved]                      14     9
  Ant-Man · attack.shrink (speck)                             1     0
  Bold Biochemist · power-up (2 to hand)                      3     0
  Coulson · his own badge                                    13     0
  Doombot · attack.jet (laser)                               19     0
  Fury · fx.agents (radio call, beams)                        2     0
  Helicarrier Strike · fx.strike (beam)                       1     1
  Helicarrier Strike · fx.strike (lock)                       3     3
  Peggy · attack.aegis (shield)                               4     0
  Pym Particles · fx.scaleBeam [cast] grew=0                  3     3
  Pym Particles · fx.scaleBeam [resolved] grew=0              3     3
  Quake · fx.shockwave (fissure)                             13     4
  Robotics Mastery · attach.snap flourish circuit             8     0
  S.H.I.E.L.D. Spy Kit · attach.snap flourish star            4     0
  Strategic Intervention · freeze-frame                      26     0
  Super Suit · attach.snap flourish hex                       5     0
  Wasp · fx.scaleBeam [cast]                                  8     0
  Wasp · fx.scaleBeam [resolved]                              2     0
  Web Up · fx.webWrap [cast]                                  6     1
  Web Up · fx.webWrap [resolved]                              9     5
  a Hero · badge on the receiver                              9     0
suppression rule 7 (one card's cast AND resolved naming one cue) fired 24×
strikeGrew over the corpus: {"up":13,"flat":11,"down":17}
```

"Aimed" is the wire saying what the item targeted — this frame's stack on a cast,
the previous frame's on a resolution. The AI casts and resolves most triggers
inside one snapshot, so most beats are unaimed and play on the caster alone; that
is reported, not papered over.

### Per beat — what keys it, and what the browser showed

Headless Chromium on the **GTX 1080 through ANGLE-on-GL** (the WebGL renderer
string read in the page: `ANGLE (NVIDIA Corporation, NVIDIA GeForce GTX
1080/PCIe/SSE2, OpenGL 4.5.0)`), dev build on `127.0.0.1:5181`, 1600 × 1000,
`?bloom=0`, the replay scrubbed to the frame BEFORE the batch, the queue paused,
stepped one frame forward, then advanced by its own virtual clock with fiber's
`advance()` pumped (the slice-1 technique). Frame numbers are the replay's
transport index. Photographs are in `var/shots-t2c3/` (local, gitignored).

- **Ant-Man shrinks to a speck** — `human-auto-7` **780** (`attackers:alone`,
  the corpus's one): at +270 ms his offset scale is **0.18**, the `shrink` clip is
  at weight 1, and the `speck` (a four-point glint on his figure anchor) and a
  particle trail ride him down the lane; the photograph (`antman-780-*.png`, and
  the DSF-2 crop `antman-780-crop.png`) is a bright speck with a sparkle trail
  over a thumbnail of his card, his tiny red figure inside it. The pop back on
  damage (`popScale` 1.4) now throws a ring from his feet (`damageCue`'s `pop`).
  **The size is one number in two files**: `cues.json`'s 0.18 and `traits.json`'s
  `shrink: 0.18` — `clips.test.ts` fails if they drift.
- **Wasp shrinks her target** — **synthetic**: the corpus never aims her attack
  trigger (0 of 10: it goes on and off inside one snapshot). At `g1` **300** a
  hand-built `{kind: 'resolved', cardId: 28}` was enqueued through the dev handle
  with a previous-frame board whose stack item 28 targets the opponent's Soldier
  Token (91) — the real ladder, the real cue. +200…+470 ms: a blue beam from HER
  figure (hovering, winged) to the token's body, the token's offset scale **0.60**,
  its `shrink` clip at weight 1, and a ring **closing** at its feet
  (`wasp-synth-330.png`).
- **Quake's shockwave** — keyed off her trigger's **`resolved`** ("Seismic
  Takedown"), no longer her own `tap`. `g3` **270** (aimed at Bold Biochemist,
  12): at +300 ms two cyan rings leave her feet and a fissure runs across the
  table to the target; at +520 ms a ring bursts at the target's feet and it plays
  `hit`; the camera shake now frames BOTH cards (it used to push in on her card
  alone, which cropped the target) (`quake-270-520.png`). The aim is T6's
  look-behind; the batch's `tap` events are never paired to her — that would be
  inventing a cause. 4 of 13 corpus resolutions are aimed.
- **Coulson's badge flash on the Heroes** — `disjoint` **120**: from +920 ms a gold
  shield-crest badge rises over **Peggy (4)** and over **Coulson (30)** himself
  (his own `resolved`, the `channel` gesture), each with a gold ring at its feet
  (`coulson-120-1160.png`). Still keyed on the card that RECEIVED the counter; no
  beam joins them, because the counters event names no source.
- **Peggy's shield** — `g1` **142** (`attackers:alone`): a hexagonal force-field
  bubble on her figure anchor, sized in her heights (she is Quantum-Reduced to
  0.38 here) and a gold ring at her feet, both going down the lane with her
  (`peggy-142-320.png`).
- **Helicarrier Strike's reticle** — `g3` **115** (the cast, `lock`): a white
  crosshair reticle closes onto the Air Force's swarm and HOLDS (+300 ms: strength
  0.92, radius 0.55) (`strike-115-1560.png`); `g3` **116** (the resolution, aimed
  by `strikeCard`): the beam comes straight down on the swarm's departing body —
  it dies in this batch — with the impact ring on the ground there
  (`strike-116-table-1190.png`). Before the departed-body anchor the beam came
  from above the graveyard pile.
- **Web Up's cocoon** — `human-comfort-13` **1034** (the cast, aimed at A.I.M.
  Scientists 42): two strands from Web Up's cocoon station to the body, the target
  lifted and squashed (`webup-1034-370.png`); **1044** (the resolution): the
  departing body, stepped out of its rank, wrapped in a web billboard with the
  strands still on it as it is carried off to exile (`webup-1044-550.png`). The
  cocoon station hangs over Web Up's card in both.
- **Super Suit's shell, the Spy Kit's glints, Robotics Mastery's circuits** —
  `g1` **300**, with the three `figures.json` rows applied **in memory** (see
  above): `overlays.counts()` reads `shells 1 · circuits 1 · glints 3`. From the
  opponent's-shoulder view (`attach-300-oppshoulder.png`, DSF-2 strip
  `t12-strip.png`): Peggy inside a plated capsule; three white glints orbiting the
  opponent's Doombot (65); blue-white traces over Wasp's body from the shoulder
  view. **At the table view the three read as a halo ring plus a coloured sheen**
  — a figure is ~40 px tall there — and the textures were redrawn twice to get
  that far (hairline traces vanished entirely; see "not done").
- **The scientists' Power-up** — `g2` **163** (A.I.M. Scientists' counter):
  +740…+1040 ms the three vials at the figure's hands light in turn (a star each,
  a beat apart), the lab ring spreads, and a card-mote leaves the figure for its
  controller's hand anchor (`powerup-163-920.png`, crop `powerup-163-crop.png`).
  The draw itself is still its own `zone.draw`.
- **The stations** — Strategic Intervention's console and Web Up's cocoon at `g1`
  **300** from the opponent's shoulder (`t12-console-cocoon.png`): a cyan ops
  screen with radar sweep, grid and bars over SI's card, and a white silk spindle
  hanging from its thread over Web Up's.

Not photographed, and tested only: Fury's radio call and beams (1 entry, 1 attack
in the corpus — `disjoint` 242/267), the Doombot's laser, Agent 13's muzzle
flashes, the Agents' lone-attacker spotlight, the Air Force's sweep, Pym
Particles following the target's size (the corpus only ever chose its vigilance
mode: `strikeGrew` 0, so it pulses and claims no change), Depower's flicker on
resolution, Strategic Intervention's freeze-frame banner.

### Budgets and idle

- **`g1` @355, bloom off** (dev build, GTX 1080): **74 draw calls, 27,230
  triangles** with the committed data (both tracks' work in the tree); **76 /
  27,234** with the three T12 rows applied — against ≤ 90 and ≤ 30,000. `g1` @316
  with the rows: 70 / 23,450. This track's own share at @355 is the two stations
  (2 calls) and the looks (+2 net: three meshes in, the chest glow out).
- **Idle is still zero**: `human-comfort-13` @1262 (stations and the identity
  track's props on the table), 0 frames rendered in 5 s of idle.
- **The §9.3 cap**: 0 → **2** refused effects over the whole corpus sweep (one
  batch: a Doombot's laser, Strategic Intervention's freeze and two casts at
  once). Trimmed from 38 after the first draft: the hologram's second ring gives
  way to the vials, Fury's call particles to the beams, and the freeze's console
  flare was dropped (the console is a pose already).

### The wing hum — built, measured, removed

`docs/ideas`' "wing hum idle" for the Giant-Sized Flying Ant was built as a
`presence` bob (0.014 at 2.2 Hz). A presence keeps the frame loop at `always`
(Tier 2 follow-up 7), and the measurement was: bobbing board frames **964 → 1,094
of 3,679**, and `human-comfort-13` @1262 — the frame the idle-zero claim is
measured on — **0 → 300 frames in 5 s of idle**, for a vibration of about one
pixel. It was taken out; the ant's idle flight is the identity table's `idle:
hover`, which moves only while frames are drawn (D58). The `_t11` note on its
`cues.json` entry records this.

### Tests

`npm --prefix web test`: **690 `node --test` + 79 vitest**, 0 failures (both
tracks' work in the tree). This track's additions:

- `cues-exhaustive.test.ts` — the closed param schema with 15 negative controls;
  the station schema; every registered cue decaying to identity **with every
  slice-3 param on** (lock on and off); the T11 beats anchored on the figure (18
  cue/effect pairs); **no camera request ever frames a figure anchor**; under
  reduced motion no particles, no camera, no clip.
- `replay-cues.test.ts` — the census above, with floors on every beat that is a
  claim (Quake aimed ≥ 4, the strike's lock and beam, Web Up aimed on both events,
  the Air Force's aimed sweep, Pym aimed, Wasp NEVER aimed — so the day the corpus
  aims one the evidence is told); rule 7 by hand.
- `stack.test.ts` — `strikeGrew` agrees with the two frames' P/T over every aimed
  resolution; `foe` is always the other seat; Pym grows, shrinks or only pulses by
  `strikeGrew`.
- `attach.test.ts` — T12's four looks from data over the corpus; the stations
  counted against the snapshot independently, hanging over their own card, naming
  nothing; exile never linked; never for a back, a redacted card or an attached
  one.
- `clips.test.ts` — every `params.clip` in `cues.json` is a clip some model
  carries (`radioCall`); `fx.shockwave → channel`; Ant-Man's shrink agrees across
  the two files.
- `liveness.test.ts` — the pool's figure resolver and the overlay field's looks
  and stations allocate nothing (nine bodies, seven junk lines spliced into each);
  the figure anchor is `scene/effects.ts`'s alone and `layout.ts` never resolves
  one; the pool reads no clock.

`npm --prefix web run build`: zero errors; entry chunk **86.23 kB gzip**
(unchanged — no `three`), Arena chunk 344.13 kB gzip, `Post` 16.54 kB.

### Not done, or worth a decision

1. **The three `figures.json` rows** (above) — the identity track's file.
2. **At the table view the T12 looks are small.** A figure is ~40 px tall at 1600
   × 1000; the shell's rim and the glints read, the circuit traces read as a sheen.
   The shoulder views show them properly. Bigger looks would crowd the rank.
3. **Wasp's shrink has never been aimed by a real game** (0 of 10). It works on a
   synthetic resolution; a human game where her trigger waits on the stack would
   show it live.
4. **The station console sits over the opponent's land row** at the table view
   (a lift above a card on the far rank projects up the screen). It is
   translucent and additive; a flat holo-table was considered and rejected
   (nowhere to put it that a full rank does not cover).
5. **`CLAUDE.md` still says the effect pool is 38**; it is 45, and the cap is
   unchanged. The conventions section wants the figure anchor, the closed param
   schema, rule 7 and the stations — a documentation pass.
6. **Cast cues on a TRIGGER still rise out of the hand** (Tier 1's `cast.rise` on
   a card already on the battlefield decays from the controller's hand anchor).
   Pre-existing; Strategic Intervention's freeze rides it.

## Identity (T9 and T10) — every card reads as itself: traits, props, the swarm, the giant, the carrier

*Appended 2026-09-27 by the identity builder. Worktree
`/home/justin-a/code/mtg-table-t2c`, branch `tier2-slice3`, nothing committed.
Files: `web/src/arena/figures/traits.json`, `traits.ts`, `props.ts` (new),
`pose.ts`, `validate.ts`, `figures.json`; `web/src/arena/scene/props.ts` (new),
`FigureLayer.tsx`, `discs.ts`; `web/src/arena/layout.ts` (one constant,
`SILHOUETTE_ALTITUDE`); tests `web/test/traits.test.ts` (new),
`figure-pose.test.ts`, `liveness.test.ts` (the prop-field clauses). No asset,
no `figures.glb` byte, no `models.json` line, no `tools/` file and no `NOTICE`
line changed: every prop is procedural.*

The user's verdict on slice 2 was *"everything still looks very generic"* — and it
was the deliberate floor: every card was one of five bodies in a colour. This
section is the fix: **identity is data** (`traits.json`), drawn with a small kit of
**shared, instanced, procedural props** (one draw call per KIND on the table, never
per figure), and it is all a pose of the snapshot.

### What was built

- **`figures/traits.json` + `figures/traits.ts`** — per card and per subtype rung:
  `scale`, `hover` (world units above the stand point), `idle` (`hover` bobs while
  frames are drawn, `static` stands), `tint`, `accent` (the props' colour),
  `shade` (a villain darker), `turn` + `turnedRatio` (the giant flies side-on),
  `props` (named kit kinds), `swarm` + `formation` (`ring` / `squad`),
  `silhouette` (`carrier`), and `shrink` (a key the CUE layer reads — Ant-Man's
  attack scale; the pose never applies it). The ladder is `default ⊕ every matching
  subtype rung, least specific first ⊕ the card's row`; scalars take the most
  specific rung, `props` is REPLACED, never appended. `validateTraits`
  (`figures/validate.ts`) mirrors the other validators: closed keys, ranges, a
  subtype rung must be a word `SUBTYPE_ORDER` can produce, a turned figure must
  state its turned footprint; a bad row is dropped and the ladder falls through.
  `figurePose` reads the committed file (`TRAITS`, validated once at import) when
  its caller passes none, so **`Arena.tsx` needed no change**; a test passes its
  own, or `EMPTY_TRAIT_DATA` for slice 2's poses exactly.
- **`figures/props.ts` — the kit, as data** (`[NO three]`): 14 nameable kinds
  (`wings`, `helmet`, `hood`, `jetpack`, `exhaust`, `laserEye`, `pistol`, `coat`,
  `eyepatch`, `badge`, `gauntlets`, `shield`, `rider`, `labBench`) and three
  derived ones (`squad`, `swarmBee`, `carrier`), each with its blend, its colour
  role and its anchors per body family (humanoid — the three Kenney bodies share
  one 7-joint rig — drone, insect). An anchor is a joint's base name (`head`,
  `torso`, `arm-right`, the drone's `Eye`, the bee's `Head3`), `root` (the figure's
  whole transform, lunge included) or `stand` (the stand point, no cue offset), in
  **figure space** — one unit tall, feet at 0, **face at +z** (measured: the Kenney
  face detail sits on the z = +0.25 plane; the drone's eye and the bee's mouth are
  at +z). `swarmMembers` / `swarmSpan` lay out and measure a swarm purely.
- **`scene/props.ts` — the prop field.** One `InstancedMesh` per kind, every kind
  the same `ShaderMaterial` source (a view-space fresnel like `holoMaterial.ts`,
  plus instancing, an instance colour × a per-vertex colour, a per-instance opacity
  attribute) with its own uniforms — **one program for the whole field**, compiled
  at mount (`setPrimeVisible` + `gl.compile`, since `compile` skips invisible
  objects). Geometry is procedural primitives merged per kind (wings are four
  ellipse blades darkening to the root; the helmet a glass shell, antennae and red
  lenses; the carrier a hull, bow, flight deck with runway lights, island and four
  rotor pods — 456 triangles), plus two kinds **baked once from the loaded library**:
  the rider (the hero body frozen crouching) and a squad follower per humanoid body
  (frozen in its idle) — sampled track by track, not through a mixer, because the
  arena's mixers are ticked in exactly two files. A joint prop is re-expressed in
  its joint's bind frame at load, so it follows whatever the clip lane does to that
  joint (the pistol rises with `pistolDraw`); a `root` prop follows `pose ⊕ offset`
  (the squad steps forward with its leader's lunge; the ring swarm turns round its
  centre); a `stand` prop ignores the offset (the bench does not lunge).
- **It is bound from the one frame loop without touching `CueRunner.tsx`**:
  `DiscField.bind` calls `props?.bind(offsets, seconds)` after the departing
  bodies — the seam D64's bodies already use, which runs after `applyFigures` has
  posed every rig. `FigureLayer` builds the field, installs it (`setProps`), hands
  it the library and COMMITS it in a layout effect once per snapshot, after every
  `<Figure>` below has registered its rig. The frame-loop body walks a fixed array
  of 192 preallocated bindings by index and allocates nothing (liveness reads it).
- **`figurePose` grew** `lift` (a flier's hover, folded into `position[1]` so the
  tether, the aura ring and the renderer see the figure where it is), `props`,
  `accent`, `swarm`, `formation`, `silhouette`, `vehicle` and `traitRungs`
  (categories, never a name). The stand disc takes `lift` back out and stays on the
  ground under a flier, and draws nothing under a silhouette.
- **T10 — the carrier.** A `subtype:vehicle` rung (an ARCHETYPE, so no model belongs
  to one card) makes a Vehicle a `carrier` silhouette: posed at its stand point
  lifted by the rung's `hover` (0.85, on top of the card's own 0.9 `presence`), never
  below `layout.ts`'s new `SILHOUETTE_ALTITUDE` (1.65) whatever a presence rule
  says, riding the card's presence bob and its cue offset (so `fx.flyIn` carries it
  in), 1.85 world units long, one draw call. **It is drawn crewed or not**: 613 of
  the corpus's 728 Helicarrier frame-instances are an uncrewed `Artifact - Vehicle`,
  and the snapshot says it is on the battlefield either way — so `figurePose` now
  poses a face-up non-creature Vehicle as a silhouette-only pose (`vehicle: true`,
  `modelId: null`, no disc, no props), 599 such poses over the corpus.
- **T9.** The **Doombot** has a red laser eye on its `Eye` joint, twin thrusters on
  its back and a resting exhaust under them — lit at 0.7 as a pose, flaring with
  **the emitter hook**: every glowing kind (`exhaust`, `laserEye`, `gauntlets`,
  `badge`) burns at its kit's rest level and rises with the clip lane's weight on its
  card (`attack` / `summon` / `channel` / `grow` — so `attack.jet` is the jet burn)
  and with the cue offset's `glow`; a cue drives it by asking for a clip or a glow,
  and there is no second API. **Ant-Man's Air Force** is five small procedural bees
  in a slowly turning ring (one instanced call); its insect rig still stands at the
  centre for the clip lane and is hidden. **The Giant-Sized Flying Ant** reads as
  giant with no exemption from D65 (next section), with extra wings and a crouching
  red rider on its head.

### D65 is still strict — the giant is giant because it flies side-on

The width clamp holds every figure to its rank slot, and the bee's WIDTH is its
wingspan (1.47× its height), so every insect was 0.49 tall and the giant was not
giant (slice 2 follow-up 3). `traits.json` turns it 90° (`turn`), so its width along
the rank is its body's length: `traits.test.ts` loads the committed `figures.glb` in
Node, poses the insect in its resting stances exactly as `build-figures.mjs`
measures width, and finds its depth **0.783×** its height (the file declares 0.83;
the test fails if the declaration is below the measurement or more than 0.1 above
it). At `scale: 1.35` the strict clamp then gives **0.867 tall** — against 0.490
facing — inside the same 0.720 slot. A swarm is clamped by its whole ring
(`swarmSpan`: the Air Force stands 0.504 tall, each bee 0.21) and a squad by its
whole rank (the Agents' leader 0.580). `figure-pose.test.ts`'s overlap sweep —
now 7,216 neighbouring pairs (slice 2's 7,331 less the 115 crewed-Helicarrier
instances, a silhouette over the rank now rather than a disc in it) — is still
0.000; silhouettes are excluded from it because they fly over the rank, and a new
test asserts over the corpus, with the cue file's presence rules and without, that
**every carrier's underside (lowest 1.55) is above every head on its seat (tallest
1.19)**.

### Every card, on a real frame (headless Chromium on the GTX 1080)

*(The first builders' photographs. The verification pass found several of these
unreadable at 1× from the table view; what changed, and the new photographs, are
in the verification fixes at the end of this file.)*

`--use-angle=gl`, the Vite dev server on 5180, `?bloom=0`, the replay slider set
through the native value setter, `queue.skipAll()`, frames pumped through the app's
pre-bundled fiber `advance()`; close-ups put the camera beside the card's pose with
the orbit controls disabled. Photographs are in `var/shots-t2s3/` (local,
gitignored), named below. "Calls" is `gl.info.render.calls` for that shot's own
camera (a close-up draws less than the table).

| card | what reads | frame | calls | photo |
|---|---|---|---:|---|
| Wasp, Shrinking Savior | half a hero's height (0.468), gold, hovering 0.35 over her stand point on top of her card's 0.24 presence, four pale-blue iridescent wings on her back (seen above her head from the table's height) | `g1`@304; `disjoint`@198 | 50; 31 | `e02-wasp-g1-304.png`, `e03-wasp-disjoint-198.png` |
| Ant-Man, Reformed Rogue | red body under a glass dome helmet with antennae and red lenses | `g2`@196 | 44 | `e04-antman-g2-196.png` |
| Ant-Man's Air Force | five small striped bees with wings in a ring round the stand point, no insect body | `human-comfort-13`@534 | 24 | `e05-airforce-hc13-534.png` |
| Giant-Sized Flying Ant | a bee twice any other insect's height, side-on, extra wings, a red rider crouched on its head | `g2`@151 | 38 / 34 | `e06-giant-g2-151.png`, `e06b-giant-rider-g2-151.png` |
| Aerial Doombot | Doom green, a red laser eye; from behind, twin thrusters and two lit flames | `g1`@304 | 42 / 32 | `e07-doombot-g1-304.png`, `e08-doombot-back-g1-304.png` |
| Nick Fury, Spymaster | a dark body, the eyepatch over HIS left eye with a thin strap round the head, a long dark coat with lit lapels (from behind: a coat to the ankles) | `disjoint`@260 | 34 / 26 | `e09-fury-disjoint-260.png`, `e10-fury-back-disjoint-260.png` |
| Agent Phil Coulson | navy suit, a gold shield-shaped badge on his left breast | `disjoint`@76 | 21 | `e11-coulson-disjoint-76.png` |
| Quake, Agent of S.H.I.E.L.D. | teal body, both fists glowing | `g3`@92 | 29 | `e12-quake-g3-92.png` |
| Agent 13, Sharon Carter | a gunmetal pistol in her right hand (small at table distance) | `human-auto-7`@916 | 29 | `e13-agent13-ha7-916.png` |
| S.H.I.E.L.D. Helicarrier | the carrier overhead — both players' in this frame — from **all five views** (`1` table, `2` shoulder, `3` opponent's shoulder, `4` side-on, `5` low) | `g1`@316 | 68 each | `e18`…`e22-heli-view1..5-g1-316.png`, close `e23-heli-close-g1-316.png` |
| Bold Biochemist | lab green, a lab bench at his left hand with a lit flask and three vials | `disjoint`@137 | 21 | `e14-bio-bench-disjoint-137.png` |
| A.I.M. Scientists | bright yellow, the bucket hood with its dark visor, the bench | `g2`@181 | 31 | `e15-aim-bench-g2-181.png` |
| Peggy Carter, Secret Agent | warm white, a round red-white-and-blue shield on her left arm | `disjoint`@137 | 28 | `e16-peggy-disjoint-137.png` |
| Agents of S.H.I.E.L.D. | a squad: the leader and two followers a step behind | `human-comfort-13`@1123 | 34 | `e17-agents-hc13-1123.png` |
| (the table) | all of the above at table distance | `g1`@355 | 74 | `e01-g1-355-table.png`, bloom on `e24-g1-355-table-bloom.png` |

Two placements were moved after looking. **Wasp's wings** first hid behind the
chibi head (the head is half the figure): they are now 0.74 figure units long,
splayed ±53°, and pale blue so they separate from the gold. **The lab bench** first
stood behind the scientist, toward the centre line, and your own scientist's head
hid it from your camera (the opponent's read): it now stands at the scientist's
left hand, inside its own rank slot.

### Budgets — `g1`@355, bloom off (dev build, GTX 1080), both tracks in the tree

| | draw calls | triangles | programs |
|---|---:|---:|---:|
| slice 2 (its evidence) | 65 | 24,406 | 11 |
| **now** | **74** | **27,230** | **12** |
| of which the prop field | 7 kinds (`wings` ×2, `jetpack` ×2, `exhaust` ×2, `laserEye` ×3, `shield`, `carrier`, `rider`) | 2,822 | 1 |

Against report 13 §8.2's ≤ 90 and ≤ 30,000 (and ≤ 14 programs; 27 with bloom on,
Tier 2 follow-up 5 unchanged). The remaining +2 calls are the cue track's stations.
The busiest prop frames in the corpus (from `traits.test.ts`'s census): **`g2`@208,
9 kinds** — 65 calls, 22,130 triangles, 4,043 of them props — and
**`human-auto-2026`@925, 9 kinds, 17 instances** — 62 calls, 26,689 triangles, 4,588
of them props. The census asserts ≤ 12 kinds and ≤ 96 instances in any frame.
The drones dominate the triangle line (4,544 each); a prop kind is 23–540
triangles, and the baked rider and squad follower are a Kenney body each (~730).

**Idle is still zero.** `human-comfort-13`@1262 — the Air Force swarm, the squad, the
giant and its rider, badges and gauntlets on the table — rendered **2 frames in 5 s**
(both card-texture uploads, traced to `useCardTexture.ts`'s `invalidate`) with bloom
off; with bloom on, 72 `gl.render` calls, which is the same 2 frames through the
composer's passes. A flier's `idle: hover` bob and the ring's turn move only while
frames are drawn (D58), so they cannot wake the loop; `g2`@181 renders continuously
only because Wasp's own `presence` bob keeps it at `always` (Tier 2 follow-up 7,
pre-existing).

### Hard rule 8

`traitFor` returns the default for a hidden card without reading its name, and
`figurePose` never asks for a card drawn as a back. Asserted: **1,179 anonymous
figure-instances in the corpus, none with a prop, a hover, a swarm, a silhouette or
a trait rung**; a hand-built face-down card named "Wasp, Shrinking Savior" is the
anonymous disc at full `FIGURE_HEIGHT` with no wings; a card drawn as a back is never
posed as a vehicle. A prop carries a kind and a colour, never a name; every prop
mesh clears `raycast`.

### Tests

- **`traits.test.ts` (new, 14)**: the data validates with zero errors and is the
  module's `TRAITS`; the validator's ten negative controls; the merge order; hard
  rule 8 (above); **the census** — which card got which rungs, props, scale, hover,
  swarm and silhouette, over 3,679 board frames, printed every run — with every card
  row and every archetype rung firing, and the task's list read back off it (Wasp
  small/hovering/winged, Ant-Man helmeted, the Air Force a ring of five, the giant
  over 0.8 with a rider, the Doombot's three props, Fury's two, Coulson's badge,
  Quake's gauntlets, Peggy's shield, Agent 13's pistol, the Agents' squad, the
  carrier, both benches, A.I.M.'s hood); every deck prop fits its body; the giant's
  side-on clamp and the measured depth; the swarm and squad clamps over the corpus;
  "no trait data ⇒ slice 2's poses"; the procedural bee is exactly
  `SWARM_BEE_RATIO` wide and the carrier one length long, every kind ≤ 1,200
  triangles.
- **`figure-pose.test.ts`**: the stand point plus `lift` is `layout.ts`'s; one pose
  per creature + ghost + uncrewed vehicle (599); silhouettes out of the overlap
  sweep and asserted above every head.
- **`liveness.test.ts`**: `traits.json` in the provenance-only URL check; the prop
  field bound only from `DiscField.bind`, installed, built and committed only by
  `FigureLayer`, no transport, no cue engine, no click, no clock, nothing built in
  its frame loop, which refreshes the rigs it reads and reads the clip lane (the
  emitter hook); `PropField.bind` and `commitKind` in the allocation scan with every
  junk line spliced in.
- `npm --prefix web test`: **690 `node --test` + 79 vitest, 0 failures**;
  `npm --prefix web run build`: zero errors, entry chunk **86.23 kB gzip**
  (unchanged, no `three`), Arena 344.2–344.4 kB gzip across three builds (both
  tracks, the other still editing), `Post` 16.54 kB.

### `figures.glb` and the asset pipeline

Untouched: **143,920 B, sha256 `c09ac552…a981a3`**, what `models.json` records and
`figures.test.ts` checks. No prop needed a mesh the kit could not build from
primitives, so **no source was added to `tools/assets-manifest.json`, nothing was
downloaded, and `NOTICE` needs no new entry.** The rebuild itself was **not** re-run:
this worktree has no `var/assets/figures/` (gitignored), and
`node tools/build-figures.mjs --verify-only` refuses with the Kenney zip's download
URL, as designed (D67). Re-downloading the four CC0 sources is the user's call.

### Not done, or worth a decision

1. **The cue track's three T12 rows for `figures.json`** (Super Suit `shell`, Spy
   Kit `glints`, Robotics Mastery `circuit`, written out in that track's section
   above) were added here and **taken out again**: `attach.test.ts` still pins the
   pre-row rungs (`Robotics Mastery` → `subtype:aura`, the Spy Kit →
   `subtype:equipment`), so committing the rows from this side turned that track's
   own test red. They should land in one change with that test's update.
2. **A dying figure drops its props.** The departing body (D64) is its own clone,
   not a rig the prop field binds, so a Doombot falls without its eye and thrusters.
   Binding the departure field's bodies is the fix; it is a second input to
   `PropField.commit`.
3. **Your own figures face YOU.** Measured, not changed: the models' fronts are at
   +z and the viewer's seat is at +Z, so `facingY: 0` turns your figures toward your
   camera (the slice-2 evidence and a test comment said they face the opponent; the
   comments in `pose.ts` and `figure-pose.test.ts` are corrected, the behaviour is
   not changed). It
   is why a badge, an eyepatch and a laser eye read on your side and a jetpack or a
   coat reads on the opponent's. Turning them is a one-line change with a large
   visible cost; it wants the user's eye first.
4. **Small props are small at the table view.** Agent 13's pistol and Ant-Man's
   lenses read in a close-up and as a glint at 1600 × 1000; the shoulder and low
   views show them properly.
5. **The uncrewed Helicarrier is now a pose.** 599 frames gained a
   silhouette-only `FigurePose` (`vehicle: true`); every consumer of `FigureLayout`
   was checked (the disc skips it, the overlays find no attachments, the tether aims
   at the hull, departures ignore it), but a reviewer should know figures are no
   longer only creatures and ghosts.
6. **Every browser number is headless Chromium on the GTX 1080** (Tier 2
   follow-up 4's caveat); no frame-time bench was run — the field is at most 12
   instanced calls and ~5k triangles, and its frame-loop body is a fixed walk. The
   CDP driver that took the photographs is a scratch script, not in `tools/`
   (slice 2 follow-up 7's pattern).

## Verification fixes — every major and minor of the slice-3 verification pass

*Appended 2026-09-27 by the fix pass. Same worktree and branch, nothing committed.
Decisions **D75–D81** (DECISIONS.md) record the slice's choices and these fixes;
PLAN.md's *Slice 3* has the status, the follow-ups and question 13. Photographs:
headless Chromium on the GTX 1080 through ANGLE-on-GL, the dev server on 5180,
1600 × 1000, `?bloom=0`, the verifier's CDP driver. The `fx4/…` paths below are
under `var/shots-t2s3/` (local and gitignored, never committed) — the second
verification pass copied them there from the session scratchpad, which does not
persist.*

The verification pass (headless Chromium on the GTX 1080, every deck card in views
1 and 4, both corpus cinematics, one live game) passed the gate and the invariants
and found three majors and five minors. Each is below with what changed and how it
is now held.

### 1. The two tracks disagreed about which way a figure faces (major)

`scene/effects.ts`'s `#figurePoint` resolved a beat's `fwd` along
`−(sin facingY, cos facingY)`; the prop field turns figure space — whose front is
+Z, measured again here on `figures.glb` (69 of the agent's 127 eye-band vertices
within 0.03 of z = +0.25, 8 near the back; the scientist 68 / 8) — by `+facingY`.
So every front-anchored beat landed behind its prop: at `g1` 231→232 the opponent's
Doombot's exhaust cloud streamed from its FACE while its flame prop burned behind
it (the verifier's `face-doombot-g1-232-side/-other.png`).

**Fix — one definition** (**D81**): `layout.ts` now exports `FIGURE_FRONT_Z` (+1),
`seatFacingY(seat)` (which `figures/pose.ts` reads), `figurePointInto` (the only
resolution of `fwd` / `side`; both branches of `#figurePoint`, the living body and
the dying one, call it) and `figureAnchorOf` (a figure-space point → a beat's terms).
Agent 13's muzzle flash is now `figureAnchorOf(PISTOL_MUZZLE)` — ON her pistol's
lit tip. **`web/test/facing.test.ts`** (new, 5 tests) resolves `attack.jet`'s eye
(and the laser's origin), its exhaust, `attack.lunge`'s muzzle and `fx.badge`'s flash
against the `laserEye`, `jetpack`, `muzzle` and `badge` props for **both seats**,
asserts the same side in the figure's terms and in the world, puts the muzzle flash
within 1e-9 of the lit tip and on her right hand, scans `#figurePoint` for a facing
computed of its own, and carries its own negative control: slice 3's first
resolution disagrees with every prop (`oldAgreed === 0`).

**Re-photographed** at `g1` 231→232 from +x and −x (`var/shots-t2s3/fx4/facing1/`): the jetpack
and its flame and the exhaust cloud are on the same side (the back), the red eye
star on the front.

**Not changed, and the user's call (question 13):** with fronts at +Z and
`seatFacingY('you') === 0`, your figures face your camera and the opponent's face
away — both face outward. So an attacking Doombot lunges back first (its exhaust
leads and its laser crosses its own body toward the defender), and Agent 13's
`pistolDraw` aims at you. Turning them is one line in `seatFacingY`; every prop and
every beat follows it now.

### 2. T12 was not delivered in real games (major)

`figures.json` gains the three rows (`Super Suit` shell, metal, 0.9; `S.H.I.E.L.D.
Spy Kit` glints, metal, 0.95; `Robotics Mastery` circuit, 0.9), its `_kinds` note
no longer says they draw as the halo "until then", and the subtype rungs' notes say
they are for any OTHER Aura / Equipment. `attach.test.ts`'s two pinned tests now
expect the per-name rungs (`card` / circuit, shell, glints) — with two hand-built
cards proving the subtype rungs still catch anything else — and the T12 test reads
the COMMITTED file (`T12 rows in figures.json: 3 of 3 (committed)`); the corpus is
**944 shrink · 409 shell · 362 glints · 315 circuit**, nothing of this deck on the
halo. Photographed: Coulson in his Super Suit shell at `disjoint`@109 (side-on).

### 3–4. Agent 13 and Coulson were not recognisable at table distance (majors); 5. the partial ones (minor)

The kit grew three kinds (`muzzle`, `tie`, `hat`) — shared like every other — and
the table-view-critical props were enlarged, each judged at 1× from views 1 and 4
(`var/shots-t2s3/fx4/cards1/`, `…/fx4/peggy2/`, and 3× contact sheets of the 1×
crops, `…/fx4/sheet1.png`, `…/fx4/sheet-peggy.png`):

| card | change | at 1×, table view |
|---|---|---|
| Agent 13 | tint `#5b52c4` (indigo, her own), accent silver; `pistol` 0.3 on the TORSO, raised at the right of the chest, barrel forward and 20° out; `muzzle` (additive, lit at rest, flares with her attack) at its tip | an indigo agent with a white pistol and a bright tip — no longer the pale agent a Soldier Token or Peggy is |
| Coulson | tint `#3f5fbf` (darker navy); `badge` 0.13, NORMAL blend (additive gold over navy summed to white), a bright gold rim, a deeper field, a dark roundel; `tie` (white shirt-front V and a dark tie) | a navy agent with a gold badge; the tie is under his head from this camera and reads from views 2, 4 and 5 |
| Nick Fury | patch radius 0.108 (was 0.08), strap 0.05 thick (was 0.024); coat 50° open at the front (was 72°) | a grey agent under a dark coat with a dark patch and band across the face |
| Peggy Carter | `hat` (red, a crown, a band and a brim wider than the head); `shield` 0.25 (was 0.17), in front of the arm and turned out | a red hat — the top of the head is what this camera sees most of; side-on, the roundel shows |
| Ant-Man | the helmet gains a silver crest over the crown and thick antennae with lit tips; bigger red lenses | a red figure in a glass helmet with two bright antenna tips |
| Bold Biochemist | its own row: `coat` (white — Fury's kind in another colour) and the bench | a mint scientist in a white lab coat at a white bench |

The census's "task list" reads each back off the corpus (Coulson badge and tie,
Peggy shield and hat, Agent 13 pistol and muzzle, Bold Biochemist coat and bench).

### 6. The ops console and the carrier covered figures from the table view (minor)

**Stations** (`figures/attach.ts`): a station now stands at its OWN slot's stand
point (`standPointOf` — where a creature's figure would stand), figure-sized
(`STATION_SIZE`: console 0.68 × 0.425, cocoon 0.34 × 0.68 — neither wider than
`FIGURE_MAX_WIDTH`), `STATION_LIFT` 0.3 / 0.4 above it. A new `attach.test.ts` test
projects every station and every figure of every corpus frame through the table
view's camera (1600 × 1000): **11,031 pairs, worst cover 0.004**; the old placement
measures **0.564** (negative control run by hand). Photographed at `g2`@224: the
console stands in its slot between Ant-Man and Wasp.

**Carrier** (`layout.ts`, `figures/props.ts`, `traits.json`): a grid of altitude,
inboard shift and scale was projected through all four seat/spectator views over
the corpus. The first numbers (1.65, 1.85 long) overlapped 352 of 799 own-seat
carrier/figure pairs by more than 5% in the table view; **`SILHOUETTE_ALTITUDE`
2.05, the vehicle rung's `hover` 1.25 and `CARRIER_LENGTH` 1.5 take it to 0.000 on
both seats**. A new `figure-pose.test.ts` test projects every carrier (through
`CARRIER_BOUNDS`, which `traits.test.ts` holds the built geometry inside) and every
figure: **5,103 pairs, worst 0.000**; the old numbers measure **0.569**. What it
costs: from the over-the-shoulder views a carrier over your rank still projects onto
the far rank (342 of 621 pairs in view 2, 356 before), because no position satisfies
both views — an inboard shift fixes the shoulder and breaks the table. Photographed at
`g1`@323: your carrier clear above Wasp, the opponent's near the top edge.

### 7. The prop field's gaps (minor)

- **A dying figure keeps its props.** `DepartureField.bodies()` is a second input to
  `PropField.commit`; a departing body's joint props ride its own joints, its other
  props its root (`MODE_BODY`), fading with its material and drawn only while it is.
  Photographed at `human-auto-7` stepped 794 → 795 (`var/shots-t2s3/fx4/death1/`, the `die` clip at
  t 0.21 and 0.50): Ant-Man falls in his helmet and the opponent's Agent 13 with her
  pistol and lit muzzle; `discs.counts()` reads 2 departures, 10 prop instances.
- **Reduced motion is followed live**: a `matchMedia` `change` listener writes the
  field's motion factor, subscribed in `ensure()` and dropped in `dispose()`.
  `traits.test.ts` stands a fake `MediaQueryList` in for the browser's and asserts
  the field subscribes, follows a change both ways, and lets go on `dispose`.
- **Fliers no longer wear the Doombot's eye**: `attack.jet` takes `eye` (a new row
  in the closed `PARAM_SPECS`, default `true`); Wasp's and the giant ant's
  `attackers` rows pass `eye: false`, keeping the lunge and the wing-wash.
  `facing.test.ts` asserts both rows and the Doombot's.

### 8. The docs (minor)

CLAUDE.md (the pool is 45; a slice-3 conventions section; the decision range),
`tools/assets-manifest.json`'s `_deferred.carrier` (closed without an asset),
DECISIONS **D75–D81**, PLAN.md's *Slice 3* with its follow-ups and question 13,
README's decision count, and this section.

### Budgets, idle, network

`g1`@355, bloom off, table view, GTX 1080: **77 draw calls, 27,474 triangles, 12
programs**; the prop field 8 kinds (`wings` ×2, `jetpack` ×2, `exhaust` ×2,
`laserEye` ×3, `shield`, `hat`, `carrier`, `rider`), 3,062 triangles. The census:
at most **10 prop kinds** (`g2`@208) and **19 instances** (`human-auto-2026`@925) in
any corpus frame, against its ≤ 12 and ≤ 96. **Idle is still zero**:
`human-comfort-13`@1262 (the swarm, the squad, the rider, two badges and ties, four
gauntlets on the table) rendered **0 frames in 5 s**, `frameloop` `demand`; `g1`@316
keeps rendering only because of the Helicarrier's pre-existing presence bob (Tier 2
follow-up 7). Across every page load of the fix pass
the only off-origin requests were `cards.scryfall.io` card art (D52); the console
carried nothing but three's `THREE.Clock` deprecation notice (pre-existing).

### The gate

`npm --prefix web run build`: zero errors; entry chunk **86.23 kB gzip** (unchanged,
no `three`), Arena **346.14 kB**, `Post` **16.54 kB**. `npm --prefix web test`:
**698 `node --test` + 79 vitest, 0 failures** (690 before the fix pass; `facing`
+5, `attach` +1, `figure-pose` +1, `traits` +1). `rm -rf bridge/out && WSPORT=8666
./tools/check-all.sh`: **`check-all OK`, exit 0, 731 s** — node --test 708 / 700
pass / 0 fail / 8 skipped and 79 vitest inside it, all ten games of 9c, 9d and
10a–10g, and `check-redaction` over every fixture and fresh recording.


## Second verification pass — four majors and five minors, all fixed

*Appended 2026-09-27. Same worktree and branch, nothing committed. Decisions
**D82–D87**. Photographs: headless Chromium through ANGLE on the GTX 1080, the dev
server on 5180, 1600 × 1000, `?bloom=0`, a scratch CDP driver (the verifier's,
extended); every still cited below is under `var/shots-t2s3/fx5/` (local,
gitignored). "@N" is the replay slider's index, as every evidence file uses it.*

The pass (4× zooms of the committed frames, BOTH seats, views 1 and 4, real-time
cue playback, a live game at seed 11) found that both earlier passes had judged the
props on the viewer's own figures only, while the table view sees the OPPONENT's
figures from behind (D81). What changed, and how each is now held:

### 1. Front props vanished on the opponent's side (major) — and a way to measure it

**`web/test/prop-raster.ts`** (test support; the glob is `test/*.test.ts`) is a
software rasteriser over the real pipeline: `figures.glb` parsed by three's
`GLTFLoader` in Node and indexed by the arena's own `indexLibrary` (exported from
`scene/models.ts` for it), each body instanced by `instantiateFigure` and held in
its resting clip at the phase `CueRunner` uses, the props read back out of a real
`PropField` committed and bound as `FigureLayer` and `DiscField.bind` do, every
triangle projected through a `PerspectiveCamera` at `camera.ts`'s table pose and
scan-converted into a depth buffer at 1600 × 1000. A prop's pixel counts iff it is
nearer the lens than every body and every depth-writing prop of another kind (a
body writes depth and every prop draws after the bodies). Calibrated against a
screenshot: the viewer's Soldier Tokens at `g1`@355 land within 5% of their
photographed boxes once the canvas's 54 px header is accounted for.

`traits.test.ts` poses every deck card from `decks/pacho-shield.dck` alone and at
the end of a five-card rank, standing and kneeling, on BOTH seats, and prints the
fewest pixels each prop reaches (the bar is 48 on both seats; `tie`, `laserEye`
and `exhaust` are one-sided details that must show on their own side at 24 while a
partner — `badge`, `visor` — carries the other):

| card | prop | your seat | opponent's seat |
|---|---|---:|---:|
| Agent Phil Coulson | badge (chest + back emblem) | 133 | 273 |
| | tie (one-sided) | 37 | 0 |
| Agent 13, Sharon Carter | pistol | 537 | 199 |
| | muzzle | 196 | 87 |
| Nick Fury, Spymaster | coat | 1,350 | 1,838 |
| | eyepatch (patch + strap) | 488 | 318 |
| Aerial Doombot | visor (new) | 135 | 87 |
| | laserEye (one-sided) | 48 | 0 |
| | jetpack | 66 | 168 |
| | exhaust (one-sided) | 0 | 43 |
| Peggy Carter | shield / hat | 293 / 1,994 | 206 / 1,130 |
| Quake | gauntlets | 734 | 388 |
| Agents of S.H.I.E.L.D. | squad | 1,146 | 1,156 |
| Wasp | wings | 310 | 593 |
| Ant-Man | helmet | 2,354 | 1,448 |
| Ant-Man's Air Force | swarmBee | 2,454 | 1,520 |
| Giant-Sized Flying Ant | wings / rider | 821 / 1,594 | 312 / 1,125 |
| Bold Biochemist | coat / labBench | 1,415 / 180 | 1,912 / 171 |
| A.I.M. Scientists | hood / labBench | 3,148 / 147 | 2,345 / 165 |

The negative control: Coulson's chest badge alone, from the opponent's seat, is
**0 px**. Before the fixes (measured with the same harness in `ready`): the
opponent's Coulson carried 0 px of badge and tie, the Doombot 0 px of eye.

What changed (**D83**): the **badge** kind has a second anchor, a 0.17 emblem
between the shoulder blades tilted up to the camera, and the chest badge is lower,
bigger (0.155) and tilted up, out from under the chibi's chin; the **pistol** is
at her right hip, out beside the body and 49° out from straight ahead, 0.32, its
tip inside the body's own width; the new shared kind **`visor`** is a robot's eye
as a lit band round its head (the Doombot's red, the Robot token's cyan through the
robot rung); the **tie** runs to the belt. Photographed, 4× crops of 1× shots
(`var/shots-t2s3/fx5/identity/`, `sheet-identity.png`): the opponent's Coulson
with his gold emblem on his back (`hc13-1262-v1-coulson-opp*`, `hc13-1279-v1-*`,
view 3 `dj-265-v3-coulson-you*`); the opponent's Agent 13 kneeling, a white pistol
beside her (`g2-148-v1-a13-opp*`); yours with its lit muzzle out to the side
(`g2-148-v1-a13-you*`, `ha7-916-v1/v4-*`); the opponent's Doombot from behind with
its thrusters and a red band below them (`g1-355-v1-doom-opp*`). Before:
`var/shots-t2s3/fx5/before/`.

### 2. The Agents did not read as a squad (major)

A wedge, 0.46 aside and 0.2 back, followers at 0.78, clamped into one slot (0.396
tall), in steel blue `#6c86c0` (**D84**). The head test, both seats, standing and
kneeling, centre and edge: each head 336–786 px, the narrowest sideways gap between
two head centres **18.4–22.9 px**; slice 3's formation fails in **8 of 8** cases
(its followers projected just above or below the leader: a sideways gap of 0).
Photographed: `hc13-1279-v1-agents-opp*` (three blue agents), `hc13-1262-v1-agents-opp*`
(kneeling), `hc13-1279-v4-agents-opp*` (side-on).

### 3. Nick Fury (major)

A slate body (`#566076`), a nearly opaque black coat (`#15181e`) flared to 0.46
(the head is 0.34) with trim strips ×30 of the coat's colour down its front, round
a stand-up collar and its hem, lit only at its silhouette (the `CLOTH` look: rim
power 3, lift 0.45); a 0.14 black patch with a thin pale rim, and a black strap
that runs diagonally from the patch up across his forehead and round the back of
his head (**D83**). Two looks were tried first and photographed: `#2b303b` with a
soft rim lift read as a pale grey bell (the rim lift greys a flared coat seen at a
grazing angle), and a black body over a bright card read grey (the hologram's core
alpha is 0.38) — so the body is slate and the coat carries the black. Photographed
at `disjoint`@265, untapped and not sick: view 1 (`dj-265-v1-fury-you*`), from
behind in view 3 (`dj-265-v3-fury-you*` — the black coat and the strap across the
back of his head), side-on (`dj-265-v4-fury-you*` — a black coat with pale trim).
He is the darkest figure on the table at 1× and reads as a figure in a long black
coat; the patch reads as a dark disc ringed pale. (The verifier's `disjoint`@242 is
his CAST — a ghost at 0.4 opacity on the stack — and @260 is his first,
summoning-sick frame.)

### 4. Front-anchored attack beats fired away from their target (major)

`Offset.dRotY` and `Stage.yawTo` (**D82**). `facing.test.ts` (+3 tests): the
short-way-round turn faces any point; with a `SceneStage` over a two-seat board
the real `attack.lunge` (muzzle) and `attack.jet` (eye, laser) put the beat on the
defender's side of the lunged body and the body's front within 10° of its defender
(6° measured) on BOTH seats, with no turn at t = 0 and t = 1; all four lunging
attack cues turn with geometry and not on a `NullStage`; the negative control
(no turn) faces every attacker away. Photographed, the batch stepped with the queue
paused (`var/shots-t2s3/fx5/beats/`): `a13-g2-157-v1-*` — the opponent's Agent 13
turned 2.56 rad, the star on her pistol's tip; `doom-g1-232-v1-*` and
`doom-g1-342-v1-*` — the laser leaves the side of the drone that faces its target.

### 5. The opponent's carrier under the HUD (minor)

Measured in the browser at 1600 × 1000, 1280 × 800, 1920 × 1080, 1000 × 1000 and
2560 × 1080: the chrome over the canvas is fixed in pixels — the decision bar
(to 112), the cue and camera strips (116–150), the credit line (152–167) and the
opponent's seat card (96–180), window px; the canvas starts at 54. `HUD_TOP_PX`
128 below the canvas top. A grid over the corpus (every opponent carrier, every
live aspect, the table view, the two seat-safe shoulder views): over the
opponent's half, every placement under the band covered the opponent's figures;
over the centre line at 0.8 up and ×0.8, table-view cover 0.000 (**D85**). The
test: highest carrier NDC 0.353 against a band from 0.656 (745 px canvas) /
0.729 (946 px); slice 3's placement reached 1.058. Photographed
(`var/shots-t2s3/fx5/carrier/`): `g1-355-v1` — the opponent's carrier between the
ranks, the HUD clear; `g1-316-v1` — both carriers, overlapping like a formation
(the known cost, PLAN follow-up 5); `g3-270-v1`.

### 6–7. Coulson and Agent 13 on your side; four quiet beats (minors)

Coulson's chest badge and Agent 13's pistol: above (§1). The beats (**D87**),
stepped with the queue paused at their peaks (`var/shots-t2s3/fx5/beats/`):
Helicarrier Strike's resolution at `g3`@116 — a thick white beam and a star on the
target (`strike-g3-116-v1-01*`; a camera excursion was tried and removed: it framed
the struck card, already in the graveyard); the Power-up at `g2`@163 — the card
appears over the scientist's head as a card-sized light and holds a beat before it
leaves for a hand off the top of the view (`power-g2-163-*`; a first try that left
from the chest was hidden inside the body); the Air Force at `g2`@219 — a bright core
riding the sweep's arc (`swarm-g2-219-*`); Peggy's aegis at `g1`@142 — a blue
bubble with red and white rings, apart from her white Super Suit shell
(`aegis-g1-142-*`).

### 8. A click on an enchanted creature hit its aura (minor)

`ATTACH_DY` −0.002 (**D86**). `attach.test.ts` builds `HitProxy`'s planes for
every eighth corpus frame and raycasts with three's `Raycaster` from views 1, 2
and 5: **765 of 765** host-centre clicks hit the host (with the old +0.002, 765 of
765 missed); **761 of 765** attachments keep a clickable strip — the other 4 lie
wholly under their host and a wrapped rank's back row in one crowded `g3` board,
not drawn either (PLAN follow-up 9). In the browser, the real scene's proxies
raycast at every host's centre at `g1`@250 (Peggy under Quantum Reduction), @355
and `g3`@200 in views 1, 2 and 5: the host every time.

### 9. The evidence's scratchpad paths (minor)

The fix pass's stills are now in `var/shots-t2s3/fx4/` (cited above), this pass's
in `var/shots-t2s3/fx5/`. **`build-figures.mjs`'s byte reproducibility was still
not re-run**: the four CC0 source archives are in neither this worktree nor the
main checkout, and downloading them is the user's call — PLAN follow-up 7 records
that `node tools/build-figures.mjs --verify-only` is owed once they are back.
`figures.glb` is unchanged (143,920 B, sha256 `c09ac552…a981a3`, what
`models.json` records and `figures.test.ts` checks); no asset was added.

### Live (seed 11, bridge on 8661–8664, `?ws=1`)

A scripted single-session driver: play first, keep, an Island by a canvas click on
it in hand, Peggy Carter cast by a canvas click with Auto pay, and on turn 5 Peggy
declared an attacker by a canvas click on her card on the battlefield
(`act: clickCard 4` → OK → the `attackers` event) — then conceded; every bridge
printed `MTGTABLE OK` and `check-redaction.mjs` passed the live log. (The live
combat budget snaps a combat batch in the human's own turn — PLAN question 12 — so
the attack's turn is a replay-and-opponent's-turn sight.) The Quantum Reduction
board the verifier hit did not recur in these runs; §8's raycasts are the check.

### Budgets, idle, network

`g1`@355, bloom off, table view: **78 draw calls, 27,906 triangles, 12 programs**
(77 / 27,474 before: the `visor` kind and the bigger coat); sweeps of `g1` 300–376,
`g2` 140–225 and `human-comfort-13` 1100–1316 peak at 78 / 27,906. Idle
`human-comfort-13`@1262: **0 `gl.render` calls in 5 s**. Off-origin requests:
`cards.scryfall.io` only (D52). No console errors.

### The gate

`npm --prefix web run build`: zero errors; entry chunk **86.24 kB gzip** (no
`three`; the +0.01 against slice 3's 86.23 is the lazy Arena chunk's hashed file
name inside it), Arena **347.70 kB**, `Post` **16.54 kB**. `npm --prefix web test`:
**704 `node --test` + 79 vitest, 0 failures** (698 before this pass: `facing` +3,
`traits` +2, `attach` +1). `rm -rf bridge/out && WSPORT=8665 ./tools/check-all.sh`:
**`check-all OK`, exit 0, 729 s** — node --test 714 / 706 pass / 0 fail / 8
skipped and 79 vitest inside it, all ten games of 9c, 9d and 10a–10g, and
`check-redaction` over every fixture and fresh recording.


## Status — the documentation pass

*Appended 2026-09-27. Same worktree (`/home/justin-a/code/mtg-table-t2c`) and
branch (`tier2-slice3`, from `5891444`), **nothing committed**. This pass changed
no code, no data file under `web/src/`, no test, no fixture and no asset.*

### Where slice 3 stands

**Built, verified twice, fixed twice, not yet play-tested, not committed.** The
two verification passes reported three majors and five minors, then four majors
and five minors; every one has a fix in the tree (**D75–D87**). Three things a
reader should not have to dig for:

- **The second pass's fixes (D82–D87) have not been independently verified.** They
  were checked by the pass that made them — its gate run, the new raster test in
  `web/test/prop-raster.ts` and `traits.test.ts`, `facing.test.ts`, and the
  photographs in `var/shots-t2s3/fx5/` — and by this pass's gate run below, which
  proves the tree is green, not that the table reads (PLAN.md slice-3 follow-up 11).
- **Nick Fury is only partly answered**, by that pass's own account: at 1× from the
  table view he is the darkest figure on the table in a long black coat, but the
  eyepatch reads as a dark disc ringed pale (follow-up 10). The user named him.
- **Your figures face you** (D81) and that is still the user's call — PLAN.md's
  question 13; since D82 it decides only how the table looks at rest.

(A bookkeeping note: the first verification pass's section above numbers Agent 13
and Coulson as two majors, "3–4", under a header and a fix-pass report that both
say three majors in all. PLAN.md uses the reported count.)

### Two decisions written up, and one gap found by reading the code

- **D88 — several bodies are one pose.** The Air Force is five procedural bees
  (`swarmBee`, one instanced draw call) round the card's one insect rig, which is
  kept for the clip lane and the `figure` anchor and never drawn; the Agents'
  followers are the humanoid body baked once at load, riding the leader's root;
  both clamped as a whole formation (`swarmSpan`). Slice 2's hand-over had
  pencilled in "a small swarm of the insect" (copies of the model); the builders
  drew procedural bees instead, and D88 records why that stands.
- **D89 — Quake keyed off her trigger resolving, aimed only by the stack.** The
  cue track moved her row from Tier 1's `tap:on` substitute to `resolved`
  (4 of 13 corpus resolutions aimed); pairing the batch's `tap` events to her —
  the heuristic that would have matched the idea table's "when her trigger taps a
  creature" — was not taken, because the engine never says which card caused a
  tap.
- **A dying Air Force is not seen dying** (D88's known cost; PLAN.md slice-3
  follow-up 14). `scene/FigureLayer.tsx` skips a ring swarm when it collects
  departing bodies ("a ring swarm's body is never drawn, so it has no body to
  die"), and `scene/props.ts` binds no bees to a departed ring, so the swarm leaves
  with its snapshot — the one exception to D64. No pass reported or photographed
  it; it is deliberate in the code's comments and is recorded here so it is not
  mistaken for D64 holding everywhere. A squad's followers do fall with their
  leader.

### What this pass changed

- `PLAN.md`: the M7 row of the milestone table (slice 2 committed as `5891444`,
  slice 3 built); *The evenings* gains **T9–T12** and an **id** row (per-card
  identity), each with what proves it; slice 1's follow-up 15 (Web Up measured)
  closed; slice 2's follow-ups 2 (the scientist from behind) and 3 (the giant)
  closed and 10 (the slice-2 play-test) marked partly answered; *Slice 3*'s status
  made honest about the unverified second fix pass; **fourteen** slice-3
  follow-ups (nine before; added: Fury, the unverified fixes, pixels-not-contrast,
  no frame-time bench, the dying Air Force); *What slice 3 hands to T13–T14* with a
  play-test to do first; *Tier 3 — a note, not a plan* (likeness models,
  personal-only); the deferred list's Tier 3 line; and **question 14** (is
  likeness part of the end goal at all?) beside question 13.
- `DECISIONS.md`: **D88** and **D89**.
- `README.md`: *Arena mode*'s intro and Tier 2 bullets corrected (figures face
  outward, not "the other seat"; the Helicarrier is no longer a disc; the three
  attachment looks; Quake's trigger, not her tap); a new *Tier 2, slice 3 — every
  card reads as itself* with the card-by-card table and **how to give a card its
  identity as data** (the `traits.json` keys and ranges, the kit, the ladder, the
  test and the look); the repo layout's new files; the decision count.
- `CLAUDE.md`: the slice-3 conventions gain D88 (several bodies are one pose) and
  D89 (an aim is the stack's, or nothing); the gate timings and test counts; the
  docs table.
- `NOTICE` §7: a paragraph saying slice 3 added no asset, listing what is built in
  code, that the rider and the squad followers are the existing CC0 bodies frozen
  in a pose, and that the badge is generic geometry and not the S.H.I.E.L.D.
  emblem.
- `docs/ideas/arena-mode.md`: a slice-3 status block; a **Status** column on every
  row of the cue table (implemented / substituted / pending, with the tier or
  slice); *What Tier 2's third slice did to those rows*, row by row.

### The gate

`WSPORT=8666 ./tools/check-all.sh`, run once, without deleting `bridge/out`
(`var/check-all-t2s3-docs.log`): **`check-all OK`, exit 0, 726 s wall.** 9b's
re-recording of seed 42 multiset-identical to `fixtures/games/human-auto-42.jsonl`
(1,587 frames); 9c's ten games `TEN GAMES OK` in 269 s; 9d and 10a–10g;
`check-redaction` over every committed fixture and fresh recording; the web step's
build with the entry chunk at **86.24 kB** gzip (no `three`), Arena **347.70 kB**,
`Post` **16.54 kB**, and node --test **714 / 706 pass / 0 fail / 8 skipped** plus
**79** vitest (5 files). Standalone, `npm --prefix web test` is **704 / 704 pass**
plus **79** vitest (`var/npm-test-t2s3-docs.log`). Every number is the second fix
pass's, as it should be for a pass that changed no code.
