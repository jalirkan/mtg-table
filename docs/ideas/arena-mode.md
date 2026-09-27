# Arena mode: a cinematic 3D presentation of the game

Raised 2026-09-11. **Scheduled as M7, after M6** (see `PLAN.md`). The protocol
change it needs — an id-only `events` list on every `state` frame — was pulled
forward into M1 (`docs/protocol.md` §3.6, `DECISIONS.md` D12).

> **STATUS, 2026-09-13 — Tier 1 is BUILT.** Six evenings E1–E6 of
> [`../research/09-arena-tier1-plan.md`](../research/09-arena-tier1-plan.md) §11
> plus two verification passes; `web/src/arena/`, lazily imported, on the
> React-18 3D line (**D47**, **D48**). Open it with
> `npm --prefix web run dev:arena` or `./scripts/play.sh --arena`, or press `V`
> in any browser session. All **25** of the protocol's event kinds have a cue,
> the S.H.I.E.L.D. table below is implemented as `web/src/arena/cues/cues.json`
> (28 cards, 7 archetypes), and a whole game has been played from the 3D seat.
> What was measured: [`../evidence/m7-arena.md`](../evidence/m7-arena.md). What
> is still owed, and the Tier 2 hand-over: `PLAN.md` §M7.
>
> **STATUS, 2026-09-27 — Tier 2's first slice is BUILT and verified** (committed
> as `4f84613`; built on branch `tier2-slice1`). Evenings T0–T7 of
> [`../research/13-arena-tier2-plan.md`](../research/13-arena-tier2-plan.md)
> §11, on the assets surveyed in
> [`../research/12-arena-tier2-assets.md`](../research/12-arena-tier2-assets.md):
> a holographic low-poly figure at every creature (three CC0 archetypes — agent,
> drone, insect — and a glowing disc for everything else), auras and equipment
> on the figure, lands as terrain slabs, mana motes flowing to the caster's side,
> the stack as spell forms with tethers and strikes, two silhouette busts, and
> bloom. What was measured: [`../evidence/m7-tier2.md`](../evidence/m7-tier2.md).
> The user's nine Tier 2 decisions are `DECISIONS.md` **D53–D62**; the follow-ups
> and the hand-over to T8–T14 are `PLAN.md`'s *M7 Tier 2*.
>
> **STATUS, 2026-09-27 — Tier 2's second slice (T8 and the camera views) is BUILT,
> verified twice and fixed twice** (committed as `5891444`; built on branch
> `tier2-slice2`).
> The humanoids are three bodies of one CC0 kit — the agent, a hero with two round
> buns, a scientist in glasses and a tie — on one rig with one clip set, the
> Universal Animation Library's recoil and death retargeted in (the rest of its
> clips did not read on a chibi, so Kenney's own stay); a creature that dies is
> now **seen dying** rather than vanishing with its card; and the camera has
> **five views** (table, your shoulder, the opponent's shoulder, side-on at figure
> height, low), a **spectator mode** and an **auto director** that cuts between
> them on combat, casts and strikes. What was measured:
> [`../evidence/m7-tier2-slice2.md`](../evidence/m7-tier2-slice2.md); decisions
> **D64–D74**; the follow-ups and the hand-over to T9–T14 are `PLAN.md`'s *M7
> Tier 2*. The camera swoops in the tiers below are still Tier 1's cue moves —
> the chosen view is where they now leave from and come back to.
>
> **STATUS, 2026-09-27 — Tier 2's third slice (T9–T12, per-card identity) is
> BUILT, verified twice and fixed twice** (not yet committed: branch
> `tier2-slice3`). It answers the user's verdict on slice 2 — *"everything still
> looks very generic"* — without a model per card: **every card in the deck reads
> as itself through data** (`web/src/arena/figures/traits.json`: size, hover,
> colour, props, swarm, silhouette) and a shared kit of eighteen procedural,
> instanced props — Wasp small, hovering and winged; Ant-Man in a helmet; the Air
> Force a ring of five bees; the giant ant giant, with a rider; the Doombot with a
> laser eye and a jetpack; Fury in a black coat and an eyepatch; Coulson with a
> badge and a tie; Quake's glowing gauntlets; Peggy's hat and shield; Agent 13's
> pistol; the Agents a squad; the Helicarrier an actual carrier overhead; the
> scientists at a lab bench. **Every row of the cue table below is now marked**
> (the *Status* column, and *What Tier 2's third slice did to those rows* after
> it): the per-card beats are drawn ON the figure, the attachments have looks of
> their own, and the rows Tier 1 substituted are either built or substituted
> again with the reason stated. What was measured:
> [`../evidence/m7-tier2-slice3.md`](../evidence/m7-tier2-slice3.md); decisions
> **D75–D89**; the follow-ups and the hand-over to T13–T14, and a note on Tier 3,
> are `PLAN.md`'s *M7 Tier 2*.
>
> **Three lines below are superseded by those decisions and are kept as
> written:** Tier 2's rigs are **not** Mixamo (**D54** — CC0 packs, and
> Quaternius's CC0 *Universal Animation Library* where more clips are needed);
> the two duelists are **silhouette busts**, with full avatars deferred
> (**D62**); and Tier 3's "generated from the card art with an image-to-3D tool"
> is **ruled out** — no model is made from card art, locally or hosted (**D54**).
> **Tier 3 is NOT started**, and stays on `PLAN.md`'s deferred list. If it ever
> comes, Tier 3 means **likeness** — a Wasp who looks like Wasp — and a likeness
> model of a Marvel character is **personal-only**: local, gitignored, never
> committed or published, exactly like the card images (`PLAN.md`, *Tier 3 — a
> note, not a plan*, and its question 14).

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

- **Tier 1, the 3D table (weeks of evenings, no art assets). ← BUILT.** Cards are
  textured planes using the Scryfall images we already fetch. `cast` = card
  rises and glows in its mana colour; `tap` = rotate; `attackers` = card lunges
  at the defender with a camera swoop; `damage` = numbers; `zone`
  battlefield→graveyard = dissolve; `life` = HUD pulse. Looks dramatic already.
- **Tier 2, creature manifestations (months). ← SLICES 1–3 BUILT (T0–T12, the camera views and per-card identity); T13–T14 handed over.** A small library of stylised
  generic models keyed by creature type and colour with idle / attack / hit /
  die animations (Mixamo-style rigs). The MSH deck has a handful of types —
  Human Spy Hero, Robot Villain, Insect, Scientist — so about eight archetypes
  cover it. Two duelist avatars stand at either end; creatures appear as
  holograms between them. This is the Yu-Gi-Oh look.
- **Tier 3, per-card models (open-ended). ← not started.** Unique meshes per card, hand-made or
  generated from the card art with an image-to-3D tool. *(Superseded in part: generating
  from card art is ruled out — D54. And a model that looks like a Marvel character
  would be personal-only — local and never committed — whoever made it.)*

## Source-material-informed animation

These cards depict Marvel characters and objects whose powers are already
famous, and the card mechanics were designed to echo them. The animation for a
card should draw on that, not on the generic archetype, whenever the source
material gives us a clear cue. The mechanism: **a per-card cue file**
(`web/src/arena/cues/<card-name>.json` or one `cues.json`), keyed by card name,
with a fallback to the type/colour archetype. Cues are data, never rules: they
choose *how* to show an event the engine already emitted.

Cue table for the current deck (first pass; refine when we build it). The
*Status* column was added on 2026-09-27, after Tier 2's third slice: **implemented**
(the row's beat is on screen, with the tier or slice that built it), **substituted**
(something else is on screen, for a reason written down), **pending** (not seen
yet). The row-by-row detail is *What Tier 2's third slice did to those rows*, below.

| Card | Source cue | Animation cue | Keys off | Status |
|---|---|---|---|---|
| Ant-Man, Reformed Rogue | Scott Lang shrinks and grows | Enters at full size, shrinks to a speck when he attacks alone, pops back to size on damage | `zone`→battlefield, `attackers`, `damage` | **implemented** — Tier 1; slice 3 |
| Wasp, Shrinking Savior | Janet/Hope: shrinks, flies, stings | Hovers above the table; on `cast` trigger the targeted creature visibly shrinks (the −3/−0) | `cast`, `stats` | **implemented** — Tier 1; slice 3 · the aimed shrink **pending** a real game |
| Giant-Sized Flying Ant | Ant-Man's flying ant mount | Oversized insect with a rider silhouette; wing hum idle | `zone`→battlefield | **implemented** — slice 3 · wing hum **substituted** |
| Ant-Man's Air Force | Swarm of flying ants | Particle swarm sweeping across the table | `cast`, `resolved` | **implemented** — Tier 1; slice 3 |
| Pym Particles | The shrink/grow serum | Beam from the card; target scales up (counters) or down | `cast`, `counters`, `stats` | **implemented** — slice 3 (Tier 1: partly) |
| Quantum Reduction | Quantum Realm shrinking | Target collapses into a point of light and vanishes (exile-style) | `cast`, `zone` | **implemented** — Tier 1; slice 1 (T5) |
| Quake, Agent of S.H.I.E.L.D. | Daisy Johnson's seismic powers | Ground-shockwave ring when her trigger taps a creature or land; camera shake | `tap` caused by her `cast` trigger | **substituted** — slice 3 (D89) |
| Nick Fury, Spymaster | Runs the agency | Radio-call gesture; agents materialise beside him | `zone`→battlefield for the cards he makes | **implemented** — Tier 1; slice 3 |
| Agent Phil Coulson | Team coordinator | Points; every other Hero gets a brief badge flash (the +1/+1 counters) | `counters` | **substituted** — Tier 1; slice 3 |
| Peggy Carter, Secret Agent | Founder, indestructible resolve | When attacking alone, a shield-glow aura (indestructible until end of turn) | `attackers` with a single attacker | **implemented** — Tier 1; slice 3 |
| Agent 13, Sharon Carter | Field agent | Quick pistol-draw attack pose | `attackers` | **implemented** — slice 1; slice 3 |
| Agents of S.H.I.E.L.D. | The team | Squad steps forward together; the lone attacker gets a spotlight (+1/+1) | `attackers` | **implemented** — slice 3 |
| S.H.I.E.L.D. Helicarrier | The flying carrier | Flies in overhead and hovers above the board for the rest of the game | `zone`→battlefield | **implemented** — Tier 1; slice 3 |
| Helicarrier Strike | Carrier bombardment | Targeting reticle from above, strike beam on the target | `cast`, `damage` or `zone` | **implemented** — Tier 1; slice 3 |
| S.H.I.E.L.D. Spy Kit / Super Suit | Gear-up | Equipment snaps onto the creature with a HUD flourish | `attach` | **implemented** — Tier 1; slice 3 |
| Strategic Intervention | Agency intervention | Brief freeze-frame and a "mission control" overlay | `cast`, `resolved` | **implemented** — slice 3 · the overlay **substituted** |
| Web Up | Spider-Man's webbing | Target gets wrapped in webs and lifted off the table (exiled until Web Up leaves) | `cast`, `zone`→exile | **implemented** — Tier 1; slice 3 · the lasting cocoon **substituted** |
| Aerial Doombot | Doctor Doom's flying robots | Hovering drone, laser-eye idle, jet exhaust on attack | `zone`→battlefield, `attackers` | **implemented** — Tier 1; slice 3 |
| A.I.M. Scientists / Bold Biochemist | Beekeeper-suited scientists, lab work | Hologram lab bench; Power-up = vials glow, cards fly to hand (draw) | `counters`, `zone` library→hand | **implemented** — Tier 1; slice 3 |
| Robotics Mastery / Depower | Tech buffs and shutdowns | Circuit-trace glow on the target / lights flicker out | `cast`, `stats` | **implemented** — Tier 1; slice 3 |
| Thriving Heath / Thriving Isle, Plains, Island | Lands | Terrain tiles that rise from the table on `land`; mana taps ripple | `land`, `tap` | **implemented** — Tier 1; slice 1 (T4) |

### Which rows Tier 1 implements — all of them, three with a stated deviation

`web/src/arena/cues/cues.json`, 2026-09-13: **28 card entries and 7 archetypes**,
with a `_note` on every entry saying which event kinds it keys off and what the
source material is. Every row of the table above has an entry. The census
`web/test/replay-cues.test.ts` prints on every run, over all eighteen committed
recordings: **1,156 of 19,208 events resolve to a per-card cue** across 40
distinct entries, and 1,007 more to an archetype.

| row | what Tier 1 does | faithful? |
|---|---|---|
| Ant-Man, Reformed Rogue | `attackers:alone` → `attack.shrink` (shrinks to a speck, 0.18 scale); `damage` → `damage.hit` pops him back | yes |
| Wasp, Shrinking Savior | `presence` hover; `cast` → `fx.scaleBeam` (the target visibly shrinks); `attackers` → `attack.jet` | yes |
| Giant-Sized Flying Ant | `zone`→battlefield → `zone.enters`; `attackers` → `attack.jet` | yes, minus the rider silhouette (a model — Tier 2) |
| Ant-Man's Air Force | `cast` **and** `resolved` → `fx.swarm`, a particle sweep | yes |
| Pym Particles | `cast` → `fx.scaleBeam` | **partly** — the beam fires on the cast; it does not re-key off the `counters`/`stats` that follow |
| Quantum Reduction | `cast` → `fx.collapse` (target collapses to a point of light) | yes |
| Quake, Agent of S.H.I.E.L.D. | `tap:on` → `fx.shockwave`, two cyan rings + a bounded camera shake | **deviation** — the ring is centred on **her own** tap. The engine never says which card caused another card's tap, and inventing that link is rules logic in a renderer |
| Nick Fury, Spymaster | `zone`→battlefield **and** `attackers` → `fx.agents`, played *beside* him | yes — and it never creates, names or counts the tokens; each one enters with its own `zone` event and its own cue |
| Agent Phil Coulson | his own `counters:P1P1+` → `fx.badge`, plus the `creature/W` archetype's badge on every Hero that receives one | **deviation** — the badge is keyed to the card that **received** the counter. §3.6's `counters` event carries no *source*, so "Coulson did this" is not on the wire. His own entry fired **0 times** in eighteen recordings; only a census tells you that |
| Peggy Carter, Secret Agent | `attackers:alone` → `attack.aegis`, a gold halo and a held ring | yes |
| Agent 13, Sharon Carter | `attackers` → `attack.lunge` | the generic lunge — a pistol-draw *pose* needs a rigged model (Tier 2) |
| Agents of S.H.I.E.L.D. | `attackers` → `attack.lunge` | as above; "the squad steps forward together" is Tier 2 |
| S.H.I.E.L.D. Helicarrier | `zone`→battlefield → `fx.flyIn` (enters through the top of the frame, downwash particles, a camera move at priority 3) and then **stays** up — `presence: hoverY 0.9`, a *layout* rule, so it survives `skip all` | yes |
| Helicarrier Strike | `cast` → `fx.strike`, a reticle and a beam from above | yes |
| S.H.I.E.L.D. Spy Kit / Super Suit | `attach:on` → `attach.snap` (and `attach.release` on the way off) | yes |
| Strategic Intervention | `cast` → `cast.rise`, `resolved` → `resolved.pop` | **partly** — the generic pair. The "freeze-frame and mission-control overlay" is a full-screen effect Tier 1 did not buy |
| Web Up | `cast` → `fx.webWrap` | yes |
| Aerial Doombot | `presence` hover + bob, tilted toward the camera; `attackers` → `attack.jet` | yes |
| A.I.M. Scientists / Bold Biochemist | `zone`→battlefield and `counters` → `fx.hologram` | yes |
| Robotics Mastery / Depower | `cast` → `fx.circuit`, a circuit-trace glow | yes |
| Thriving Heath / Thriving Isle / Plains / Island | `zone`→battlefield → `fx.terrain` (the tile rises); `tap` → `fx.ripple` | yes — and these are the bulk of the census: `Island · tap` alone is 433 of the 1,156 |

**What Tier 2's first slice adds to those rows** (with no edit to `cues.json` for
most of them — a clip is keyed by the cue id the row already resolves to): every
creature row now also has a **figure** — the agents, heroes and scientists as the
holographic humanoid, the Doombot and Robot tokens as the drone, both ants as the
insect (the Giant-Sized Flying Ant at 1.35×; still no rider), the Helicarrier
still on its disc until T10. **Agent 13's pistol draw is done** — her attacking
stance is the model's two-handed shooting pose, through `params.clip`, and it was
seen in a live game. **Quantum Reduction** now also shrinks the figure it
enchants to 0.45× and keeps it shrunk; the other attachments draw a halo on the
figure (Super Suit's shell, Spy Kit's glints and Robotics Mastery's circuits are
T12). **The lands** are terrain slabs and their taps send mana motes to the
caster. Still Tier 2 work: Fury's radio call, the squad stepping forward
together, Web Up's cocoon, Strategic Intervention's mission-control overlay and
the Doombot's eye (`PLAN.md`, *What slice 2 hands to T9–T14*) — **all built by the
third slice**, below.

### What Tier 2's third slice did to those rows — every card reads as itself

Slice 3 (T9–T12, 2026-09-27; `../evidence/m7-tier2-slice3.md`) did two things to
this table. **Identity**: every creature row now has a look of its own, as data in
`web/src/arena/figures/traits.json` drawn with a shared kit of procedural,
instanced props (**D75**) — a pose, so it survives `skip all`, a scrub and a
`resync`. **Beats on the body**: every per-card beat is now drawn ON the figure
(the `figure` anchor, **D79**) rather than at the card's resting spot, so it
follows the body through a lunge, a hover, a shrink or a death; and an attacker
turns to face what it attacks while it does (**D82**). The rule the file lives by
is unchanged — a beat keys off an event about THAT card — and where the wire does
not say what a beat wants to know, the row says so rather than guessing.

| row | status | what is on screen since slice 3 |
|---|---|---|
| Ant-Man, Reformed Rogue | **implemented** (Tier 1; slice 3) | red, in a glass helmet with antennae, a crest and red lenses; attacking alone he shrinks to 0.18 and a bright speck with a particle trail rides his body down the lane; the pop back on damage throws a ring from his feet |
| Wasp, Shrinking Savior | **implemented** (Tier 1; slice 3); the aimed shrink **pending** a real game | half a hero's height, gold, hovering, four pale-blue wings; her trigger's beam leaves HER figure and the target's body shrinks with a ring closing at its feet — but the AI puts the trigger on and off the stack inside one snapshot, so 0 of 10 corpus triggers are aimed and the shrink has been seen only on a synthetic event |
| Giant-Sized Flying Ant | **implemented** (slice 3); the wing-hum idle **substituted** | 0.867 tall against any other insect's 0.490, because it flies side-on (**D76**), with extra wings and a crouching rider on its back. The wing hum was built as a `presence` bob and taken out: it cost 300 idle frames in 5 s for a one-pixel vibration; its flight is `idle: hover`, which moves only while frames are drawn |
| Ant-Man's Air Force | **implemented** (Tier 1; slice 3) | the card stands as a ring of five bees, one draw call (**D88**); its cast and resolution send one particle cloud with a bright core ACROSS the table — to what its trigger targeted when the wire says, otherwise toward the other seat's rank (**D87**) |
| Pym Particles | **implemented** (slice 3; Tier 1's "partly" closed) | the beam lands on the target's body and the size change follows the SNAPSHOT (`strikeGrew`, the sign of the struck card's P/T change): grown, shrunk, or a pulse and no claim. Every corpus game chose its vigilance mode, so only the pulse has been seen |
| Quantum Reduction | **implemented** (Tier 1; slice 1's T5) | unchanged by slice 3: the collapse on cast, and the host figure held at 0.45× for as long as the Aura is attached |
| Quake, Agent of S.H.I.E.L.D. | **substituted** (slice 3, **D89**) | teal, both fists glowing. The shockwave is keyed off her trigger **resolving**, not off a tap: two rings leave her feet and, when the previous frame's stack says what the trigger targeted, a fissure runs to it, a ring bursts at its feet and it flinches; the camera shake frames both (4 of 13 corpus resolutions aimed). "When her trigger taps a creature" is not on the wire — the engine never says which card caused another card's tap, and pairing them would be inventing a cause |
| Nick Fury, Spymaster | **implemented** (Tier 1; slice 3) | a slate body in a long black coat and a black eyepatch with a diagonal strap; on entering and on attacking he makes the radio call (`radioCall`), a ring leaves his feet and beams go to where agents appear beside him — never to a token, because which card made a token is not on the wire. Still the least legible identity at the table view (PLAN.md slice-3 follow-up 10) |
| Agent Phil Coulson | **substituted** (Tier 1's deviation stands; slice 3 added to it) | a navy suit, a shirt-front and tie, a gold badge on his chest and a bigger one on his back. When his own trigger resolves he shows his badge (the `channel` gesture) while the badges flash on every Hero that RECEIVED a counter; no beam joins them, because the `counters` event carries no source |
| Peggy Carter, Secret Agent | **implemented** (Tier 1; slice 3) | warm white, a red hat, a round red-white-and-blue shield turned out; attacking alone, a blue bubble on her body with red and white rings at her feet (**D87**), for exactly the lunge |
| Agent 13, Sharon Carter | **implemented** (slice 1's clip; slice 3) | indigo, a silver pistol at her right hip with a lit muzzle; her attack plays the model's shooting pose and the muzzle flashes land ON the pistol's lit tip, turned toward her defender (**D82**) |
| Agents of S.H.I.E.L.D. | **implemented** (slice 3) | a squad in steel blue — the leader and two followers in a wedge, three heads side by side from both seats (**D84**) — which steps forward together on the lunge; only a lone attacker takes the spotlight |
| S.H.I.E.L.D. Helicarrier | **implemented** (Tier 1; slice 3) | an actual carrier silhouette — hull, flight deck, island, four rotor pods — flying over its card, crewed or not; yours high over your rank, the opponent's lower over the centre line, clear of the HUD (**D77**, **D85**). The fly-in is still Tier 1's cue |
| Helicarrier Strike | **implemented** (Tier 1; slice 3) | the cast locks a crosshair reticle on the target's FIGURE and holds it while the spell waits; the resolution brings a thick beam down on what the previous frame said it targeted, with a star on the body — on the falling body if the strike kills |
| S.H.I.E.L.D. Spy Kit / Super Suit | **implemented** (Tier 1; slice 3) | the snap with a star (Spy Kit) or hex-plating (Super Suit) flourish, and then a look the host WEARS as a pose (T12, **D80**): three gadget glints orbiting its hands, or a plated armour shell round the whole figure. Small at the table view; the shoulder views show them properly |
| Strategic Intervention | **implemented** (slice 3); the "mission control overlay" **substituted** | a freeze-frame flash and a MISSION CONTROL banner on cast, and the figures really hold while the trigger waits in combat (T6's freeze). The overlay is a 3D **ops console** — radar, grid, bars, status lights, no words — standing in its own rank slot while the card is on the battlefield, not a full-screen DOM widget (it would have been a click target and a second renderer; **D80**) |
| Web Up | **implemented** (Tier 1; slice 3); the lasting cocoon **substituted** | the cast sends strands from a cocoon to the target's body, lifting and squashing it; the resolution wraps the departing body and carries it off to exile. The cocoon hangs over **Web Up's own card**, not the exile pile: measured first, the wire never relates Web Up to what it exiled (**D80**) |
| Aerial Doombot | **implemented** (Tier 1; slice 3) | Doom green, a red laser eye and a red visor band round its head, twin thrusters and a lit exhaust on its back; attacking, it turns to its defender, the exhaust flares and the eye fires a laser at the player or creature the attack band names |
| A.I.M. Scientists / Bold Biochemist | **implemented** (Tier 1; slice 3) | both at a lab bench with a flask and three vials; A.I.M. in bright yellow under its bucket hood, the Biochemist in a long white lab coat. The Power-up lights the vials in turn, and card-sized lights appear over the scientist's head, hold a beat and fly to its controller's hand (one for A.I.M., two for the Biochemist; the draw itself is still its own zone cue) |
| Robotics Mastery / Depower | **implemented** (Tier 1; slice 3) | Robotics Mastery's circuit traces are now WORN by its host as a pose (T12), with a circuit flourish on attach; Depower's traces also flicker out when it resolves, on what it targeted |
| Thriving Heath / Thriving Isle / Plains / Island | **implemented** (Tier 1; slice 1's T4) | unchanged by slice 3: terrain slabs and mana motes |

**The Tier 2 line, held.** None of the above is a model used by exactly one card:
every prop is a kind any row may name (Bold Biochemist's lab coat is Fury's coat in
white), the carrier is the `subtype:vehicle` archetype's, and the two baked kinds
(the ant's rider, the Agents' followers) are the library's own CC0 bodies frozen in
a pose. A card drawn as a back — redacted or face down — is the anonymous disc with
no props, no hover and no swarm (hard rule 8).

One card not in the table above has an entry too: **Borough Backup** (`cast` →
`fx.swarm`). The seven archetypes — `creature/W`, `creature/U`, `creature/*`,
`land/*`, `equipment/*`, `instant/*`, `sorcery/*` — are the middle rung, and they
are the same keys a Tier 2 model library would be keyed by.

**The one rule the file lives by, learned the hard way:** a cue keys off an event
that is about **that card**. The ladder resolves an event through the card the
event *names*, so where the source material's beat belongs to another card, the
entry goes on the card the **engine** named and the `_note` says so.

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

## First concrete step, when M7 starts — DONE, 2026-09-13

*As written before the milestone:* `web/src/arena/` with a `Scene` that consumes
the same `ClientState` and its `events`, developed entirely against
`fixtures/games/*.jsonl` with the replay controls. Milestone: a recorded AI-vs-AI
game plays back as a Tier 1 cinematic with no human seat involved, with the cue
table above driving at least the S.H.I.E.L.D. cards.

**That is what happened, and it went one step further than it asked.** The
cinematic was developed entirely against the committed corpus with the board's
own replay controls (`npm --prefix web run dev:arena` needs no JVM), the cue
table above drives 28 cards, and then the *live seat* moved into the arena as
well: `./scripts/play.sh --arena` plays a whole game against the Forge AI in 3D —
mulligan, lands, casts, an `ability_menu` answered in M5's own modal over the
canvas, an attack declared, a concede — with `V` switching back to the 2D board
mid-session over the same socket. Evidence:
[`../evidence/m7-arena.md`](../evidence/m7-arena.md) §4.
