# WORLD.md: the art bible for ForgeCoach's board scenery (draft 1)

Written 2026-10-22 for the concept stage. Nothing here is a decision; every rule is a proposal for Justin to keep,
change or throw out. Read beside `COVERAGE.md` (the 23 situations), `land-art-reference/NOTES.md` (the five rules),
`LIGHT.md` (the hours) and the storyboard (`STORYBOARD.md`, `sheets/storyboard.jpg`).

## 1. What the table is

**The table is one world, seen as two places that face each other across the centre mist.**
- Your half is your country, seen from your own edge of the table looking toward the middle.
- The opponent's half is their country, seen from their edge. It is drawn upright, so on your screen it reads as
  the **far country**: the land across the valley, a step hazier and cooler than yours.
- The centre mist is the valley floor between the two. It is the only place both halves touch, so it is where
  shared things happen: the hour's colour, an attack's flare.

**A game is one day in that world.** It starts before dawn with nothing named, and it ends at night or at a
clearing. The lands are what make the place; everything else that happens in the game (combat, life, the end)
is weather and light passing over it.

## 2. The vocabulary: what each colour does to a place

Every colour has three jobs:
- a **ground**: what you stand on when it is your main colour;
- an **element**: what it adds to someone else's place when it is a minor colour;
- a **weather**: how it arrives, and how it reads in the sky.

| Colour | Ground (the biome) | Element (as a minor colour) | Weather (the arrival, the front) |
|---|---|---|---|
| **White** (plains) | open grass and pale stone under a big sky | light: rays, a halo, a lit path, pale stone | a wall of light and glittering dust rolling in |
| **Blue** (island) | sea, shore, ice | water: a river, a channel, frost, sea fog on the horizon | sea fog and spray, cold air |
| **Black** (swamp) | fen, bog, dead wood | rot: a black channel, dead trees, dark standing water | low fog that crawls along the ground, a sick moon |
| **Red** (mountain) | rock, peaks, lava | fire and stone: ember seams, red outcrops, a smoke column | ash fall and heat haze |
| **Green** (forest) | trees and their floor | growth: lone great trees, vines, moss over stone | pollen and spores drifting, a warm humid haze |
| *Colourless* | none: the **prologue land** (§6) | a **monument**: an obelisk, a tower, a road | none |

## 3. Growth: arrival, settlement, full

The ladder already exists (pack-v9: six stages per biome; panoramas-v1: three pair stages). In the concept
it has three movements:
- **Arrival (stage 1, one or two lands).** The place is named. It is calm and readable, but still a finished
  painting ("not so bare that it's ugly").
- **Settlement (the middle stages).** The ground wakes: water, stone, grass and trees take their full colour.
  The pair panoramas pan toward whichever colour has more lands.
- **Full (the top stage).** The sky opens: aurora, fire, glowing canopy, the pair's dusk or night. A board with
  six lands is a reward, as ART-DIRECTION §1 says.

Growth is the one axis that is already painted. It tells you how much mana a player has.

## 4. How a second and a third colour enter a place

The five land-art rules apply to every arrival:
1. One colour is the ground; the other is a feature, an element or the horizon. Never a 50/50 split.
2. Paint one real place where both belong (tundra, taiga, badlands), not two places side by side.
3. Split in depth and altitude, at a natural edge (a shore, a treeline, a cliff foot).
4. One light and one atmosphere bind both.
5. The minor colour interleaves as an element, not a block.

In game terms:
- **The second colour arrives as a front** (storyboard B04). It rolls in from its side of the pair picture in
  its own weather: a wall of light, sea fog, ash, spores or ground fog. Behind the front the half is the pair's
  place. The front is the transition; it hides the hard cut from the mono picture to the panorama.
- **A dual brings two colours at once.** With no front, the land itself is the arrival. Storyboard B05 shows the
  case: a cracked fetch's road opens into Plateau.
- **The third colour arrives as an element**, never as a third tile (B08): a river through the mesas, sea fog on
  the horizon, then frost as it grows (B09). It takes no territory; it changes the place.
- **The fourth and fifth fold into elements too** (situation S02).

Open question: does a place ever change identity mid-game? Under the 1.13 draft, Evan's Island would re-key his
half from Plateau to Tundra, because island+plains became the heavier pair. The concept says no (§9, Q1).

## 5. Time: the game arc

Two clocks run, and they must not fight:
- **The stage owns the painting's hour.** Stage 1 is dawn, the middle stages are day, and the top stage is dusk
  or night (LIGHT.md). That is already painted and stays.
- **The game owns a grade over it.** It is a tint at a third of full strength or less, so each stage keeps its own
  light:
  - **opening**: cool and clean;
  - **midgame**: neutral;
  - **late**: warm, with longer shadows;
  - **peril**: when a player is low, a storm over their half only (darker, desaturated, colder, with rain or sleet);
  - **the end**: night or clearing (§6).

The storm is per half, and that is what makes it legible: the race reads at a glance, because one sky is breaking
and the other is clear (B10, E04).

## 6. The prologue and the ending

- **The prologue** is the empty table: one unformed land at first light. It is pale stone and bleached grass under
  mist, with a few standing stones and no colour (B00).
  - Both halves share it: the same painting, mirrored on the far side.
  - A mulligan stirs the mist over that half (B01).
  - The first land burns the mist off its own biome (B02).
  - A colourless land leaves the prologue in place and stands a monument in it (S01).
  - A fetch is a road into the mist with its two colours glowing at the far end (B03).
- **The ending**:
  - The **winner's half** clears into the morning after: a sunrise over their top stage, warm and still (B11).
  - The **loser's half** falls to night and ash, then withers grey (the existing CSS).
  - A **draw** dims both halves to one grey dusk (S08).
  - The scene no longer just freezes; the day has a last picture.

## 7. Events, if they are ever shown

The scenery is behind the cards and never competes with them. Events are weather, not animation:
- **Combat:** the attacker's ground throws up dust and sparks toward the centre, and the mist band flares in the
  attacker's colours (B07). The band is the one place the two halves meet.
- **Damage to a player:** the existing flash, plus the storm when the total goes low.
- **The stack:** a held breath, both halves dimming a little while a spell waits (S13).
- **A land leaving:** a scar in that biome's material, then today's backward step (S07).
- **Landmarks:** a Saga, a planeswalker or a big artifact is an object in the place, painted in neutral stone so
  it sits on any biome (S10).
- **Creatures:** herds and flocks, by count (S12).

## 8. The opponent's half

It is the same world seen from the other side, through the same reads as yours (their public battlefield only).
- It is drawn upright and a step hazier and cooler (atmospheric perspective). Both halves share one sky hour and
  one horizon (the cloud's C1 pass), so the board is one view, near and far, not two postcards.
- When both players share a pair, the two halves are the same kind of place, as in the friend game, where both
  were Plateau's mesa country (B05). Seen from Evan's chair (E01–E05), Justin's half is the far one.

## 9. Phone and desktop

- **Desktop** shows lateral travel: the 16:5 panorama pans toward the heavier colour.
- **Phone** shows depth: a tall picture with ground at the bottom and backdrop at the top. It gets the same
  grades, the same mist and the same storm (S09).
- On a phone the weather carries more of the story than the panning, because a phone half is too narrow to pan.

## 10. How it feels as a game

The beats a player should notice, in order, from turn 0 to the end. For each one: what the current packs deliver
(pack-v9, panoramas-v1, the 1.13 draft), and what they do not.

| # | Beat | Should feel like | Delivered today? |
|---|---|---|---|
| 1 | Sitting down | a quiet, unnamed land: something is about to happen | **No**: the board is empty until a land arrives |
| 2 | Mulligan | the mist stirring: a fresh start | **No** |
| 3 | First land | the mist burns off; *your* place is named | **Partly**: the mono stage 1 appears, but out of nothing |
| 4 | The opponent's first land | a far country appears across the valley | **Partly**: same pictures; no far-country haze yet (C1/#17, the cloud's light pass) |
| 5 | Second colour | weather rolls in; the place becomes a pair | **Partly**: panoramas exist for all ten pairs × three stages; the swap is a cross-fade, not a front |
| 6 | Growing | each stage is a step you can name from a thumbnail | **Yes**: the strongest axis (pack-v9, panoramas-v1) |
| 7 | A fetch, a colourless land | the road into the mist; a monument | **No**: 1.11 draws nothing, which is honest but blank |
| 8 | Third colour | the place changes without breaking | **No**: 1.13 shows a third panel (or re-keys the place) |
| 9 | Combat | the halves touch: the valley lights up | **Partly**: a one-shot sweep in the strip; nothing at the centre |
| 10 | The middle of the game | the day moving on: afternoon, then evening | **Only by lands**: the stage ladder moves the hour, the turn does not |
| 11 | Someone is losing | a storm over their ground; the other sky clear | **No**: the life total has no picture |
| 12 | The long game | the night deepening, watchfires, the stars | **No**: stage 6 freezes |
| 13 | The end | a last picture: clearing for the winner, night for the loser | **No**: the scene freezes |

**What already feels like a game:** beats 3, 5 and 6. Lands make a place that grows and pans, and the
panoramas have made the two-colour place feel like one location.

**What does not:** the frame of the game (beats 1, 2, 13), its tension (beat 11) and its rhythm (beats 9, 10).
These are exactly the beats the brief's grades and veils would add, and most of them cost no GPU (COVERAGE
§B: nine rows of 21 need no painting). The friend game shows the size of the gap. Its biggest swing, 15 → 6 at
turn 13, would draw nothing at all, even under the proposed ≤ 5 storm.
