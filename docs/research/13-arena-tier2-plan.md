# 13 — Arena mode, Tier 2: the manifestation stage

*Written 2026-09-13, against the Tier 1 arena **as it is in the tree** — git
`main` at `cd5071b`, "M7 Tier 1: the arena", `web/src/arena/` — and not against
report 09's plan for it. Where the code and the plan disagree, the code wins and
this report says so. Every line number below was read out of that commit; every
external fact carries the URL it was verified on.*

Read first: [`../ideas/arena-mode.md`](../ideas/arena-mode.md) (the tiers and the
cue table), [`09-arena-tier1-plan.md`](09-arena-tier1-plan.md) §5, §6, §7, §12,
§13 (the offset model, the cue table, the cue data format, the Tier-1/Tier-2
split, the risks), `PLAN.md` §M7 (*"What Tier 1 hands to Tier 2"* and the twelve
follow-ups), [`../evidence/m7-arena.md`](../evidence/m7-arena.md) (what was
measured), and `docs/protocol.md` §3.1–§3.6 (what the wire actually says).

---

## 0. The one-paragraph version

Tier 2 adds **one new layer and one new lane**, and nothing else. The layer is
the **manifestation stage**: a pure function `figurePose(layout(state))` that
gives every battlefield creature a figure standing beside its card — the card
plane stays exactly where it is and keeps being the identity of the thing. The
lane is **`clip`**: a fifth kind of transient on the `Stage` interface, written by
the same cues that already write offsets, decaying to nothing the same way, and
**driven by the cue queue's virtual clock** rather than by an `AnimationMixer`'s
own — which is what buys pause, 0.5×–4× speed, skip, scrub, the live budget and
`prefers-reduced-motion` for free, since all of those already work on that clock.
Everything else Tier 2 wants — auras on the enchanted creature, land tiles,
tapped stances, blockers standing in front of the attacker they block, a spell
forming at the caster's side — turns out to be **state-derived pose, not cue**,
which is the single most important design finding in this report: it is measured
below that there are **28 `attach` events in the whole committed corpus and 985
frames showing an attachment**, so an aura built as a cue is invisible 97% of the
time it should be on screen. Assets are the only genuinely new cost, and they are
gated behind a loader whose failure mode is the Tier-1 glow disc, so a fresh
checkout with no models at all still plays the whole film.

---

## 1. The five invariants Tier 2 may not break

Every one of these is already mechanical in the tree, with a test behind it.
Tier 2 does not get to argue with any of them; it gets to *generalise* them.

### 1.1 `finalTransform = layout(state) ⊕ offsets[id]` (**D50**)

`web/src/arena/layout.ts:427` is pure and authoritative; `cues/stage.ts:46`'s
`Offset` is a transient that starts at identity and is back at identity when the
cue ends; `scene/CueRunner.tsx:290` is the one place the equation becomes an
`Object3D`. `web/test/replay-cues.test.ts` asserts the offset map is **empty**
after every one of the corpus's 3,293 batches.

**Tier 2's version:** a figure's transform is `figurePose(placed)[id] ⊕
offsets[id] ⊕ clip[id]`, and the clip map obeys the same emptiness rule. The
decay assertion generalises by adding one line to the existing test, which is the
test for whether the design is right: if `stage.clips` cannot be asserted empty
after a batch, the clip lane has been built wrong.

### 1.2 The `Stage` is the seam, and cues never touch three

`cues/registry.ts` (1,893 lines, 47 cue ids) imports no three, no React, no DOM
and starts no timer. That is what lets `replay-cues.test.ts` run every event of
every committed recording through the **real** cues against a `NullStage`
(`cues/stage.ts:323`) in bare Node. `web/test/liveness.test.ts` is a source scan
that asserts it.

**Tier 2's version:** the clip lane is two methods on `Stage`
(`setClip`/`clearClip`) carrying **numbers and a string enum**, and the figure
*pose* module is pure. Only `scene/FigureLayer.tsx` and `scene/figureRigs.ts`
import three. `liveness.test.ts` is extended in the same change — CLAUDE.md's M7
convention 1 says in as many words that it is "the file to extend when the arena
grows a module".

### 1.3 The pose/cue split — `presence` is the precedent, and Tier 2 leans on it hard

Report 09 §5.1's "one deliberate exception" is that the Helicarrier's hover is a
**layout rule** (`layout.ts:481`, `applyPresence`), not a cue, because a cue
decays and a hover must not. Tier 2 discovers that most of what it wants is on
the *pose* side of that line:

| Tier 2 feature | pose (survives `skip all`) | cue (a transition) |
|---|---|---|
| a creature has a figure at all | ✔ | — |
| tapped → kneel / powered-down stance | ✔ (`Card.tapped`) | the tap *transition* |
| summoning sickness → translucent | ✔ (`Card.sick`) | — |
| an aura's manifestation on its host | ✔ (`Card.attachedToId`) | the snap-on flourish |
| a blocker standing in front of its attacker | ✔ (`state.combat.bands`) | the interpose move |
| a land tile, and its type | ✔ (type line) | the rise |
| a spell form at the caster's side | ✔ (`state.stack`) | cast / resolve / counter |
| a targeting tether | ✔ (`stack[].targetCardIds`) | the strike along it |
| attack lunge, damage hit, death | — | ✔ |

**The rule, stated once:** *if the snapshot says it, it is a pose; if only the
event says it, it is a cue.* A thing built on the wrong side of that line is
either invisible after a skip (pose built as cue) or stuck on screen forever
(cue built as pose).

### 1.4 Hard rule 8 in 3D: a figure is a new surface that can name a card

`CardPlane` is THE card renderer of the arena (CLAUDE.md M7 convention 2), and
`layout.ts` sets `Placement.back` for a redacted stub **and** any face-down card
before `CardPlane` asks `art.json` for anything. `layout.test.ts` asserts
`isHidden(card) ⇒ placement.back` over 84,418 placements in 3,679 frames.

A **figure is exactly the same hazard in a new shape**: picking a distinctive
mesh for a card is a statement about what that card is. Two rules:

1. **A figure is only ever placed for a card whose `Placement.back` is `false`.**
   Hidden cards are not on the battlefield in the committed corpus (measured: 0),
   but the branch is explicit rather than incidental.
2. **A face-down creature gets the default figure and nothing else.** Measured:
   **1,138 face-down battlefield card-instances** in the corpus (the `morph.jsonl`
   fixture), **every one of them carrying an empty `name`** — so the per-card rung
   of the figure ladder cannot match, and the archetype rung sees
   `types: "Creature"` with `manaCost: null` → `creature/C`. That is already the
   right answer; the test asserts it rather than trusting it, mirroring
   `layout.test.ts`.

The redaction net in `replay-cues.test.ts` (no cue param and no stage op carries
a card name) extends to **model ids and clip names**, because a model id like
`"helicarrier"` in an op log is a name by another spelling.

### 1.5 `frameloop='demand'` is a budget, not a nicety

`CueRunner.tsx:112`: `setFrameloop(queue.idle && !placedRef.current.bobbing ?
'demand' : 'always')`. A card game is static most of the time and the correct
number of rendered frames while the AI thinks is zero. The `bobbing` flag is the
existing proof that **one always-on motion costs the whole idle budget**.

**Therefore: idle breathing is off by default in Tier 2.** See §8.3 rule 1 for
the middle path (breathe only while something else is already animating), which
costs nothing and is the recommendation.

---

## 2. What Tier 2 actually has to draw — the corpus, measured today

Counted 2026-09-13 over all **eighteen `fixtures/games/` plus the
`fixtures/synthetic/` recordings**, by walking every `state` frame's
`body.players[].zones.battlefield.cards` (a read-only pass over the JSONL; the
predicate for "is a land" is `render/labels.ts`'s `isLandTypeLine`, the one the
arena already uses, and "is a creature" is `/\bCreature\b/`). Attachments are
excluded from the figure count because `layout.ts` already parks them on their
host.

**3,679 `state` frames carry a board.**

| | value |
|---|---:|
| max creature figures on the table in one frame | **21** (`games/human-sideboard-7.jsonl`) |
| max permanents in one frame | 42 |
| max lands in one frame | 21 |
| max tokens on the battlefield in one frame | 7 |
| frames with ≥ 8 figures | 461 (**12.5%**) |
| frames with ≥ 10 figures | 205 (**5.6%**) |
| frames with ≥ 1 attachment | **985** |
| max attachments in one frame | 4 |
| `attach` **events** in the whole corpus | **28** |
| frames with a non-empty stack | 389 (10.6%), max depth **4** |
| stack items carrying ≥ 1 target (frame-instances) | **44** |
| frames with a non-empty stack during a COMBAT phase | **66** (1.8%) |
| `cast` events | 414, of which **234 (56.5%)** share a batch with ≥ 1 `tap:on` |
| face-down battlefield card-instances | 1,138 — all with an empty `name` |
| distinct non-token creature names ever on a battlefield | **21** |
| distinct token creature names | 4 |

**Four things follow, and each one changes a design decision.**

- **"~10 figures" is the right budget and 21 is the worst case.** §8 sizes for 12
  comfortably and degrades above it, and the benchmark frame must be a
  `human-sideboard-7` frame, not a g1 frame.
- **An aura built as a cue would be invisible.** 28 `attach` events against 985
  frames showing an attachment: the transition is rare, the *state* is common.
  §4 is built on the pose side of §1.3's line because of this number.
- **Targeting arrows are a minority case.** 44 targeted stack-item instances. The
  spell form has to read on its own (§6.2); the tether is a bonus.
- **The mana-flow link is only 56.5% available even as a heuristic** (§5.4), which
  is why §5.4 recommends the version that needs no link at all.

**The figure corpus, in full** (what the Tier 2 test must resolve; counts are
frame-instances, so they measure how much screen time each archetype gets):

| creature | frames | type line | archetype |
|---|---:|---|---|
| Garruk's Companion | 1,859 | `Creature - Beast` | beast (probe deck) |
| *(face-down)* | 1,138 | `Creature` | **default** |
| Ainok Tracker | 956 | `Creature - Dog Scout` | beast (probe deck) |
| Aerial Doombot | 929 | `Artifact Creature - Robot Villain` | **drone** |
| Peggy Carter, Secret Agent | 783 | `Legendary Creature - Human Spy Hero` | **agent** |
| Ant-Man's Air Force | 605 | `Creature - Insect` | **insect** |
| Bold Biochemist | 548 | `Creature - Human Scientist` | **scientist** |
| Thallid | 519 | `Creature - Fungus` | default (probe deck) |
| Giant-Sized Flying Ant | 473 | `Creature - Insect` | **insect** |
| Wasp, Shrinking Savior | 388 | `Legendary Creature - Human Hero` | **hero** |
| Agent Phil Coulson | 337 | `Legendary Creature - Human Spy Hero` | **agent** |
| Battering Craghorn | 282 | `Creature - Goat Beast` | beast (probe deck) |
| Quake, Agent of S.H.I.E.L.D. | 281 | `Legendary Creature - Inhuman Spy Hero` | **agent** |
| A.I.M. Scientists | 169 | `Creature - Human Scientist Villain` | **scientist** |
| Agent 13, Sharon Carter | 158 | `Legendary Creature - Human Spy Hero` | **agent** |
| S.H.I.E.L.D. Helicarrier | 115 | `Artifact Creature - Vehicle` | **vehicle** |
| Ashcloud Phoenix | 104 | `Creature - Phoenix` | default (probe deck) |
| Volcano Hellion | 99 | `Creature - Hellion` | default (probe deck) |
| Ant-Man, Reformed Rogue | 80 | `Legendary Creature - Human Rogue Hero` | **hero** |
| Agents of S.H.I.E.L.D. | 48 | `Creature - Human Spy Hero` | **agent** |
| Nick Fury, Spymaster | 33 | `Legendary Creature - Human Spy Hero` | **agent** |
| **Soldier Token** | 1,193 | `Creature - Soldier` | **agent** (token tint) |
| **Robot Token** | 502 | `Artifact Creature - Robot` | **drone** |
| **Hero Token** | 254 | `Creature - Hero` | **hero** |
| **Saproling Token** | 48 | `Creature - Saproling` | default |

**A measured trap, worth its own line: a token's `name` carries the word
`Token`.** The wire says `"Soldier Token"`, `"Robot Token"`, `"Hero Token"`,
`"Saproling Token"` — sampled straight out of `g1.jsonl`
(`{"id":90,"name":"Soldier Token","types":"Creature - Soldier","token":true,…}`).
A `figures.json` keyed on `"Soldier"` would never match, exactly as the arena's
`counters:P1P1` selector never matched until `counterToken()` normalised the
wire's spelling (amendment **M43**). Key the per-card rung on the wire's string
and let the *subtype* rung do the work.

**Six archetypes cover the deck** — agent, hero, scientist, drone, insect,
vehicle — plus a default, which is what `arena-mode.md`'s "about eight archetypes
cover it" predicted. The probe decks contribute four more type lines that will
sit on the default, and that is correct: they are not the deck this is for.

---

## 3. The manifestation stage

### 3.1 Where a figure stands

Units are `layout.ts`'s: **1 world unit = 1 card height**, `CARD_W = 63/88`, the
table is the XZ plane at `y = 0`, you sit at `+Z` (`layout.ts:69`, `:79`, `:192`).

A figure **stands off the front edge of its card, toward the centre of the
table**:

```
figure.position = [ p.x,  p.y,  p.z − seatSign(p.seat) × FIGURE_STANDOFF ]
seatSign('you') = +1        FIGURE_STANDOFF = 0.52
seatSign('opp') = −1        FIGURE_HEIGHT   = 0.85   (world units ≈ one card long)
figure.rotation.y = seat === 'you' ? 0 : π       // it faces the other seat
```

Three reasons, in the order they matter:

1. **The card stays readable.** The rest camera is
   `position [0, 9.3, 8.3] → target [0, 0, 0.8]` (`camera.ts`'s `REST_POSE`): a
   steep, high three-quarter view. A figure standing *on* its card occludes the
   art from exactly that angle. Standing 0.52 in front of it leaves the whole
   card face clear.
2. **It stands where it will fight.** The creature rank is at `z = 2.3` and the
   combat lane at `z = 0.9` (`YOU_ANCHORS`, `layout.ts:192`): the standoff puts
   the figure at `z ≈ 1.78`, so the attack lunge is a short, legible step toward
   the centre line rather than a leap over its own card.
3. **It inherits `presence` for free.** `applyPresence` already folds the
   Helicarrier's and the Doombot's hover into `placement.position.y`
   (`layout.ts:481`), so a figure derived from `placement.position` floats without
   a line of new code.

Wrapped ranks (ten or more creatures, `RANK_WRAP_Z = 0.55`) put the second row
0.55 behind the first, which is almost exactly the standoff — so a figure in row 0
would stand on row 1's cards. **Rule: the standoff scales with the row** —
`FIGURE_STANDOFF × (1 − 0.45 × row)` — and above 12 figures the stage degrades to
discs (§8.2). This is the one geometric interaction Tier 2 has with Tier 1's
layout and it must be in `layout.ts`'s units, not invented in the figure module.

### 3.2 The module layout, and which files may import three

Mirroring `cues/` exactly, because that split is what makes the tests possible:

```
web/src/arena/figures/
  figures.json        DATA. card name / archetype key → model id, tint, clip aliases.
  models.json         DATA. model id → path, licence, sha256, height, facing, clips.
  types.ts            [NO three] the vocabulary: ClipName, FigureSpec, Stance, …
  resolve.ts          [NO three] the ladder: card → FigureSpec. Pure.
  pose.ts             [NO three] figurePose(layout, data) → FigureLayout. Pure.
  clips.ts            [NO three] CLIP_FOR (cue id → clip), clip arbitration.
  validate.ts         [NO three] closed key sets, drop the entry not the file.
web/src/arena/scene/
  FigureLayer.tsx     three. One <Figure> per pose; registers into figureRigs.
  figureRigs.ts       three (types only). cardId → { root, mixer, actions, … }.
  models.ts           three. Loader + module-level cache + fallback. Mirrors useCardTexture.ts.
  tiles.ts            three. The land tile library (§5).
  forms.ts            three. The stack's spell forms (§6).
web/public/models/    BINARIES. Gitignored (§9.1).
```

`figures.json` and `models.json` live in **source**, next to `cues.json`, because
they are text keyed by card names and model ids — the same argument
`09` §13 makes for `cues.json` being committable. The `.glb` files do not (§9.1).

### 3.3 The `Stage` gains one lane

```ts
// cues/stage.ts — additions, and the whole of them
export const CLIP_NAMES = [
  'idle', 'summon', 'attack', 'block', 'hit', 'die',
  'grow', 'shrink', 'channel', 'crouch',
] as const;
export type ClipName = (typeof CLIP_NAMES)[number];

export interface ClipRequest {
  clip: ClipName;
  /** 0…1 through the clip. THE CUE OWNS THIS (§3.4). */
  t: number;
  /** 0…1 against the resting stance. */
  weight: number;
  /** A per-card alias the figure layer resolves against the model (§3.6). */
  alias?: string;
}

export interface Stage {
  // … deltaTo, setOffset, clearOffset, setEffect, clearEffect, requestCamera, clearAll
  setClip(cardId: number, request: ClipRequest): void;
  clearClip(cardId: number): void;
}
```

**Offsets compose; clips arbitrate.** `composeInto` (`cues/stage.ts`) adds
translations and multiplies scales because two cues on one card in one batch is
reachable (a creature that takes damage *and* dies) and last-writer-wins would
make the animation depend on iteration order. Poses do not add: a figure cannot be
30% dying and 70% attacking. So `SceneStage.setClip` keeps **one** request per
card, chosen by a total order that is a pure function of the requests and not of
arrival:

```
die > hit > block > attack > summon > shrink > grow > channel > crouch > idle
ties broken by weight, then by clip name          // deterministic, testable
```

`NullStage` records clip ops in `ops` and keeps a live `clips` map, exactly like
`offsets`, so the fixture sweep asserts both the arbitration and the decay with
no GPU. The `cue()` builder in `registry.ts:139` already makes `end()` total by
construction over targets and declared effect keys; it gains `clearClip` over the
same target list, so a cue cannot leak a pose by forgetting a branch.

### 3.4 The clock: the cue drives `action.time`, the mixer never ticks itself

This is the load-bearing mechanism of the whole tier, and it is verified against
the installed `three@0.186.0`:

- `AnimationMixer.update(deltaTime)` advances `this.time`, calls
  `action._update(time, deltaTime, …)` for every active action, then applies every
  binding (`three/src/animation/AnimationMixer.js`, `update()`).
- `AnimationAction._updateTime(deltaTime)` opens with
  `if ( deltaTime === 0 ) { if ( loopCount === -1 ) return time; … }` —
  i.e. **with a zero delta it returns `this.time` untouched**
  (`three/src/animation/AnimationAction.js`, `_updateTime`).

So:

```ts
action.time = clipRequest.t * action.getClip().duration;
action.setEffectiveWeight(clipRequest.weight);
mixer.update(0);                                  // scrub, do not advance
```

is a deterministic scrub of a skinned pose from a number the cue computed.

**Why this matters more than it looks.** The queue's clock is virtual
(`cues/queue.ts:321`, `tick(now)` advances an internal count by
`(now − last) × speed`), and everything the arena can already do — pause, 0.5×–4×,
"step one batch", `skipCurrent`, `flushAndSnap`, the 2500/1200/**250 ms** budgets
(`queue.ts:49`), the ×0.3 reduced-motion scale (`queue.ts:74`) — is a property of
that clock. A mixer with its own wall clock would keep all of it and lose all of
it at once: skipping a cue would leave a creature frozen mid-lunge, a 4× replay
would play cues fast and animations at 1×, and `prefers-reduced-motion` would
shorten the cue and not the motion. **Driving `action.time` from `t` means the
clip *is* the cue**, and none of that code is written twice.

The two consequences to accept:

- **A looping idle cannot ride the cue clock**, because no cue is running. It
  rides the frame clock in `applyFigures`, exactly as the `presence` bob does today
  (`CueRunner.tsx:290`, "a function of TIME, and `layout()` is a pure function of
  STATE"). §8.3 rule 1 is why it is off by default.
- **Root motion is forbidden.** A clip that translates the root fights
  `figurePose ⊕ offset`, which owns position. Clips animate *bones about a fixed
  root*; the lunge is an offset. State it in `models.json` as a lint
  (`"rootMotion": false`) and check it at load: a clip with a non-constant root
  track is dropped with a console note, not played.

### 3.5 Which cue plays which clip

Keyed by **cue id, not by event kind** — one table in `figures/clips.ts`:

```ts
export const CLIP_FOR: Readonly<Record<string, ClipName>> = {
  'zone.enters': 'summon',   'fx.flyIn': 'summon',    'fx.agents': 'summon',
  'attack.lunge': 'attack',  'attack.jet': 'attack',  'attack.aegis': 'attack',
  'attack.shrink': 'shrink', 'block.interpose': 'block',
  'damage.hit': 'hit',       'damage.lethal': 'hit',
  'zone.dissolve': 'die',    'sacrifice.crush': 'die', 'zone.exile': 'die',
  'counters.pop': 'grow',    'counters.drop': 'shrink',
  'fx.scaleBeam': 'grow',    'fx.collapse': 'shrink',
  'fx.circuit': 'channel',   'fx.hologram': 'channel', 'fx.badge': 'channel',
  'stats.flip': 'channel',   'tap.rotate': 'crouch',   'phased.fade': 'channel',
};
```

**Why the cue id and not the event kind.** The ladder has already run by the time
a cue exists, so the cue id is the most specific thing anyone said about this
card and this event. Ant-Man's `attackers:alone → attack.shrink` and Peggy's
`attackers:alone → attack.aegis` are *different* entries for the *same* kind, and
this table gives them `shrink` and `attack` respectively with no new data. The
practical payoff is large: **`cues.json`'s existing 28 cards and 7 archetypes
light up figures with no edit to `cues.json` at all.**

**The per-card override is a `params` key, not a new cue id.** `CueParamValue` is
already `number | string | boolean` (`cues/types.ts`) and `validate.ts` already
type-checks params, so this is legal in the file today:

```jsonc
"Agent 13, Sharon Carter": {
  "attackers": { "cue": "attack.lunge", "ms": 620,
                 "params": { "spotlight": 1, "clip": "pistolDraw" } }
}
```

That is report 09 §12.2's "the pose is the point, and the pose is a model" row
answered with one string. The registry reads `params.clip` in the shared helper
that already reads `colour` and hands it to `setClip` as `alias`.

**Do not widen `CueParams` to accept arrays.** The redaction sweep in
`replay-cues.test.ts` scans every string a cue or a stage op carries, and
`validate.ts`'s type check is a closed set of primitives. Where Tier 2 needs a
list of ids (§5.4), it encodes digits and commas in a string — digits cannot be a
card name, and the net stays exactly as tight as it is.

### 3.6 The clip vocabulary, and clip resolution

Ten clips, chosen so that **an archetype with only four of them still reads**:

| clip | required? | when | length |
|---|---|---|---|
| `idle` | ✔ | the resting stance (one pose, or a loop if §8.3 rule 1 is on) | 1–3 s |
| `summon` | ✔ | enters the battlefield | 0.5 s |
| `attack` | ✔ | declared as an attacker | 0.8 s |
| `hit` | ✔ | took damage | 0.4 s |
| `die` | ✔ | left for the graveyard / was sacrificed / exiled | 0.7 s |
| `block` | | declared as a blocker | 0.6 s |
| `grow` / `shrink` | | counters, `stats`, a scale beam | 0.4 s |
| `channel` | | a trigger fired, an aura landed, a circuit lit | 0.6 s |
| `crouch` | | tapped (see §3.9) | 0.3 s |

Clip resolution is a **three-rung ladder that always terminates**, the same shape
as the cue ladder:

1. the requested `alias` (`"pistolDraw"`) in this model's clip map;
2. the generic `ClipName` (`"attack"`) in this model's clip map;
3. **nothing** — the figure holds its stance and the Tier-1 offset still plays.

Rung 3 is the important one: *a missing clip never removes the animation*, it
removes only the part of it a model was going to add. That is the same rule as
"a missing image renders a text card and never blocks a click".

### 3.7 Choosing a figure

`figures/resolve.ts`, pure, no three:

```
figureFor(card, data) →
  1. data.cards[card.name]                         "Aerial Doombot" → drone
  2. data.archetypes["creature/subtype:" + s]      for each recognised subtype, in order
  3. data.archetypes[archetypeKey(card)]           creature/W, creature/U, …
  4. data.archetypes[looserArchetypeKeys(card)]    creature/*, */W, */*
  5. data.default                                  { model: null } → the glow disc
```

Rungs 3 and 4 are `cues/archetype.ts:67` and `:79` **unchanged** — PLAN's *"the
archetype key is the Tier 2 model key"* is literally true and no new
classification code is needed for them. Rung 2 is the one addition: a pure
`subtypesOf(card): string[]` beside `primaryTypeOf`, reading the words after the
em dash of `card.types`, with its own test. The subtype rung comes **before** the
colour rung because the deck's flavour is in the subtype: a Robot Villain and a
Human Spy Hero are both mono-white artifacts-or-not, and the colour key cannot
tell them apart.

The recognised subtype order, from the census in §2 (most screen time first, so
the first match is the most specific thing said about the card):

```
robot · insect · vehicle · scientist · spy · hero · soldier · villain · human
```

`figures.json`, in full, for this deck:

```jsonc
{
  "version": 1,
  "archetypes": {
    "creature/subtype:robot":     { "model": "drone",     "tint": "#9fb4c8" },
    "creature/subtype:insect":    { "model": "insect",    "tint": "#9ec7f0" },
    "creature/subtype:vehicle":   { "model": "carrier",   "tint": "#9ec7f0" },
    "creature/subtype:scientist": { "model": "scientist", "tint": "#8ee0c0" },
    "creature/subtype:spy":       { "model": "agent",     "tint": "#f6f0d8" },
    "creature/subtype:hero":      { "model": "hero",      "tint": "#f2d98c" },
    "creature/subtype:soldier":   { "model": "agent",     "tint": "#cfd6de" },
    "creature/W":                 { "model": "agent",     "tint": "#f6f0d8" },
    "creature/U":                 { "model": "agent",     "tint": "#9ec7f0" },
    "creature/*":                 { "model": null }
  },
  "cards": {
    "Aerial Doombot":            { "model": "drone",  "scale": 1.0, "clips": { "attack": "jet" } },
    "Giant-Sized Flying Ant":    { "model": "insect", "scale": 1.35 },
    "Ant-Man's Air Force":       { "model": "insect", "scale": 0.7, "swarm": 5 },
    "S.H.I.E.L.D. Helicarrier":  { "model": "carrier", "scale": 1.6 },
    "Ant-Man, Reformed Rogue":   { "model": "hero",   "clips": { "attack": "shrink" } },
    "Agent 13, Sharon Carter":   { "model": "agent",  "clips": { "attack": "pistolDraw" } },
    "Nick Fury, Spymaster":      { "model": "agent",  "clips": { "channel": "radioCall" } },
    "Soldier Token":             { "model": "agent",  "tint": "#cfd6de", "token": true }
  },
  "default": { "model": null }
}
```

`"model": null` is not a hole; it is the declared fallback (§9.4).

### 3.8 `figurePose` — the pure pose function

```ts
// figures/pose.ts — [NO three]
export interface FigurePose {
  cardId: number;
  seat: Seat;
  position: [number, number, number];
  facingY: number;
  /** World units, after the archetype's and the card's own scale. */
  height: number;
  modelId: string | null;         // null ⇒ the glow disc
  tint: string;
  stance: Stance;                 // 'ready' | 'crouch' | 'attacking' | 'blocking' | 'sick'
  /** Pose-derived manifestations of this host's attachments (§4). */
  attachments: AttachmentManifestation[];
  /** Pose-derived opacity: summoning sickness is a translucency, not a tint. */
  opacity: number;
  /** The attacker this figure is blocking, from `state.combat` — never from the event. */
  interposesId: number | null;
}

export function figurePose(
  placed: Layout,
  combat: Combat | null,
  data: FigureData,
): Map<number, FigurePose>;
```

It takes the **already-computed `Layout`**, not the `ClientState`, for three
reasons: `layout.ts` stays the only module that knows a coordinate (§1.1);
`presence`, the wrap rows and the attachment host resolution across both seats
have already happened; and `Placement.back` is already decided, which is what
§1.4 branches on. It is total over a pre-game frame, an empty board, a `null`
combat and a card with a `null` controller, and it never throws.

### 3.9 Stance

| snapshot field | stance | how it reads |
|---|---|---|
| `tapped` | `crouch` | the figure kneels / powers down. **It does not rotate with its card.** |
| `sick` | `sick` | `opacity 0.75` and the card's existing `SICK_TINT` grey; the figure is *not yet there* |
| `attacking` | `attacking` | weapon up, forward lean, standing in the combat lane |
| `blocking` | `blocking` | standing in front of `interposesId` |
| otherwise | `ready` | `idle` |

**The tap rule is worth its own sentence.** `layout.ts` turns a tapped card by
`TAP_ANGLE` in the table plane and keeps its slot (`layout.ts:79`, and the file's
own "a tapped card keeps its slot"). A figure that inherited that rotation would
lie down sideways. The figure reads `placement.tapped` and changes *stance*; the
card keeps turning. Same fact, two vocabularies.

**Blocking comes from `state.combat`, not from the `blockers` event**, and this is
protocol law rather than taste: amendment **M7** says an unblocked attacker
arrives as `{attackerId: n, blockerIds: [n]}` — Forge's own encoding — and that
"`state.combat` is the authority on who blocked what". `resolve.ts` already skips
the self-block in `cardIdsOf`; the *pose* skips the whole problem by reading the
snapshot. Measured ceiling: **11 attacking bands and 3 blockers** in one frame
across the corpus, so the interpose layout is a small problem.

### 3.10 What a figure must never do

1. **Never carry a name, a type line or oracle text.** No labels above figures.
   The card plane is the identity of the thing, and it already went through
   `CardPlane`'s one gate.
2. **Never be the click target.** `HitProxy` is parked at `layout(state)` and is
   the only thing the raycaster sees (report 09 §5.5); figures get
   `raycast = () => {}` so a moving figure cannot steal or move a click. This is
   the same asymmetry Tier 1 exploits — the renderer skips invisible objects, the
   raycaster does not check `visible` — read the other way round.
3. **Never gate on `selectable`.** CLAUDE.md M7 convention 1.
4. **Never decide anything.** A figure that "knows" a creature is about to die is
   rules logic in a renderer.

---

## 4. Auras and equipment: the attachment manifestation

### 4.1 The measurement that decides the design

**28 `attach` events in the corpus; 985 frames with an attachment on the
battlefield; four distinct attachment cards, all from this deck:** Quantum
Reduction 944 frame-instances, Super Suit 409, S.H.I.E.L.D. Spy Kit 362,
Robotics Mastery 315; never more than 4 at once.

An aura built as a cue is on screen for 500 ms out of a game and gone. **The
manifestation is a pose; the snap-on is a cue.**

### 4.2 The shape

`layout.ts:593`'s `layoutAttachments` already resolves a host **across both
seats** — the verification pass fixed exactly this, because an Aura one player
controls on a creature the other controls was being drawn a card-width from its
host in 16.7% of frames. `figurePose` therefore gets the host relation for free:
for each placement with `kind === 'attachment'`, look up
`card.attachedToId`'s pose and append:

```ts
export interface AttachmentManifestation {
  /** The attaching card's id — for the snap cue to key its effect off. */
  cardId: number;
  kind: 'shrink' | 'shell' | 'circuit' | 'glints' | 'cocoon' | 'halo';
  colour: string;                       // colourHex(colourIdOf(manaCost)) unless overridden
  /** Multiplies the host figure's height. `shrink` is the only one that is not 1. */
  hostScale: number;
  strength: number;                     // 0…1, for the overlay's intensity
}
```

The host figure's final height is `height × Π hostScale` over its manifestations,
which is how Quantum Reduction shrinks a creature **and stays shrunk** through a
skip, a scrub and a `resync` — because the scale is derived from the snapshot that
still says the Aura is attached.

### 4.3 The per-card table for this deck

| attaching card | `kind` | what it does to the host | cue on `attach:on` |
|---|---|---|---|
| **Quantum Reduction** | `shrink` | `hostScale 0.45`, plus a slowly contracting ring at the figure's feet | the existing `fx.collapse`, now also `setClip(host,'shrink')` |
| **Robotics Mastery** | `circuit` | the circuit-mask overlay Tier 1 already generates, projected on the figure instead of the card | `fx.circuit` |
| **Super Suit** | `shell` | a second, slightly larger silhouette of the same model in a metallic tint — **no new mesh**: clone the host's own geometry, scale 1.06, additive rim | `attach.snap` |
| **S.H.I.E.L.D. Spy Kit** | `glints` | two or three small additive sparks orbiting the figure's hands | `attach.snap` |
| **Web Up** | `cocoon` | §4.5 | `fx.webWrap` |
| **Strategic Intervention** | — | not an attachment: a full-table overlay, §6.5 | `cast.rise` |

**Super Suit's "armour shell" is the cheapest interesting idea in this report**:
re-using the host's own geometry as the armour costs one extra draw call and
**zero new art**, and it is automatically right for every archetype, including
ones drawn years later.

### 4.4 The default, so any aura reads

```
kind: 'halo'
colour: colourHex(colourIdOf(attachingCard.manaCost))    // colour.ts, unchanged
a ring at the figure's feet + a soft glow at chest height, both in that colour
```

This is the rule that makes the feature *finished* rather than *seeded*: an aura
nobody wrote an entry for still visibly does something to the creature it is on,
in its own colour, and an Equipment gets a metallic variant of the same. Both are
built from the existing `Effect` primitives (`glow`, `ring`) — `EffectPool`
(`scene/effects.ts`) already pools 6 glows and 6 rings, and they cost nothing
while parked because three's renderer skips invisible objects outright.

**But they must not come out of the cue budget.** `MAX_LIVE_EFFECTS = 8`
(`cues/stage.ts:251`) exists to cap *blended transients*; pose overlays are
steady-state and predictable (measured ceiling: 4 attachments in one frame). So:

```ts
export const MAX_POSE_OVERLAYS = 12;     // separate pool, separate cap
```

with the same "degrade, don't stutter" behaviour: over the cap, the halo is drawn
and the sparks are not.

### 4.5 Web Up, and the honest limit

Web Up exiles the creature it webs. The moment it resolves, the target leaves the
battlefield — so **there is no host figure to wrap any more**, and whether the
wire still relates the two is not something to assume: there is no Web Up
attachment in the committed corpus at all (the four measured are Quantum
Reduction, Super Suit, Spy Kit, Robotics Mastery).

So Tier 2 ships the beat that is certainly available and declares the rest:

- **The cue.** `fx.webWrap` on `cast` already lifts the target; Tier 2 adds
  `setClip(target,'die')` and a cocoon overlay that closes over the figure as it
  rises, then the `zone:*>exile` cue takes it off the table. That is the whole
  shot and it is honest.
- **The pose, only if the wire supports it.** If `attachedToId` on the exiled card
  still resolves in later frames, the exile pile draws a webbed card. **Measure
  before building**: play one game with Web Up, and look. Writing it on a guess is
  how a renderer ends up asserting a rules relationship the engine never stated —
  which is the exact defect `cues.json`'s own `_note`s exist to prevent.

---

## 5. Lands: tiles

### 5.1 A tile is a pose

A land is on the battlefield and its type line is in the snapshot, so its tile is
pose-derived and immortal across skips. `fx.terrain` and `land.rise` stay exactly
as they are: they animate the **arrival** of a tile that then simply exists.

The tile is a shallow box (or a disc) under the card, sized to the card footprint
plus a margin, `y ∈ [−0.06, +0.004]`, so the card lies **on** it:

```
tile.position = [ p.x, 0.0, p.z ]        tile.scale = [ CARD_W + 0.10, 0.06, 1.0 + 0.10 ]
```

### 5.2 The library, and instancing

Keyed by the same ladder as figures (per-name → subtype → default), because the
corpus has six land names and two of them are not in this deck:

| land | tile | note |
|---|---|---|
| Plains (5,560) | `plateau` | pale, flat, a low grass fringe |
| Island (9,511) | `water` | the one new shader (§5.3) |
| Thriving Heath (495) | `plateau` two-tone | a second colour band at the rim |
| Thriving Isle (1,796) | `water` two-tone | as above |
| Mountain (8,309), Forest (3,718) | `crag`, `grove` | probe decks — the fallback proves itself |
| anything else | `plain slab` | tinted by colour identity |

**All tiles of one kind are one `InstancedMesh`.** Verified against the installed
`three@0.186.0` (`src/objects/InstancedMesh.js`): `new InstancedMesh(geometry,
material, count)`, `setMatrixAt(i, m)`, `instanceMatrix.needsUpdate = true`, and
optional `setColorAt` for the per-tile tint. With a measured ceiling of **21 lands
in one frame** over ~4 kinds, that is **4 draw calls for the whole terrain**.

### 5.3 Tapping, and the second shader

- **Tapped is a pose**: the tile dims (`setColorAt`, or a per-instance uniform) —
  so a board scrubbed to mid-turn shows the right lands spent, with no cue history.
- **The ripple is the cue**: `fx.ripple` exists and already fires on `tap` for
  `land/*` and for all four land names in `cues.json`. It is the single biggest
  entry in the Tier-1 census (`Island · tap` alone is 433 of the 1,156 per-card
  cue hits), so it is also the animation the player will see most; it gets a
  slightly stronger ring on the water tile and a dust puff on the plateau.
- **Water is the one new shader Tier 2 writes,** and the budget is one. Tier 1
  wrote exactly one (`scene/cardMaterial.ts`'s dissolve, injected with
  `onBeforeCompile` and a constant `customProgramCacheKey` so all 40 card
  materials share one program). Copy that pattern exactly: patch a
  `MeshBasicMaterial` with a scrolling UV distortion and a single `uTime`, one
  cache key, one program for every water tile. **No reflections, no render
  targets, no second camera** — the arena has never rendered the scene twice and
  must not start (report 09 §9.2 rule 3 makes the same argument against drei's
  `ContactShadows`).

### 5.4 Mana flowing toward the spell — and the two ways to do it

**What the wire does not say.** There is no mana event: `GameEventManaPool` is on
§3.6's dropped list ("`state` carries both"), and no event links a tapped land to
the spell it paid for. `PlayerState.manaPool` exists in the snapshot, but reading
a *delta* out of it means diffing consecutive frames, which is the exact thing
`events` was added to avoid.

**Recommended (needs no invented link, always correct):**

> A `tap:on` on a card whose type line is a Land emits a **mana mote** that rises
> from the tile and drifts to **that land's controller's casting anchor** (§6.2).
> When a `cast` event arrives, the spell form at that anchor **consumes** the
> motes standing there.

Every step of that is a fact the engine stated: this land tapped; it belongs to
this player; this player cast a spell. The reading — "the mana this player made
went into the spell this player cast" — is true of the game even when the mote
count is not exact, and no renderer has claimed a link the engine did not make.
Bound it the way Tier 1 bounds `isLand`: the predicate is
`render/labels.ts`'s `isLandTypeLine`, the same one `layout.ts` already uses, so
there is one definition of "is this a land" in the app (CLAUDE.md M4 convention 6).

**The alternative, if the user wants literal beams** (a per-land beam to the spell
card), is a **declared heuristic** in the same register as Quake's shockwave: in
one batch, a `cast` and one or more `tap:on`s on lands with the same controller
are drawn as connected. Measured coverage: **234 of 414 casts (56.5%)** have at
least one `tap:on` in the same batch, so 43.5% of spells would show nothing at
all — a visibly inconsistent effect. It is implemented in the **planner**
(`queue.ts:129`, beside the six existing suppression rules), never inside a cue,
and it passes the land ids to the cast cue as `params.manaFrom = "12,14,18"` — a
string of digits, because `CueParams` is primitives-only and must stay that way
(§3.5).

---

## 6. The stack, manifested

### 6.1 What the wire gives, measured

389 frames (10.6%) have a non-empty stack, **max depth 4**; only **44** stack-item
frame-instances carry a target; **66** frames have a stack during a COMBAT phase.

So: the stack is shallow, usually untargeted, and the "instant during combat"
moment is real but rare (1.8% of frames). Build the form so it reads alone; build
the freeze cheap.

### 6.2 The casting anchor, and the spell form

One addition to `AnchorRef` (`cues/stage.ts:178`) and one case in
`anchorPosition` (`layout.ts:863`), which keeps `layout.ts` the only module that
knows a coordinate:

```ts
| { kind: 'casting'; player: number }      // resolved to the seat's own casting area
```

placed above the seat's land rank and inboard of the library
(`{ x: 1.9, y: 0.75, z: ±3.6 }`), so it is clear of the hand fan, the stack column
at `x = +4.8` and the graveyard/exile column at `x = −4.8`.

**The card plane still goes to the stack column** — that is the identity of the
spell and where the player reads it. The **form** is the manifestation: a small
generic construct that hangs at the caster's side for as long as the item is on
the stack. Chosen by the same ladder:

| type | form |
|---|---|
| instant | a hovering dart, aimed |
| sorcery | a flat sigil, turning slowly |
| enchantment / aura | a slow ring, tethered |
| artifact / equipment | a tumbling component |
| creature (a spell on the stack) | the creature's own figure, ghosted at 40% |

That last row is the one that makes the stack read as Magic: **the creature you
are casting is already standing there, translucent, and it solidifies when it
resolves** — and it needs no new asset, because the figure library already has it.

### 6.3 Tethers are pose, strikes are cue

- **Tether**: for every `stack[].targetCardIds` / `targetPlayerIds` of the current
  frame, a thin beam from the form to the target's figure (or the player anchor).
  Pose-derived, so it is correct after a scrub with no history. The existing
  `Effect{kind:'beam'}` draws it; `layout.ts`'s anchors aim it.
- **Strike**: on `resolved`, the form travels the tether and bursts at the target
  — `resolved.pop` gains a translation along `deltaTo(target)` and a
  `setClip(target, 'hit' | 'channel')`.
- **Fizzle**: `resolved:fizzled → resolved.fizzle` already greys and shrinks; the
  form goes grey and drops through the table.
- **Countered**: `unstacked → unstacked.shatter` — the form cracks. Note the
  existing suppression rule 2 (`queue.ts:201`): `unstacked` fires for *every*
  spell that leaves the stack, resolution included (412 of each in the corpus), and
  is dropped when a `resolved` covers it. Tier 2 inherits that for free and must
  not re-derive it.

### 6.4 The combat freeze

While `state.stack.length > 0` **and** `state.phase` names a combat phase, every
figure holds: clip weight is kept, clip `t` is not advanced, and a faint
desaturation washes the table. Pose-derived from the snapshot, so it costs one
boolean in `figurePose` and no new asset.

Two guards: it freezes **clips only** — never the HUD, never the decision layer,
never a click (there is no code path from the pose module to `onAct`); and it
must not freeze the *spell form*, which is the thing the player is being asked to
look at.

Strategic Intervention's "mission control overlay" is the same mechanism plus a
DOM overlay in the existing `.arena__layer` sibling layer — and that layer's own
rule applies (CLAUDE.md M7 convention 6): **every widget in it needs its own
`pointer-events: auto`**, and `liveness.test.ts` will fail the build if a new
widget is added to the layer's JSX without a class in its table.

### 6.5 Camera: no fifth move

Report 09 §8's budget is four camera cues, and §13 names camera nausea as a risk:
*"a fifth is a discussion, not a commit"*. The stack does **not** get a camera
move in Tier 2. The `CameraDirector` (`camera.ts`) already drops a request while
the engine is waiting on the human, under reduced motion, and while the user holds
the camera — and the framing solver already had to bend once (`HAND_BAND`) to keep
the viewer's own hand on screen. Adding a shot that pulls toward the casting
anchor at the moment the player is deciding whether to respond is the worst
possible time to move a camera.

---

## 7. Duelists: defer the avatars, take the silhouette

**Recommendation: do not build two rigged duelist avatars in Tier 2.** Two
reasons, one of them measured:

1. **The camera cannot afford them.** `REST_POSE` is
   `[0, 9.3, 8.3] → [0, 0, 0.8]` with `fov 40`, and §8 rule 6 requires the
   viewer's own hand to stay framed — a constraint that already forced a measured
   deviation (`camera.ts`'s `HAND_BAND`, which documents that enforcing rule 6
   literally dropped *both* of §8's own camera moves at 1920×1080). Avatars stand
   at the table ends, which is precisely where the frame would have to grow to
   include them, and everything already on the table would shrink.
2. **They are the most art-direction-expensive thing in the tier** and the least
   load-bearing: no rule, no event and no piece of information is carried by them.

**Take the cheap half instead: a silhouette bust per seat.** A single textured
quad at the existing `playerAnchorFor(seat)` HUD anchor (`layout.ts`, already used
by `life.tick` and `damage.player`), billboarded to the camera, dark, unlit,
no rig. It gains:

- a body for `damage:player` and `life.tick` to play on — a flinch, a red rim, and
  the number rising from a person instead of from nowhere;
- the Yu-Gi-Oh silhouette at the table ends that `arena-mode.md` is reaching for;
- **2 draw calls, zero rigs, zero clips, zero new pipeline.**

And one rule: **the duelists are never in the camera solver's required set.** They
are decoration and may leave frame; `framesSeat` keeps testing the hand and the
battlefield and nothing else.

Full avatars are Tier 2.5, and they should be revisited only after a play-test
answers whether anyone missed them.

---

## 8. Performance: ten figures on integrated graphics

### 8.1 The honest baseline

From `docs/evidence/m7-arena.md` §5 and W.3, and every number there is
**SwiftShader**, a software rasteriser and an explicit lower bound — no
measurement on the user's own iGPU was possible in that sandbox (M7 follow-up 2):

| | measured |
|---|---|
| scene, production build | **40 draw calls, 80 triangles, 1 geometry**, 49–59 textures |
| frame *body* (tick + offsets + effect bind + camera + `gl.render`) | p50 **0.1 ms**, p95 0.2 ms, max 0.5 ms over 200 frames |
| warm frame interval, 1920×993, governor settling on render dpr 0.75 | p50 8.6 ms, **p95 13.8–15.5 ms** — passes §9.4's p95 ≤ 20 ms gate |
| same, pinned `?dpr=1` | p95 22.4–23.6 ms — **fails** |
| cold table | 1–3 frames > 50 ms in the first ~40 — **the first GPU upload of a card's texture** (M7 follow-up 1) |
| idle frames | **0** (`frameloop='demand'`) |

The one-sentence summary: **the arena is fill-rate bound, not geometry bound**,
and the control that answers it is resolution (`arena/perf.ts`'s `DprGovernor`).

### 8.2 The Tier 2 budget

Sized for **12 figures** (only 5.6% of corpus frames reach 10; the ceiling is 21).

| resource | Tier 1 | Tier 2 budget | note |
|---|---:|---:|---|
| draw calls | 40 | **≤ 90** | 12 figures + 4 instanced tile kinds + ≤ 12 pose overlays + ≤ 4 forms + 2 duelist quads. §9.1's cap is 120. |
| triangles | 80 | **≤ 30,000** | ≤ 1,500 per figure — generous for stylised low-poly; tiles are boxes. |
| bones | 0 | **≤ 24 per figure, ≤ 300 total** | keeps CPU matrix work and GPU uniform pressure trivial |
| geometries | 1 | ≤ 20 | one per model + the shared quad + the tile boxes |
| materials / programs | ~8 | ≤ 14 | **shared across instances** (`SkeletonUtils.clone` reuses geometry and material) + one water program |
| model bytes on disk | 0 | **≤ 4 MB total, ≤ 400 kB per `.glb`** | |
| model texture VRAM | — | **≤ 8 MiB** | ≤ 512² per model against the 47 MiB of card art already measured |
| CPU per frame | 0.1 ms p50 | **≤ 3 ms** | 12 mixers × 24 bones is ~300 matrix composes |
| blended transients | ≤ 8 (`MAX_LIVE_EFFECTS`) | unchanged | pose overlays get their own `MAX_POSE_OVERLAYS = 12` |
| idle frames | 0 | **0** | §8.3 rule 1 |
| gate | p95 ≤ 20 ms | **p95 ≤ 20 ms on a ≥ 10-figure frame** | the bench frame changes; see §8.5 |

**Figures are opaque, and that is a fill-rate *win*.** Card planes are
`transparent` with an alpha map (`CardPlane.tsx`), so they render in the
transparent pass; an opaque figure renders in the opaque pass with early-z and
*reduces* overdraw on the pixels it covers. The death dissolve must therefore use
`discard` (the pattern `cardMaterial.ts` already established) rather than
blending, so a dying figure stays opaque.

### 8.3 The five things that will actually bite

1. **Losing `frameloop='demand'`.** An idle breathing loop makes the arena render
   60 fps forever on a laptop that is otherwise at zero. **Default: figures hold a
   static `idle` pose.** The middle path, if breathing is wanted: run the idle
   only while the queue is non-empty — i.e. while the loop is awake anyway — which
   costs *nothing* and still breathes during every animated moment. Anything more
   is a decision with a measured thermal cost (§13).
2. **Lights.** Tier 1 has **none**: every material is unlit, which is why 40 draw
   calls buy a whole table. A skinned model in `meshBasicMaterial` reads as a flat
   silhouette. Two options, and the choice is art direction with a measurable
   price: **(a)** bake the shading into vertex colours or the model's own texture
   and stay unlit — recommended, zero cost, and the holographic look wants it
   anyway; **(b)** one `HemisphereLight` + one `DirectionalLight` with
   `MeshLambertMaterial` **on the figures only**. Under no circumstances do the
   *cards* become lit — that re-lights Scryfall's already-lit paintings and
   multiplies the shader cost across the fill-bound half of the scene. **No shadow
   maps, ever.**
3. **The first-draw hitch, now worse.** M7 follow-up 1 is already a measured
   cold-table stall from texture uploads; a model adds a parse, a geometry upload
   and a skeleton bind on the frame a creature first appears. Mitigation, and it is
   required rather than nice: **preload the whole archetype set at arena mount**
   (6 models ≤ 400 kB each) and warm the programs with
   `renderer.compile(scene, camera)` — verified present in the installed
   `three@0.186.0` (`WebGLRenderer.js:1396`, with `compileAsync` at `:1515`).
4. **Overdraw from pose overlays.** Halos, circuit overlays and glints are all
   additive with `depthWrite: false` — report 09 §9.3's first-named risk. The
   separate `MAX_POSE_OVERLAYS` cap and the "no effect quad may exceed 25% of the
   viewport" rule both stand.
5. **The dpr governor's blind spot.** M7 follow-up 3: on a vsync-locked display
   there is no headroom to read out of frame intervals, so the ladder sits where it
   is. Tier 2 makes the scene heavier, so the governor's *down* step will fire
   correctly and its *up* step still will not. Nothing to fix here; something to
   know before reading a Tier 2 benchmark.

### 8.4 How to measure it

`tools/arena-bench.mjs` unchanged, with three changes to how it is *run*:

- **the frame must have figures on it** — scrub to a `human-sideboard-7.jsonl`
  frame with ≥ 10 creatures, not g1's 4;
- run warm (`--settle 4000`) **and** cold, and report both, because Tier 2 makes
  the cold number worse and hiding that would repeat the mistake the verification
  pass caught (a `PASS` reported from one lucky sample);
- run `?dpr=1` and unpinned, so the governor's decision is visible.

It stays **out of `check-all.sh`** (M7 follow-up 10) for the same reasons.

---

## 9. Assets: pipeline, repo layout, licences

### 9.1 Where models live, and what is committed

```
web/public/models/<id>/model.glb        BINARY — gitignored by default
web/public/models/<id>/LICENSE.txt      the third-party licence text, as shipped
web/src/arena/figures/models.json       COMMITTED — the manifest code reads
docs/licences/models.md                 COMMITTED — one row per model, human-readable
```

`web/public/` is Vite's static root and already holds exactly this pattern:
`web/public/art.json` is **gitignored** with the comment *"written by
`tools/fetch-art.ts` from Scryfall; regenerate, never commit"*. Models get the
same treatment for the same reason, plus a stronger one:

> **Nothing derived from card art may be committed.** Marvel art is licensed to
> Wizards; the Fan Content Policy is explicit that *"If you don't have the rights
> to use another person's stuff in your Fan Content—don't"*
> (<https://company.wizards.com/en/legal/fancontentpolicy>). `NOTICE` §2 and the
> Scryfall images already live under this rule.

And a second one that **corrects an assumption in the Tier 2 brief**: *"gitignored
if Marvel-derived, committed if CC0"* is right in principle but the popular
"CC0" libraries are not all CC0 any more.

- **Kenney — genuinely CC0.** kenney.nl/support states *"all game assets on the
  asset pages are public domain licensed (CC0)"* and *"You're free to use them,
  even in commercial projects"* (<https://kenney.nl/support>). **Committable.**
- **Quaternius — no longer CC0.** The licence is now the **Quaternius Asset
  License (QAL) v1.0**, which grants use, copying and modification with no
  attribution but forbids *"extract, repackage, sublicense, sell, or otherwise
  redistribute the Assets … as a standalone asset, asset pack, stock file,
  template, or similar product"* (<https://quaternius.com/license.html>). A public
  git repository containing the raw `.glb` is arguably exactly that.
  **Usable, not committable.** (Older mirrors still say CC0 — e.g. the Poly Pizza
  listing of Quaternius's animated platformer character, which displays *"Public
  Domain (CC0)"*, <https://poly.pizza/m/kKtL4zvS3n> — which is precisely why the
  licence goes in the manifest per model, from the page it was downloaded from, on
  the day it was downloaded.)
- **Mixamo — usable, not redistributable.** Adobe's terms allow royalty-free use
  of characters and animations in a finished project with no credit, but not
  repackaging the raw character/animation files as an asset pack or template. (The
  canonical page, <https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html>,
  refused an automated fetch with HTTP 403 during this research; **read it in a
  browser before relying on it**, and record what it says in the manifest row.)

**Therefore the default is: the models directory is gitignored, and a fresh
checkout has no models and falls back to discs.** Anything CC0 *may* be committed
by explicit decision; the manifest is what makes that decision visible.

### 9.2 The manifest

```jsonc
// web/src/arena/figures/models.json — committed, validated, read by the loader
{
  "version": 1,
  "models": {
    "agent": {
      "path": "models/agent/model.glb",
      "sha256": "…",
      "bytes": 284160,
      "height": 1.75,              // the model's own height, for normalisation
      "facing": "+z",              // normalised at load; never assumed
      "rootMotion": false,         // enforced at load (§3.4)
      "bones": 21,
      "clips": { "idle": "Idle", "summon": "Land", "attack": "Punch",
                 "hit": "HitReact", "die": "Death", "pistolDraw": "Shoot" },
      "source": "https://…",
      "licence": "CC0-1.0",
      "licenceUrl": "https://kenney.nl/support",
      "retrieved": "2026-09-…",
      "committable": true
    }
  }
}
```

`figures/validate.ts` mirrors `cues/validate.ts` exactly: closed key sets, `_`
prefixed keys are comments, **an error drops that entry and the ladder falls
through**, and `node --test` fails on any error. `tools/check-models.mjs` (new,
not in the gate) verifies the sha256 of whatever is on disk and prints what is
missing — a fetch script's job, not the renderer's.

### 9.3 Format and compression

- **`.glb`.** glTF 2.0 is the runtime delivery format — Khronos's own top-level
  elements are *"Scenes and nodes, cameras, meshes, buffers, materials, textures,
  skins and animations"*, and `.glb` is the single-binary packaging
  (<https://www.khronos.org/gltf/>). Skins and animations are in the format, which
  is the whole requirement.
- **Meshopt, not Draco — unless the decoder is local.** drei's `useGLTF` defaults
  its DRACO decoder path to a CDN: `let decoderPath =
  'https://www.gstatic.com/draco/versioned/decoders/1.5.5/'` in
  `node_modules/@react-three/drei/core/Gltf.js:8`. That is the same trap
  `scene/numberSprite.ts` already documents for drei's `<Text>` (*"its default
  font is fetched from `fonts.gstatic.com`… a local-only game whose damage numbers
  need a CDN is a game that silently loses its numbers offline"*) and it is why
  Tier 1 drew its numbers on a canvas instead. **The installed `three@0.186.0`
  ships the decoders locally** — `examples/jsm/libs/draco/` (1.8 MB) and
  `examples/jsm/libs/basis/basis_transcoder.{js,wasm}` (584 kB) — so if compression
  is wanted, point the loader at those and copy them into `web/public/`. For
  models this small, **uncompressed or meshopt is simpler and the right default.**
- **Textures ≤ 512², WebP.** KTX2/Basis is available (`KTX2Loader` is present, and
  it requires both `setTranscoderPath` and `detectSupport(renderer)` —
  `three/examples/jsm/loaders/KTX2Loader.js:182, :230, and the explicit throw at
  :379`), but it is a second pipeline for ≤ 8 MiB of texture. Defer it.
- **Authoring/optimisation:** glTF-Transform (MIT, with a CLI:
  `@gltf-transform/cli`) does dedupe, resize, WebP/KTX2 and Draco/meshopt from one
  command (<https://gltf-transform.dev/>). It is a **build-box tool, not a
  dependency** — nothing new enters `web/package.json`.

### 9.4 The loader, with fallbacks

`scene/models.ts` is `useCardTexture.ts` rewritten for meshes, and deliberately so
— that file already solved every problem this one has:

```ts
const cache   = new Map<string, Promise<LoadedModel>>();   // by path, never by card id
const ready   = new Map<string, LoadedModel>();            // resolved, for a re-mount
const failed  = new Set<string>();                         // a miss is cosmetic
```

- **`three/examples/jsm/loaders/GLTFLoader.js`** (117 kB source, bundled into the
  already-lazy arena chunk) loaded directly, **not** through drei's `useGLTF` —
  because `useGLTF` goes through `three-stdlib`, suspends inside the canvas
  (numberSprite reason 2) and carries the gstatic DRACO default.
- **One clone per figure with `SkeletonUtils.clone`**
  (`three/examples/jsm/utils/SkeletonUtils.js`, 11.5 kB): it clones the hierarchy
  and re-binds each `SkinnedMesh` to the cloned bones while **reusing geometries
  and materials by reference**
  (<https://github.com/mrdoob/three.js/blob/dev/examples/jsm/utils/SkeletonUtils.js>).
  That is what makes 12 agents cost 12 draw calls and one material.
- **Normalise at load**: scale so the model's measured bounding-box height equals
  `FIGURE_HEIGHT`, and rotate so `facing` becomes `+Z`. Two models from two
  libraries then stand the same height and look the same way, which no amount of
  per-card fiddling in `figures.json` would achieve reliably.
- **`null` is not an error state.** No manifest entry, no file, a 404, a parse
  failure, a clip that does not exist → **the Tier-1 glow disc**: an
  `Effect{kind:'glow'}` at the figure's stand-point, in the card's colour identity,
  sized by power/toughness. The card plane is untouched, every cue still plays, and
  the game is fully readable. This is the rule that lets Tier 2 be built
  incrementally and lets the repo ship with no binaries at all.

### 9.5 Rigging and retargeting

If the clip set comes from one source and the meshes from another, `SkeletonUtils`
also exports `retarget(target, source, options)` and `retargetClip(target, source,
clip, options)` for remapping bones between skeletons (same file). That is the
path for "one animation set, six archetypes" and it is worth aiming at: a single
`clips.glb` carrying the ten clips, retargeted onto each model at load, is far less
art work than ten clips per archetype — but it only works if the skeletons are
compatible, so **it is a T2/T9 experiment with a named fallback (per-model clips),
not an assumption.**

---

## 10. Tests

All of these run under `node --test` with no browser, because `figures/` imports
no three — the same payoff report 09 §2.4's `[NO three]` annotations bought for
`cues/`.

1. **`figures.test.ts` — the corpus sweep (the important one).** Every distinct
   creature in every committed recording, resolved through `figureFor(card, data)`:
   asserts **no throw**, **never `undefined`**, and that every result is either a
   model id present in `models.json` or the declared `null` fallback. Prints the
   census every run — model id → frame-instances → which rung matched — exactly as
   `replay-cues.test.ts` prints the cue census, so **a figure entry that never
   fires says so on the day it is added.**
2. **The decay assertion, extended.** In `replay-cues.test.ts`: after every one of
   the 3,293 batches drains, `stage.clips` is **empty** as well as `stage.offsets`.
   One line, and it is the mechanical proof that the clip lane was built on the
   right side of §1.1.
3. **Clip coverage.** Every clip name any cue asks for over the whole corpus exists
   in `CLIP_NAMES`, and every `alias` in `figures.json` exists in the named model's
   `clips` map (or is explicitly marked as intentionally absent).
4. **Clip arbitration is a pure function.** Given a set of `ClipRequest`s, the
   winner does not depend on insertion order — assert over shuffled permutations.
5. **`figure-pose.test.ts` — the pose is a pure function of the frame.** Over all
   3,679 board frames: every battlefield creature has exactly **one** pose; no pose
   is outside `TABLE_HALF_X/Z`; a tapped card's figure keeps its slot; a figure's
   `interposesId` always names a card that `state.combat` says it blocks.
6. **Redaction, twice.** `figureFor(hiddenCard) === default` and
   `figureFor(faceDownCard) === default` over the corpus (the 1,138 face-down
   instances are the live test data); and `NullStage.strings()` — extended to clip
   names, aliases and model ids — contains **no card name from anywhere in the
   recording**, which is the existing net widened to the new surface.
7. **Budget.** `figurePose` never returns more than `MAX_FIGURES` figures with a
   model (above it, the surplus degrade to discs), and never more than
   `MAX_POSE_OVERLAYS` overlays.
8. **`models-data.test.ts`.** `validateFigures` and `validateModels` report **zero
   errors** over the committed data; every `model` named in `figures.json` exists in
   `models.json`; every model row carries `licence`, `licenceUrl`, `source`,
   `retrieved` and `committable`.
9. **`liveness.test.ts`, extended** — the source scan gains `figures/*`: no three,
   no React, no DOM, no timer, no transport; and `scene/FigureLayer.tsx` must not
   import `transport/`.
10. **Not automated, and honest about it.** Whether a figure *looks* right is not
    testable here. The loop is the existing dev handle: `window.__mtgArena.queue`,
    `setPaused(true)`, `advance(ms)`, look — which is how every mid-cue photograph
    in `docs/evidence/m7-arena.md` was taken, because the browser pane's
    `requestAnimationFrame` never fires.

---

## 11. The evenings

### The first playable slice — eight evenings

| | deliverable | done when |
|---|---|---|
| **T0** (½) | **The spike and the go/no-go.** Load one `.glb`, clone it 12× with `SkeletonUtils.clone`, scrub one clip from a hand-driven `t`, read `gl.info`. | 12 figures ≤ 12 draw calls, one material, frame body still < 1 ms. **Named fallback if not: stylised billboards instead of meshes, and the rest of the plan is unchanged.** |
| **T1** | **The pose layer, with no assets at all.** `figures/types.ts`, `resolve.ts`, `pose.ts`, `figures.json`, `subtypesOf`; every battlefield creature gets a glow disc at its stand-point, sized by P/T, tinted by colour. `figures.test.ts` + `figure-pose.test.ts` over the corpus. | The whole corpus resolves; the board reads; **a shippable stopping point.** |
| **T2** | **The model loader and one humanoid.** `models.json`, `scene/models.ts`, normalisation, preload + `renderer.compile`, `FigureLayer` + `figureRigs`, static `idle`. | One agent archetype stands on the table in a replay; a missing file still draws a disc. |
| **T3** | **The clip lane.** `Stage.setClip`/`clearClip`, arbitration, `CLIP_FOR`, `params.clip`, `CueRunner`'s fifth step, `cue()`'s `clearClip`. Wire summon / attack / hit / die. | The decay assertion passes with clips in it; a skip lands the figures on their poses. |
| **T4** | **Lands as tiles.** The tile library, instanced by kind, the water shader, tapped dimming, the mana motes. | 21 lands = 4 draw calls; a scrub shows the right lands spent. **Second shippable stopping point — reassess here.** |
| **T5** | **One aura, properly.** The attachment manifestation as pose, Quantum Reduction's shrink + collapsing ring, and the **default halo** so every other aura reads. | A scrub to any of the 985 attachment frames shows the aura; `attach:on` snaps. |
| **T6** | **The stack.** The `casting` anchor, the five spell forms, the ghosted creature, tethers as pose, strike / fizzle / shatter, the combat freeze. | The 389 stack frames read without touching the camera. |
| **T7** | **Measure and tune.** `arena-bench.mjs` on a ≥ 10-figure frame, warm and cold; the governor; the cold-start hitch; reduced motion; the idle-breathing decision. Write `docs/evidence/m7-tier2.md`. | p95 ≤ 20 ms at the governor's chosen rung with 10 figures; the numbers are in the evidence with their caveats. |

### The full deck — six more

| | deliverable |
|---|---|
| **T8** | The rest of the humanoids: hero and scientist archetypes; token tints; the retarget experiment (§9.5) with per-model clips as the fallback. |
| **T9** | Drone and insect: `Aerial Doombot`'s jet and eye, `Ant-Man's Air Force` as a small swarm of the insect model, `Giant-Sized Flying Ant` at 1.35×. |
| **T10** | The vehicle: the Helicarrier as an actual silhouette overhead, riding the `presence` hover it already has. |
| **T11** | The per-card clips from `arena-mode.md`'s table that Tier 1 could only substitute for: Agent 13's pistol draw, the S.H.I.E.L.D. squad stepping forward together, Fury's radio call, Coulson's badge gesture — **all as `params.clip`, no new cue ids.** |
| **T12** | The remaining attachments: Super Suit's shell, Spy Kit's glints, Robotics Mastery's circuits, Web Up's cocoon (after §4.5's measurement), Strategic Intervention's overlay. |
| **T13** | Duelist silhouettes (§7), if taken; otherwise the second verification pass. |
| **T14** | Verification pass: an independent reviewer, the corpus census printed, the evidence document, the CLAUDE.md conventions and the PLAN entry. |

**Reassess after T4 and again after T7.** T1 and T4 are both honest stopping
points — a table where every creature has a presence and every land is terrain is
already most of what "the game is experienced visually" asks for, with no art
assets and no licence questions at all.

---

## 12. Risks

**Cue creep, again, with assets attached.** Report 09 §13 named it and time-boxed
E5 to one evening. Tier 2's version is worse because each entry now has a model
behind it. *Mitigation:* the archetype set is fixed at six before any per-card work
starts; per-card work is `params.clip` and nothing else; T11 is one evening.

**The frozen React-18 3D line.** `fiber@8.18.0` and `drei@9.122.0` have had no
release in 19 months (report 09 §13); the tree already prints `THREE.Clock … has
been deprecated` once per `<Canvas>` mount (M7 follow-up 11). Tier 2 adds a
*larger* surface of three's API — skinning, the animation system, glTF — which is
more to break on a future `three` bump. *Mitigation:* the loader and the mixer are
used through `three` directly, not through drei, so drei's freeze does not gate
them; pin `three` exactly, as it already is.

**Lighting turns into a rewrite.** "Just one directional light" is how an unlit
scene that runs at 40 draw calls becomes a lit scene that does not. *Mitigation:*
§8.3 rule 2's hard line — cards never become lit — plus a measurement before the
choice, not after.

**The GPU is still unmeasured.** Every performance number the project has is
SwiftShader (M7 follow-up 2). Tier 2 could pass every gate here and stutter on the
actual machine. *Mitigation:* §13's first user question; T0's go/no-go is the
earliest cheap signal.

**A figure asserting something the engine did not say.** The two standing examples
are already written down: `counters` carries no *source*, so "Coulson gave this
counter" is not on the wire; and the engine never says which card caused another
card's tap, which is why Quake's ring is on her own. A figure is a much louder
channel for that class of error — a creature that *points at* another creature is
a claim. *Mitigation:* every `figures.json` entry carries a `_note` saying which
event it keys off, exactly as `cues.json` does, and the same one rule applies: **a
manifestation keys off an event that is about that card.**

**Scope confusion with Tier 3.** Tier 2 is *archetypes*; per-card meshes are Tier 3
and open-ended. `figures.json`'s `cards` block is the seam where the two meet, and
the temptation to start Tier 3 one card at a time inside Tier 2 is real.
*Mitigation:* a per-card entry in Tier 2 may choose a model and alias a clip; it
may not introduce a model used by exactly one card. Write that in the file's
header.

---

## 13. Only the user can decide

1. **Art direction — and it is the decision everything else hangs off.** Three
   coherent answers, and they are not mixable:
   - **(a) Stylised low-poly**, Kenney/Quaternius-shaped: readable at the table
     camera's distance, cheap, CC0 or near it, and it will look like a boardgame
     rather than like Magic. Cheapest and lowest-risk.
   - **(b) Holographic silhouettes**: single-colour, fresnel-edged, translucent —
     the Yu-Gi-Oh reading `arena-mode.md` reaches for. It *hides* low model
     quality, keeps the scene unlit (§8.3 rule 2's option (a) for free), and makes
     one generic humanoid serve six archetypes with only a tint change. **My
     recommendation**, and it is also the cheapest to get right.
   - **(c) Likeness** — figures that look like the characters. This is Tier 3 in
     everything but name, it is the most work by an order of magnitude, and it is
     the option with a real licence problem (see 2).
2. **AI-generated models from card art — a "personal use only" answer, and here is
   what "personal use" actually means here.** Generating a mesh from a Marvel card
   image makes a derivative of art licensed to Wizards, and the Fan Content Policy's
   own line is *"If you don't have the rights to use another person's stuff in your
   Fan Content—don't"* (<https://company.wizards.com/en/legal/fancontentpolicy>).
   The tools' own terms make the same point from the other side: Meshy's help centre
   says paid-plan users retain private ownership *"provided you do not publish them
   publicly … and that you have used materials that do not violate the copyrights of
   others"*, and **free-plan outputs are licensed CC BY 4.0**
   (<https://help.meshy.ai/en/articles/10137554-what-is-the-ownership-of-the-generated-models>)
   — i.e. the free tier would have you publishing, under an open licence, a
   derivative of art you do not own. So: **if this is done at all, it is paid-tier,
   private, local, gitignored, never published, and recorded in the manifest as
   `committable: false`** — exactly the rule the Scryfall images already live under.
   It is your call, and the pipeline above is built so the answer can be "no" and
   nothing else changes.
3. **The GPU reality check.** Every performance figure this project has is from a
   software rasteriser. Before T2 buys models, run the existing bench on the
   **actual** machine (a real browser on the iGPU, `DRI_PRIME=1`, `?stats=1`, and
   `?glinfo=1` for the counters) on a `human-sideboard-7` frame, and report p50/p95
   and the governor's chosen rung. If the arena is already at dpr 0.75 on the target
   at 40 draw calls, Tier 2 wants option (b) above and probably wants 8 figures, not
   12.
4. **Idle breathing: motion or battery?** §8.3 rule 1. "Off" keeps the measured
   zero idle frames; "only while something else animates" is free and is the
   recommendation; "always" costs a permanent 60 fps loop. Your table, your laptop.
5. **Duelists now, or the silhouette?** §7 recommends the silhouette and defers the
   avatars, mostly because of the camera. Say if the avatars are the point of the
   whole tier, because then the camera work has to come first and §6.5's "no fifth
   camera move" needs revisiting.
6. **Lights, or baked shading?** §8.3 rule 2. One directional + one hemisphere on
   the figures only is defensible; it needs a measurement, and the measurement needs
   your machine.
7. **The play-test loop.** This is the thing nothing here can answer. Tier 1 was
   built against the corpus and then played live once; Tier 2's whole thesis is
   about how a game *feels* to watch. The proposal: after T4 and after T7, play three
   games (`./scripts/play.sh --arena --games 3`) and write down, in the moment, the
   three things that read wrong — not afterwards, and not as a list of features. That
   list is what T8–T12 should be re-ordered around. Mid-slice, the replay corpus is
   the faster loop: `npm --prefix web run dev:arena`, `?replay=games/human-sideboard-7.jsonl#arena`
   for a crowded board, and the paused-queue dev handle for a single beat.
