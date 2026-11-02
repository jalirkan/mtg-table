# SYSTEM.md: the scenery system, and the slots the art batches fill

Written 2026-10-22. This is the spec the next art batches are cut against. Nothing here is painted, and no ForgeCoach
file is touched. It turns Justin's statement of the system into rules, and settles the concept bible's open questions
(`concept-v1/CONCEPT-NOTES.md` §3) as defaults.

> "we have a set of scenarios that are possible. The main ones are basic lands, and we want to have images that can
> match whatever the basic land situation is. And then we also have unique lands, and we have combos of lands. So in my
> mind, we want to build images and have a system for that. Ideally, the unique cards, maybe down the road, some of the
> unique cards we can mimic the spirit of and kind of capture some of the aesthetic without just stealing the art."
> (Justin, 2026-10-22)

**The four defaults.** Justin did not object to the PC's translation of the bible's questions, so these are now the defaults:

1. **Two landscapes, stacked.** Each player's land situation gets its own landscape. The two are stacked with matched
   light so they do not clash. They are never one continuous valley.
2. **The picture matches the combination on the board now.**
   - The heaviest pair names the base picture.
   - A third colour is an element inside that picture.
   - A transition plays whenever the combination changes.
3. **Light stays inside the land pictures**, as it is today. A grade by turn or life is an optional later layer and
   is not part of this system.
4. **A unique land is a landmark** added to the base picture. It captures the spirit of the card's art, never the art
   itself. A fetch or utility land changes nothing. Triples are elements, not separate paintings.

Read with: `COVERAGE.md` (the situations), `land-art-reference/NOTES.md` (the five rules), `LIGHT.md` / `light.json`
(each picture's hour and horizon), ForgeCoach `docs/scenery-pack-spec.md` 1.5–1.12 on `test-main` (`d571c00`) plus the
1.13 draft on `pc/scenery-panoramas`.

## A. Inputs → picture

The input is one player's lands: the viewing seat's redacted battlefield, nothing else. The output is the picture
on that player's half. The steps run in order, and the first one that matches decides the picture.

**What counts** is spec 1.11, `src/ambience/model.ts` `landBiomes`, unchanged:

| The land | Counts as |
|---|---|
| Basic, snow basic, an MDFC's land face | 1 to its colour |
| Dual with two basic types (the originals, the shocks, the surveil lands, Hedge Maze) and every typeless two-colour land (painlands, checklands, bouncelands, gainlands, temples, filters, the Restless lands, Horizon Canopy) | **both colours**, ½ each |
| Pathway | the face in play only: 1 to that colour |
| Thriving land | its fixed colour; for your own, ½ fixed / ½ chosen once you have chosen |
| Triome, Seaside Citadel | ⅓ to each of its three |
| Fetch land, colourless utility, Mishra's Factory, Mutavault, Urza's Saga, any-colour land, Wastes, no card data yet | **nothing**. A fetch's slot goes to the land it fetches |

**The decision list:**

1. **Count by colour.** Sum each colour's weight. The colours whose weight is above zero, with their weights and
   the order they arrived, are the **makeup**. A land's weight is the same in every row below, so the half's total
   weight equals its number of coloured lands.
2. **No colour → the empty table** (prologue, B8). This covers the start of the game, and a half that holds only
   fetches, utility or any-colour lands.
3. **One colour → its mono picture** (B1). The stage comes from the colour's weight on the pack's thresholds:
   1 land is stage 1, and so on up to 6+ lands at stage 6. Between thresholds the next stage fades in by the
   progress (1.6).
4. **Two colours → the pair picture** (B3).
   - **Stage** comes from the total: 1–2 lands is pair stage 1, 3–4 is stage 2, 5+ is stage 3. A lone dual shows
     stage 1.
   - **Pan**: `split` is the left colour's share of the pair, clamped to 0.2–0.8. It pans the 1.6× picture so that
     the transition sits at `split`. This is the 1.13 draft's `pairFullFrame`.
   - **Mirror** the picture when the board's order is the reverse of the pair key.
5. **Three colours → the heaviest pair's picture, plus the third colour's element** (B5).
   - The heaviest pair is the two colours with the most weight. On a tie, the pair already showing stays. Failing
     that, the colours that arrived first win.
     *(amended 2026-11-02: the pair is kept as the base. The pair showing stays while both its colours remain among
     the three heaviest by weight -- fewer than three colours strictly outweigh each, so a tie at the edge of the top
     three is not leaving it. It changes only when one of its colours leaves the top three, and then to the heaviest
     pair among the top three, with the tie rule above. The first pair, with nothing showing, is still the heaviest.
     So a third colour may outweigh the pair; it is then the element, fully in. Seen on the storyboard: Island, Swamp,
     Mountain, Mountain redrew the swamp half as desert, and W U B R G twice then Forest, Island brought three
     unrelated landscapes in three lands; both now keep their first pair. ForgeCoach spec 1.19 b.)*
   - The pair's own two weights set the pan.
   - **Stage** counts every coloured land on the half, so a growing third colour still grows the place.
   - The element sits over the picture, on the heavier colour's ground and clear of the transition. It fades in
     with the third colour's share and is graded to the base picture's `light.json` key.
     *(amended 2026-11-02: where the picture shown has the third colour painted in, that picture; else its cut-out
     element -- on a seam cell too, and on a phone its phone piece; else its own panel beside the pair. Never
     nothing. "Clear of the transition" is the seam core: 0.07 of the picture's drawn width either side of it.
     ForgeCoach spec 1.19 a.)*
6. **Four or five colours → fold to three.** Keep the three heaviest (ties broken as in step 5), then run step 5.
   The other colours show nothing. One element at a time.
   *(amended 2026-11-02: every colour visible -- no fold. The pair and the third are drawn as step 5 says, and
   EVERY further colour is drawn as its cut-out element, stacked on the pair's grounds: the heavier pair colour's
   ground first, then the lighter's, in weight order -- the heavier ground holds two (the third, painted in or cut
   out, and the fourth) side by side, the heaviest at the half's outer edge; the lighter ground holds the fifth.
   Each fades by its share (n × its weight over every coloured land, at most 1, n the colours on the half: three
   colours give step 5's "an equal third is fully in"), none on the seam core, on a phone its phone piece. The
   further colours still weigh nothing in the pair, the pan or a panel; their lands still count in the stage. The
   caption names every element. Without the pair picture (the board's panels) the three kept colours keep their
   panels and the rest stand on the pair's panels the same way. ForgeCoach spec 1.19 a.)*
7. **A landmark land → its landmark on top** (B6) of whatever steps 2–6 drew, the empty table included.
   - It does not change the makeup.
   - One per card name; a second copy adds nothing.
   - At most two per half, the earliest two.
8. **Transitions.** Compare the makeup and stage with the last state:
   - **Same makeup, new stage** → the stage frames. For mono that is 1.7 (B2). For pairs it is B4 when that exists,
     and the 1.6 cross-fade until then.
   - **New makeup** → the arriving colour's front (B7). A colour leaving plays its front backwards. A re-key (a
     new heaviest pair) is a new makeup.
   - **Empty table → first picture** → the mist burns off: the prologue dissolves.
   - **A stage step and a makeup change at once** (a dual brings two colours) → one transition, the makeup's.
   *(amended 2026-11-02: ForgeCoach's default pack is pack-v9.2, which carries batch 3's pieces -- five elements
   with phone pieces, the W/U/B/G fronts, both veils and the empty table -- so steps 2, 5–8 draw them on every board,
   with the whole-half flag and without. ForgeCoach spec 1.19 d.)*
9. **Compose the two halves.** Each player's picture fills their own half. The opponent's is on top, upright: the
   far country. Matching the light is client work and costs no GPU:
   - The far half is hazed about 22% toward the centre mist, at contrast 0.86. This is concept-v1's `compose.py`.
   - Both halves are pulled at most 35% toward one table hour: the later of the two pictures' own `light.json`
     hours. This is a pull between the pictures, not a game grade. Each picture keeps its own hour, so a dawn half
     never sits raw against a night half.

**Worked example: Evan's half in the friend game (2026-10-17)**

| Turn | Lands | Makeup (weights) | Shows | Transition |
|---|---|---|---|---|
| T2 | Arid Mesa | none | empty table | — |
| T3 end | Mesa cracked → Plateau | R ½, W ½ | mountain+plains s1, split 0.5 | mist dissolve |
| T4 | + Plains | R ½, W 1½ | mountain+plains s1, panned to the plains (0.25) | — |
| T8 | + Island | W 1½, U 1, R ½ | **island+plains** s2 (re-keyed: 2.5 outweighs 2.0) + red's fire element | blue's front |
| T10 | + Tundra | W 2, U 1½, R ½ | island+plains s2 (4 lands), the pan eased toward the island (plains 0.60 → 0.57), + fire | — (the pan moves) |

*(amended 2026-11-02, the pair kept as the base (step 5): at T8 the red is still among the three heaviest, so
mountain+plains stays at s2 with blue's element on the plains' ground (fully in) and blue's front plays; at T10 the
pan moves further to the plains (mountain 0.25 → 0.20) and the island stays the element, fully in. ForgeCoach spec
1.19 b; its `pieces.test.ts` plays this table.)*

## B. The slot table

A slot is one picture the system can ask for. "Shapes" means desktop (16:5 half or 1.6× panorama) and phone (4:5, or
1.28:1 for panoramas), each with @2x where the pack has it. GPU hours use the measured rates:

- panorama: 2.1 h per four desktop, ≈ 0.52 h each with 3 candidates;
- phone panorama: ≈ 0.25 h;
- transparent piece with candidates: ≈ 0.1 h (seams-v1);
- 1.7 frame: ≈ 0.04 h;
- panorama tween: ≈ 10 steps at 24 s a step for desktop, 13.5 s for phone;
- sketch: ≈ 2 min (concept-v1: 75–90 s wall each).

| # | Slot | What | Status | Slots × shapes = files | GPU-h (sketch + finished) | Pri |
|---|---|---|---|---|---|---|
| B1 | Mono | 5 biomes × 6 stages | **done**: pack-v8 (the same pictures as the live pack-v9) | 30 × 2 = 60 | 0 | — |
| B2 | Mono stage transitions | 5 × 5 steps, 2–3 frames (1.7) | **done**: pack-v7.3, carried into pack-v8 | 25 (58 frames) × 2 = 116 | 0 | — |
| B3 | Pairs | 10 pairs × 3 stages, panoramas | **done, unpublished**: panoramas-v1 (trimmed to 14.6 MB, untagged) | 30 × 2 = 60 | 0 (publishing is CPU) | P1 |
| B4 | Pair stage transitions | 10 × 2 steps, 2 frames | to do (the draft cross-fades) | 20 (40 frames) × 2 = 80 | — + ≈ 4.4 | P2 |
| B5 | Elements | W light (rays, a lit path, pale stone) · U water (a river, frost, sea fog) · B rot (a black channel, dead trees) · R fire (ember seams, red outcrops, a smoke column) · G growth (lone great trees, vines, moss on stone); transparent overlays | to do | 5 × 2 = 10 | 0.3 + 1.0 | **P1** |
| B6 | Landmarks | the three below; transparent objects | to do | 3 × 2 = 6 | 0.2 + 0.6 | P2 |
| B7 | Makeup transitions | a front per arriving colour, in its own weather (a wall of light, sea fog, crawling ground fog, ash fall, pollen), 3 frames | to do | 5 (15 frames) × 2 = 30 | 0.5 + 1.2 | **P1** |
| B8 | The empty table | one unformed land at first light. Painted 1.6× wide so each half shows its own window and the far half is not a mirrored copy | to do (concept sketch J0) | 1 × 2 = 2 | 0.1 + 0.8 | **P1** |
| B9 | The end | a win veil (still, clear air, settling light) and a loss veil (ash and dark over the existing grey wither). A draw dims both halves (client) | to do | 2 × 2 = 4 | 0.1 + 0.4 | **P1** |

**Totals:**

- **121 slots.**
  - **85 done** (B1–B3, 236 files). B3 is unpublished.
  - **36 to do** (B4–B9, 132 files): ≈ 1.2 h of sketches + ≈ 8.4 h finished, ≈ 9.6 GPU-h.
- **Manifest field.** Elements, landmarks, fronts and veils need an additive overlay field in the manifest: spec 1.4
  allows one full-area piece per stage. Writing that field is a ForgeCoach version after 1.13, not this lane.

**The landmarks.** These come from the 124 cards in `seams-v1/lands-audit.csv` (the ten cube documents). A land
earns one if it shows one named place in its art, and the rest of the system does not already say it. Each is painted
from our own words, never from the card image. No reference art is used as a guide (NOTES: the scenery is our own
painting).

| Landmark | Where | Makeup | The spirit, in our words |
|---|---|---|---|
| Seaside Citadel | Counter Blitz (Justin's own deck) | ⅓ G/W/U: a triple | a pale walled keep on a headland, banners, sea light |
| Exotic Orchard | Counter Blitz | nothing (any colour) | a small walled orchard whose trees each bear a different-coloured fruit |
| City of Brass | Peasant cube | nothing (any colour) | brass domes far off on the horizon in heat shimmer |

**No landmark:**

- **Two-colour lands** (35 typed duals, 33 typeless, the 10 Restless lands) *are* the pair picture.
- **Pathways, MDFC faces and snow basics** are their colour's picture.
- **None:**
  - the fetches (12) and the ten Landscapes;
  - colourless utility (Ancient Tomb, Temple of the False God, Forge of Heroes, Nesting Grounds, Hanweir Battlements,
    Ash Barrens);
  - Mishra's Factory, Mutavault and Urza's Saga;
  - Wastes;
  - the Triomes and Thriving lands, which are not in the cubes and would count by 1.11 if they arrive.
- **Closest calls, parked:** the eight Ravnica bouncelands, each a guild building in one cube.

## C. What is not in the system, and why

Each of these is a named layer that can be added later without touching A or B. Each needs Justin's word.

| Layer | What it would be | Why it is parked | Cost |
|---|---|---|---|
| Time of day by turn | the game-arc grade: opening cool, late warm | default 3: the stage owns the hour. The warm grade over-saturated the dusk pictures (B09) | client |
| Life storms | a storm over a low half; a squall on a big loss | the strongest sketch (B10), but it is a teaching call: it says "you are losing" loudly to a learner (E04) | 1–1.5 h veils |
| Combat effects | the centre band flaring, dust | 1.2's attack and damage one-shots stay as they are. Dust in the land fights the cards (B07) | client / painting |
| Turn, stack, mulligan | +5% light, a dim, a mist swirl | they barely read (S11, B01). The UI says them | client |
| Inhabitants, a scar, the long game | herds by creature count; a scar when a land leaves; night past the top stage | they double-count the cards; the scar sketch failed; the top stage holds | 3 h / 0.5 h / 4 h |
| Painted triples, a second element, fetch roads, colourless monuments | 6b's 30 panoramas; S02; B03/S01/S10 | defaults 2 and 4. The WUB test (`panoramas-v1/out/triple/`) stays as a reference for B5, not a slot | ≈ 23 h for triples |
| One valley across both halves | the far half keeps the sky, the near half is ground | default 1: never | — |

## D. The next batches, as slot-filling

Every step runs under `logs/gpu.lock` with the 6 GB gate, as panoramas-v1 did.

**Batch 3: B5 + B8 + B9 + B7.** Sketch quality first, then finished, with Justin judging in between.

| Step | What | GPU-h |
|---|---|---|
| Sketch | 31 desktop sketches at half resolution (14–16 steps): 5 elements × 2 candidates over a stage-2 pair, 2 empty-table candidates, win and loss veils × 2, 5 fronts × 3 frames | ≈ 1.0 |
| Justin judges | one sheet in the storyboard's form: the empty table → first land → a second colour's front → a pair → a third colour's front and its element settling → the end, from both chairs | 0 |
| Finished | elements 10 pieces (1.0), the empty table desktop + phone (0.8), veils 4 pieces (0.4), fronts 30 frames (1.2) | ≈ 3.4 |
| **Batch 3** | | **≈ 4.4** |

**Batch 4: B4 + B6.**

- Pair stage frames: ≈ 4.4 h.
- Landmarks: sketch 0.2 h, finished 0.6 h.
- Total ≈ 5.2 h.

Publishing panoramas-v1 (B3) costs no GPU and waits on Justin's word. When batch 4 is done, all 121 slots are full.
Coding steps A1–A9 is a ForgeCoach lane (1.13's `pairfull.ts` grown into steps 5–9), separate from these batches.

## C. One world: canonical halves and seams (2026-10-24, Justin's rule)

Justin, 2026-10-24: "Going from one island to island and swamp is a huge, jarring transformation … adding a single mana
should not completely redraw the entire landscape. It should evolve it. I like the landscapes we developed. We need to
work on the conceptual aspect, making sure things work logically." Agreed principle, now the rule:

1. **Each colour has one canonical landscape per stage, and it never changes.** The mono pictures (pack-v8's ladder,
   stages 1–6) ARE the canonical landscapes. Six Islands is the island picture at stage 6, whatever else is on the half.
2. **A second colour slides in beside the first; nothing is redrawn.** The pair picture is the first colour's canonical
   half, the second colour's canonical half, and a painted SEAM between them (the transition: a bog creeping into the
   shore, a treeline climbing onto scree). The halves are the mono pictures; only the seam is new paint.
3. **A third colour grows INTO one half** (the heavier colour's ground), as the painted-in elements do today (1.16.1).
4. **One geography, so every seam has one direction.** The land rises from the sea to the mountains, left to right:
   **Island (coast) → Swamp (marsh behind the coast) → Plains (lowland) → Forest (upland) → Mountain (highland).**
   In any pair the colour earlier in this order is the LEFT half. The board mirrors the whole picture for a reversed
   order, as today, so the logic inside a half never changes.
5. **Stages evolve one half at a time.** A half shows its colour's canonical picture at the stage of that colour's own
   land count (mono thresholds); the seam is painted at three pair stages (the mono stages 2 / 4 / 6 on both edges) and
   is chosen by the total, as today's pair stage is. Adding one land changes one half's stage, never the other half.
   *(amended 2026-11-02: no clamp. The seam grid is painted for halves at most one stage apart; until now a pair
   further apart showed the lighter half raised to one stage below the heavier, so one Island beside five Forests was
   drawn at stage 4 and grew with every Forest -- the storyboard's gap 4, against this rule. Now, when the exact
   cell for the two stages is missing, each colour's own mono picture (its half picture at its own stage, the phone
   picture on a phone) is drawn side by side where the cell's halves would be, at the pair's split, joined by the
   plain mist seam, with no band picture; a third colour is its cut-out there (no painted picture exists for that pair
   of stages); the caption says "island s1 | forest s5, no seam cell". A painted cell, when it exists, is always
   preferred, so painting the missing cells later needs no code change. ForgeCoach spec 1.19 c.)*
6. **Light stays inside the pictures.** The halves carry their own hour (light.json); the seam is painted at the later
   of the two hours and the shared horizon (LIGHT.md).
7. **What is kept:** the mono ladder and its 1.7 transition frames unchanged; the pieces (the empty table, the veils,
   the fronts); the painted-in third colours, redone onto the new pair bases once the seams are approved.
8. **What is replaced:** the pairs-v5 whole-place panoramas, by seam compositions. Nothing is unpublished until the
   replacement is judged live.

**The work, in order:** the ten seams sketched between the canonical halves at pair stage 2 (mono stage 4 edges) and
one at pair stage 3, sketch quality, one sheet for Justin → the full seam set (10 pairs × 3 stages, desktop and
phone) → the third colours painted into the new bases → live at two, three and four colours → judged.
