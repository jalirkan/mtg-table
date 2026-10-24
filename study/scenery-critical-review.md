# Scenery: a critical review before anything else ships (2026-10-24, the PC session)

Justin asked for a critical look at the whole scenery stack, not a momentum check, before the pack-v9.2
default flip (ForgeCoach #197) or the whole-half flip. This is that review: the live site
(011dffa9 = #196, pack-v9.2 + pairs-v4, `?pairfull=1`, judged state by state at desktop and phone
widths in the browser), the finished sheets, and an independent read-only code review of the merged
ForgeCoach scenery code (1.13–1.15, #191–#197) by a forked reviewer.

## Verdict

**Do not flip either default yet.** Neither the pack flip (#197) nor the whole-half flip is clean:

- The pack flip is safe as a *load* (the manifest validates, the two-colour board is unchanged) but it
  ships three visible faults: the veils and fronts draw UNDER the foreground accent layer, the fronts
  often never play at all, and both halves show one identical empty table.
- The whole-half flip is not safe: with four or five colours the half is panned by a colour that is not
  on screen, the strip and the pieces disagree about which pair is showing, the element silently does
  not draw while the caption says it does, and the panorama path has no load gate or fallback.

## What is good, and stays

- The whole-half panoramas themselves (ten pairs × three stages, desktop and phone): painted, one place
  per pair, the transition legible, the pan by land share works for two colours. This is the direction
  Justin chose and it holds up live.
- The empty table: the strongest picture in the set; reads at both shapes.
- The won / lost veils as pictures: quiet, effective grades.
- Blue's and white's fronts as pictures.
- The mono ladder (pack-v8's pictures) is unchanged and still works.

## Code faults (the reviewer's, confirmed live where marked)

| # | Severity | Fault | Where | What the player sees |
|---|---|---|---|---|
| 1 | HIGH | Four/five colours: `foldPanels` adds the dropped colour's land weight to the nearest kept panel, so the pair is panned by a colour not on screen (confirmed live: one Mountain + one Swamp panned 33/67). `planHalf` (pieces) ranks the UNFOLDED makeup, so strip and pieces choose different pairs; `ScenePieces` draws the element only when both agree → **no element, caption lies** (confirmed live). A test pins the folded weight as intended. | layout.ts:184–215, pairfull.ts, pieces.ts, ScenePieces.tsx:135, pairfull.test.ts:116 | Wrong picture pan, missing element, a caption promising it |
| 2 | MEDIUM | Pieces (veils, fronts, elements) paint at z −3, UNDER the full-area accents at z −2, which every biome has from stage 2 up. | scenery.css:775 vs :927 | A "lost" veil darkens the land while the foreground plants stay bright |
| 3 | MEDIUM | Fronts play only if every frame is decoded at the moment of change; frames are warmed by `innerWidth < 700` but picked by `narrow || box.w/box.h < 1.6` → a tall desktop half warms the wrong set and never plays a front; on a cold CDN the first front is skipped. | ScenePieces.tsx (`frontFrames`, `useTween`), manifest.ts `pieceUrls` | Nothing happens when a colour arrives, no error |
| 4 | MEDIUM | Elements are never warmed and have no load gate (they pop in after the fade); the panorama has no `onError` / `onReady` and is never warmed by `pairPictures`. | ScenePieces.tsx, pairs.ts:584 | A blank half until the panorama arrives, or for good |
| 5 | MEDIUM | No code grades a piece to the base picture's `light.json` key/hour (SYSTEM.md A5). | — | The neutral-lit cut-outs Justin saw are the whole story |
| 6 | MEDIUM | `pieces.empty` is one 16:5 picture: both halves show the identical empty table (B8 asked for 1.6× so each half has its own window). | — | The first impression of every game is a mirror |
| 7–11 | LOW | A false 50 MB warning on the next pairs tag; pieces fade at the 16% default (the mist variable is on a sibling); mirroring flips the whole painting so the two halves' light can come from opposite sides; a veil unmounts abruptly on a replay scrub; landmarks use the mono panels' horizon; the 15 s preload covers stage-1 layers only. | pairs.ts:337, scenery.css, pairfull art, … | |

Untested anywhere: the strip/pieces agreement on the pair (the HIGH), that a front plays on a real
board, and anything in the DOM (z-order, fallbacks, mirrored light). There are no component tests and
the e2e suite does not cover scenery.

## Art faults (from the finished sheet and the live page)

- **Elements** are the weak layer and have the fault Justin has called out before: things that sit on a
  painting rather than in it. They are painted in neutral light with no contact shadow; red's crag has a
  hard edge and its own lighting; green's trees are the wrong scale (model trees); black nearly vanishes
  on dark grounds; white's path is faint. Blue's river and black's channel are the two that belong to
  their ground. Code fault 5 means even a well-lit cut-out would not be graded to its scene.
- **Fronts:** green's first frame is a glowing ringed oval; red's is unpainted; black's reads low on dusk
  scenes. Motion cannot be judged from stills, and code fault 3 means the fronts have not actually been
  seen playing on a board.
- **The empty table** is identical on both halves (fault 6).
- **Style seam:** the mono ladder (pack-v5–v8, partly photographic foregrounds such as island stage 6's
  starfish beach) and the painted panoramas differ in hand; a player going from six Islands to a pair
  sees the style change.
- **Phone:** elements read small against the phone half's deep ground; blue's front is a narrow column.

## How this got through

The cloud merged its own scenery code on green unit tests and a green e2e suite that does not cover
scenery; nobody drove the four-colour case or watched a front play. The pieces lane composited elements
in Python instead of seeing them drawn on the board, because the board could not draw them yet. The PC
recommended the flip on the strength of the sheets and the demo page's two- and three-colour cases
without the four-colour one. All three are process faults, not art faults.

## Order of work (the PC's, no decision needed from Justin)

1. Fix the HIGH: one makeup rule shared by the strip and the pieces (SYSTEM.md step 6: the dropped
   colours show nothing, the heaviest pair by UNFOLDED weight, ties by what is showing then arrival),
   pan by the pair's own two weights, and replace the test that pins the leak. Component tests for the
   agreement and for the four- and five-colour cases.
2. Fix 2 (z-order: pieces above the full-area accents, below the cards and the strip), 3 (fronts: one
   shape rule for warming and picking, play when ready rather than never) and 4 (a load gate and a
   fallback for the panorama; warm elements and panoramas). Then a real front has been seen playing.
3. Only then the pack flip, with green's first frame cut.
4. The elements' second pass (scene-graded light in the client from `light.json`, a contact shadow,
   green's scale, red's edge, black's lift) and red's front; the empty table painted 1.6× so each half
   has its own window. Then the whole-half flip is judged again, live, at four colours.
