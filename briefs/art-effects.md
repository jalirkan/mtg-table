# Addendum for the local session: Task 3, effects (spec 1.2)

The spec now has the effect fields you asked for. Spec 1.2 keeps `schema: 1`, and every new field is optional, so your island pack keeps working as it is. Effects are short one-shots that play on a player's strip when something happens on the board.

## Read first
- The spec's new section, **§2 Effects (1.2)**, and its worked example *Effects for the island*: `docs/scenery-pack-spec.md`. It is merged (ForgeCoach #48), so pull main, and the live site has 1.2 once Pages redeploys (a few minutes): `https://jalirkan.github.io/ForgeCoach/#ambience?scenery=http://127.0.0.1:8650/`.
- **§3** has the effect budgets, and **§4** has the motion and reduced-motion rules.

## What 1.2 lets you add
- **Events:**
  - `creatureEnter`;
  - `attack`;
  - `damagePlayer` and `damageCreature` (the engine tells them apart);
  - `landfall` (replaces the slot's built-in glow);
  - `stageUp` (a land lifts a slot to its next stage).
- **Where they go:**
  - in the top-level `effects` object, for every biome;
  - in `biomes.<name>.effects`, which wins for that biome.

  A biome may have `effects` and no `stages`. It then keeps the built-in scene and plays your effects, which is handy for testing effects on their own.
- **Each effect is one of:**
  - `sprite`: a WebP sheet with `frames` / `cols` / `rows` / `fps`, played once;
  - `video`: a WebM with alpha, plus an MP4 `fallback`;
  - `particles`: a built-in `preset` (`shimmer` `sweep` `flash` `crack` `motes` `ripple`) with an optional `color`. It needs no files.
- **Placement and look:**
  - `at`: `slot`, `card` (near the creature), or `strip`;
  - `scale`: height as a fraction of the strip;
  - `aspect`;
  - `y`;
  - `blend` (default `screen`);
  - `mirror` (default on for `attack`). Draw attack art pointing up, toward the other side. On the opponent's strip it is flipped to point down.
- **Reduced motion:** `reduced` is `glow` (the default, a still glow), `poster` (needs a `poster` still), or `skip`.
- **Concurrency:** `effects.maxConcurrent` (1–6, default 3) caps how many play at once.

## Budgets
- **≤ 2.5 s per effect.** Longer sheets and clips are cut.
- **≤ 4 MB of effect files per biome,** counted apart from the scenery's 6 MB. Put each effect's file size in `bytes` and the validator warns past the budget.
- **Sprite sheets:**
  - ≤ 2048 px on a side;
  - 8–30 frames at 12–24 fps.
- **Clips:**
  - ≤ 720 px wide;
  - no audio;
  - not looped.
- **The whole pack** should stay ≤ 30 MB, effects included.

## Art direction
- **Effects are punctuation.** Make them soft-edged, brief and gone. Avoid:
  - strobing, or more than one bright peak per effect;
  - full-strip white flashes.
- **Cards always sit on top of the strip.** A `card`-anchored effect needs to be wider than a card, so it shows around it.
- **Scenery levels up with mana.** Justin's direction: each stage is more intricate, vivid and fantastical, ending dreamlike. `stageUp` is that moment, so make it the richest effect in each biome.
- **Read the opponent's strip.** It is drawn as an upright vista, and effects there stand about a quarter of the way up. Check that yours read on both sides.

## Serve it and test it
```bash
cd ~/scenery-packs/forgecoach-v1
npx http-server . --cors -p 8650 -c-1
```
1. Open `#ambience?scenery=http://127.0.0.1:8650/`.
2. Play a land for each side.
3. In the new **Effects** card, fire each effect for You and for the Opponent.
4. Under **Pack effects**, check that each event shows "pack …", not "built-in".
5. Press **Check effect files**. It fetches every effect file, lists any that fail, and measures each biome against 4 MB.
6. Check **Motion → Stills only**: each effect should become a still glow or its poster, or show nothing.
7. Test at desktop width and at 390 px.

## Rules (unchanged)
1. **Original art only.** Generate from your own prompts. Don't use card art, Wizards of the Coast characters, or other people's work as inputs or references.
2. **Commit art nowhere.** Not in ForgeCoach and not in mtg-table. Keep the pack in its own folder (or in a private art repo, if Justin makes one).
3. **The lab comes first.** Never stop or pause the runner. Watch memory, and ask Justin before any big GPU or CPU burst.
4. **Don't edit ForgeCoach code.** Ask for spec changes through HEARTBEAT.md's `## Messages`.

## Reporting back
As before:
- 2–4 screenshots, under `art/effects/` on the pc-results branch: `#ambience` mid-effect, desktop and phone. Keep each under 5 MB, and never include the art itself.
- One line in HEARTBEAT.md saying what's there, plus any spec requests.
