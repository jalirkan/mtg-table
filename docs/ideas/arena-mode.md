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
> verified twice and fixed twice** (not yet committed: branch `tier2-slice2`).
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
> **Three lines below are superseded by those decisions and are kept as
> written:** Tier 2's rigs are **not** Mixamo (**D54** — CC0 packs, and
> Quaternius's CC0 *Universal Animation Library* where more clips are needed);
> the two duelists are **silhouette busts**, with full avatars deferred
> (**D62**); and Tier 3's "generated from the card art with an image-to-3D tool"
> is **ruled out** — no model is made from card art, locally or hosted (**D54**).
> **Tier 3 is NOT started**, and stays on `PLAN.md`'s deferred list.

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
- **Tier 2, creature manifestations (months). ← SLICES 1 AND 2 BUILT (T0–T8 and the camera views); T9–T14 handed over.** A small library of stylised
  generic models keyed by creature type and colour with idle / attack / hit /
  die animations (Mixamo-style rigs). The MSH deck has a handful of types —
  Human Spy Hero, Robot Villain, Insect, Scientist — so about eight archetypes
  cover it. Two duelist avatars stand at either end; creatures appear as
  holograms between them. This is the Yu-Gi-Oh look.
- **Tier 3, per-card models (open-ended). ← not started.** Unique meshes per card, hand-made or
  generated from the card art with an image-to-3D tool. *(Superseded in part: generating
  from card art is ruled out — D54.)*

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
the Doombot's eye (`PLAN.md`, *What slice 2 hands to T9–T14*).

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
