# Arena mode: a cinematic 3D presentation of the game

Raised 2026-09-11. **Scheduled as M7, after M6** (see `PLAN.md`). The protocol
change it needs — an id-only `events` list on every `state` frame — was pulled
forward into M1 (`docs/protocol.md` §3.6, `DECISIONS.md` D12).

## Why it fits this architecture

The client is `render(reduce(frames))`: a pure function of a frame stream that
arrives either live over the WebSocket or from a recorded `frames.jsonl`. The
arena is simply a second renderer for the same stream. It needs no new rules
code, no new engine, and no human input to get started: the M1 AI-vs-AI
recordings are a perfect input for a spectator cinematic ("watch the AI duel
like an episode"), so the first arena milestone is a replay, not a live game.

## Renderer

Three.js via react-three-fiber (TypeScript, MIT) inside the existing Vite app.
Babylon.js is the alternative. Godot (MIT) is the option if this ever becomes a
desktop app; it can speak the same WebSocket protocol. Nothing is built from
scratch.

## Tiers, cheapest first

- **Tier 1, the 3D table (weeks of evenings, no art assets).** Cards are
  textured planes using the Scryfall images we already fetch. `cast` = card
  rises and glows in its mana colour; `tap` = rotate; `attackers` = card lunges
  at the defender with a camera swoop; `damage` = numbers; `zone`
  battlefield→graveyard = dissolve; `life` = HUD pulse. Looks dramatic already.
- **Tier 2, creature manifestations (months).** A small library of stylised
  generic models keyed by creature type and colour with idle / attack / hit /
  die animations (Mixamo-style rigs). The MSH deck has a handful of types —
  Human Spy Hero, Robot Villain, Insect, Scientist — so about eight archetypes
  cover it. Two duelist avatars stand at either end; creatures appear as
  holograms between them. This is the Yu-Gi-Oh look.
- **Tier 3, per-card models (open-ended).** Unique meshes per card, hand-made or
  generated from the card art with an image-to-3D tool.

## Source-material-informed animation

These cards depict Marvel characters and objects whose powers are already
famous, and the card mechanics were designed to echo them. The animation for a
card should draw on that, not on the generic archetype, whenever the source
material gives us a clear cue. The mechanism: **a per-card cue file**
(`web/src/arena/cues/<card-name>.json` or one `cues.json`), keyed by card name,
with a fallback to the type/colour archetype. Cues are data, never rules: they
choose *how* to show an event the engine already emitted.

Cue table for the current deck (first pass; refine when we build it):

| Card | Source cue | Animation cue | Keys off |
|---|---|---|---|
| Ant-Man, Reformed Rogue | Scott Lang shrinks and grows | Enters at full size, shrinks to a speck when he attacks alone, pops back to size on damage | `zone`→battlefield, `attackers`, `damage` |
| Wasp, Shrinking Savior | Janet/Hope: shrinks, flies, stings | Hovers above the table; on `cast` trigger the targeted creature visibly shrinks (the −3/−0) | `cast`, `stats` |
| Giant-Sized Flying Ant | Ant-Man's flying ant mount | Oversized insect with a rider silhouette; wing hum idle | `zone`→battlefield |
| Ant-Man's Air Force | Swarm of flying ants | Particle swarm sweeping across the table | `cast`, `resolved` |
| Pym Particles | The shrink/grow serum | Beam from the card; target scales up (counters) or down | `cast`, `counters`, `stats` |
| Quantum Reduction | Quantum Realm shrinking | Target collapses into a point of light and vanishes (exile-style) | `cast`, `zone` |
| Quake, Agent of S.H.I.E.L.D. | Daisy Johnson's seismic powers | Ground-shockwave ring when her trigger taps a creature or land; camera shake | `tap` caused by her `cast` trigger |
| Nick Fury, Spymaster | Runs the agency | Radio-call gesture; agents materialise beside him | `zone`→battlefield for the cards he makes |
| Agent Phil Coulson | Team coordinator | Points; every other Hero gets a brief badge flash (the +1/+1 counters) | `counters` |
| Peggy Carter, Secret Agent | Founder, indestructible resolve | When attacking alone, a shield-glow aura (indestructible until end of turn) | `attackers` with a single attacker |
| Agent 13, Sharon Carter | Field agent | Quick pistol-draw attack pose | `attackers` |
| Agents of S.H.I.E.L.D. | The team | Squad steps forward together; the lone attacker gets a spotlight (+1/+1) | `attackers` |
| S.H.I.E.L.D. Helicarrier | The flying carrier | Flies in overhead and hovers above the board for the rest of the game | `zone`→battlefield |
| Helicarrier Strike | Carrier bombardment | Targeting reticle from above, strike beam on the target | `cast`, `damage` or `zone` |
| S.H.I.E.L.D. Spy Kit / Super Suit | Gear-up | Equipment snaps onto the creature with a HUD flourish | `attach` |
| Strategic Intervention | Agency intervention | Brief freeze-frame and a "mission control" overlay | `cast`, `resolved` |
| Web Up | Spider-Man's webbing | Target gets wrapped in webs and lifted off the table (exiled until Web Up leaves) | `cast`, `zone`→exile |
| Aerial Doombot | Doctor Doom's flying robots | Hovering drone, laser-eye idle, jet exhaust on attack | `zone`→battlefield, `attackers` |
| A.I.M. Scientists / Bold Biochemist | Beekeeper-suited scientists, lab work | Hologram lab bench; Power-up = vials glow, cards fly to hand (draw) | `counters`, `zone` library→hand |
| Robotics Mastery / Depower | Tech buffs and shutdowns | Circuit-trace glow on the target / lights flicker out | `cast`, `stats` |
| Thriving Heath / Thriving Isle, Plains, Island | Lands | Terrain tiles that rise from the table on `land`; mana taps ripple | `land`, `tap` |

Rules of thumb for cues:

- The engine decides what happened; a cue only decides how it looks. A cue
  can never delay or change an input prompt.
- Every cue has a duration and the replay controls can skip it. Live games
  must feel snappy: cues over ~1.5 s only fire when the engine is not waiting
  on the human.
- Missing cue → archetype cue (by creature type + colour) → default cue. The
  game never fails to render because a cue is missing.

## Constraints

- Non-commercial fan project under the Wizards Fan Content Policy. Any assets
  derived from card art (Marvel art is licensed to Wizards) stay local and out
  of the public repo, exactly as card images do today. Code stays GPL.
- Keep the arena a *renderer*. Rules stay in Forge; the arena never decides
  anything.

## First concrete step, when M7 starts

`web/src/arena/` with a `Scene` that consumes the same `ClientState` and its
`events`, developed entirely against `fixtures/games/*.jsonl` with the replay
controls. Milestone: a recorded AI-vs-AI game plays back as a Tier 1 cinematic
with no human seat involved, with the cue table above driving at least the
S.H.I.E.L.D. cards.
