# Art brief addendum: board accents (scenery spec 1.3)

For the local art session. The contract is `docs/scenery-pack-spec.md` in
ForgeCoach (§2 *Board accents*, §3 budgets); this note is the short version.
Branch `c/scenery-overlay`, PR #59, merged to ForgeCoach main as f36a195 (live on Pages after the deploy); still `schema: 1`, so add
`"spec": "1.3"` to `scenery.json`. Packs written for 1.2 keep working unchanged.

## What accents are

Still pictures that reach out of the scenery strip onto the player's area
itself, like a board frame in Hearthstone or Runeterra: vines creeping along
the edges of a player's area as their mana grows; ash, moss, sea spray or
petals for the other colours. They grow with the biome's stages.

They are always drawn **beneath** the cards, labels, action bar and dialogs,
never take clicks, and are clipped to the player's area. Even so, keep them
at the rim: cards sit over the middle.

## Where they go in `scenery.json`

Per biome, per stage, next to `layers`:

```json
"forest": {
  "stages": [
    { "layers": [ … ], "overlay": [ { "id": "vine-bl", "anchor": "bottom-left", "src": "forest/ov-vine-bl.webp", "src2x": "forest/ov-vine-bl@2x.webp", "size": 0.14, "maxPx": 200, "motion": "sway", "bytes": 380000 } ] },
    { "layers": [ … ], "overlayMode": "add", "overlay": [ { "id": "vine-br", "anchor": "bottom-right", "src": "forest/ov-vine-br.webp", "bytes": 360000 } ] }
  ]
}
```

A biome may have accents and no strip art: give every stage an `overlay` and
no `layers`, and the strip keeps the built-in scene.

### Stage fields

| Field | Values | Default | Meaning |
| --- | --- | --- | --- |
| `overlay` | list of pieces | (inherit) | Left out: the previous stage's pieces carry on unchanged. |
| `overlayMode` | `replace` \| `add` | `replace` | `replace`: the list is the stage's complete set (`[]` clears). `add`: added to the previous stage's; a piece with an `id` already there replaces it in place. |

### Piece fields (exact names)

| Field | Values | Default | Meaning |
| --- | --- | --- | --- |
| `id` | `[A-Za-z0-9][\w.-]*`, ≤ 40 chars | required | Unique within the stage. Same `id` and anchor in the next stage: the piece stays put; a new one fades in. |
| `anchor` | `top-left` `top-right` `bottom-left` `bottom-right` `top-edge` `bottom-edge` `left-edge` `right-edge` | required | Unknown anchor: the piece is dropped, with a warning. |
| `src` | `.webp` or `.avif` | required | A transparent still. PNG, GIF, SVG, video and sprite sheets are refused. |
| `src2x` | `.webp` or `.avif` | none | The 2x file. |
| `size` | 0.02–1 | corners 0.18, edges 0.05 | A fraction of the player area's **width**: a corner's box width, or an edge band's thickness. |
| `maxPx` | 16–1024 | corners 280, edges 72 | A pixel cap on that width or thickness. |
| `tile` | `repeat` \| `stretch` | `repeat` | Edges only. `repeat` tiles along the edge at the band's thickness (art must be seamless); `stretch` fits the whole edge. |
| `opacity` | 0–1 | 1 | |
| `blend` | `normal` `screen` `multiply` `overlay` `lighten` `darken` `soft-light` `color-dodge` `plus-lighter` | `normal` | |
| `motion` | `none` \| `sway` \| `drift` \| `breathe` | `none` | CSS only. `sway` turns ±1.2° about the corner, `drift` shifts ±1.5%, `breathe` grows 3.5%. |
| `periodMs` | 2000–60000 | 9000 | One swing (it alternates). |
| `mirror` | `true` \| `false` | `true` | On the opponent's side: top and bottom swap and the picture flips vertically, so it hugs their outer edge. |
| `bytes` | whole number | none | The piece's file sizes, for the budget. |

## Draw for your own side

Draw every piece for the **viewer's** side, where the player's outer edge (and
the strip) is the **bottom** of their area. ForgeCoach mirrors it for the
opponent (vines hang from the top corners on their side). Left and right
never swap: draw a separate picture for `bottom-left` and `bottom-right`.

## Several biomes

When a player has several biomes, the accents follow the strip's slots: the
left corners and `left-edge` from the leftmost slot's biome, the right corners
and `right-edge` from the rightmost, `top-edge` and `bottom-edge` from the
biome with the most lands. So give **every** biome pieces for both bottom
corners and the bottom edge; the slots pick which show.

## Asset shapes

| Piece | Size | Notes |
| --- | --- | --- |
| Corners | about **1024 × 1024**, transparent WebP (quality 80–85) or AVIF | Subject pushed into its corner (bottom-left for `bottom-left`), fading to nothing toward the opposite corner, no hard edge where the picture ends. Shown ≤ 280 px wide by default, so 1024 covers 2x. Optional `@2x` is rarely needed. |
| Top / bottom edges | about **2048 × 256** | Ground at the bottom. Seamless left to right if `tile: "repeat"`. |
| Left / right edges | about **256 × 2048** | Root at the outer side. Seamless top to bottom if tiled. |

Naming: `<biome>/ov-<what>.webp`, e.g. `forest/ov-vine-bl.webp`,
`island/ov-spray-edge.webp`.

## Budgets

- **≤ 2 MB of accent files per biome** (declare `bytes`; a warning past it). This is separate from the scenery's 6 MB and the effects' 4 MB; the whole pack stays ≤ 30 MB.
- **≤ 6 pieces per stage**, and on the board ≤ 6 per player area across biomes (extras dropped).
- **≤ 3 moving pieces per stage** (`motion` other than `none`; the rest are drawn still).
- CSS motion on a still is **not** one of the strip's 2 moving layers (those are decoded video and sprite sheets).

## Rendering rules to design for

- Under **600 px** of area width (phones), only corners show, at most **88 px**, still. Under 300 px, none. Corners must read small.
- Reduced motion: everything still. Accents are off whenever the scenery is off, and have their own switch (Settings → Board accents, on by default).
- Low contrast, mostly at the rim. They frame the area; they are not a picture in it.

## Art direction per colour (suggestions)

- **Forest:** vines and leaves creeping in from the corners, thicker each stage; a leaf band along the bottom edge from stage 3.
- **Island:** frost crystals and sea spray, cool and pale (`screen` blends well).
- **Mountain:** drifting ash and a few embers, warm-dark.
- **Swamp:** moss and hanging strands, low mist along the edge.
- **Plains:** petals and light motes, warm and pale.
- **Wastes:** fine dust, almost nothing.

Stage 1 is a hint; the last stage is the richest frame, still quiet.

## Test locally

1. Serve the pack folder with CORS:
   `npx http-server ./pack --cors -p 8650 -c-1`
2. Open `#ambience?scenery=http://127.0.0.1:8650/` (e.g. `https://jalirkan.github.io/ForgeCoach/#ambience?scenery=http://127.0.0.1:8650/`, or `http://localhost:5173/#ambience?scenery=http://127.0.0.1:8650/` from `npm run dev`). Accept the browser's local network access prompt if it asks.
3. The pack status lists warnings with field paths. **Check a manifest by pasting it** validates as you type and lists each biome's accent pieces per stage and declared MB.
4. Play lands for either side, drag **Stage**, and toggle **View → Board accents**. Narrow the window under 600 px to check the corners-only phone view.
5. On a board: `?scenery=http://127.0.0.1:8650/` on any ForgeCoach URL, e.g. the replay `#sample=human-auto-42`. `?accents=off` hides the accents for one page load.

## Rules

- **Original art only.** Your own work, or generated or rendered from your own prompts and scenes. No card art, set symbols, logos, named planes or characters, and no imitation of a recognisable artist.
- **No text, faces of real people, or symbols** in the art.
- **Packs are never committed** to ForgeCoach, never uploaded, never put in a published URL; serve them from `127.0.0.1`.
- **The lab comes first.** Accents are polish: the PC's lab runs (the runner, the ladder) take priority for the machine's time and GPU. Render accents when the lab is idle, and never pause or slow a lab run for them.
