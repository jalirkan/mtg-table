# Scenery coverage: every situation the board can be in

Draft, 2026-10-22, for choosing the next art batches. Nothing painted, nothing changed in code.
Read against: ForgeCoach `main` at `d571c00` (`test-main`) plus the 1.13 draft on
`pc/scenery-whole-half` (`f9cecbc`) and `pc/scenery-panoramas` (`7a31f32`). Also the live pack
`forgecoach-scenery@pack-v9` with `pairs-v3.1`, the spec (1.1–1.13), `pc-results/ART-DIRECTION.md`,
`land-art-reference/NOTES.md`, the pack SUMMARYs, and mtg-table `docs/protocol.md` §3.

Justin's question was "do we have an image for each situation?" The short answer is no. **We
cover one axis thoroughly: lands, by colour and count.** Five biomes × six stages, desktop and
phone, with transition frames, a full-area accent from stage 2, six effects each, ten bridges, ten
pair places (pairs-v2) and ten road motifs (pairs-v3.1). Everything else the game does, the scenery
does not see.

## A. The inputs

Every signal the board already has, from the wire (`state`, `events`, `over`). The scenery reads the
viewing seat's redacted copy only.

| Signal | On the wire as | Scenery reads it today? |
|---|---|---|
| Lands by biome and count | `players[].zones.battlefield` (public) | **Yes.** Weight per biome, slot order by arrival, stage from the thresholds `[1..6]`, progress, withering. |
| Duals / shocks / Pathways / Thriving | the land's type line, plus card data and the seat's own choice | **Yes.** ½ / ½, which widens the motif or band. A Triome or Lair is ⅓ each and widens nothing. An opponent's Thriving land counts its fixed colour only. |
| Colourless, any-colour and fetch lands | the same | **Yes, as "nothing"** (1.11). |
| Growth stage | derived | **Yes.** It is the whole of the scenery's growth. |
| Land enters / leaves | snapshot diff | **Yes.** `landfall` and `stageUp` effects, frames played forward or backward, withered grey when a biome's last land leaves. |
| Creature enters, attack, damage to a player or a creature | `events`: `zone`, `attackers`, `damage` | **Yes, as one-shots.** Four event kinds become six effects (`creatureEnter`, `attack`, `damagePlayer`, `damageCreature`, plus `landfall`/`stageUp`). |
| Turn / round | `turn`, `round`, the `turn` event | No |
| Phase / active player / priority | `phase`, `activePlayer`, `priority`, the `phase` event | No |
| Life totals, poison | `players[].life`, `poison`, the `life` event | No |
| Board size (creatures, other permanents) | battlefield cards and types | No |
| Planeswalkers, artifacts, Sagas, enchantments | battlefield type lines | No (a Saga is a colourless land and draws nothing) |
| The stack | `stack`, `cast`, `resolved`, `unstacked` | No |
| Deaths, sacrifice, graveyard size | `zone` → graveyard, `sacrificed` | No |
| Mulligan / opening hand | the `mulligan` event, hand `count`, the viewer's own hand | No |
| Game over | `gameOver`, the `outcome` event, `over` | No. The scene simply freezes. |
| The opponent's half | the same reads, for their battlefield | **Yes.** Same pictures, drawn upright, with a mist band at the centre line. |
| The viewer's seat | `BoardScenery`'s `seat` | **Yes**, for which half is "yours". |
| Screen shape | the panel's aspect | **Yes.** Phone pictures for halves, frames, bridges and motifs (PR #191). |

Two facts constrain everything below:

1. **The light is already spent.** The ladder gives each stage its own hour (ART-DIRECTION §2.1 and
   §3): s1 dawn, s2 noon, s4 sunset, s6 night, with s3 and s5 the blends between. A turn-driven
   time of day would fight the growth language Justin chose. A mixed half already breaks land-art
   rule 4 ("one light"): a stage-6 night island can sit beside a stage-1 dawn mountain.
2. **#ambience cannot show any of the new signals.** `sim.ts` pins `phase: 'MAIN1'`, life 20, and
   `gameOver: null`. Each rule below needs a slider there before Justin can judge it without a game.
   That costs no GPU, only client work.

## B. The matrix

GPU rates, measured:

| Asset | Rate | Basis |
|---|---|---|
| Opaque stage picture (desktop + phone, detail pass, 3 candidates) | ≈ 0.67 h | pack-v8: ~20 h for 30 pictures plus frames; pairs: 20.6 h |
| Panorama (desktop, 3 candidates, no detail pass) | ≈ 0.52 h | panoramas-v1: 2.09 h for four |
| Phone picture | ≈ 0.25 h | 2 × 76 s + a ~10 min detail pass |
| Transparent piece (bridge-like, with candidates) | ≈ 0.1 h | seams-v1: 1.1 h for 20 |
| Transition frame | ≈ 0.025–0.04 h | pairs-v2: 5.2 h for 241 |
| Grade / tint | 0 h | client work only |

Priorities:

- **P1:** seen in every game, or cheap and decisive.
- **P2:** seen in many games.
- **P3:** rare, or polish.

| # | Situation | Today (asset · rule) | Should show | Assets needed | GPU-h | Pri |
|---|---|---|---|---|---|---|
| 1 | Empty table before the first land (turn 1, or a land-light start) | Nothing. Board background; `layout.length === 0` returns null | A **prologue**: one unformed place at first light (mist over neutral ground), shared by both halves. It dissolves into the first land's biome | 1 picture × desktop + phone | 0.6 | **P1** |
| 2 | Mulligan / opening hand / coin toss | Nothing | The prologue, plus a 3-frame mist "reshuffle" on each `mulligan` event. Optionally (viewer's half only, own hand) a faint dawn tint in the hand's land colours | 3 frames × 2 shapes | 0.25 | P3 |
| 3 | Mono, stages 1–6 | **Covered**: pack-v9, 5 × 6 halves and phones, 5 × 5 steps of frames, a front accent from s2, 6 effects | Soft spots only (swamp 1→2 is the smallest step) | — | 0 | — |
| 4 | Two biomes, no dual | Default: two panels plus the pairs-v3.1 road motif at `band.min`. `?pairfull=1`: pairs-v2 panned; panoramas exist for 4 pairs at pair stage 3 (batch 2 adds the other 6 at s3) | One place for the pair, at every pair stage. Pair stage 1 (2 lands) is what **every** two-colour game shows first, yet only s3 is painted | 10 pairs × s1, s2 desktop = 20 panoramas | 10.4 | **P1** (if 1.13 is kept) |
| 5 | Two biomes with duals | Default: the motif widens 0.10 → 0.34. 1.13: duals change nothing (they only pull the share toward 0.5) | Keep the dual's visible job: its shared feature (the pairs-v3.1 road or river) drawn over the panorama's transition, widening per dual | none (reuse pairs-v3.1); a client mock | 0 | P2 |
| 6 | Three biomes | Default: 3 panels and 2 motifs. 1.13: the heaviest pair's picture, with the third as a plain panel ("a placeholder") | The pair's place with the third colour as an **element or light** in it (NOTES (b): a river through it, fire, crystals, the sky's colour), never a third tile | **Colour elements**: 5 colours × 2 densities × 2 shapes = 20 transparent pieces | 2.0 | **P1** |
| 6b | — painted triples instead | — | 10 triples × 3 stages as panoramas | 30 desktop + 30 phone | ≈ 23 | P3 |
| 7 | Four-plus colours (folded to three, 1.10) | The folded colour disappears; it only widens its host | The folded colour shows as an element on its host panel | reuses #6's elements | 0 | P2 |
| 8 | Colourless-only half (Saga, Tomb, Wastes, an uncracked fetch) | Nothing (1.11) | The prologue persists until a coloured land arrives; a Saga or artifact appears as a landmark (#19) | reuses #1 and #19 | 0 | P2 |
| 9 | The game going long: 7+ lands of a colour, turn 12+ | Stage 6 frozen from land 6; nothing more changes | The late game carried by **other** axes: the game-arc grade (C2), landmarks, peril. Painted alternative: a stage-7 "apotheosis" | alt: 5 × (desktop + phone) + 10 frames | 0 / alt ≈ 4 | P2 / P3 |
| 10 | Viewer's life ≤ 5 (or poison ≥ 7) | Nothing (the `damagePlayer` flash only) | **Peril** on that half: a storm grade (darker sky, less saturation, colder) plus a per-biome weather veil (sea squall, ash fall, rot fog, dust wind, blight leaves) | 5 biomes × 2 shapes, transparent | 1.0–1.5 | **P1** |
| 11 | Opponent's life ≤ 5 | Nothing | The same on their half. The light on yours stays clear, so the race reads at a glance | shared with #10 | 0 | **P1** |
| 12 | The second or third colour arrives (the moment) | A new panel blooms in and the others shrink over 900 ms. **Under 1.13 the second colour swaps the whole half from the mono picture to the panorama in one cross-fade** | A **weather front**: 3 frames rolling in from the new colour's side in its material (spray, ash, spores, pollen, light), covering the swap | 5 colours × 3 frames × 2 shapes = 30 frames | 1.2 | **P1** (under 1.13), else P2 |
| 13 | A fetch is cracked | The fetch drew nothing; the land fetched plays `landfall` | Fine as is. Optionally a "path opens" one-shot on `sacrificed` | built-in placeholder | 0 | P3 |
| 14 | A land leaves (bounce, destroy, Wasteland) | Growth and frames run backward; the last land of a colour leaves a greyed stage-1 panel (CSS `grayscale(0.85)`) | A `landLost` one-shot (a scar or crack in the biome's material), then today's backward step | 5 effect sprites (or the built-in one) | 0.5 | P3 |
| 15 | Game over, viewer wins | Nothing; the last frame freezes | The winner's half holds its top light and loop and warms ("the morning after"); the loser's withers grey (the existing CSS); one epilogue veil (rays) | 1 veil × 2 shapes | 0.2 | **P1** |
| 16 | Game over, viewer loses / draw | Nothing | The mirror of #15 (ash veil). A draw dims both halves to one grey dusk | 1 veil × 2 shapes | 0.2 | **P1** |
| 17 | Opponent's half vs the viewer's | Identical pictures, upright, mist between; their Thriving choice unknown | **The far country**: their half a step hazier and cooler (atmospheric perspective), one sky hour shared with yours (C1) | grade only | 0 | **P1** |
| 18 | Phone vs desktop | Phone halves, frames, bridges and motifs exist. **Panoramas are desktop only**, and their @2x is a Lanczos upscale, not a detail pass | Phone panoramas composed for depth, not the pan (NOTES (a)); a detail pass on the panoramas' @2x | 10 pairs × 3 stages × phone = 30; @2x detail 30 | 7.5 + 9 | P2 |
| 19 | Landmarks: Urza's Saga, a planeswalker, a big or legendary artifact | Nothing | **Objects in the place**: a tower that grows by Saga chapter, a walker's beacon on the horizon, a monument. Neutral stone and light, so one piece sits on any biome (bridge-style soft alpha) | 5 objects (Saga × 3 chapters, beacon, monument) × 2 shapes | 1.5 | P2 |
| 20 | Whose turn; the phase | Nothing | "The sun is on the active player's side": +5% light on the active half; the end step a touch toward dusk | grade only | 0 | P2 |
| 21 | Board size (creatures in play) | Nothing (only the one-shot on entry) | **Inhabitants**: flocks, herds, lanterns, at 3 densities by creature count | 5 × 3 × 2 shapes = 30 pieces | 3.0 | P3 |
| 22 | The stack, a counter-war | Nothing | A held breath: a slight dim on both halves while a spell waits | grade only | 0 | P3 |
| 23 | Combat across the centre | The `attack` sweep in the attacker's strip | The centre mist band flares in the attacker's colour, the one place both halves touch | grade only | 0 | P3 |

**Gaps: 21 of the 23 rows** (#3 is covered; #13 is fine as is). Of these, **9 are P1**: #1, 4, 6, 10, 11, 12,
15, 16, 17. **9 of the 21 need no new painting** (grades, rules, or reuse).

## C. Linkages

1. **One light, one horizon across both halves.** Rule: the *table's hour* is the highest stage
   either player has reached (the ladder's own light). Each panel on both halves is graded
   **partway** toward that hour, capped at about 35%, so a stage keeps its identity (ART-DIRECTION
   §2.1). Both halves already put the horizon at ~57%. The mist band takes the hour's colour, so
   the centre line reads as one atmosphere. Cost: 0 GPU. Fit a per-channel curve for each
   (own stage → hour) pair by histogram-matching the sky bands of the six stage pictures; that is
   CPU work in minutes.
2. **Time of day by turn and life, as a tint pass.** Because the land count already owns the
   hour, the turn should drive a **game arc** rather than a clock:
   - opening (rounds 1–3): cool and clean;
   - midgame (4–8): neutral;
   - late (9+): warmer, longer shadows, more contrast;
   - peril (any life ≤ 5) and end (`gameOver`): as in #10 and #15–16.

   That makes five grades. *How:* one SVG filter per grade, `feComponentTransfer` with
   `tableValues` (a 1-D LUT per channel, 3 × 17 numbers). Apply it as CSS `filter: url(#grade-late)`
   on the half's picture layer, under the scrim and the cards. Add a `soft-light` gradient for the
   sky's darkening, and cross-fade between grades over `growth.seconds`. A true 3-D LUT would need
   a canvas/WebGL pass; start with per-channel curves. Under reduced motion the grade changes
   at once.
3. **The arrival of a colour as a weather front** (#12). Frames in 1.7's shape, keyed by the
   *arriving* colour, not by the pair: 30 frames serve all twenty arrivals. The same set covers
   the mono → panorama swap under 1.13, which is today's hardest cut.
4. **Prologue and ending frames** (#1, #2, #15, #16). The game gets a first and a last picture: one
   prologue painting, two veils, and the existing wither. That is under 1 GPU-h for the whole arc.
5. **Landmarks** (#19). New permanents become places in the land: a Saga's tower grows by
   chapter, a walker stands on the horizon, an artifact becomes a monument. Read from the public
   battlefield; a face-down card is never a landmark.
6. *(Found)* **One element set serves three situations.** The colour elements of #6 are also
   the third colour of a triple, the folded fourth colour (#7), and the minor colour at a small
   share (NOTES rule 5: one land of B is a stream through A). Twenty pieces close three rows.
7. *(Found)* **The opponent as the far country** (#17). Atmospheric perspective makes the two
   halves one view, near and far, instead of two postcards.
8. *(Found)* **The centre band as the place the players meet** (#20, #23). The active player's
   light and attacks flaring across the band link the halves through the game's rhythm.
9. *(Found)* **The dual keeps a job under 1.13** (#5). The pairs-v3.1 roads, laid over the
   panorama's transition, still widen per dual.

Spec and process notes:

- Every overlay above is a new kind of full-area piece. Spec 1.4 allows **one** per stage, and
  corner and edge accents are retired (ART-DIRECTION §0.7), so peril, elements, landmarks and
  inhabitants need an additive spec field.
- Every grade is an art change under ART-DIRECTION §0.3: a note first, and a PC re-screenshot
  before anything merges.

## D. Proposed batches

**Batch 3, "the whole game, once through" (~10 GPU-h)**

| Item | GPU-h |
|---|---|
| Prologue (#1) | 0.6 |
| Mulligan frames (#2) | 0.25 |
| Peril veils (#10–11) | 1.5 |
| Colour elements (#6–7) | 2.0 |
| Weather fronts (#12) | 1.2 |
| Win/loss veils (#15–16) | 0.4 |
| Panorama s1 and s2 for batch 1's four pairs (#4) | 4.2 |
| **Total** | **~10.2** |

The four batch-1 pairs then grow s1 → s3 under 1.13. The client side is a flagged mock of the five
grades (C1, C2, #17, #20) and the #ambience sliders for life, turn and game over.

*Justin judges:* one sheet that plays a game from the prologue to the epilogue:
- the first land;
- a pair growing through its three stages;
- a third colour arriving as a front and settling as an element;
- a half at 3 life;
- the win and the loss.

Two questions for him: does the shared hour keep each stage's own light (C1), and do the
elements read as their colour at board size on a phone?

**Batch 4, "finish what batch 3 confirms" (~14 GPU-h)**

| Item | GPU-h |
|---|---|
| Panorama s1 and s2 for the other six pairs (#4) | 6.2 |
| Phone panoramas at s1–s2 for all ten pairs (#18) | 5.0 |
| Landmarks (#19) | 1.5 |
| Panorama stage frames, desktop, 10 pairs × 2 steps × 2 | ~1.0 |
| **Total** | **~13.7** |

*Justin judges:*
- all ten pairs at every stage, desktop and phone;
- a Saga or planeswalker game.

That decides whether 1.13 becomes a version.

Left for later, by the matrix: painted triples (#6b, ~23 h), inhabitants (#21, 3 h), stage-7
apotheosis (#9, ~4 h), phone s3 and @2x detail for the panoramas (~11.5 h), and `landLost` art
(#14).
