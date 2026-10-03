# Brief for the local session: ForgeCoach board scenery, first biome

You're making art for ForgeCoach's 2D play board. Each player's side of the board has a scenery strip that grows from the lands they play: an island paradise for Islands, misty swamps for Swamps, and so on. The cloud session has built the engine for it: the strip, the animation, and a preview page. You make the art. The two sides meet at one contract, the scenery-pack spec.

## Read first
- The spec: https://github.com/jalirkan/ForgeCoach/blob/main/docs/scenery-pack-spec.md. Also in a ForgeCoach checkout at `docs/scenery-pack-spec.md`; pull main first.
- The preview page: https://jalirkan.github.io/ForgeCoach/#ambience. It has buttons to "play" lands for either player, a stage slider, and a box for your pack's URL that checks your manifest as you type. It never connects to the engine, so you can use it while the lab runs.

## Task 1: the island biome, done properly
- **All four growth stages:** stage 1 = 1 Island, 2 = 2–3, 3 = 4–5, 4 = 6+.
  - The shape of the island's growth: sea and sky, then a shoreline, then a lagoon and palms, then a full paradise.
  - The spec's worked example shows the island's layers. Follow its layer naming, depth and parallax values, and blend modes.
- **A bloom-in for each stage, and one gentle idle loop.** Example idle loops: water shimmer, palm sway, drifting clouds.
- **Formats** (spec §3):
  - stills: WebP or AVIF with alpha;
  - sprite sheets: WebP;
  - loops: WebM VP9 with alpha, plus an MP4 fallback, 2–6 s, seamless.
- **Budgets:** ≤ 6 MB for the biome, and ≤ 1.5 MB for stage 1 because it's preloaded.

## Composition notes the spec doesn't stress
- **The bottom third is mostly covered.** On the real board, the land cards sit over the bottom of the strip. Keep it low-detail and put the strong shapes 30–60% of the way up.
- **Seams are narrow.** Where two biomes meet, the seam is only about 55 px on a phone. Make your edges soft and let them fade at both ends.
- **Slots vary a lot in width.** A slot can be about 130 px wide on a phone or more than 1280 px on a desktop, and the art must read at both. Test at 390 px wide.
- **The opponent's strip** shows the same art as an upright vista, not flipped.

## Serve it and test it
```bash
cd ~/scenery-packs/forgecoach-v1        # suggested home; anywhere outside the repos is fine
npx http-server . --cors -p 8650 -c-1
```
- Open `https://jalirkan.github.io/ForgeCoach/#ambience?scenery=http://127.0.0.1:8650/`. Play Island one, two, four and six times, and check every stage at desktop width and at 390 px.
- After changing art, press Reload on the page.
- When it looks right, Settings → Board scenery uses it on the real board.

## Rules
1. **Original art only for this pack.** Generate it from your own prompts. Don't use Magic card art, Wizards of the Coast characters, or models taken from online as inputs or references. That keeps the pack shareable later if Justin chooses.
2. **Commit art nowhere.** Not in ForgeCoach (public) and not in mtg-table. Keep the pack in its own folder on this PC. If Justin creates a private art repo, use that.
3. **The lab comes first.** Lab jobs run around the clock on this PC (the systemd runner). Don't stop or pause it. Image generation mostly uses the GPU and the lab uses the CPU, so they should coexist, but watch memory. If you need a big GPU or CPU burst, ask Justin.
4. **Don't edit ForgeCoach code.** If the spec is missing something you need, ask for it. Examples: a new layer kind, more stages, effect fields for creatures and attacks.

## Reporting back
- Put 2–4 screenshots of `#ambience` with your pack loaded, at desktop and phone width with stages 1 and 4, under `art/island/` on the pc-results branch in your pc-results worktree. Keep each under 5 MB.
- Add one line to HEARTBEAT.md's `## Messages` addressed to the cloud session. Say what's there and any spec requests. The cloud session reads pc-results on a schedule and will reply in the pc-jobs README under "NOTES TO THE PC".
- Never put the art itself in pc-results, only screenshots.

## After the island
Task 2 is the other five biomes (swamp, mountain, forest, plains, wastes), in the same way. Task 3 is effects for creatures entering, attacks and damage, once the spec adds fields for them. The cloud session will add those fields when you're ready.
