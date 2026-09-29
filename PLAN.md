# mtg-table — plan

Source of truth: [`docs/research/05-architecture-synthesis.md`](docs/research/05-architecture-synthesis.md)
§9. That document is the spec; this file is its schedule, kept up to date as
milestones land.

## Open now — every open follow-up and every owner-only question, indexed

An index, and nothing more: it was generated on 2026-09-28 (the docs block) from
the follow-up lists and the questions table further down, it moves nothing, and
**those lists stay the truth** — an item's status is whatever its own entry says.
An item counts as open unless its entry marks it closed or strikes it through;
*partly*, *standing*, *accepted* and *not reproduced* are the entries' own words.
Each lane links to its list. When a list changes, change this index in the same
commit.

**The 30 follow-up lists hold 373 items, and 278 of them are open** — 254 open,
18 partly done, 3 not reproduced, 2 standing and 1 accepted — against 95
closed (M1's six among them; the personal tier's list was added, with its 18 and
19 closed, when that lane merged; its phase 2 closed ten and opened seven, and
its fix pass 1 recounted it and opened three; the status layer's list of twelve
was added when that lane merged). **Of the 30 questions only the owner can settle,
5 are answered** and 25 stand on the default this plan assumes.

### Open follow-ups

| lane | # | status | the item, in one line | the file it names first |
|---|---|---|---|---|
| [M2](#fu-m2) | 3 | open | Gate 0's `"unknown"` arm has never been observed at runtime | — |
| [M2](#fu-m2) | 4 | open | Amendment M9's pre-header path is self-test-only | — |
| [M2](#fu-m2) | 7 | standing | `emitOver`'s wait loop was kept, not deleted | — |
| [M3](#fu-m3) | 1 | open | `NO_CLIENT_ASK_TIMEOUT_MS` (120 s) has never fired | — |
| [M3](#fu-m3) | 2 | open | D22 shrinks the `ability_menu` race; it does not mathematically eliminate it | — |
| [M3](#fu-m3) | 3 | open | The asynchronous `ability_menu` is not re-delivered by `resync`, and a stale answer is applied blind | `docs/evidence/m5-board.md` |
| [M3](#fu-m3) | 6 | open | Amendment M10's `seq: 0` reservation is true by construction, not by an assertion | — |
| [M3](#fu-m3) | 8 | open | `--refuse-first-ask` lives in `tools/ws-auto-play.mjs`, not `ws-smoke.mjs` | `tools/ws-auto-play.mjs` |
| [M3](#fu-m3) | 9 | open | Space = OK is proved by a synthetic `KeyboardEvent`, not by a finger | — |
| [M3](#fu-m3) | 10 | open | Two socket properties are closed by construction rather than by a test | — |
| [M3](#fu-m3) | 11 | open | Two M2 follow-ups (gate 0's "unknown" arm, M9's pre-header buffer) are still open here | — |
| [M4](#fu-m4) | 2 | open | Report 10 §2.2's middle-row arithmetic is 23 px out, and the spec is the half that is wrong | — |
| [M4](#fu-m4) | 3 | not reproduced | `TypeError: set is not iterable`, once, from a layout effect | `web/src/render/rects.ts` |
| [M4](#fu-m4) | 8 | open | `check-redaction.mjs` cannot read a four-line M11 session | `tools/check-redaction.mjs` |
| [M5](#fu-m5) | 3 | open | The default auto-answer policy changed for two kinds, in a shared file | `tools/ws-auto-play.mjs` |
| [M5](#fu-m5) | 4 | open | There is no DOM test environment | `web/test/hooks-order.test.ts` |
| [M5](#fu-m5) | 5 | open | The combat-band strip is an overlay, and while it is tall it covers the graveyard / exile strips behind it | — |
| [M5](#fu-m5) | 6 | accepted | 9b's multiset diff differs under load — accepted, left loud, and said where it prints | `tools/fixture-multiset-diff.mjs` |
| [M5](#fu-m5) | 7 | open | The board picker reaches exactly one kind here | `fixtures/games/` |
| [M5](#fu-m5) | 8 | open | `assign_amount` is not a picker | — |
| [M5](#fu-m5) | 9 | open | `clickAbility` still never leaves the browser | `tools/check-all.sh` |
| [M5](#fu-m5) | 10 | open | `input.weak` is still `[]` on the wire | `docs/evidence/m6-engine.md` |
| [M5](#fu-m5) | 11 | open | Two M4 follow-ups carry over unchanged (report 10 §2.2, the four-line M11 session) | `tools/check-redaction.mjs` |
| [M5](#fu-m5) | 12 | open | `docs/evidence/m5-probes.md` §12 overstates its own un-recorded corners | `docs/evidence/m5-probes.md` |
| [M5](#fu-m5) | 13 | open | The user still has not pressed the space bar | `web/test/keys.test.ts` |
| [M6](#fu-m6) | 1 | open | `order` with `sideboardMode: true` is still unrecorded | `decks/sideboard-probe.dck` |
| [M6](#fu-m6) | 2 | open | Only the `endOfTurn` yield has an engine recording | `fixtures/` |
| [M6](#fu-m6) | 3 | open | `input.weak[]` is still `[]` and `input` still carries no typed `payingMana` | — |
| [M6](#fu-m6) | 4 | open | `clickAbility` still never leaves the browser | — |
| [M6](#fu-m6) | 5 | open | `newGame` is absent from the frame log | `docs/evidence/m6-engine.md` |
| [M6](#fu-m6) | 7 | open | D40's fix is not in the gate | `tools/check-all.sh` |
| [M6](#fu-m6) | 8 | open | `tools/check-redaction.mjs`'s two M6 relaxations want a second human reader | `tools/check-redaction.mjs` |
| [M6](#fu-m6) | 9 | open | Three protocol rows are still specified and not emitted | — |
| [M6](#fu-m6) | 10 | open | No AI profile picker and no yield settings, deliberately | `docs/evidence/match-setup.md` |
| [M6](#fu-m6) | 11 | open | Phase stops are reseeded for every game | — |
| [M6](#fu-m6) | 12 | open | `useMana` still has no post-act snapshot push | — |
| [M6](#fu-m6) | 13 | open | The user still has not pressed the space bar | — |
| [M6](#fu-m6) | 14 | open | The gate never enters amendment M42's branch | `docs/evidence/m6-engine.md` |
| [M6](#fu-m6) | 15 | open | `comfortNotYet()`'s retry path in `tools/ws-auto-play.mjs` has no automated test | `tools/ws-auto-play.mjs` |
| [M6](#fu-m6) | 16 | open | `WsTransport` caches `lastState` and does not clear it on `hello_ok` | — |
| [M7 Tier 1](#fu-m7) | 1 | open | `max ≤ 50 ms` fails on a cold table, and the cause is measured | — |
| [M7 Tier 1](#fu-m7) | 2 | open | Every performance number in this milestone is from SwiftShader | — |
| [M7 Tier 1](#fu-m7) | 3 | open | The dpr governor cannot climb back on a vsync-locked display | — |
| [M7 Tier 1](#fu-m7) | 4 | open | §10.7's `?cue=<id>` loop route is not built | — |
| [M7 Tier 1](#fu-m7) | 5 | open | §7.1's `?cues=<url>` override is a documented refusal, not an omission | `web/src/arena/Arena.tsx` |
| [M7 Tier 1](#fu-m7) | 6 | open | `<AdaptiveDpr />` is mounted and dormant | — |
| [M7 Tier 1](#fu-m7) | 7 | open | `drawnEntities()` in `web/src/render/picker.ts` was deliberately not extended | `web/src/render/picker.ts` |
| [M7 Tier 1](#fu-m7) | 8 | open | `COUNTER_LABELS` in `web/src/render/labels.ts` is keyed by the enum-constant spelling | `web/src/render/labels.ts` |
| [M7 Tier 1](#fu-m7) | 9 | open | There is no canvas equivalent of `render.test.tsx`'s `data-card-name` sweep | `web/test/render.test.tsx` |
| [M7 Tier 1](#fu-m7) | 10 | open | `tools/arena-bench.mjs` is not in `check-all.sh` | `tools/arena-bench.mjs` |
| [M7 Tier 1](#fu-m7) | 11 | open | The frozen React-18 3D line prints one deprecation warning at runtime | — |
| [M7 Tier 1](#fu-m7) | 12 | open | A second JVM started at the same `--seed` truncates the first's frame log | `scripts/play.sh` |
| [Tier 2, slice 1](#fu-t2s1) | 1 | open | In the human's own combat the transient clips mostly do not play live | — |
| [Tier 2, slice 1](#fu-t2s1) | 4 | open | Bloom's default rests on one headless measurement | — |
| [Tier 2, slice 1](#fu-t2s1) | 5 | open | The program budget is exceeded under bloom | — |
| [Tier 2, slice 1](#fu-t2s1) | 6 | open | With bloom on, `gl.info.render` counts only the composer's last pass | — |
| [Tier 2, slice 1](#fu-t2s1) | 7 | open | The idle cost of a table with a bobber on it rose | `web/src/arena/figures/traits.json` |
| [Tier 2, slice 1](#fu-t2s1) | 12 | open | The fizzle is evidenced only by a synthetic event | — |
| [Tier 2, slice 1](#fu-t2s1) | 13 | open | Engine order puts `attach` before `resolved` | — |
| [Tier 2, slice 1](#fu-t2s1) | 14 | open | The SwiftShader cold start | — |
| [Tier 2, slice 1](#fu-t2s1) | 16 | open | The minified chunks carry no licence banners | `web/dist/` |
| [Tier 2, slice 1](#fu-t2s1) | 19 | open | `web/t0-spike.html` is kept | `web/t0-spike.html` |
| [Tier 2, slice 2](#fu-t2s2) | 4 | open | The dying body steps out in the frame the rank closes | — |
| [Tier 2, slice 2](#fu-t2s2) | 5 | open | A death flushed before its first frame has no body | — |
| [Tier 2, slice 2](#fu-t2s2) | 6 | partly | No live death has been seen, and the retargeted `hit` was not photographed in the arena | — |
| [Tier 2, slice 2](#fu-t2s2) | 7 | open | The in-browser checks are not repeatable from the repo | `tools/` |
| [Tier 2, slice 2](#fu-t2s2) | 8 | open | The views' trade, and a flash nobody sees | — |
| [Tier 2, slice 2](#fu-t2s2) | 9 | open | A spectator's swoop is a close-up | `web/src/arena/cues/cues.json` |
| [Tier 2, slice 2](#fu-t2s2) | 10 | partly | Nobody has play-tested slice 2 | — |
| [Tier 2, slice 3](#fu-t2s3) | 2 | open | Three props sit on one side of a body by nature | `web/test/traits.test.ts` |
| [Tier 2, slice 3](#fu-t2s3) | 3 | open | Most beats are unaimed in the corpus, and Wasp's never is | `web/test/stack.test.ts` |
| [Tier 2, slice 3](#fu-t2s3) | 4 | open | At the table view the T12 looks are small | — |
| [Tier 2, slice 3](#fu-t2s3) | 5 | open | The carriers still project onto the far rank from the shoulder views | — |
| [Tier 2, slice 3](#fu-t2s3) | 6 | open | Cast cues on a TRIGGER still rise out of the hand | — |
| [Tier 2, slice 3](#fu-t2s3) | 7 | partly | The CDP drivers that took every photograph are scratch scripts | `tools/` |
| [Tier 2, slice 3](#fu-t2s3) | 8 | partly | Nobody has play-tested slice 3 | — |
| [Tier 2, slice 3](#fu-t2s3) | 9 | open | Four attachments in one crowded `g3` board have no clickable strip | — |
| [Tier 2, slice 3](#fu-t2s3) | 10 | open | Nick Fury is still the least legible identity | — |
| [Tier 2, slice 3](#fu-t2s3) | 11 | partly | The second verification pass's fixes have not been independently verified | `web/test/facing.test.ts` |
| [Tier 2, slice 3](#fu-t2s3) | 12 | open | The raster test counts pixels, not contrast | — |
| [Tier 2, slice 3](#fu-t2s3) | 13 | open | No frame-time bench was run on slice 3 | — |
| [Tier 2, slice 3](#fu-t2s3) | 14 | open | A dying Air Force is not seen dying | — |
| [Tier 2, slice 4](#fu-t2s4) | 1 | open | Were the duelists wanted? | `web/src/arena/figures/duelists.json` |
| [Tier 2, slice 4](#fu-t2s4) | 2 | open | The opponent's duelist is not at the far end of the table | `docs/ideas/arena-mode.md` |
| [Tier 2, slice 4](#fu-t2s4) | 4 | partly | Two views and one window shape lose a duelist | — |
| [Tier 2, slice 4](#fu-t2s4) | 5 | open | The duelists read weakly as a director and a villain, and each has a visible artifact | — |
| [Tier 2, slice 4](#fu-t2s4) | 6 | open | Card identity is uneven at 1× from the table view | — |
| [Tier 2, slice 4](#fu-t2s4) | 7 | open | The duelists' headline gesture is not seen in the most common live case | — |
| [Tier 2, slice 4](#fu-t2s4) | 10 | open | The budget headroom is thin on three lines at once | `web/public/models/figures.glb` |
| [Tier 2, slice 4](#fu-t2s4) | 11 | open | Every humanoid is a Superhero body | — |
| [Tier 2, slice 4](#fu-t2s4) | 12 | open | Five archives were downloaded without the user's approval in chat | — |
| [Tier 2, slice 4](#fu-t2s4) | 13 | partly — (d) open | The gate is flaky under load — (b) and (c) closed by the hardening pass, (d) the ask's push order still open | `tools/wire-drift.mjs` |
| [Tier 2, slice 4](#fu-t2s4) | 15 | not reproduced | A camera mis-aim, seen once and unconfirmed | — |
| [Tier 2, slice 4](#fu-t2s4) | 16 | open | The damage number rises from the HUD anchor | `web/src/arena/layout.ts` |
| [Tier 2, slice 4](#fu-t2s4) | 17 | open | Small debts, each deliberate or cheap | — |
| [Tier 2, slice 4](#fu-t2s4) | 18 | open | Every number is headless Chromium on the GTX 1080, no frame-time bench was run, and nobody has played slice 4 | `tools/arena-bench.mjs` |
| [Tier 2, slice 4](#fu-t2s4) | 19 | open | The duelists' stand offsets live outside `layout.ts` | `web/src/arena/layout.ts` |
| [Card library](#fu-cards) | 1 | open | `tools/fetch-art.ts` can read from the library instead of Scryfall | `tools/fetch-art.ts` |
| [Card library](#fu-cards) | 2 | open | Report 03 §4.5's refresh rules (a newer `image_updated_at`, a dated retry) | — |
| [Card library](#fu-cards) | 3 | open | `config.json`'s `scryfallUserAgent` still carries a placeholder contact | `config.json` |
| [Card library](#fu-cards) | 4 | open | Whether `fixtures/cards/` is committed at all | `fixtures/cards/` |
| [Card library](#fu-cards) | 5 | open | Every MSH + MSC print's image is not fetched (question 17) | — |
| [Card library](#fu-cards) | 6 | open | The name ladder is local only | — |
| [Card library](#fu-cards) | 7 | open | No `resolve --write`, no `cdn_uuid` warm start, no incremental refresh | — |
| [Card library](#fu-cards) | 8 | open | The *copy .dck line* button writes `\|SET` only for MSH and MSC | — |
| [Card library](#fu-cards) | 9 | open | The real build is not in the gate | `tools/check-all.sh` |
| [Card library](#fu-cards) | 10 | open | The browser loses the mode app's UI state across the detour | — |
| [Card library](#fu-cards) | 11 | open | No production route | — |
| [Workshop](#fu-workshop) | 8 | open | Camera cues are not previewed | — |
| [Workshop](#fu-workshop) | 9 | open | The legibility meter's limits (1600 × 1000 against 1600 × 900; pixels, not contrast) | `web/test/traits.test.ts` |
| [Workshop](#fu-workshop) | 10 | open | Never opened from a built `dist/` | — |
| [Workshop](#fu-workshop) | 11 | open | The live-game chip was checked with a stand-in transport object | `scripts/play.sh` |
| [Workshop](#fu-workshop) | 12 | open | An override masks the committed row until it is reset | — |
| [Workshop](#fu-workshop) | 13 | open | A synthetic board is one card's world | — |
| [Workshop](#fu-workshop) | 14 | open | The duelists are seats, not cards | — |
| [Workshop](#fu-workshop) | 15 | partly | A fizzled TRIGGER still plays its card's plain resolution | — |
| [Workshop](#fu-workshop) | 18 | open | The arena re-renders on every loop-mode change | `tools/arena-bench.mjs` |
| [Workshop](#fu-workshop) | 19 | open | A card whose Scryfall name differs from Forge's | — |
| [Match setup](#fu-match) | 1 | open | Identity rows for the villain deck, after the arena branches merge | `web/src/arena/` |
| [Match setup](#fu-match) | 3 | open | A deck and profile picker in the browser | — |
| [Match setup](#fu-match) | 4 | open | Dark Deed was cast once in 38 games — the next swap if it never leaves the hand | — |
| [Match setup](#fu-match) | 5 | open | Paths no recording has reached | — |
| [Match setup](#fu-match) | 6 | open | The redaction gate and `DigUntil`'s reveal | `tools/check-redaction.mjs` |
| [Match setup](#fu-match) | 7 | open | The rest of report 11 §9 is not exposed | — |
| [Match setup](#fu-match) | 10 | open | The workshop has no facts for the villains | `web/src/workshop/catalog.json` |
| [Engine and sets](#fu-engine) | 1 | open | The M6 next-game race — a blocker for any engine switch | `bridge/src/mtgtable/WireGuiGame.java` |
| [Engine and sets](#fu-engine) | 4 | open | `MtgTable` prints `MTGTABLE OK` and exits 0 on a 0-turn game | — |
| [Engine and sets](#fu-engine) | 5 | open | `check-redaction.mjs` A10 raises a false alarm | `tools/check-redaction.mjs` |
| [Engine and sets](#fu-engine) | 6 | open | Arena identity for the FRA creatures | `web/src/arena/figures/figures.json` |
| [Engine and sets](#fu-engine) | 7 | partly | Card art and the card library | `tools/fetch-art.ts` |
| [Engine and sets](#fu-engine) | 8 | open | Prepare on the board | — |
| [Engine and sets](#fu-engine) | 9 | open | `input.openZones`' `{hand}` hint does not arrive on 2.0.15 | — |
| [Engine and sets](#fu-engine) | 10 | open | D14's retirement | — |
| [Engine and sets](#fu-engine) | 11 | open | Forge's to close, ours to re-check: no AI logic for Empower, a typo in Pyre Rhymer | — |
| [Engine and sets](#fu-engine) | 12 | open | Two deck audits | `tools/check-deck.mjs` |
| [Hardening](#fu-hardening) | 1 | open | `figures.glb` was not rebuilt with the pinned toolchain | `web/public/models/figures.glb` |
| [Hardening](#fu-hardening) | 3 | open | An exception that kills a `Game-n` thread other than the game loop is only printed | — |
| [Hardening](#fu-hardening) | 7 | open | Step 6 checks the stack's ORDER on one id-set | — |
| [More villains](#fu-villains) | 1 | open | The flat 8 spells (D117) | — |
| [More villains](#fu-villains) | 2 | open | Identity rows for the three decks | `web/src/arena/figures/traits.json` |
| [More villains](#fu-villains) | 3 | open | The workshop has no facts for them | `tools/check-redaction.mjs` |
| [More villains](#fu-villains) | 4 | open | A hand review of the ability lines | — |
| [More villains](#fu-villains) | 5 | open | Doom Legion at seed 6 | — |
| [More villains](#fu-villains) | 6 | open | The top of the Hulk curve seldom arrives | — |
| [More villains](#fu-villains) | 7 | open | Pinning a print | `tools/build-deck.ts` |
| [More villains](#fu-villains) | 8 | open | `fixtures/cards/` does not carry the new decks' cards | `fixtures/cards/` |
| [More villains](#fu-villains) | 9 | open | The smoke's advisory cannot tell a land never drawn from a nonland never cast | — |
| [More villains](#fu-villains) | 10 | open | Paths the smoke did not show reaching the seat | — |
| [Spectating](#fu-spectate) | 1 | open | A live observer socket | — |
| [Spectating](#fu-spectate) | 2 | open | The outcome cue speaks for the viewing seat | — |
| [Spectating](#fu-spectate) | 3 | open | `Snap.sweepText` conceals a seat's own spell text when it says "surveils (1)" | — |
| [Spectating](#fu-spectate) | 4 | open | The director is one key away, not the default | `scripts/spectate.sh` |
| [Spectating](#fu-spectate) | 5 | open | The pace is one number | — |
| [Spectating](#fu-spectate) | 6 | open | Commit a Doom Legion recording | `fixtures/games/` |
| [Spectating](#fu-spectate) | 7 | open | No picker in the page | — |
| [Spectating](#fu-spectate) | 8 | partly | Reloading a followed page restarts following | — |
| [Spectating](#fu-spectate) | 9 | open | The page's clock and the bridge's are compared | — |
| [Spectating](#fu-spectate) | 10 | open | Spectate recordings are not in step 11's corpus sweep | `tools/wire-drift.mjs` |
| [Narrator](#fu-narrator) | 2 | open | Commit one Doom Legion recording | — |
| [Narrator](#fu-narrator) | 3 | open | The engine paths no committed log reaches | — |
| [Narrator](#fu-narrator) | 4 | open | The seat's own decisions are not told | `tools/check-redaction.mjs` |
| [Narrator](#fu-narrator) | 5 | open | "gets +1/+1 until end of turn" is invisible | — |
| [Narrator](#fu-narrator) | 6 | open | `--json` is unversioned | — |
| [Narrator](#fu-narrator) | 7 | open | Coalescing hides the middle of a flush | — |
| [Narrator](#fu-narrator) | 8 | open | A multi-game client log | — |
| [Story page](#fu-story) | 1 | open | A story panel INSIDE the arena | `web/src/arena/` |
| [Story page](#fu-story) | 2 | open | A live seat's story | — |
| [Story page](#fu-story) | 3 | open | Reloading a followed story restarts at the live edge | — |
| [Story page](#fu-story) | 4 | open | Tokens have no image | `tools/fetch-art.ts` |
| [Story page](#fu-story) | 5 | open | A quoted name is not marked | — |
| [Story page](#fu-story) | 6 | open | One line per moment is long for a combat | — |
| [Story page](#fu-story) | 7 | open | The frame count is the replay's, not the story's | — |
| [Story page](#fu-story) | 8 | open | Measured in Node, not in the browser | — |
| [Gate speed](#fu-gate) | 2 | open | 10g is the critical path from about six slots up | `decks/yield-probe.dck` |
| [Gate speed](#fu-gate) | 3 | open | The default is conservative | — |
| [Gate speed](#fu-gate) | 5 | open | The serial gate's console merges stderr into stdout | — |
| [Gate speed](#fu-gate) | 6 | open | `tools/deck-smoke.sh` could be jobs now | `tools/deck-smoke.sh` |
| [Gate speed](#fu-gate) | 7 | open | One gate per worktree, still | — |
| [Undo race](#fu-undo) | 1 | open | The yield acts can start the mana-lost worker unmarked | — |
| [Undo race](#fu-undo) | 2 | standing | Clicks are not guarded against our own refresh walk | — |
| [Undo race](#fu-undo) | 3 | not reproduced | The real crash was not reproduced at natural timing here | — |
| [Undo race](#fu-undo) | 5 | open | Slice 4's follow-up 13(d) is not this defect | — |
| [Polish 1](#fu-polish1) | 3 | open | `GuardFeeds` itself is read, not driven | `tools/undo-race-repro.sh` |
| [Polish 1](#fu-polish1) | 4 | open | The pair check's "after it left" cannot tell leaving from a log that stopped being written | — |
| [Guards](#fu-guards) | 1 | open | Every lane worktree needs a card index now, or `SKIP_DECKS=1` | — |
| [Guards](#fu-guards) | 2 | open | The lint is still a grep | `var` |
| [Guards](#fu-guards) | 3 | open | The self-test's snippets are text, not compiled code | — |
| [Guards](#fu-guards) | 4 | open | `enclosing_method` needs a modifier | — |
| [Guards](#fu-guards) | 5 | open | Forge's own hops are not counted | — |
| [Lane LOOK](#fu-look) | 3 | open | MOTION / BODIES — props have one look per KIND | `web/src/arena/scene/propMaterial.ts` |
| [Lane LOOK](#fu-look) | 4 | open | BODIES — retire `holoMaterial.ts` | `web/src/arena/scene/holoMaterial.ts` |
| [Lane LOOK](#fu-look) | 8 | open | Question: the backdrop per seat | — |
| [Lane LOOK](#fu-look) | 10 | open | The raster counts paint, not contrast | — |
| [Lane LOOK](#fu-look) | 11 | partly | Shadows the stage does not show | `web/src/arena/layout.ts` |
| [Lane LOOK](#fu-look) | 12 | open | The stage's colours come from what a seat has shown | — |
| [Lane LOOK](#fu-look) | 13 | open | Report 15 §4.2's rest — fog, ambient motes, a comic panel border — is not built | — |
| [Lane LOOK](#fu-look) | 14 | open | The paint input path has no committed user | — |
| [Lane LOOK](#fu-look) | 15 | open | The spike's `?ink=hull` URLs now draw the post line | — |
| [Lane LOOK](#fu-look) | 16 | open | Under SwiftShader the governor reaches its floor later with the comic look | `web/src/arena/perf.ts` |
| [Lane LOOK](#fu-look) | 18 | open | Aliasing | `web/src/arena/scene/Post.tsx` |
| [Lane LOOK](#fu-look) | 19 | open | The raster's lights are optimistic | — |
| [Lane LOOK](#fu-look) | 20 | open | The workshop's front view shows the card upside down | — |
| [Lane LOOK](#fu-look) | 21 | open | Headed and integrated-GPU measurements are still owed | — |
| [Lane MOTION](#fu-motion) | 3 | open | A summoned figure's props do not ink in with it | `web/src/arena/scene/props.ts` |
| [Lane MOTION](#fu-motion) | 4 | open | The pedestal shows no camera shake | `web/src/workshop/Pedestal.tsx` |
| [Lane MOTION](#fu-motion) | 5 | open | The lettering is the system's heaviest font | — |
| [Lane MOTION](#fu-motion) | 6 | open | Every star is POW yellow unless a row says otherwise | — |
| [Lane MOTION](#fu-motion) | 7 | open | The villain deck has no words | `web/src/arena/cues/cues.json` |
| [Lane MOTION](#fu-motion) | 8 | open | The integrated GPU is still unmeasured | — |
| [Lane MOTION](#fu-motion) | 9 | open | The workshop's 1× close-up crops an attacker's star | `web/src/workshop/Pedestal.tsx` |
| [Lane MOTION](#fu-motion) | 10 | open | A flier's splat is mostly under its own falling body at table distance | — |
| [Lane MOTION](#fu-motion) | 11 | open | Every star is still one of five words on one yellow | — |
| [Lane MOTION](#fu-motion) | 12 | open | The workshop's rehearsals leave the pedestal in their AFTER state when auto-rest is off | — |
| [Lane MOTION](#fu-motion) | 13 | open | A summon swings from hologram to HALF ink, not to ink | — |
| [Lane MOTION](#fu-motion) | 14 | open | A high flier's speed lines stand wide | — |
| [Lane BODIES](#fu-bodies) | 2 | open | The Universal Base Characters pack — needs the user's approval in chat | `tools/build-figures.mjs` |
| [Lane BODIES](#fu-bodies) | 3 | open | The cheaper road to library headroom | `web/public/models/figures.glb` |
| [Lane BODIES](#fu-bodies) | 4 | partly | Expressions | — |
| [Lane BODIES](#fu-bodies) | 5 | open | A face on the director duelist | `web/src/arena/figures/duelists.ts` |
| [Lane BODIES](#fu-bodies) | 6 | partly | `FigurePose.art` is carried and not yet drawn | — |
| [Lane BODIES](#fu-bodies) | 8 | partly | The coat close up | — |
| [Lane BODIES](#fu-bodies) | 9 | open | The cape's shoulder panels are rigid on `spine_03` | — |
| [Lane BODIES](#fu-bodies) | 10 | open | The procedural hair reads as a cap close up | — |
| [Lane BODIES](#fu-bodies) | 11 | open | `HEAD_SHAPE` and the face landmarks are measured constants | — |
| [Lane BODIES](#fu-bodies) | 12 | open | The palette runs on the main thread | — |
| [Lane BODIES](#fu-bodies) | 14 | open | A trimmed coat hem | `web/src/arena/figures/duelists.json` |
| [Lane BODIES](#fu-bodies) | 15 | partly | Dark procedural hair still reads as a cap from above | — |
| [Lane BODIES](#fu-bodies) | 16 | open | Fury is bald now | — |
| [Lane BODIES](#fu-bodies) | 18 | open | The workshop cannot show a face at 1×, and the table cannot read one | `web/src/workshop/framing.ts` |
| [Lane BODIES](#fu-bodies) | 19 | open | Pain on a hit — lane MOTION's | — |
| [Lane BODIES](#fu-bodies) | 20 | open | Coulson's clasp is a judgement call | — |
| [Lane BODIES](#fu-bodies) | 21 | open | The bench on an idle machine | — |
| [Lane BODIES](#fu-bodies) | 22 | open | The director duelist's small flap at view 1 | — |
| [Lane BODIES](#fu-bodies) | 23 | partly | Peggy's sidearm is still small from above | — |
| [Lane BODIES](#fu-bodies) | 24 | open | A face at play distance is on the far seat only | — |
| [Lane BODIES](#fu-bodies) | 25 | open | Fury's strap crosses his good brow | `web/src/arena/scene/props.ts` |
| [Lane BODIES](#fu-bodies) | 26 | open | The raster's merge details are keyed by KIND | `web/test/traits.test.ts` |
| [Lane BODIES](#fu-bodies) | 27 | open | Lane LOOK's follow-up 4 is still open | `web/src/arena/scene/models.ts` |
| [Lane BODIES](#fu-bodies) | 28 | open | A liveness message names a line by its text | — |
| [Lane BODIES](#fu-bodies) | 29 | open | Two hairs are details by measurement, not by nature | `web/test/traits.test.ts` |
| [Lane BODIES](#fu-bodies) | 30 | open | The villain duelist's armour shows through his cloak | `web/src/arena/figures/duelists.json` |
| [Lane BODIES](#fu-bodies) | 31 | open | Peggy's sidearm reads as a grey slab from above | `web/src/arena/scene/props.ts` |
| [Docs block](#fu-docs) | 1 | open | Mirror the Java guide's section table into `WireGuiGame.java`'s header | `bridge/src/mtgtable/WireGuiGame.java` |
| [Docs block](#fu-docs) | 2 | open | The Java guide's older citations: seven stale quotes, the inline line numbers | `docs/guides/java-for-typescript-people.md` |
| [Personal tier](#fu-personal) | 8 | open | Factor the build's retarget beside a rebuild of `figures.glb` | `tools/build-figures.mjs` |
| [Personal tier](#fu-personal) | 10 | open | `--pose all`: a posed model keeps its legs and spine posed | — |
| [Personal tier](#fu-personal) | 12 | open | What Blender would still do on Doom | — |
| [Personal tier](#fu-personal) | 13 | partly | Textures: the normal maps are gone (Doom 1.36 MB); a smaller copy for the table is still open | — |
| [Personal tier](#fu-personal) | 14 | open | A head scale for a life-size head at 60–100 px | — |
| [Personal tier](#fu-personal) | 15 | open | FBX and `.blend` input need Blender | — |
| [Personal tier](#fu-personal) | 16 | partly | Chromium's last background attempts (signin, GCM; the AI-mode call stopped) | — |
| [Personal tier](#fu-personal) | 17 | open | `tools/arena-bench.mjs` and `tools/story-shot.mjs` start Chromium without the isolation | `tools/arena-bench.mjs` |
| [Personal tier](#fu-personal) | 20 | open | The limb check's limits rest on four correct maps | `tools/personal/lib.mjs` |
| [Personal tier](#fu-personal) | 22 | open | The ends at attack t = 0.5 caught no arm fold | — |
| [Personal tier](#fu-personal) | 23 | open | The preview profile stays in the slug's folder, not under `var/` | `tools/personal/check.mjs` |
| [Personal tier](#fu-personal) | 24 | open | Prepare's fold warning looks only at the forearm | — |
| [Personal tier](#fu-personal) | 25 | open | The inspect view's depth relief: the painting as a window, not a picture | `web/src/workshop/Pedestal.tsx` |
| [Personal tier](#fu-personal) | 26 | open | Per-model tuning: the MCU Wasp's wings shrink her, Coulson's shirt shows through his jacket | — |
| [Personal tier](#fu-personal) | 27 | open | A floor rung that sheds personal models on a slow machine | `web/src/arena/perf.ts` |
| [Personal tier](#fu-personal) | 28 | open | Upload a personal model's paint at load, not at its first draw | `web/src/arena/scene/personalModels.ts` |
| [Personal tier](#fu-personal) | 29 | open | The fan Wasp's akimbo jacket and Doom v2 — the owner's call and Blender's | — |
| [Personal tier](#fu-personal) | 30 | open | A model prepared again needs a dev-server restart | `web/src/personal/devRoute.ts` |
| [Personal tier](#fu-personal) | 31 | open | The inspect view's art box is the modern frame's, measured once | `web/src/workshop/framing.ts` |
| [Personal tier](#fu-personal) | 32 | open | One exposure target for every model, set on eight | `tools/personal/lib.mjs` |
| [Personal tier](#fu-personal) | 33 | open | The worst case passes §8.2's 90-call line on SwiftShader (95) | `tools/personal/prepare.mjs` |
| [Personal tier](#fu-personal) | 34 | open | `arena-bench --personal` is a flag the caller must remember | `tools/arena-bench.mjs` |
| [Status layer](#fu-status) | 1 | open | g1 predates M49: step 6 does not compare the keywords' values | `tools/wire-drift.mjs` |
| [Status layer](#fu-status) | 2 | open | No committed recording carries keywords | — |
| [Status layer](#fu-status) | 3 | open | The bar does not animate its drain | `web/src/arena/cues/stage.ts` |
| [Status layer](#fu-status) | 4 | open | `g1`@316 on SwiftShader is 91 draw calls, one over the line | `tools/arena-bench.mjs` |
| [Status layer](#fu-status) | 5 | open | The far seat's strips sit ~30 px above the heads | `web/src/arena/figures/status.ts` |
| [Status layer](#fu-status) | 6 | open | Raised hands and held props can reach the strip | `web/test/status.test.ts` |
| [Status layer](#fu-status) | 7 | open | The icon size is fixed; no tuning row | `web/src/workshop/Workshop.tsx` |
| [Status layer](#fu-status) | 8 | open | The arena has no tooltip for an icon | — |
| [Status layer](#fu-status) | 9 | open | The glyphs are procedural; Kenney's packs were the intended source | `tools/assets-manifest.json` |
| [Status layer](#fu-status) | 10 | open | `UNDEFINED` keywords are omitted | `bridge/src/mtgtable/Snap.java` |
| [Status layer](#fu-status) | 11 | open | Strip and stack thumbnails, and the zoom, show no keyword row | `web/src/render/CardTile.tsx` |
| [Status layer](#fu-status) | 12 | open | UNTAP and CLEANUP are not cells of the turn-order bar | `web/src/arena/DecisionLayer.tsx` |

### Questions only the owner can settle

| # | question | status |
|---|---|---|
| [1](#owner-questions) | Licence: GPL-3.0-or-later, or AGPL so manabrew could be forked? | open — the plan runs on its default |
| [2](#owner-questions) | Keep the M1 recorder, or go straight to the browser seat? | open — the plan runs on its default |
| [3](#owner-questions) | React or vanilla TS for `web/`? | open — the plan runs on its default |
| [4](#owner-questions) | Ever rewrite `~/.forge`'s `Pacho SHIELD.dck` in place to add `\|MSC`? | open — the plan runs on its default |
| [5](#owner-questions) | Card images hot-linked from Scryfall, or proxied through our own origin? | open — the plan runs on its default |
| [6](#owner-questions) | Install a JDK? | open — the plan runs on its default |
| [7](#owner-questions) | GitHub: a public repo or a private one? | open — the plan runs on its default |
| [8](#owner-questions) | Is losing to the Forge AI acceptable, or does a profile picker come forward? | answered (came forward) |
| [9](#owner-questions) | Forge's floating-mana warning on in real games? | answered |
| [10](#owner-questions) | Report 13 §13's first six questions (art direction, card-art models, the GPU, breathing, duelists, lights) | answered |
| [11](#owner-questions) | Commit `web/public/models/figures.glb`, or gitignore it and regenerate it? | open — the plan runs on its default |
| [12](#owner-questions) | Should the live combat budget let the clip lane play? | open — the plan runs on its default |
| [13](#owner-questions) | Should your figures face the other seat? | answered |
| [14](#owner-questions) | Is likeness — Tier 3, a model per card — part of the end goal? | open — the plan runs on its default |
| [15](#owner-questions) | Commit `fixtures/cards/`, or gitignore it? | open — the plan runs on its default |
| [16](#owner-questions) | What contact goes in `config.json`'s `scryfallUserAgent`? | open — the plan runs on its default |
| [17](#owner-questions) | Fetch every MSH + MSC print's image (~104 MiB)? | open — the plan runs on its default |
| [18](#owner-questions) | Play Reality Fracture now, or wait for an official Forge release? | answered |
| [19](#owner-questions) | Fix the M6 next-game race on `main` now, or before the engine switch? | open — the plan runs on its default |
| [20](#owner-questions) | Accept the draft green-black FRA opponent? | open — the plan runs on its default |
| [21](#owner-questions) | For the engine day: the pin inside the repo, and re-recording `g1` if only `stats` order differs? | open — the plan runs on its default |
| [22](#owner-questions) | Keep the prepared FRA files, and should `audit-deck.mjs` join the gate? | open — the plan runs on its default |
| [23](#owner-questions) | Which deck should a bare `./scripts/play.sh` seat against you? | open — the plan runs on its default |
| [24](#owner-questions) | `deck-smoke.sh`: the flat 8 spells a game, or the rate `min(8, AI turns − 3)`? | open — the plan runs on its default |
| [25](#owner-questions) | Keep comic FX on by default? | open — the plan runs on its default |
| [26](#owner-questions) | Keep on twos on by default? | open — the plan runs on its default |
| [27](#owner-questions) | The five comic words, and which card says which | open — the plan runs on its default |
| [28](#owner-questions) | Should a summon swing all the way to ink before it settles at half? | open — the plan runs on its default |
| [29](#owner-questions) | Download the *Universal Base Characters* pack again for its hairstyles? | open — the plan runs on its default |
| [30](#owner-questions) | Keep the art rung on by default? | open — the plan runs on its default |

---

Eight milestones, each with **one runnable command and a deliverable you can look
at**. Total estimate ~13 evenings, first browser game at evening 7.

| | Milestone | Effort | Status |
|---|---|---|---|
| M0 | The engine runs our code | 1 evening | **done** |
| M1 | Record a game and scrub through it in the browser | 2 evenings | **done** — hardened, all six follow-ups closed |
| M2 | A full game against the AI, in the terminal | 2 evenings | **done** — two review passes closed; M3 closed four of its eight follow-ups |
| M3 | The same game, in a browser tab | 2 evenings | **done** — a review pass and a fix pass, all 21 findings closed; eleven follow-ups open, none blocking M4 |
| M4 | A board that looks like Magic | 3 evenings | **done** — a review pass and a fix pass; of its eight follow-ups M5 closed five, one was not reproduced, two are open |
| M5 | Nothing dead-ends | 3 evenings | **done** — probe decks, two verification passes, all findings closed; exit criterion met by `tools/ten-games.sh` (10/10, zero `UNIMPL`); thirteen follow-ups, none blocking M6 |
| M6 | Comfort | 2 evenings | **done** — New Game without restarting the JVM, phase stops, pass-to, auto-yield, undo, concede, `buttons.focus`; the `sideboard` ask recorded at last; gate grew **9d** and **10g**; two verification passes, all findings closed; **D37–D45**; thirteen follow-ups, none blocking M7 |
| M7 | Arena mode: the game as a cinematic | open-ended (Tier 1: 6 evenings) | **Tier 1 done** — a second renderer over the same frame stream: a 3D table, cards as textured planes, all 25 event kinds cued, a choreographed camera, the seat playable in 3D; two verification passes, all fourteen findings closed; **D47–D52**; twelve follow-ups, none blocking Tier 2. **Tier 2 slice 1 (T0–T7) built, verified and committed** (`4f84613`): figures at every creature, auras as poses, lands as terrain, mana motes, the stack as spell forms with tethers and strikes, silhouette busts, bloom on by default; one verification pass, passed; **D53–D63**; nineteen follow-ups. **Tier 2 slice 2 (T8 and the camera views) built, verified twice, fixed twice and committed** (`5891444`): hero and scientist bodies of their own, the UAL's `hit` and `die` retargeted onto the one humanoid rig, a verified and reproducible `figures.glb`, a death that is seen, five camera views with spectator mode and an auto director; **D64–D74**; six of slice 1's follow-ups closed, ten of its own opened. **Tier 2 slice 3 (T9–T12, per-card identity) built, verified twice, fixed twice and committed** (`0368a90`): every deck card reads as itself through data — `traits.json` and a shared kit of eighteen procedural, instanced props — the Air Force a swarm, the Agents a squad, the giant ant giant, the Helicarrier a carrier overhead, T11's beats drawn on the body, T12's attachment looks; **D75–D89**; one of slice 1's and two of slice 2's follow-ups closed, fourteen of its own opened. **Tier 2 slice 4 (T13, proportioned bodies in painted costumes, T14) built, verified once, documented and committed** (`23e26b3`): every humanoid a CC0 *Universal Base Characters* person on the animation library's own rig, painted by a costume palette, still one program; a full duelist per seat — the director and the villain — with gestures as cue params; **D95–D101**; nineteen follow-ups. **Tier 2 is complete (T0–T14)**; likeness — Tier 3, personal-only — is the open question (question 14) |
| — | Match setup: the AI's own deck and its Forge profile *(a deferred item, brought forward)* | 1 day | **built, reviewed, fixed, documented and committed** on branch `match-setup`, rebased onto `main`'s `23e26b3` (2026-09-27) with a second fix commit, then onto the workshop's `bf0392b` the same day with the verifier's four findings fixed — `decks/doom-legion.dck`, 40 blue-black Marvel villains for the AI; `--ai-deck` / `--ai-profile` on the bridge and `scripts/play.sh`, `config.json`'s `match` block read by `play.sh` alone; `hello_ok.match` (amendment **M44**) naming the AI's deck but never listing it; the board's rails print both decks and the profile; gate rows 11–14 of `ten-games.sh` and step **9e**; **D105–D108**; one review pass, all nine findings closed; ten follow-ups, three of them (2, 8, 9) closed by the rebase and its fix commit; the ask path's push order recorded open as slice 4's follow-up 13(d) |
| — | The narrator: a frame log read back as a story *(off the plan, for watching how the AI plays)* | 1 day | **built, gated and documented**, committed on branch `narrate` (2026-09-28) — `tools/narrate.mjs` tells any per-seat log turn by turn, `--turn`, `--summary`, `--seat`, `--json`; names only what the log's seat saw, never remembered (**D123**); `tools/narrate-selftest.mjs` is gate sub-step **12d**, with five negative controls, client-log re-deliveries and two golden files; nine follow-ups, the first a `#story` page it does not build; rebased onto spectating's `a5c8e39` (2026-09-28), where it became **D123** and **12d** and reads spectated recordings (`yourProfile`, `paceMs`) |
| — | The story page: the narrator in the browser, in step with the replay *(off the plan, the narrator's follow-up 1)* | 1 day | **built, gated and documented**, committed on branch `story` (2026-09-28) — the narrator moved whole into `web/src/story/narrate.ts` and `tools/narrate.mjs` is its shell, output unchanged by a byte (**D124**); `#story`, a lazy page over the replay that imports no transport, the story column grouped by turn with the moment on screen highlighted, the summary card, the frame on screen with its cards, one cursor with the arena and the board (**D125**, **D128**); re-told as a followed log grows, only the played frames while the future is hidden (**D126**); hard rule 8 held by rendering it over the corpus with a control (**D127**); `./scripts/spectate.sh --story`; nine follow-ups, the first the story panel inside the arena, the last an engine race the gate hit (`act: undo`, not this branch's) |
| — | Gate speed: `check-all.sh` in parallel *(off the plan, for a faster gate)* | 1 day | **built, measured and documented**, committed on branch `gate-speed` (2026-09-28), rebased onto the story page's `0af97a9` — `GATE_JOBS` jobs at a time from a job table with dependencies, a log per job and a timing table; ~245 s at four, 151 s at eight, against ~900–950 s serially (907 s at merge); `GATE_JOBS=1` is the serial gate; every job its own Forge home (at merge); **D129–D135**; *Gate speed*, just above *Deferred* |
| — | The undo race: `undo` waits for a parked engine *(a defect, from the story branch's gate run)* | 1 day | **built, gated and documented**, committed on branch `undo-race` (2026-09-28), rebased onto gate speed's `6b35054` — `undo` and `useMana` applied only while the engine is quiet on this seat, else `notice {title:"Not now"}`, and a `concede` from a running engine carried forward to the engine's own check (**D136**, written as D170; amendment **M48**); a deterministic reproduction (`tools/undo-race-repro.sh`, the held window, the guard-off negative control); `ActGuardSelfTest` in the build; 10g's job holds the window and asserts the refusal; M6 follow-up 6, the story page's follow-up 9 and gate speed's follow-up 8 closed; five follow-ups, one of them (4) closed at merge |
| — | CI: the gate's engine-free half on GitHub Actions *(off the plan)* | ½ day | **built** on branch `ci` (2026-09-28), pull request to `main` — `.github/workflows/checks.yml`: `web` (`npm ci`, build, `npm test`), `bridge` (lint, `check-forge.sh`, `bridge/build.sh` and its five self-tests against the official `forge-2.0.14` release's jar, checked against the pin and cached alone) and `redaction` (the committed corpus, the checker's, the narrator's and the drift check's selftests, the catalog check); `check-all.sh`, which plays games, stays local; the stray `.vite/` cache untracked and ignored; README's *Continuous integration* |
| — | Polish 1: the skeptics' nine minors *(off the plan)* | ½ day | **built, gated and documented** on branch `polish-1` (2026-09-28), off `main`'s `f6bad35` — `ActGuard`'s wiring under its self-test, 10g holding both halves of the late undo, the narrator's N1 from the decks alone and its pair check both ways, a 416 read as `lost`, `same-game.mjs` saying what it sets aside, a docs correction, a liveness clause written for the merge pass, and `var/check-all/` pruned to 20 runs; no wire change, no step, no decision; *Polish 1*, after *The undo race* |
| — | Lane LOOK: the comic look, to production *(report 15 §9.1, the first art-direction lane; the user approved the direction)* | 1 day | **built, verified, documented and committed** on branch `look` (2026-09-28), rebased onto the undo race's `f6bad35` — every figure, dying body, duelist and painted prop in the comic look by default: three cel bands from a lens-fixed key, halftone, a rim, an ink line inside bloom's pass that inks only what is painted, a contact shadow, a mid-value stage in each seat's shown colours; `?look=holo` the hologram; a seat's figures facing the opponent (question 13, answered); **D137–D146**, written as D120–D129; one verification pass; twenty-one follow-ups, half of one closed at merge; *Lane LOOK*, after *Guards* |
| — | Lane BODIES: resting poses, hair, faces, coats that drape, the art's own colours *(report 15 §9.3, the third art-direction lane)* | 1 day | **built, verified three times, documented and committed** on branch `bodies` (2026-09-28), rebased onto Lane MOTION's `e2aee03` — every person rests in a pose of its own (a model variant), wears hair and a comic face and a coat that drapes from the hips, and a card with no hand-written look takes its colours from its own painting (drawn since the merge); **D156–D165**, written as D140–D149; at merge the verifier's two open majors fixed (a figure that mounts tapped lands in its kneel; the art rung drawn, its test failing with any gate removed), Lane LOOK's follow-up 17 and the polish lane's poll clause applied; with Lanes LOOK and MOTION, **rebased onto `main`'s `a08c15f`** (after CI, Polish 1 and Guards), Polish 1's follow-ups 1 and 2 applied (the arena's `lost` word) and the final skeptic's minors fixed or written down; *Lane BODIES*, just above *Deferred* (its *Onto `main`'s `a08c15f`*) |
| — | The docs block: `CLAUDE.md` split by directory, and the owner's two policies *(off the plan; the structure review of 2026-09-28)* | ½ day | **built, gated and documented** on branch `docs-block` (2026-09-28), off `main`'s `102fb1f` — the history out of `CLAUDE.md` into two evidence files; **D200** (decision numbers are final), **D201** (Claude commits on branches and merges on a green gate; pushes, releases and anything public are the user's), **D202** (CI's pinned engine fetch); rule 10 pointing at the lint; a root `CLAUDE.md` of about 5,600 words and four nested files, held by `web/test/claude-md.test.ts`; *Open now*; the Java guide's map of `WireGuiGame.java`; gate green at `GATE_JOBS=4`, 259.2 s; *The docs block*, just above *Deferred* |
| — | The personal tier, phase 1: the folder, the manifest and the pipeline *(off the plan; the user's decision of 2026-09-28 — "this can never ever ever be sold or published")* | 1 day | **built, gated and documented** on branch `personal-tier` (2026-09-28), off `main`'s `a08c15f` and rebased onto `f2c934d` — `tools/personal/` (import, prepare, check) over a gitignored `personal/models/<slug>/`, Doctor Doom run through it, three verification rounds; **D190–D193**; gate green at `GATE_JOBS=4`, 262.4 s; *The personal tier*, just above *Deferred* |
| — | The personal tier, phase 2: the loader, the other seven models, the workshop | 1 day | **built, gated and documented** on branch `personal-tier-2` (2026-09-28), off `main`'s `096c952` — the clip set baked in, the paint step, `--joints`, `check.json`; a dev-server index and route; THE lookup (hard rule 8, a hostile corpus sweep); Doom as the villain duelist and on his card, and Coulson, Fury, Peggy, the MCU Wasp and the Hulks on theirs; the workshop's badge, toggle and inspect view; the catalog's engine facts; **D194–D196**; gate green twice at `GATE_JOBS=4`, 241.7 s and 241.3 s; **fix pass 1** (2026-09-29): the personal tier's own triangle line, a sum benched at its worst case (**D197**), a model's own colours exposed and never blued (**D198**), three minors; gate green at 241.5 s; *The personal tier*'s *Phase 2* |

**Off the milestone plan, 2026-09-27: the card library and the card browser**
(**D90–D94**) — brought forward from the deferred list on the user's request, as
dev-server **tools** rather than a milestone: a local SQLite + FTS5 index of every
card under `tools/card-library/`, an image cache, and a `#cards` browser. Built,
reviewed twice and fixed, and committed on `main` as `754f504` (worktree
`/home/justin-a/code/mtg-table-t2g`, branch `card-library`). Nothing on the wire
or in `bridge/` moved, and the board gained one link (`▦ cards`, beside the arena
toggle) and nothing else. *The card library and the card browser*, just above
*Deferred*, has the status, the commands and the follow-ups.

**Off the milestone plan, 2026-09-27: engine and sets** (**D109–D112**) — the
user's Reality Fracture pre-release pool, and the question of which Forge plays
it. **The engine stays Forge 2.0.14**, by the user's own rule: *"Let's not break
anything to force in the latest cards."* The set arrives the day an official
Forge release ships it; until then the pool is prepared (`decks/fra-rw-aggro.dck`,
a draft opponent, a per-card deck audit, the saved bridge port as a patch) and
nothing about how the game runs has changed. **Committed on branch
`engine-upgrade`**, rebased onto `main`'s `a092d3a` (2026-09-27, after slice 4,
the workshop and match setup) and gated there, and on `main` since `aead79d`. *Engine and sets*,
just above *Deferred*, has the rule, the measurements, the checklist for the day
and the follow-ups.

**Also off the plan, 2026-09-27: a hardening pass** (**D113–D115**, amendments
**M45–M46**) — seven small defects from the follow-up lists, each fixed at its
cause and each with a test or gate assertion that fails without the fix: gate
step 6 no longer flakes or exits 141 under load, an instant `newGame` can no
longer end the next game, an engine crash fails the run, the T-pose flash, the
seat plates in `visibleShare`, the catalog drift check in the gate (12b), and the
`@gltf-transform/cli` pin. Rebased onto match setup the same day and onto
engine and sets on 2026-09-28, with the
engine-crash check in the gate (12c) and the arena's seat plate held to four
one-line rows inside the top band. Its first verification round found step 6
comparing no stack, `priority` or mid-game combat, and every attack and block cue
jumping at both ends; both are fixed. *The 2026-09-27 hardening pass*, just above
*Deferred*, has the table, the two rebases, the round and what is left open.

---

## M0 — The engine runs our code

**Status: done** (evidence: [`docs/evidence/m0-smoke.md`](docs/evidence/m0-smoke.md)).
**Effort: 1 evening.**

**Command**

```bash
./tools/check-forge.sh && ./bridge/build.sh && ./bridge/run.sh mtgtable.Smoke
```

**Deliverable.** The first commit. In under 10 seconds the run prints the
`FModel.initialize` timing (measured ~2,033 ms), `cards in DB = 95126`,
`deck = … (40 cards)` and an AI-vs-AI match result — with `~/.forge` and `~/forge`
provably untouched (`sha1sum` the trees before and after, specifically
`~/.forge/decks/constructed/`).

Files: `LICENSE`, `NOTICE`, `README.md` with its NON-GOALS list, `.gitignore`,
`PLAN.md`, `DECISIONS.md`, `CLAUDE.md`, `docs/protocol.md`, `config.json`,
`tools/check-forge.sh`, `tools/make-forge-home.sh`, `forge-home/`,
`bridge/build.sh`, `bridge/run.sh`, `bridge/src/mtgtable/HeadlessGuiBase.java`,
`bridge/src/mtgtable/Smoke.java`.

**Watch for.** `GuiBase.setInterface(...)` must be the first Forge call in the
process. `isGuiThread()` must be the named-thread check. Record whether
`Match.prepareAllZones` emits any `revealUnsupported` complaint for an MSH/MSC
card.

**Resolved 2026-09-11.** The `SVar 'Any' not found in ability, fallback to Card
(Quantum Reduction)` warning — which also fires for Helicarrier Strike, the
deck's other `K:Teamwork:2` card — is **benign and informational, not a finding**.
The string `"Any"` is a hard-coded sentinel inside `CostTeamwork`, not in any card
file, so no override can remove it; the computed amount is 0 either way and all
three rules paths skip it. `Smoke` / `RecordMatch` classify it as `svar-fallback`
at **informational** level and a non-zero count is not a failure
(`docs/research/08-deck-card-coverage.md` §3).

Also resolved here: the bootstrap now sets `FPref.UI_SELECT_FROM_CARD_DISPLAYS`
to `"false"` (**D13**) and `make-forge-home.sh` installs the corrected
A.I.M. Scientists card script (**D14**), which `Smoke` verifies by printing the
loaded card's keywords.

## M1 — Record a game and scrub through it in the browser

**Status: done** — the hardening pass landed and all six of its follow-ups are
closed (evidence: [`docs/evidence/m1-record.md`](docs/evidence/m1-record.md),
[`m1-web.md`](docs/evidence/m1-web.md),
[`m1-hardening.md`](docs/evidence/m1-hardening.md),
[`m1-followups.md`](docs/evidence/m1-followups.md)).
**Effort: 2 evenings.**

**Command**

```bash
./bridge/run.sh mtgtable.RecordMatch --deck decks/pacho-shield.dck --seed 42 \
    --out fixtures/games/g1.jsonl
npm --prefix web run dev:replay            # opens /?replay=games/g1.jsonl
./tools/check-all.sh                       # the gate: lint, build, smoke, re-record, redaction, web tests
```

**Deliverable.** Two AI seats play to completion and write the frame log; the
browser then shows a text board — turn/round, phase, both life totals, each zone
as a list, hands as backs, library counts, the stack, combat bands — with
prev / next / play / speed.

This is the keystone. It builds `Json`, `Snap`, redaction, `GameLog`,
`protocol.ts`, `reduce.ts`, the `Transport` interface and the entire board
renderer **with no socket, no blocking input and no possible deadlock**, and it
leaves committed fixtures so every later front-end evening runs without a JVM.

Also ships here: a redaction test that feeds `g1.jsonl` to a checker asserting no
opponent hand card ever carries a `name`.

**Added 2026-09-11.** Every `state` frame also carries `events`
(`docs/protocol.md` §3.6): the engine events the snapshot reflects, as id-only
objects. The text board lists them; they exist for M7. The redaction checker also
asserts no `name` key appears under `events`.

**Hardening pass, 2026-09-11 (what M1 shipped without, and then got).** Two audits
landed after M1 was first recorded — `docs/research/06-hidden-information-audit.md`
and `07-wireguigame-spec.md`, plus `08`, `10` and `11` — and the M1 review found a
second, ungated string path to the wire. The protocol amendments are applied
(`docs/protocol.md` → "Amendments"); the M1 work items are:

- the five-key redacted stub (`owner` added), `library: {count, cards}`, `Card.alt`
  and `Card.token` in `Snap.java`, `protocol.ts` and the checker;
- `tools/lint-bridge.sh` (the banned-accessor grep, wired into `bridge/build.sh`)
  and `tools/check-all.sh` (the one command to run before committing);
- `tools/check-redaction.mjs` grows report 06 §9's assertions A1–A11, including
  **name-before-reveal** — a full opponent-owned card in a hidden zone is a
  failure unless that id was revealed earlier through a public zone, an `ask`
  body, `input.focusCard` or `library.cards`;
- fixtures `g1`/`g2`/`g3` re-recorded at seeds 42 / 7 / 2026 after the `Snap`
  change, with the web tests green on the regenerated files.

**Second round, same day (the hardening review).** Four more items, all of them
"the test does not test what it says":

- `check-redaction.mjs` was silently downgrading the **absence** of every field
  this pass added to a warning, so five reverted amendments passed the gate. The
  tolerance is now behind `--pre-amendment`, which nothing uses, and the checker
  has a negative-control corpus of its own — `fixtures/negative/redaction/`, one
  defect per file, asserted by `tools/check-redaction-selftest.mjs` as step 7 of
  `check-all.sh`.
- `fixtures/synthetic/sample-handwritten.jsonl` was still pre-amendment *and* was
  the only artifact carrying `input` / `ask` / `answer` frames, so P6 and P7 had
  no coverage at all. Regenerated with all **eleven** ask kinds, their answers,
  and the `input` fields P7 added — and `check-all.sh` now runs the checker over
  `fixtures/synthetic/` too.
- `library.cards` was `[]` in every recording, because neither deck runs a
  continuous `MayLookAt` static. `decks/future-sight-probe.dck` and
  `fixtures/games/future-sight.jsonl` are the engine evidence for P2, and the web
  suite now asserts the corpus still contains content rather than only a shape.
- the `faceDownHidden` shape retired by P3 was still specified as live in
  `docs/protocol.md` §3.3, §8.5 and §9, in `CLAUDE.md` rule 8 and in report 05's
  amendment note, while no emitter had produced one for hours.

What remains engine-unevidenced (`surveil` / `phased` / `foretold`, a face-down
card outside play, and every `ask`/`input` shape) is named as M2-E1…M2-E6 in
`docs/evidence/m1-hardening.md` §2.2 — an AI-vs-AI recording has no seat to
produce them, so they belong to M2, not to M1.

M1 is **not** reopened by any of this: the deliverable (record → scrub in the
browser) works. The hardening is what makes the redaction claim testable rather than
coincidental, and it is cheaper now than after M3 freezes the reducer.

### M1 follow-ups — all six closed, 2026-09-11

Raised by the hardening verifier, done during M2, each verified by mutation.
Evidence: [`docs/evidence/m1-followups.md`](docs/evidence/m1-followups.md) (the
per-item measurements and diffs) plus
[`m2-console.md`](docs/evidence/m2-console.md) §5 and the review pass below.
**Nothing on this list is outstanding**; what M1 left genuinely open is the
engine evidence for the ask kinds, which is on the M2 follow-ups list.

- **closed** — `tools/check-redaction.mjs`: an opponent's library dumped as full
  cards now **fails** by default, with `--opponent-library-ok` as the explicit
  escape. Proved by mutating a fixture: exit 1 without the flag, exit 0 with it.
- **closed** — `tools/check-redaction.mjs` asserts per-kind `answer` shapes
  (`ANSWER_RULES`), including the two kinds with no null default. It now also
  asserts per-kind **`ask`** shapes and their declared nullability.
- **closed** — `tools/check-all.sh` step 6: the fresh re-record is normalised
  (`t`, `startedAt`, `gameId`) and diffed against `fixtures/games/g1.jsonl`.
- **closed** — the redacted stub's `zone` is non-null: `Snap.card()` falls back
  to the caller's hint and then to `"unknown"`.
- **closed** — `web/test/render.test.tsx` mounts `<Board/>` over every fixture
  under vitest, and `npm test` runs it after the node suite.
- **closed** — `fixtures/synthetic/sample-handwritten.jsonl` is regenerated from
  `tools/make-sample-fixture.mjs` with all eleven ask kinds, the five-key stub,
  `token` / `alt` / `library.cards`, and a session header carrying `transport`.

### M2 review pass, 2026-09-11 (what the reviewer found, and what closed it)

Ten findings against the first M2 build. Three majors and seven minors; the wire
changes are `docs/protocol.md`'s **M1–M7** amendment rows.

- **`notice` was an ungated string path.** `message(message, title)` wrote both
  arguments verbatim and `PlayerControllerHuman.notifyOfValue` passes
  `CardView.get(sa.getHostCard()).toString()` as the title, so five recordings
  carried `{"title":"Thriving Isle (49)"}` while card 49 was a hidden stub in the
  opponent's hand. `Snap.sweepText` now gates both strings, `WireGuiGame` caches
  the frame's concealed-id set on the game thread, and `check-redaction.mjs`
  **fails** on a hit (protocol §6).
- **`over` was emitted only from `finishGame`/`afterGameEnd`**, which Forge does
  not reliably call after a concede: two of four identical console runs wrote no
  `over` at all and still exited 0. The outcome capture is now the emitter, and
  the console quit path exits **2** when there is still no `over` (protocol §7).
- **Nine of the eleven ask kinds had never been dispatched by Forge.** The answer
  marshalling moved to `mtgtable.Ask` (no Forge types) and
  `mtgtable.AskSelfTest` drives every kind from real JSON in `bridge/build.sh`;
  two probe decks reach two of the nine for real —
  `decks/trample-probe.dck` → `assign_damage`, `decks/scry-probe.dck` →
  `input.focusCard` — and are committed as fixtures.
- Plus: gate 0 now covers a null `ZoneType` on the M2 card entry points;
  `NullTransport` delivers its null through `onAnswer` so its log has answers
  rather than looking like a wedge; `Transport.Inbound`'s thread contract says
  what the asserts actually enforce; three ask fields agree at both ends; and the
  run summary prints the game-thread / EDT split of every focus push.

### M2 verification pass, 2026-09-11 (an independent replay of the evidence)

A verifier rebuilt from scratch, ran six games and re-derived every number.
Nothing under `~/.forge` or `~/forge` changed; the gate passed; the redaction
audit found no leak. Seven findings, two of which were real defects and five of
which were the docs and the gate lagging the code. All closed:

- **major — `GameLog.close()` self-deadlocked against its own appender thread.**
  `close()` was `synchronized` and held the monitor across `thread.join(30s)`,
  while `drain()` needed that same monitor after every written line, so a line in
  flight meant the join **always** timed out and the file was truncated at
  whatever the appender had flushed (measured: `n=1 → close() = 30,000 ms`;
  `n=20000 → 12,089 of 20,001 lines`). It fired in 2 of the verifier's 6 real
  games — `total wall` exceeding `game wall` by exactly 30 s — and every
  `frames = N log line(s)` printed after it was wrong. The counter is an
  `AtomicLong`, the appender takes no lock, the join is outside the monitor, and
  a join that still times out **throws**. `mtgtable.GameLogSelfTest` (new, in
  `bridge/build.sh`) asserts close in under a second and exactly `N+1` lines;
  re-introducing either half of the defect makes it exit 1.
- **major — the protocol's clickability rule was falsified by M2's own
  recordings.** Closed as amendment **M8**; see `docs/protocol.md` §4/§4.1/§4.2,
  report 10 §0.0 item 6 and §18.3, `web/src/render/Board.tsx`, and the test in
  `web/test/human-seat.test.ts` that pins it to the corpus (328 of 345
  `clickCard` acts fall outside `input.selectable.cardIds`).
- **minor — `onResync()` disarmed the pre-input act guard** (the fix, and the
  test M3 owes it, are under M3 below).
- **minor — the "no thread of ours is named `Game*`" assert covered 2 of 7
  names.** All seven are constants now, `HeadlessGuiBase`'s static block checks
  the whole set against the stronger `mtg-table-` prefix, and
  `tools/lint-bridge.sh` **rule 6** greps every `new Thread(` under `bridge/src`
  for a name that resolves to one — which catches a thread that no run
  constructs.
- **minor — the gate never ran the console or auto transports.**
  `tools/check-all.sh` has two new steps: the documented console smoke (exit 0,
  exactly one `over`, `over` last) and one `--transport auto --seed 11` game (a
  seed no fixture uses; zero UNIMPL, zero emit errors). Both logs go through
  `check-redaction.mjs`, which now downgrades its two "this file proves nothing"
  assertions to **warnings** when every `state` in the file is `turn: 0` — the
  documented console command concedes before a card is dealt, so the repo's own
  gate used to reject the artifact the repo's own docs told you to make.
- **minor — two emitter defects.** A frame emitted before `openView` went on the
  wire with `seq: 0` (amendment **M9**): `GameLog` numbers and holds it until the
  session header instead. And `assignGenericAmount`'s fallback arm wrote
  `String.valueOf(t)` as an option label — unreachable today, but the exact shape
  of the leak amendment M1 closed — so it writes the class name, like its sibling
  in `assignCombatDamage`.
- **minor (no code) — the size of the unevidenced surface, stated where a reader
  will see it.** `docs/evidence/m2-console.md` §8 now says: across eleven
  recordings the engine has dispatched **three** of the eleven ask kinds.

## M2 — A full game against the AI, in the terminal

**Status: done**, with eight follow-ups open below and none of them blocking M3
(evidence: [`docs/evidence/m2-console.md`](docs/evidence/m2-console.md) — §11 is
the current status — plus the review pass and the independent verification pass
above).
**Effort: 2 evenings.**

**Command**

```bash
./bridge/run.sh mtgtable.MtgTable --transport console --seed 42
```

Type `?` at the prompt for the command list; `README.md`'s *Playing the console
game* is the same table in prose. The other two transports are the same seat
without a human in it — `--transport auto` plays a minimal legal game by itself
(D16) and `--transport null` answers every ask with `null` so the game runs on
Forge's own documented defaults. All three are in `tools/check-all.sh`.

**Deliverable.** The user beats (or loses to) the Forge AI with their own deck,
without a browser.

**What the evidence actually shows** (`docs/evidence/m2-console.md`, plus the two
passes below):

- **Games finish.** Four complete games to a terminal `over` in the first pass
  and more since, with **zero `UNIMPL`**, zero emit errors and zero dropped
  events. **22 of the 37** members have fired in a real game; the other 15 are
  implemented and never reached by a W/U deck at `setGamesPerMatch(1)`.
- **Redaction survives a human seat**, which is the first time it was tested at
  all: across the five committed human-seat fixtures there are **3,164 opponent
  hand cards** (1,638 in the three `human-auto-*` alone) and **every single one
  is the five-key stub** — `{controller, hidden, id, owner, zone}`, no other key
  set occurs. `check-redaction.mjs` passes all five. The review pass then closed
  the one string path that was not gated (`notice`).
- **Five committed fixtures now carry the frames an AI-vs-AI recording cannot
  produce** — `input`, `ask`, `answer`, `notice`, `over`, and a `transport` key
  in the session header: `human-auto-{42,7,2026}.jsonl` plus the two probe-deck
  recordings `human-trample-7.jsonl` (the `assign_damage` ask) and
  `human-scry-7.jsonl` (`input.focusCard`).
- **The gate runs the seat.** `tools/check-all.sh` was twelve steps and green at
  the end of M2 (it is **thirteen** now that M3 added the ws step), three of them
  fresh human-seat games (null, the scripted console smoke, and `auto` at a seed
  no fixture uses), each asserted to end in exactly one `over` as its last frame,
  each log put through `check-redaction.mjs`. Every JVM step is under a
  `timeout`.
- **`docs/protocol.md` needed no new shape for M2** — every body emitted already
  conformed to §2.2/§3/§4/§5. The nine amendments **M1–M9** it did gain are
  corrections the two review passes forced, not M2 discovering the spec was
  short.

Five decisions the build made are now written down: **D15** (the ask timeout is
a transport policy: infinite for the console, 30 s for `auto`/`null`), **D16**
(`AutoTransport` is the automated human and `NullTransport` overrides only its
answer half), **D17** (acts hop to the virtual EDT, answers arrive on
`mtg-table-io`, both asserted), **D18** (`isLibgdxPort()` stays `false`, so the
input path is the primary path) and **D19** (phase stops live in `WireGuiGame`'s
own map, seeded from the prefs and never saved).

`WireGuiGame` with all **37** abstract members present behind `Transport`, plus
`ReplyPool` and `ConsoleTransport`. This de-risks the whole threading model —
virtual EDT, latch-blocking vs value-returning calls, answering from a third
thread — with no WebSocket and no DOM. Every unimplemented member logs
`UNIMPL <name>` and returns a safe default rather than throwing, so a game
degrades instead of dead-ending and the log says which of the 37 actually fire for
a W/U deck.

<a id="fu-m2"></a>

### M2 follow-ups — four closed by M3, one by M5, two open, one standing (2026-09-11)

M2 is **done**, not perfect. Everything below was carried from the builders' and
the verifiers' own "problems" notes; none of it blocked M3, and each line says
who should pick it up. Nothing here is a known leak — the redaction gate is
closed and tested — they are gaps in *evidence* and two small decisions left
standing. **M3 closed items 1, 5, 6 and 8**, moved the live half of item 2 onto
the M3 follow-ups list below, and left 3, 4 and 7 exactly where they were.

| # | what it was | status after M3 |
|---|---|---|
| 1 | the last `state` before `over` | **closed** — the emitter flushes it; amendment **M11** names the one path that cannot |
| 2 | ask kinds with no engine evidence | **closed by M5, 2026-09-12** — was seven, then six; now nine of eleven are engine recordings and the other two (`options`, `manipulate_list`) are proved unreachable in the jar's bytecode. `sideboard` alone remains, as M5 follow-up 1 |
| 3 | gate 0's `"unknown"` arm never observed | **open**, unchanged |
| 4 | M9's pre-header path is self-test-only | **open**, unchanged |
| 5 | the `transport` header key optional or mandatory | **closed** — it stays optional (**D26**) |
| 6 | report 07 §10 step 3 is wrong | **closed** — corrected in place, 2026-09-11 |
| 7 | `emitOver`'s wait loop was kept, not deleted | **standing** — still a decision, still kept |
| 8 | two transport tests belong to M3 | **closed** — `tools/ws-smoke.mjs` and check-all step 10 |

1. **closed — the last `state` before `over`.** Amendment
   **M4** says `over` is emitted "after the `state` that carries it", but today
   the emitter reaches `over` through `captureOutcome()` rather than through a
   final `flushState`, so `over` can arrive with no `gameOver` snapshot in front
   of it. The committed `fixtures/games/human-auto-42.jsonl` has 1,611 lines /
   227 `state` frames; today's build produces 1,610 / 226, and the missing one is
   exactly that final snapshot. It was proved to **predate** the verification
   pass (the same seed on a build with that pass's three `WireGuiGame` edits
   reverted produces the same 1,610). Either emit the final `state`
   unconditionally or soften M4's wording — and then re-record. See
   `docs/evidence/m2-console.md` §10.4.
   **Closed in M3, and the answer was both halves** (`docs/evidence/m3-ws.md`
   §6.1): `captureOutcome` now emits that final snapshot itself, on the game
   thread, when nothing else has — M4 as written — and amendment **M11** softens
   M4 for the one path where it provably cannot, a concede *before* the engine
   has asked this seat for anything, which `applyAct`'s pre-`inputSeen` guard
   ends on the EDT with no Forge outcome to snapshot. There `over` is
   `{winner: null, reason: null, matchOver: true}` with no `gameOver` `state` in
   front of it and the bridge prints `OVER WITHOUT A gameOver STATE` on stderr.
   **A client must not require the preceding snapshot**; the board's reducer
   never did, and its banner now says *"No result — the session ended before the
   engine published an outcome"* rather than "Draw." for that shape. The five
   human fixtures were re-recorded with the final snapshot present.
2. **closed by M5 — six of the eleven ask kinds still had no engine evidence**
   (was seven; **`ability_menu` closed it in M3's review pass**). The committed corpus now
   contains **four** — `choose_list`, `order`, `assign_damage` and `ability_menu`
   — and a fifth, `choose_entities`, fired in an uncommitted console session
   (`m2-console.md` §3.2). `assign_damage` no longer needs
   `decks/trample-probe.dck` to appear: the primary deck reaches it at seed 42
   now that a multi-ability card can be cast at all. `confirm`, `options`,
   `text`, `assign_amount`, `manipulate_list` and `sideboard` are implemented
   against report 07 §7, unit-tested by `mtgtable.AskSelfTest`, and shape-pinned
   by `ASK_SHAPES` plus the hand-written fixture — **none of which can prove the
   emitter**. Two of them are reveal surfaces and are already scheduled as M5's
   first move (the probe decks). **CLOSED 2026-09-12**, by four probe decks and
   two bytecode proofs — see M3 follow-up 4 below and §M5.
3. **Gate 0's `"unknown"` arm has never been observed at runtime.** `unzoned
   cards = 0` in every game run so far, so the null-`ZoneType` branch of
   `Snap`'s concealment gate is reasoned and reviewed, not measured. Reaching it
   needs an LKI view / `getCardForUi` / a `chooseCardsPile` header, and no
   committed deck produces one.
4. **Amendment M9's pre-header path is self-test-only.** `GameLogSelfTest`
   covers it deterministically, but no real run has emitted a frame before
   `openView`: `printf "q\n" | … --transport console` still delivers the concede
   after the seat exists. The bounded buffer and the empty-file-plus-stderr
   behaviour have no engine evidence.
5. **closed — the `transport` session-header key stays optional, deliberately.**
   `RecordMatch`
   does not write it, so an absent key means "an engine recording with no seat"
   and the six AI-vs-AI fixtures did not have to be regenerated. The cost is that
   the checker's A12 rule is conditional: a `null` answer to `order` or
   `choose_list` is a **warning** when the header says `transport: "null"` and a
   failure otherwise. Making the key mandatory means regenerating every fixture;
   that is the decision, and it is cheapest to take before M3 adds `"ws"`.
   **Taken in M3** (`docs/evidence/m3-ws.md` §7.2, now **D26**): it stays
   optional, `RecordMatch` stays untouched, and the six AI-vs-AI fixtures keep
   their bytes. A ws session's header says `transport: "ws"` like any other seat
   log, so nothing about M3 needed the key to be mandatory, and the price —
   regenerating six fixtures on a non-deterministic emitter to sharpen a rule
   that already catches its case — got worse with `ws`, not better.
6. **closed — `docs/research/07-wireguigame-spec.md` §10 step 3 was wrong.**
   It prescribed a null transport that answers only asks and
   expects a finished game; measured, that parks at the coin toss after five
   frames, because with `isLibgdxPort() == false` the seat is driven by the input
   path (D18). `NullTransport` therefore extends `AutoTransport`. The step now
   says so, in place, with a dated correction note, so the next reader does not
   rebuild the same dead end.
7. **standing — `emitOver`'s wait loop was kept, not deleted.** The verification
   pass considered removing it and did not; it is redundant with the outcome capture
   in the common path but still the thing that makes `finishGame` idempotent
   under a concede. Left as-is, named here so it is a decision rather than an
   oversight.
8. **closed — two transport tests belonged to M3, not here** — the
   `connect → resync → concede` case and a scripted `--transport ws` step in
   `check-all.sh`. **Both landed**: `tools/ws-smoke.mjs` (and its
   `--disconnect-mid-ask` variant) and check-all's step 10, which now runs
   **four** fresh ws servers (10a-10d).

**Five findings from `docs/research/07-wireguigame-spec.md` that change how this
evening is spent.** Read that document before writing a line; it is the M2
implementation spec.

1. **There is a 37th abstract member.** `AbstractGuiGame` declares
   `protected abstract void updateCurrentPlayer(PlayerView)` — it is not on
   `IGuiGame`, so the name-level diff that produced "36" missed it, and **the
   class will not compile without it**. Note the `protected`.
2. **Build the `input` path first; the `ask` path is secondary.** With
   `isLibgdxPort() == false`, almost every yes/no goes through `InputConfirm`
   (prompt + buttons) rather than `IGuiGame.confirm` — every direct
   `getGui().confirm(...)` call site is guarded by `if (getGui().isLibgdxPort())`.
   A console client that implements only the blocking calls will sit at a prompt
   it never receives. This is the single biggest scheduling fact in the spec.
3. **`handleGameEvents` can fire off the game thread.** Our forwarder is an
   `InputQueue` observer, and `InputQueue.updateObservers()` is reached from
   `removeInput`/`clearInputs` via `InputSyncronizedBase.stop()`, which runs on
   whatever thread delivered the click. Walking `CardView` there corrupts the
   `Tracker` silently. So: **guard on `ThreadUtil.isGameThread()` and buffer the
   batch when it is false**; the next game-thread flush ships it. Log the deferred
   count — a non-zero value confirms the finding and is expected, not a bug.
4. **`openZones` / `tempShowZones` are not questions**, and they arrive on the
   **EDT**, where blocking stalls every prompt. Answer them locally, echo the
   argument, and push `input.openZones` (`docs/protocol.md` §4.3). The
   `open_zones` ask kind is gone; eleven kinds remain.
5. **Three rules, written down before anything else** (spec §2.5): a push method
   may touch only `getId()` on a view; only the game thread may block (every
   value-returning override opens with
   `if (!ThreadUtil.isGameThread()) return <local default>;`); and **no thread we
   create may be named `Game*`**, because `ThreadUtil.isGameThread()` is a bare
   `getName().startsWith("Game")`.

Two shapes that will otherwise be written wrong: `OrderResult` is
`(List<T> ordered, boolean rememberDecision)` and `order` must **never** return
`null`; and ask options are addressed by **ask-local index**, because Forge's `T`
is frequently a colour, an integer or a cost rather than a view object
(`docs/protocol.md` §5.1).

## M3 — The same game, in a browser tab

**Status: done** — a review pass and a fix pass, all 21 findings closed, with
eleven follow-ups open below and none of them blocking M4 (evidence:
[`docs/evidence/m3-ws.md`](docs/evidence/m3-ws.md) — §14 is the current status —
and [`docs/evidence/m3-web.md`](docs/evidence/m3-web.md) §12, plus the two passes
below).
**Effort: 2 evenings.**

**Command**

```bash
./scripts/play.sh
```

**Deliverable.** Play the S.H.I.E.L.D. deck against the AI to a win or a loss in
Chrome, clicking card names in lists and text buttons. Ugly, complete, and the
protocol is now proven against every question the engine actually asks. **This is
the "it works" moment**; everything after is polish.

`WsTransport` (netty `HttpServerCodec` → `HttpObjectAggregator(1MB)` →
`ChunkedWriteHandler` → `WebSocketServerProtocolHandler("/ws")`), `hello_ok`,
reconnect via `resync`, `cancelAll()` on disconnect, per-ask timeout. `web/` swaps
`ReplayTransport` for `WsTransport` — **the board component is unchanged**. Every
session is logged and replayable.

**What the evidence actually shows** (`docs/evidence/m3-ws.md` for the socket,
`m3-web.md` for the board, plus the two passes below):

- **`./scripts/play.sh` is the whole command.** check-forge → `bridge/build.sh` →
  the bridge in the background (`var/play/server.log`) → poll `GET /health` until
  it answers `200 ok` → vite, opening **`http://127.0.0.1:5173/?ws=1`**. Ctrl-C
  stops both halves, and so does the bridge exiting on its own after `over`.
  `/health` is the **session's** readiness, not the port's (**D21**): 503
  `starting` for the ~1.2 s between `bind` and `openView`, 200 after.
- **A game is played in a browser by clicking.** Real mouse clicks in Chrome
  carried a session from the coin toss to `over`: land drops, a creature cast
  through Forge's own `Pay Mana Cost` prompt with the OK button relabelled
  `Auto`, a discard chosen from `selectable`, a multi-ability card played through
  the `ability_menu` modal, `Escape` = Cancel (the `End Turn` label), Space = OK,
  and a two-click Concede that ended it (`m3-web.md` §2, §3, §10, §11).
  **9 of 10 card clicks in that session named an id the engine had not listed** —
  amendment **M8**, and the reason a board that gated clicks on `selectable`
  could not play a land.
- **A whole game unattended over the socket.** `tools/ws-auto-play.mjs` at seed
  42: 1,368 frames in, 236 out, 230 `state`, 226 acts, 8 asks all answered,
  36.4 s, exit 0; server side 22 player turns, 1,603 log lines, **zero
  `UNIMPL`**, zero emit errors, one `over` and `over` last. The gate runs the
  same client at seed 13 every time (step 10c): 1,318 frames, 183 acts, 3 asks,
  15 turns. The redaction gate runs on those socket recordings — **833 opponent
  hand cards in the gate's, every one the five-key stub**, engine strings swept,
  nothing joinable to a concealed card — and on the **client's** log too, in
  `--client-log` mode (amendment **M17**).
- **The socket's five behaviours are each measured** (`m3-ws.md` §4): connect →
  `resync` → concede; disconnect mid-decision → reconnect → the game is still
  there; `ping`/`pong`; a second client refused with one `notice` and close code
  **4001**; garbage in answered with a `notice` rather than a dropped socket.
- **The gate is thirteen steps** and step 10 ran **four** fresh ws servers on
  port 8643 (10a `ws-smoke`, 10b `ws-smoke --disconnect-mid-ask`, 10c a whole
  game through `ws-auto-play`, 10d `ws-auto-play --refuse-first-ask`, the only
  thing in the repo that exercises `ReplyPool.cancelAll()` with a game thread
  genuinely parked). Every JVM step is under `GAME_TIMEOUT`. Re-run for the
  documentation pass on 2026-09-11: **exit 0, 163.2 s**
  (`var/check-all-doc-pass.log`; `docs/evidence/m3-ws.md` §14). **It is seven ws
  servers as of 2026-09-12** — M5 follow-up 5 added 10e, M5 added 10f and M6
  added 10g. **The count and the wall time live in one place, CLAUDE.md's
  §"Build and run" gate paragraph**, and this bullet deliberately no longer
  repeats them: two dated numbers in two files is how the repo ended up saying
  "five servers, 3 m 19 s" on the same day as "seven servers, eleven and a
  half minutes".
- **The protocol grew twelve rows and no new `v`.** M10–M13 while the socket was
  written, M14–M19 in the review pass, M20–M21 in the fix pass. Only **M14** (the
  asynchronous `ability_menu`) changes what a recording contains; every M1/M2
  recording is still valid, and the five human-seat fixtures were re-recorded for
  M14 and M11.

**Three things the M2 verification pass left on M3's doorstep — all closed.**

1. **A transport test for connect → `resync` → `concede`,** asserting no
   exception and an `over` frame. `resync` is a first-class client frame
   (`docs/protocol.md` §2.4) and a browser that autoconnects will send one before
   Forge has asked this seat for anything; `WireGuiGame.onResync` used to arm
   `inputSeen` and disarm the guard that keeps a concede out of
   `Match.prepareAllZones`, where removing a player mid-iteration throws inside
   Forge's own setup. The guard is fixed (`engineInput` vs `mutateInput`); the
   test is what keeps it fixed.
2. **The board sends a click for any card, not only a selectable one**
   (amendment **M8**). `selectable` is the *explicit* selection set and is empty
   for the whole of your main phase — 78 of 86 `clickCard` acts in
   `human-auto-42.jsonl` name an id outside it. Forge judges the click; a
   rejected one comes back as `notice{title:"Not selectable"}`.
3. **`--transport ws` belongs in `tools/check-all.sh`** the way `null`,
   `console` and `auto` now are: a scripted session under the same
   `GAME_TIMEOUT`, exactly one `over`, `over` last, and its log through
   `check-redaction.mjs`.

**How the three were closed.** (1) `tools/ws-smoke.mjs` is that test — connect →
`resync` → concede, no exception, one `over`, `over` last — and it is gate step
**10a**; the guard it protects is measured in `m3-ws.md` §4.1. (2) The board
sends `act: clickCard` for **any** card and never gates on `selectable`: 78 of 86
clicks in the scripted socket game and 9 of 10 in the hand-played browser game
name an id outside it, and `web/test/ws-log.test.ts` pins the property to the
corpus. (3) Step 10 ran four fresh ws servers, each with those four assertions,
plus the **client** log through `check-redaction.mjs` in its own `--client-log`
mode (amendment **M17**).

**Three more that M2 handed over with the socket — all closed.**

4. **`WsTransport` owes an `askTimeoutMs` of its own** (**D15**). The console
   answers `0` — wait forever, because a human is thinking — and `auto`/`null`
   answer 30 s so a test fails fast. A socket is neither: the right cap is tied
   to the connection's liveness, not to a clock, and `cancelAll()` on disconnect
   is what unblocks the parked game threads. Deciding this by copying either
   existing value is the bug.
5. **It writes `transport: "ws"` into the session header** (amendment **M3**,
   §8.1), which is also the moment to settle M2 follow-up 5 — whether the key
   becomes mandatory and every fixture is regenerated.
6. **`Transport.Inbound`'s contract is the comment M3 is written against.** Not
   "called on `mtg-table-io`" but "never a game thread and never the EDT",
   asserted at the top of `onAct` and `onAnswer` (**D17**). Netty's event-loop
   thread satisfies it; a handler that hops to its own executor must still
   satisfy it.

**How those three were closed.** (4) **D24**: the ws ask timeout is **0 —
infinite — while a client is connected**, with a finite 120 s
`NO_CLIENT_ASK_TIMEOUT_MS` fallback only while nobody is on the socket, and
`cancelAll()` on disconnect as the thing that actually unblocks a parked game
thread. Neither existing value was copied; D15's "liveness, not a clock" is the
rule, and the ask is **re-delivered** on reconnect rather than spent on a §5.4
default (amendment **M19**). (5) `transport: "ws"` is in every ws session header,
and M2 follow-up 5 is settled the other way: the key **stays optional**
(**D26**). (6) `WsTransport` is the first transport with **no reader thread of
its own** — inbound frames are parsed and dispatched straight from netty's event
loop, named `mtg-table-ws`, which is neither a game thread nor the EDT, so every
`Transport.Inbound` assert stayed armed through every run (`m3-ws.md` §5). The
name is the eighth entry in `HeadlessGuiBase`'s static thread-name assert.

### M3 review pass — 2026-09-11, all findings closed

An independent verifier ran the gate, played the socket with three scripted
clients and one hand-written raw client, played a real game in Chrome, and read
the logs. Eleven findings; every one is closed, and each one that changed the
wire is in `docs/protocol.md`'s **M3 review pass** amendment table (M14–M19).

**The three that mattered.**

1. **A card with two or more playable abilities could not be played from any
   client, and the click was a silent no-op** — no `state`, no `input`, not even
   a `notice`. `getAbilityToPlay` is reached from inside a click, i.e. on the
   virtual EDT, where R2 forbids blocking, so it returned `null` while
   `selectCard` still returned `true`. The menu is now **asynchronous**
   (amendment **M14**): a normal `ability_menu` ask that no game thread is parked
   on, applied afterwards through `IGameController.selectAbility`. The kind had
   never been dispatched by the engine in any recording; re-recording the seat
   corpus produced **7** of them in `human-auto-42.jsonl` alone, each answered,
   each followed by Forge's own `Pay Mana Cost` prompt — and, because the policy
   can now cast a creature at all, the primary deck reaches **`assign_damage`**
   for the first time. That closes M2 follow-up 2 for two of its seven kinds.
2. **`GET /health` answered 200 about 1.2 s before `hello_ok` existed**, and a
   client that connected in that window got `input`, `notice`, `notice`,
   `hello_ok` — §2.1 inverted, and a readiness signal `scripts/play.sh` trusts
   that was not true. Amendment **M15**: 503 `starting` until the session exists,
   no resend to a socket that beats it, and `WS LISTENING` printed after
   `startMatch`.
3. **`npm --prefix web test` was not hermetic.** `web/test/ws-log.test.ts` globbed
   `var/` and asserted two properties of `ws-auto-play`'s *policy* as if they were
   properties of the protocol, so three leftover scratch directories turned a
   green suite red with nothing in the repo changed. The corpus is now given to it
   in `MTGTABLE_WS_LOGS` (check-all sets it to the logs step 10 just produced) and
   the committed fixtures otherwise; the answer-order rule is a **subsequence**,
   so an ask cancelled by `cancelAll()` at a disconnect is legal; and the M8 click
   assertion runs only on a dumb-human-policy transcript.

**The eight smaller ones.** `ReplyPool.cancelAll()` no longer latches the seat
shut after a socket drop, so an ask raised while nobody is connected parks up to
`NO_CLIENT_ASK_TIMEOUT_MS` and is re-delivered on reconnect instead of spending
the player's decision on a §5.4 default (amendment **M19**, measured). A client
`resync` is written to the frame log (**M16**). `Transport.Inbound.onResync`
asserts its two threads like its three siblings. `check-redaction.mjs` grew a
`--client-log` mode, auto-detected from a new `recordedBy` header key (**M17**),
and check-all now runs it over the client log it just wrote. Inbound websocket
frames are aggregated and size-capped explicitly, and a dropped frame comes back
as a `notice` instead of silence (**M18**). `scripts/play.sh` execs vite directly,
so Ctrl-C stops both halves instead of leaving a reparented dev server listening.
Every clickable card carries an `aria-label` naming the card rather than the act.
These four documents were brought up to date.

**One finding was stale rather than wrong.** The verifier reported that cards are
`<li>`s with no button role and are absent from the accessibility tree; in the
working tree they are real `<button>`s (`CardButton`), and `read_page
filter=interactive` on a live board lists all fourteen of them by id. What was
missing was the accessible *name* — the `title` explaining the act shadowed the
card — and that is what the `aria-label` fixes.

### M3 fix pass — 2026-09-11, a second verification, all ten findings closed

A second independent verifier re-ran the gate from a wiped `bridge/out`, drove
the socket on three seeds nobody had used, raced a client at a booting server,
sampled the live thread list, and played in Chrome. Three majors, seven minors,
all closed. The full write-ups are `docs/evidence/m3-ws.md` §13 and
`docs/evidence/m3-web.md` §11; the wire-level rows are amendments **M20** and
**M21**, and the two new decisions are **D22** and **D23** (which corrects D21's
scope).

**The three majors, and the shape they share:** two of them were *sentences this
repo had already written as guarantees* while the code kept only part of them.

1. **The pre-`hello_ok` window was open from the inbound side.** M15 closed the
   connect path and §2.1 claimed "both halves"; a c2s frame that *arrived* in the
   window was still answered, ahead of the handshake — `act` → `notice@1` then
   `hello_ok@2`, `resync` → `input@1` then `hello_ok@2`, the second being byte
   for byte the inversion M15's own row quotes as the bug. Reachable from this
   repo's own documented commands (both socket clients send `resync` from their
   `open` handler); only the `/health` poll in check-all and `play.sh` hid it.
   Now every inbound frame is dropped with **no reply** while no session exists
   (**M20**, **D23**), `resend()` carries the same guard, and the run summary
   counts the drops.
2. **The asynchronous `ability_menu` built its body on a second `Game-n` thread
   with nothing enforcing exclusion** — the javadoc's claim that the game thread
   is parked was true at submit time and unchecked at run time, on a per-click
   path, with silent `Tracker` corruption as the failure mode. The menu is now
   stamped with the input generation it was raised for and abandoned without
   walking anything if that generation moved (**D22**); it fires on none of the
   five re-recorded fixtures.
3. **§4.2's red "wedged game thread" banner fired on ordinary play** — twice in
   the first two turns of a real browser game, because its four clauses are also
   the ordinary state of not holding priority. It needs six (**M21**): and this
   seat holds priority, and no frame has arrived for 2.5 s. Measured over the
   corpus in `web/test/wedge.test.ts`: the old rule is true on 103–359 frames per
   recording and the worst gap to the next frame after any of them is **121 ms**,
   because Forge re-pushes every 250 ms while it thinks.

**The seven minors.** `ReplyPool.cancelAll()` with a genuinely parked ask is now in
the gate as step **10d** (`tools/ws-auto-play.mjs --refuse-first-ask`, asserting
the server's `cancelling 1 pending ask(s)`), which also makes M19's
`timeoutMs: 120000` measurement reproducible at seed 13 — the cap itself has
still never *fired*, and both the protocol row and the gate now say so.
`WsTransport.ask` recomputes its deadline at the point of parking, closing a
read-found race where a disconnect during body serialisation could park a thread
with no peer and no clock. `oob()`'s javadoc names all three seq-0 frames.
Space also matches `event.code === 'Space'`, so the binding is testable by a
driver that sets `code`. Concede disarms and disables itself after `over`.
Fixture drift was re-measured and the earlier reading corrected: **all five human
fixtures are stable in content and none is reliably stable in byte order** —
`human-auto-42` re-recorded identically once and differed twice in three runs, by
the `seq` assignment of the same three frames (identical multiset), and
`human-trample-7` differs by two of Forge's own `awaitNextInput` re-pushes and
nothing else. A byte-level drift step over these files would therefore be flaky
and is **not** added; an order-insensitive one is the shape a future attempt
should take (§13.5).

**Gate before this ships — now closed.** The `DelayedReveal` / `tempShowZones` /
`openZones` enumeration is
[`docs/research/06-hidden-information-audit.md`](docs/research/06-hidden-information-audit.md)
§2: twelve reveal paths, each with its wire channel and its leak signature, plus
the exhaustive grep of the three `mayLook` sets that is the complete
dynamic-reveal surface. What is left is *implementation*, and it must be in place
before a human seat exists:

- every card inside an `ask` or `input` body goes through the one serialising
  function, and **every option label** through the same gate (`"???"` when
  concealed) — the label, not the card object, is the leak that will actually
  happen;
- `input.focusCard` carries the serialised card, because `setCard` is pushed with
  cards that are not in the snapshot;
- the redaction checker runs on a recorded M3 session, not only on the M1
  fixtures;
- `docs/protocol.md` §10's planned M6 fields are already specified — add them
  while the reducer is still soft, or pay for it in M6.

`input.prompt` can still name a card the viewer may not see (Forge builds those
strings, we do not): the checker **warns** on it, and it is accepted residual
risk, documented in report 06 §10 (residual risk 3).

<a id="fu-m3"></a>

### M3 follow-ups — eleven, three closed 2026-09-12 (4, 5 and 7), eight open

M3 is **done**, not perfect. Every line below is carried verbatim from the two
builders' and the two verifiers' own "problems" notes, and none of it blocks M4.
**Follow-ups 5 and 7 were closed by a tooling pass on 2026-09-12** — two new gate
sub-steps, no change to `bridge/` and none to `web/` — and both are struck through
below with what closed them (evidence:
[`docs/evidence/m3-followups.md`](docs/evidence/m3-followups.md)).
**Follow-up 4 was closed by M5's probe decks the same day** (evidence:
[`docs/evidence/m5-probes.md`](docs/evidence/m5-probes.md)).
Nothing here is a known leak: the redaction gate now runs over a socket
recording and a client log as well as the fixtures. They are gaps in *evidence*,
two races that are shrunk rather than eliminated, and a handful of decisions
worth re-reading when their assumptions change.

1. **`NO_CLIENT_ASK_TIMEOUT_MS` (120 s) has never fired.** Step 10d now shows the
   cap being *set* on the wire (`timeoutMs: 120000`, seed 13, 7 ms after a drop),
   which is the half M19 cites; whether a disconnected window actually catches an
   `ask` is **seed-dependent** — at seed 17 the next ask arrives after the
   reconnect with `timeoutMs: 0` — so the gate reports that half instead of
   asserting it. If a deck or seed change stops producing it the gate stays green
   and only the `note:` line changes. The cap firing, and the §5.4 default it
   would spend, are still unmeasured.
2. **D22 shrinks the `ability_menu` race; it does not mathematically eliminate
   it.** A generation could still move between the check and the first field
   read. The argument that this is safe rests on Forge's `stop()` ordering
   (`onStop()` → `clearWeaklySelectable` → our `engineInput` bump, all before
   `cdlDone.countDown()`), which is read from the **2.0.15** forge-src as prose
   and is not a signature `javap` can confirm against the 2.0.14 jar. D22 says so
   rather than claiming the race is gone. If M5 makes asynchronous asks common,
   this is the first thing to revisit.
3. **The asynchronous `ability_menu` is not re-delivered by `resync`, and a stale
   answer is applied blind.** It never enters `ReplyPool`, so `WsTransport.resend`
   does not know about it; it self-heals, because Forge's input is still the one
   that asked and the client clicks the card again (protocol §5.3, **D20**). And
   if the player answers one long after the engine moved on,
   `applyAsyncAbilityMenu` still calls `IGameController.selectAbility` — Forge's
   own input has moved, so the call lands on an input that no longer wants it. A
   second outstanding-ask registry on the `Transport` interface for one kind was
   judged too much for M3; that judgement is what M5 should re-take.
   **M5 did not re-take it, and said why** (`m5-board.md` §10): the browser still
   answers a multi-ability card through the `ability_menu` and still never sends
   the `clickAbility` act, so asynchronous asks did not become common and neither
   this nor follow-up 2 changed. The act itself is now proven end to end from a
   script (`check-all.sh` 10f), which is the half that was missing.
4. ~~**Six of the eleven ask kinds still have no engine evidence**~~ — `confirm`,
   `options`, `text`, `assign_amount`, `manipulate_list`, `sideboard`.
   **CLOSED 2026-09-12**, by four probe decks rather than the two this item asked
   for: `confirm`, `text`, `assign_amount` and `choose_entities`-with-a-
   `delayedReveal` are now committed engine recordings; `options` and
   `manipulate_list` are **proved unreachable** in this configuration, in the
   jar's own bytecode (amendments **M22**/**M23**), which is a stronger answer
   than a recording would have been; and `sideboard` alone is still open and is
   now M5 follow-up 1, blocked on M6's multi-game session (**M27**). The probes
   also caught two *answers* that were legal and non-terminating — the class of
   defect an un-evidenced kind hides, and the reason this item was worth the
   evenings. Full table: §M5 above and `docs/evidence/m5-probes.md` §1.
5. ~~**Amendment M11's exception path has never been observed.**~~ **CLOSED
   2026-09-12.** `tools/ws-smoke.mjs --concede-before-input` connects on a retry
   loop *before* `GET /health` says `ok` (the port binds ~1 s earlier), sends
   nothing until `hello_ok` — amendment **M20** drops a pre-session c2s frame in
   silence — and then writes `act: concede` synchronously from inside the
   `hello_ok` handler. Measured margin: `hello_ok` → concede **0–3 ms** against
   `hello_ok` → first engine `input` **~150 ms**, ~50×, and the window was hit **9
   times out of 9** at four seeds. The bridge does exactly what M11 documents:
   `over {winner: null, reason: null, matchOver: true}`, no `state` in front of
   it, `CONCEDE BEFORE START: ending the session` and `OVER WITHOUT A gameOver
   STATE` on stderr, a four-line frame log, and `members fired = 2 of 37`. Wired
   as gate sub-step **10e** (a fifth ws server, under the same `GAME_TIMEOUT`),
   which asserts the stderr line, the guard line, no `"gameOver":{` in the log and
   M20's `0 read before the session existed`. `check-redaction.mjs` is
   deliberately **not** run on that log — see M4 follow-up 8 below.
6. **Amendment M10's `seq: 0` reservation is true by construction, not by an
   assertion.** On the bridge it holds because one private helper
   (`WsTransport.oob`) is the only thing that writes `"seq":0`, and it has three
   callers — `pong`, the refusal `notice`, the dropped-frame `notice`; nothing
   checks that a fourth is not added. On the client `seq` is type-checked and
   otherwise ignored. The same amendment makes the cached frames' re-delivery
   **verbatim** (same `seq`, same `t`, no new log line; the `input` half is a real
   re-emission and the client's `resync` *is* logged — **D27**, amendment M16), so
   a mid-stream `resync` hands back a `seq` *lower* than the frame before it and a
   client connecting mid-game sees a forward gap. Neither is a dropped frame; only
   `check-redaction.mjs --client-log` (M17) knows the difference, and it knows it
   from a header key rather than from the frames. Every gate run says so out loud:
   *"a CLIENT log's series is neither contiguous … nor monotonic … In a
   server-side `var/games/` log the same shape IS a dropped frame."*
7. ~~**Fixture drift has no gate step, deliberately.**~~ **CLOSED 2026-09-12.**
   `tools/fixture-multiset-diff.mjs` is the order-insensitive shape the follow-up
   asked for: frames with `seq` stripped, compared as a multiset, with
   `--only-dir s2c` to ask the narrower question "did the **emitter's** output
   change?". It is gate sub-step **9b** and it is **advisory on purpose** —
   identical prints `OK`; a difference that vanishes under `--only-dir s2c` prints
   a loud advisory naming the wall-clock cause; a difference that survives it
   prints a loud advisory saying it reaches the emitter. None of the three is an
   exit code (`DRIFT_FATAL=1` makes it one, `SKIP_DRIFT=1` skips the ~31 s
   re-recording). Two of the four gate runs in that pass took the middle branch,
   so the advisory is observed firing rather than asserted. `m3-ws.md` §13.5's
   "Nobody has written it" is now false.
8. **`--refuse-first-ask` lives in `tools/ws-auto-play.mjs`, not `ws-smoke.mjs`.**
   The fix text said otherwise. Reaching an `ask` at all needs a client that can
   play a game, and a second copy of the dumb-human policy in `ws-smoke` could
   drift from `AutoTransport`'s — the one thing `ws-auto-play`'s own header says
   must not happen. `ws-smoke.mjs` is unchanged; the gate's step 10d runs
   `ws-auto-play`. Named here so it is a decision and not a discrepancy.
9. **Space = OK is proved by a synthetic `KeyboardEvent`, not by a finger.** The
   browser driver used for the evidence delivers Space as
   `{key: "", code: "", keyCode: 0}`, so the handler now also matches
   `event.code === 'Space'` and the binding was verified by dispatching exactly
   what the driver delivers. Escape = Cancel *was* a real key press. One human
   press of the space bar closes this.
10. **Two socket properties are closed by construction rather than by a test.**
    The second-client refusal is decided on netty's event loop, which serialises
    it, and nothing has tried to open two sockets in the same millisecond; and the
    1 MB `HttpObjectAggregator` bounds only the **handshake** — websocket frames
    are not aggregated by it, and `WebSocketServerProtocolHandler`'s own
    `maxFrameSize` is left at netty's default while a `state` frame already runs
    to ~30 kB.
11. **Two M2 follow-ups are untouched and still open here**: gate 0's `"unknown"`
    (null-`ZoneType`) arm has never been observed at runtime, and amendment M9's
    pre-header buffer is still self-test-only. Both need an engine shape no
    committed deck produces.

## M4 — A board that looks like Magic

**Status: done** — three evenings, built and verified, with eight follow-ups open
below and none of them a defect you can see from the board (evidence:
[`docs/evidence/m4-board.md`](docs/evidence/m4-board.md) — §1–§9 are evenings 1
and 2, §10–§18 evening 3, §19 the status).
**Effort: 3 evenings. Actual: 3.**

**Command**

```bash
node tools/fetch-art.ts && ./scripts/play.sh
```

**Deliverable.** A screenshot the user would show someone. Real layout: opponent
permanents row, middle table, own permanents, hand at the bottom, left rail (life,
zone counts, decision panel), right rail (phase strip). Real card images, tap =
90° rotate, summoning-sick tint, `input.selectable` outlines on clickable cards.
A missing image renders a generated text card frame and never blocks a click.

Spec: [`docs/research/10-board-ui-spec.md`](docs/research/10-board-ui-spec.md)
(component tree, layout tokens, wireframes at 1600×900 and 1280×720, the arrow
geometry, the three evenings). The components were written against the
**post-hardening** wire from the start rather than retrofitted onto it: **one**
concealed shape (the
five-key stub) plus a face-down card that is an ordinary `Card` with `name: ""`
and `alt: null` — report 10 §0.0's "three card shapes, not two" was superseded by
amendment P3 the same day — `Card.token`, `Card.alt`, `library.cards`,
`input.focusCard`, and a `card` on every ask option (`docs/protocol.md`
§3.2–§3.4, §4, §5.1).

**What the evidence actually shows** (`docs/evidence/m4-board.md`; two live
bridges against the Forge AI, the replay corpus, and the whole gate green with
these changes in the tree):

- **The layout is report 10 §2.2's, measured in the live page.** At 1600 × 900 the
  columns are rail **264** / table **1160** / rail **128** and the rows
  104 / 132 / **141** / 132 / 104 / 190; at 1280 × 720, **216 / 912 / 112** and
  84 / 104 / **111** / 104 / 84 / 150. Every number is the spec's to the pixel
  **except the middle row** (§2.2 computes 164 / 134 from a board that owns the
  whole viewport; this one sits under a 23 px application bar carrying title,
  seat, socket status and credits). `document.scrollWidth === innerWidth` at both
  sizes: the body never scrolls sideways, and transient banners are absolute
  overlays so they never shorten the board either.
- **The component tree of §1 is real files.** `Board` (grid, seat ordering, the
  land/permanent split, attachment hoisting, combat notes), `PlayerRail` ×2,
  `PhaseStrip`, `ZoneRow`, `HandFan`, `CardTile`, `StackPanel`, `DecisionPanel`,
  `LogDrawer`, `Mana`, `ArrowsOverlay`, `CardZoom`, `HotkeysOverlay`, plus the
  pure `labels.ts`, `resolve.ts`, `arrows.ts`, `rects.ts` and `keys.ts`.
  **`CardTile` is THE card renderer** — every card in every zone, everywhere,
  goes through it (`m4-board.md` §7).
- **Real art, with the text frame underneath it, not beside it** (**D28**):
  `grid` 488×680 WEBP on the board, `thumb` on the stack and in the drawer,
  `display` for the zoom, all derived from the `scryfallId` and hot-linked
  (open question 5's default). `?replay=games/morph.jsonl` — a deck with **no**
  `art.json` entry at all — renders a complete board of generated frames, which
  is report 10's own exit check ("delete `art.json` and reload") without touching
  a generated file.
- **Arrows, and every fact they draw is also text** (**D30**). Three classes
  (target / attack / block), three curvatures, three dash patterns,
  `aria-hidden`, `pointer-events: none`. Seen live: `target:s:11>c:44`,
  `attack:c:44>p:0`, a double block as `block:c:90>c:31` + `block:c:91>c:31`, and
  on the replay board `target:s:76>c:28` **and** `attack:c:65>p:0` on one frame
  with `data-readonly="true"` and **0 of 20** `data-act` affordances enabled.
  `web/test/arrows.test.ts` builds arrows for all **2,473** committed `state`
  frames (35 target, 575 attack, 62 block) and counts **40 frames where a
  `stack[].id` is also a battlefield `Card.id`** — the collision the namespaced
  registry exists for.
- **One keymap table, 16 rows, and `H` renders it from the same table**, so the
  help cannot list a key nothing implements. Eight are live at M4 (`SPACE`,
  `ESC`, `CTRL+Q`, `Z`, `S`, `C`, `L`, `H`/`?`); the other seven flash their chip
  and name their milestone. Two rules that are easy to get wrong are pure
  functions with tests: a focused button keeps `Space` **and nothing else** (M3's
  handler dropped the whole keyboard for a focused button, so clicking a card
  turned `Escape` off), and `Esc`'s precedence is overlay → open `ask` (answer
  `null`, §5.4) → the engine's Cancel button.
- **The hidden-information rules are asserted per frame, not asserted once.**
  `web/test/render.test.tsx` renders **every frame of every fixture twice** —
  once as a replay (`actions` null) and once as a seat — over 12 fixtures and
  7,615 frames, checking that every `data-card-name` in the markup is a name that
  same frame serialised in the clear, that no tile is drawn for a card in an
  opponent's hand, and that the replay board stays read-only. All three have
  negative controls.
- **The phase strip ships read-only** (**D31**), drawing Forge's own documented
  defaults with every dot `disabled` and a tooltip naming the act, the missing
  read field and M6. A live toggle would have had to keep its own state, which is
  the phase-stop logic `CLAUDE.md` §Scope forbids.
- **Tests and gate.** `npm --prefix web test` → **271 `node --test` (267 pass,
  4 skipped) + 41 vitest**, `npm --prefix web run build` → **0 TypeScript
  errors**. The whole gate is green with these changes in the tree: the
  documentation run on 2026-09-12 was **`check-all OK`, exit 0, 211.99 s**
  (`var/verify/m4docs/check-all.log`; `docs/evidence/m4-board.md` §19).

**What M3 hands to M4: the board is already interactive, so M4 is layout and
art.** Nothing on this list needs to be built again, and re-deriving any of it is
how a rule that took two verification passes to get right gets lost:

- **The affordances exist.** Cards and player names are real `<button>`s with an
  `aria-label` naming the card (the `title` carries the act), the two engine
  buttons are wired to `buttonOk` / `buttonCancel`, Concede is a two-click button
  reachable from every state, `Space` / `Escape` are bound, and `AskModal.tsx`
  renders **all eleven** ask kinds. M4 restyles these; it does not re-invent them.
- **The `actions` prop is the seam.** `<Board actions={…}/>` is `null` in replay
  mode and non-null in ws mode, which is the whole of the difference between the
  two — `web/test/render.test.tsx` asserts the replay board still renders
  **Read-only** over the fixture corpus, and that assertion must survive M4.
- **Never gate a click on `selectable`** (amendment **M8**). Outline what the
  engine named; send the click for anything the player presses. 78 of 86 acts in
  the scripted game and 9 of 10 in the hand-played one are outside the set.
- **Render `buttons.*.label` verbatim.** `Auto`, `Undo (2)`, `End Turn` and
  `Play` are Forge's own strings, and half of M6 is already on the wire because
  of them (report 11). A relabelled button throws the engine's answer away.
- **The stall banner's rule is `web/src/render/wedge.ts`,** six clauses after
  amendment **M21** (including "this seat holds priority" and "no s2c frame for
  2.5 s"). Import it; do not re-derive it from §4.2's prose.
- **Art is already fetched.** `node tools/fetch-art.ts` exists and writes
  `web/public/art.json` (gitignored, ~28 cards, Scryfall URLs plus `artist` and
  `copyright` for the credit line); `web/src/art.ts` and `useArt()` already read
  it and the board already reports its misses. What M4 adds is the *image* on the
  card tile and the fallback text frame — hot-linked, per open question 5.
- **Two shapes the layout must not assume away**: an `over` with no `gameOver`
  `state` in front of it (**M11**), and a `seq` that can arrive lower than the
  frame before it after a `resync` (**M10**). The reducer already tolerates both;
  a component that counts frames or trusts `seq` for ordering would not.

**None of that list was rebuilt.** `wedge.ts` is still the stall rule, imported;
`buttons.*.label` is still rendered verbatim (the live game shows `Play`, `Keep`,
`Auto`, `Alpha Strike` and `End Turn` on Forge's own terms); clicks are still
never gated on `selectable`; and `<Board actions={…}/>` is still the whole of the
difference between a replay and a seat.

<a id="fu-m4"></a>

### M4 follow-ups — five closed by M5, one not reproduced, two open (2026-09-12)

Eight items, from the builders' own "problems" notes and the verifier's findings.
**None was a defect you could see from the board**, and none blocked M5.

| # | what | status |
|---|---|---|
| 1 | `mana-font` drags 3.72 MB of faces into the build | **closed** — the fork was taken; `dist/assets` is 4 files / 1,432,461 B with **one** 187,400 B font (**D32**, `docs/evidence/m5-board.md` §7.1) |
| 2 | report 10 §2.2's middle-row arithmetic is 23 px out | **open** — spec debt, not CSS; do not "fix" the CSS to match the table |
| 3 | `TypeError: set is not iterable`, once | **not reproduced** — hunted again over a full live game and both replay passes; the stale-HMR-module explanation stands and no guard was added |
| 4 | `render.test.tsx`'s "no `useState`, no `useEffect`" paragraph is false | **closed** — rewritten on today's terms |
| 5 | the selectable-outline assertion is order- and name-coupled | **closed** — the id/selectable pair is matched independently of the name and of attribute order |
| 6 | the log drawer is 520 px against a 264 px rail | **closed** — drawer x=12 w=264 against rail x=12 w=264 at 1600×900, 216/216 at 1280×720, measured live |
| 7 | the hand fan's outer tiles leave their grid cell | **closed** — hand row 190 px vs tallest tile 177 px (lowest bottom 882 ≤ 888) at 1600×900, 150 vs 139 (705 ≤ 710) at 1280×720; no horizontal body scroll at either size |
| 8 | `check-redaction.mjs` cannot read a four-line M11 session | **open** — 10e still asserts the stronger property directly instead; widening `preGameOnly` is whoever owns the checker's call |

The detail of each closed row is below, as it was written; the table above is the
status.

1. **`mana-font`'s CSS drags ~3.5 MB of faces nothing fetches into the build.**
   Measured on the M4 documentation gate run: nine font files totalling
   **3.72 MB** in `web/dist/assets/`, of which only the 187.40 kB
   `mana-*.woff2` is ever requested — `mana.woff`, `mana.eot`, `mana.ttf`,
   `mana.svg` (1.9 MB on its own) and four `mplantin.*` are emitted because
   `main.tsx` imports the package's CSS wholesale. (`m4-board.md` §5's "about
   3.2 MB" undercounts by one file, `mana.woff`.) **D29** records why this was
   accepted — a gitignored build directory for a localhost app, against a forked
   `mana.css` that must be re-diffed on every upgrade — and says plainly that it
   becomes worth fixing the moment anything is packaged or served over a network.
2. **Report 10 §2.2's middle-row arithmetic is 23 px out, and the spec is the
   half that is wrong.** The middle row measures **141.42 px** at 1600 × 900 and
   **111.42 px** at 1280 × 720 against §2.2's 164 / 134, because the board sits
   under a 23 px application bar the spec's arithmetic does not know about. Every
   other number in §2.2 is exact. Either §2.2 gains the bar or the bar moves into
   the board's own rows; **do not "fix" the CSS to match a table that assumed a
   different viewport.**
3. **`TypeError: set is not iterable`, once, from a layout effect.** Seen in the
   browser console during the live-play pass, caught by `ErrorBoundary`, with the
   React frame at `commitRoot` — so it came from `rects.ts`'s sweep or a ref
   callback, not from render. The only candidate is `for (const el of set)`
   (`web/src/render/rects.ts:142`), and a stale Vite-HMR module still holding the
   pre-fix one-element-per-key shape (`m4-board.md` §12) would produce exactly
   that message.
   **Reproduce it before changing anything**: an `instanceof Set` guard would hide
   the cause rather than explain it, and the same symptom after a cold load would
   mean something quite different.
4. **`web/test/render.test.tsx`'s own decision paragraph (lines 25–32) is now
   false** — and it is the paragraph that says to revisit it. It reads *"The board
   is a tree of pure function components: no `useState`, no `useEffect`, no refs
   … If the board ever grows an effect, this decision needs revisiting and this
   paragraph is the place it is written down."* Evening 3 grew several (the rect
   registry, the `window` key listener, the concede timer). `renderToStaticMarkup`
   may well still be the right harness — the empty-registry SSR branch is itself a
   negative control — but the paragraph has to say so on today's terms.
5. **The selectable-outline assertion is order- and name-coupled.**
   `render.test.tsx`'s regex requires `data-card-name` to be present *and* to sit
   between `data-card-id` and `data-selectable`, so a **concealed** tile (which
   carries no `data-card-name` by design) is never counted, and reordering the
   attributes in `CardTile` would silently empty the set while the test stayed
   green. Match the id/selectable pair independently of the name and of attribute
   order.
6. **The log drawer is 520 px wide against a 264 px rail.** Report 10 §10 says
   *"left edge, over the rail"*; open, it covers the rail plus ~256 px of the
   1160 px table column. Either the width comes down to the rail or §10 says it
   is a panel over the table.
7. **The hand fan's outer tiles leave their grid cell.** At 1280 × 720 the hand
   row is 150 px (`--ch-hand`) but the outermost tiles are 121 × 159 and their
   bottom edge sits ~5 px below the row. Nothing clips and the body still does not
   scroll; it is a tile that is not inside the box that is supposed to contain it.
8. **`check-redaction.mjs` cannot read a four-line M11 session,** so gate
   sub-step 10e does not run it. The checker treats "no `state` frames at all" as
   a failure, and downgrades its two *"this file proves nothing"* assertions only
   for `preGameOnly = stats.state > 0 && stats.maxTurn === 0` — which a session
   that ends before the first snapshot fails on all three counts. 10e asserts the
   stronger property directly instead (*the only s2c frames are `hello_ok` and
   `over`*, therefore not one card was serialised). Widening `preGameOnly` to
   include "no `state` frames and a four-line session" is a small change for
   whoever owns the checker; it was deliberately not made silently.

**Still open from M3 and unchanged by this milestone:** follow-up 9 — one human
press of the space bar. The browser automation driver delivers `Space` as
`{key: "", code: "", keyCode: 0}`, the same measurement M3 recorded, so the
binding is covered by `web/test/keys.test.ts` (both the `key` and the `code`
spelling) and by the engine buttons being clicked directly, but no finger has
pressed it. Every letter key and `Escape` were driven for real.

**One harness note, not a board defect.** The first live M4 game ended with the
bridge's own `IllegalStateException: the game did not reach 'over'`: thirteen
player turns driven one browser round-trip at a time exceeded `MtgTable`'s 900 s
game timeout and the JVM tore the session down mid-`assign_damage`. Every frame
up to that point rendered and every click was answered. A human plays faster than
one tool call per click; an agent driving the board does not.

## M5 — Nothing dead-ends

**Status: built, verified, and fixed — 2026-09-12.** The probe decks, the board
work and **two** independent verification passes are all in
`docs/evidence/m5-probes.md`, `docs/evidence/m5-board.md` and
`docs/evidence/m5-fixes.md`. Amendments **M22–M27** (the probes) and **M28–M31**
(the first verification's three dead ends) are in `docs/protocol.md`. The second
pass found one major and two minors and no new wire shape: the combat-band strip
was an implicit grid row that collapsed both middle zone rows at 1600 × 900
(`m5-board.md` §11), `useMana` had no end-to-end gate although `check-all.sh`
said it did (now `ten-games.sh` assertion 8), and the picker's reach was
overstated (the census below). All three are `m5-fixes.md` §10.
**Effort: 3 evenings.**

**Commands**

```bash
./scripts/play.sh                  # play it: the bridge, /health, vite, the board
./tools/ten-games.sh               # THE exit criterion, as a command (seeds 1..10)
./tools/ten-games.sh --games 3     # the first three rows, for a quick look
./tools/check-all.sh               # runs ten-games.sh as step 9c; SKIP_TEN=1 skips it
```

The probe runs the exit criterion is built out of, for when one row fails and you
want the session by hand (`--deck2 morph-probe` is load-bearing on all three —
`docs/evidence/m2-console.md` §9.3):

```bash
./bridge/run.sh mtgtable.MtgTable --transport auto --probe --seed 7 \
    --game-id human-search-7 --deck decks/search-probe.dck --deck2 decks/morph-probe.dck
./bridge/run.sh mtgtable.MtgTable --transport auto --probe --mana-lost-prompt --seed 7 \
    --game-id human-amount-7 --deck decks/amount-probe.dck --deck2 decks/morph-probe.dck
./bridge/run.sh mtgtable.MtgTable --transport auto --probe --seed 7 \
    --game-id human-number-7 --deck decks/number-probe.dck --deck2 decks/morph-probe.dck
```

**Deliverable / exit criterion.** Ten consecutive games with **zero `UNIMPL`
lines** and no state where the board is stuck waiting on something the browser
cannot express.

**Met, as a script rather than as a memory.** `tools/ten-games.sh` is that
sentence: ten `--transport auto` games at seeds 1..10, **alternating
`decks/pacho-shield.dck` and the five probe decks** — ten games of one deck would
only prove the engine does not dead-end on the paths that deck reaches — and each
one held to eight assertions: exit 0 and `MTGTABLE OK`; `finished = true`;
`UNIMPL members = none` **and** not one raw `UNIMPL` line in either log; `emit
errors = 0`; exactly one `over`, last; `check-redaction.mjs` over the whole frame
log with no flags; **no more than 150 asks of one kind in one game** (the one
wedge every other assertion is blind to — a `confirm` backstop that latched
produced 2,278 identical asks and a 35 MB log inside one 300 s step); and **the
typed acts a row exists to prove, plus their effect** — seed 4 must send
`useMana` *and* the seat's `manaPool` must be strictly smaller in the `state`
after it than in the `state` before. The run: `10/10 … 268 s`, 165 player turns,
**seven of the eleven ask kinds in one command**, ten `PASS` lines from
`check-redaction.mjs` (`docs/evidence/m5-probes.md` §10). It asserts that
**nothing dead-ends**, not that every kind fires — which kinds a seed raises is a
property of the shuffle, so a missing one prints `ADVISORY:` and is never an exit
code.

**The deliverable as it was written, before any of it existed** — kept verbatim,
because what it got wrong is worth seeing: it treats "a modal for these kinds" as
the job (M4 had already shipped those, and M5's job turned out to be the
opposite), and it asks for arrows M4 had already drawn.

Every `ask` kind gets real UI: mana payment (tap lands plus the engine's own Auto
button, which runs `ComputerUtilMana.payManaCost` inside `InputPayMana`),
targeting from `selectable` min/max, attacker and blocker declaration,
`assign_damage`, and modals for `choose_list` / `choose_entities` / `order` /
`assign_amount`; click-to-open graveyard and exile browsers; SVG targeting arrows
from `stack[].targetCardIds` and `combat.bands`.

**It did start with probe decks, and that was the right order.** Four new decks
(`search-probe`, `amount-probe`, `number-probe`, `sideboard-probe`) and four new
committed fixtures turned four of the six evidence-less kinds into recordings,
and **proved two of the other two unreachable in this configuration rather than
merely un-recorded** (amendments M22/M23). The probes also found the two answers
that were legal and still non-terminating — a `confirm` and a numeric `text` —
which no shape check could ever have seen. The current state of all eleven kinds
is the table in `docs/evidence/m5-probes.md` §1.

**What the evidence shows — all eleven kinds, where each one's evidence lives.**
Nine of eleven are now engine recordings; the other two are **documented
ceilings** rather than gaps, and the proof for both is bytecode in the 2.0.14 jar
rather than a search that came up empty.

| kind | engine evidence | where |
|---|---|---|
| `choose_list` | yes, since M2 | every human-seat fixture (57 in the corpus) |
| `order` | yes, since M2 | `human-auto-42`, `human-scry-7`, … |
| `assign_damage` | yes, since M2 | `human-trample-7` (the deck exists to force it), `human-ability-42` |
| `ability_menu` | yes, since M3 | `human-ability-42.jsonl` — 7 asks and **7 `clickAbility` acts** |
| `choose_entities` + `delayedReveal` | **new, M5** | `human-search-7.jsonl` — `decks/search-probe.dck`, Rampant Growth |
| `assign_amount` | **new, M5** | `human-amount-7.jsonl` — `decks/amount-probe.dck`, Manamorphose; §5.3's **colour-keyed** branch |
| `confirm` | **new, M5**, behind a non-default pref | `human-amount-7.jsonl` + `--mana-lost-prompt` (**M24**) |
| `text` | **new, M5** | `human-number-7.jsonl` — `decks/number-probe.dck`, Volcano Hellion, `getInteger`'s *"Other…"* (**M25**) |
| `options` | **unreachable** | `IGuiGame.showOptionDialog` has **zero** call sites in the jar (**M22**) |
| `manipulate_list` | **unreachable while D13 holds** | one caller, pref-gated on `UI_SELECT_FROM_CARD_DISPLAYS` (**M23**) |
| `sideboard` | **still none** | `--games 2` is necessary and not sufficient (**M27**) — M6 owns it |

**No wire shape changed.** Every body the probes produced already matched
`docs/protocol.md` §5.2 as written, all four new fixtures passed
`check-redaction.mjs` with no flags, and the 2026-09-12 amendments record
*reachability*, not a change of shape. What the probes did change is two
**answers**: a `confirm` answered `false` forever and a numeric `text` answered
`""` forever are both legal and both non-terminating (`m5-probes.md` §9), which
is the defect shape a kind without engine evidence hides and which no shape check
could have caught.

**And the headline is narrower than it sounds, so here is the number.** "The
board-shaped ones stop being a modal" is true and, against this engine and these
decks, reaches **exactly one kind**: over the 15 recordings in
`fixtures/games/` — **108 asks** — `boardPick` accepts **3**, and all three are
`assign_damage`. The `choose_list` branch of the picker is exercised only by the
hand-written `fixtures/synthetic/sample-handwritten.jsonl`, and no live browser
session has produced a card picker yet. That is not a gap in the rule: the only
other card-optioned asks in the corpus are 22 `choose_list` **reveals**
(`min = max = −1`, §5.3) and 7 `choose_entities` that all carry a
`delayedReveal` (§5.3), and both are modals *by design*, while the rest have no
board entity to point at — `ability`, `color`, `other`, `number` options, or no
options at all. `options` would be the last candidate and is unreachable
(**M22**). The full table is `docs/evidence/m5-board.md` §1.1, and
`web/test/picker.test.ts` prints the census on every run so the number moves the
day a card picker appears.

**What the board gained**, against the list "What M4 hands to M5" below wrote:

1. **`useMana`** — a colour the pool actually holds is a `<button>` on your own
   rail, and `W U B R G C` spend it from the keyboard. **The one real dead end,
   closed** (`m5-board.md` §2, and the wire line is quoted there).
2. **Board-shaped asks stop being modals** — `render/picker.ts` decides it,
   purely, and `AskPicker` is the decision panel's half (`m5-board.md` §1;
   the rule and its rejected alternatives are **D33**).
3. **Zone browsers** — a graveyard / exile / command caption and the rail's
   revealed library slice open a panel of full-size `CardTile`s, and
   `input.openZones` opens one *by itself* (`m5-board.md` §3).
4. **The declared combat bands** as a strip, read from `combat.bands` only.
5. **A pending-target arrow** — from the source of the choice to the candidate
   under the pointer, and honestly absent where the source is not on the board
   (`m5-board.md` §5).
6. **`chosen k of min..max`** while a selection is open — printed, never
   enforced, and labelled as clicks sent rather than as a count the engine
   published (`m5-board.md` §6).
7. **Five of the eight M4 follow-ups**, including `mana-font` (**D32**).

All of it through the one `CardTile`, which is now imported by exactly ten files
(CLAUDE.md §"The web client"); the picker marshals nothing — the answer is built
by `AskModal`'s own `answerFromDraft`, so the two surfaces cannot disagree about
what an answer looks like.

### What M4 hands to M5 — what the board can and cannot express

Written 2026-09-12, from the M4 code as it stands. **Two lines of M5's
deliverable paragraph above predate M4 and are already shipped** — do not build
them twice:

- **SVG targeting arrows from `stack[].targetCardIds` and `combat.bands`** are
  done (**D30**): three classes, pure geometry, a namespaced rect registry, and a
  test that builds them for all 2,473 committed `state` frames. What M5 adds is an
  arrow for a *pending* target — the one being chosen out of `selectable` — not
  the resolved ones.
- **Modals for `choose_list` / `choose_entities` / `order` / `assign_amount`**
  have existed since M3, and evening 3 gave `AskModal` a real dialog shell:
  `role="dialog"`, focus moved on open and restored on close, a `Tab` trap, `Esc`
  answers `null` (§5.4), and a `timeoutMs` bar that draws **only when
  `timeoutMs > 0`** — over the socket it is 0 (**D24**), so no bar is drawn, which
  is the honest rendering. M5's job is not "a modal for these kinds"; it is
  "the board-shaped ones stop being a modal".

**The whole vocabulary the board can speak today is five acts plus `answer`:**
`clickCard` (for **any** card — never gated on `selectable`, amendment M8),
`clickPlayer`, `buttonOk`, `buttonCancel`, `concede`, and an `answer` for all
eleven ask kinds.

**Typed acts with no control on the board:**

- **`useMana` — this is the one real dead end, and it goes first.** The console
  seat can spend floating mana (`m W|U|B|R|G|C`); the board has no control for it
  and the mana pool is six read-only pips in the rail. A state in which Forge
  expects floating mana to be spent through `useMana` cannot be resolved from the
  browser at all. Everything else on this list is a missing comfort.
- **`clickAbility`** — the console seat sends it (`a <card> <ab>`,
  `ConsoleTransport.java:534`); **the browser never has**. A multi-ability card
  goes through the asynchronous `ability_menu` instead (**D20**/**D22**), whose
  answer is applied with the same `IGameController.selectAbility` call, so the
  engine path is exercised and the *act* is not.
- **`passPriority`, `undo`, `alphaStrike`, `nextGame`, `setPhaseStop`,
  `setYield`** — all M6 by their own §2.2 rows. Their keys exist (`A`, `CTRL+Z`,
  `E`, `T`, `B`, `CTRL+A`, `Y`, `N`) and flash their milestone rather than doing
  nothing quietly.

**What the board draws but cannot be opened or manipulated:**

- **No zone browsers.** Graveyard and exile are always-visible 45 px strips in the
  middle row; there is no click-to-open browser for either, none for the library's
  revealed slice, and none for a revealed list. `input.openZones` renders as a
  text hint (*"a view hint; it reveals no cards"* — P6 / report 06 §3), which is
  correct, but there is nothing to open.
- **Attackers and blockers** are declared by clicking tiles and pressing the
  engine's button, which is how Forge's inputs genuinely work — but there is no
  band-building gesture, no drag, and no "this blocker on that attacker" beyond
  the clicks the engine asks for.
- **`assign_damage`** is answered in the modal (defender at index 0, §5.3), not on
  the blockers themselves.
- **Targeting** is `selectable` outlines plus clicks. The ask's min/max are
  *printed*, never enforced — Forge judges, and `CLAUDE.md` §Scope is why.

**Whatever M5 adds, it adds through `CardTile`.** One card renderer for every card
in every zone is the renderer's half of hard rule 8 (`docs/evidence/m4-board.md`
§7): a zone browser or a targeting picker that draws its own card component is how
a name for a `hidden: true` id gets back onto the screen, and it is exactly what
`render.test.tsx`'s per-frame name check would *not* catch if the markup stopped
carrying `data-card-name`.

**The six ask kinds without engine evidence — settled, 2026-09-12** (this
supersedes M3 follow-up 4). Written before M5; here is what the probe decks
actually found, row by row, against the amendments they produced:

| kind | before M5 | now |
|---|---|---|
| `choose_entities` + `delayedReveal` | one uncommitted console session | **`fixtures/games/human-search-7.jsonl`** — `decks/search-probe.dck`, Rampant Growth |
| `assign_amount` | none | **`fixtures/games/human-amount-7.jsonl`** — `decks/amount-probe.dck`, Manamorphose; the colour-keyed branch of §5.3 |
| `confirm` | none | **`fixtures/games/human-amount-7.jsonl`** — the same deck plus `--mana-lost-prompt` (**M24**: one reachable call site, `InputPassPriority`, behind `FPref.UI_MANA_LOST_PROMPT`) |
| `text` | none | **`fixtures/games/human-number-7.jsonl`** — `decks/number-probe.dck`, Volcano Hellion, through `getInteger`'s "Other…" (**M25**) |
| `options` | none | **unreachable, and not only for a human seat** — `IGuiGame.showOptionDialog` has **no call site anywhere** in the 2.0.14 jar (**M22**). A documented ceiling, not a gap. |
| `manipulate_list` | none | **unreachable while D13 holds** — one caller, pref-gated on `UI_SELECT_FROM_CARD_DISPLAYS`, confirmed in the jar's bytecode (**M23**). |
| `sideboard` | none | **still none** *(as of M5)*. `--games 2` is necessary and not sufficient: `emitOver` ends the session on game 1's `matchOver:false` (**M27**). `decks/sideboard-probe.dck` and the flag exist; making it fire is M6's `HostedMatch.restartMatch` row. **Closed by M6**: `fixtures/games/human-sideboard-7.jsonl`, asserted by gate step 9d (**M38**). |

So: **four kinds recorded, two proved unreachable, one handed to M6 and closed
there.** `ability_menu` came from the live browser games and `choose_list`,
`order` and `assign_damage` were already in the corpus, which makes **nine of
eleven** evidenced and the two ceilings documented — the count `docs/protocol.md`
§5.2 now prints as a census.

**Two shapes a new panel must not assume away**, the same two M4 was handed: an
`over` with no `gameOver` `state` in front of it (**M11** — now measured, M3
follow-up 5) and a `seq` that can arrive lower than the frame before it after a
`resync` (**M10**).

<a id="fu-m5"></a>

### M5 follow-ups — thirteen, 2026-09-12

From the two builders' own "problems" notes and the two verification passes.
**None of them stops a game**: the exit criterion is met, ten games run with zero
`UNIMPL`, and the one real dead end M4 named is closed. **Four belong to M6** by
ownership (1, 2, 9, 10); **three are test- or tooling-quality debt** (3, 4, 6);
**two are accepted trades** with the escape hatch measured (5, 8); **two are
facts about what Forge asks or about the browser harness**, not defects (7, 13);
**one is corrected in place today** (12); and **one is carried over from M4**
(11).

**After M6, 2026-09-12:** of the four that belonged to M6, **1 and 2 are
closed** — `sideboard` has an engine recording and the mana-lost prompt is on by
default — and **9 and 10 are not**; both are carried onto the M6 follow-ups list
below (items 4 and 3 there) rather than being closed by proximity. 13 is
unchanged and is M6 follow-up 13.

1. **CLOSED BY M6.** ~~`sideboard` still has no recording, and only M6 can give
   it one.~~ It has one: `fixtures/games/human-sideboard-7.jsonl`, game 2 of a
   `--games 2` match, asserted by gate step **9d**. The paragraph below is why it
   could not happen before amendment M38.
   **`sideboard` still has no recording, and only M6 can give it one.**
   `decks/sideboard-probe.dck` is correct and `MtgTable --games 2` exists; the
   ask cannot fire because the session does not survive game 1's `over` with
   `matchOver: false` — `WireGuiGame.emitOver` counts the `finished` latch down
   and sets `overEmitted`, after which `ask()` returns `null` before emitting
   (**M27**). The wire is right; the session ends too early. M6's
   `HostedMatch.restartMatch` row.
2. **CLOSED BY M6 — the decision was taken, and it is "on".**
   `config.json` carries `"manaLostPrompt": true`, `MtgTable` sets
   `FPref.UI_MANA_LOST_PROMPT` from it **in memory** (never `save()`), and
   `--mana-lost-prompt` / `--no-mana-lost-prompt` override it either way
   (amendment M40). So `confirm` now occurs in ordinary games. The open question
   table's row 9 below is answered by this. The paragraph as written:
   **`confirm` is invisible on stock Forge preferences.**
   `FPref.UI_MANA_LOST_PROMPT` defaults to `"false"`; `--mana-lost-prompt` sets
   it in memory for probe runs only (**M24**). Whether to turn it on for the user
   — it is a genuinely useful warning — is an M6 comfort decision, deliberately
   not taken here.
3. **The default auto-answer policy changed for two kinds, in a shared file.**
   `AutoTransport.answerFor` (mirrored line for line in `tools/ws-auto-play.mjs`)
   now answers a `confirm` with the body's own `defaultYes` instead of `false`,
   and a **numeric** `text` with `null` instead of `""`; from the third identical
   prompt *with no progress in between* the confirm answer alternates, the
   counters clear whenever a `state` changes `turn|phase|activePlayer`, and
   `ASK_REPEAT_CAP = 20` answers and then concedes. No committed fixture contains
   either kind and 9b's multiset diff of `human-auto-42` is unchanged, so nothing
   was re-recorded — but **it is a policy change to a shared file and should be
   read as one**, and the alternating backstop is a heuristic: it guarantees no
   single prompt loops forever, not that the answer it lands on is the one a
   human would have given. `AskSelfTest` (106 checks) and ten-games' 150-asks-of-
   one-kind ceiling are what would notice it regressing.
4. **There is no DOM test environment**, so three of M5's load-bearing
   measurements are pinned by numbers in a document rather than by an assertion:
   the `.table__middle` grid tracks after the band fix, the caption
   hit-testing, and `dist/assets`' font count. `node --test` type-strips and
   vitest runs in the `node` environment (CLAUDE.md §"The web client").
   `web/test/hooks-order.test.ts` is a **source scan** — negative-controlled, and
   it exists because a `useMemo` below `Board`'s early return shipped and the
   whole suite stayed green — but it is not a rules-of-hooks check, and any other
   component with an early return is still unguarded. Adding jsdom is a
   dependency decision nobody has taken.
5. **The combat-band strip is an overlay, and while it is tall it covers the
   graveyard / exile strips behind it** (**D36**). That is a trade, not a free
   fix: at 1600 × 900 the middle is on its 120 px floor and two 62 px strip rows
   already want 128 px. Mitigated and measured — the strip shrink-wraps (453 px
   of a 910 px middle) and sits at `z-index: 55`, **below** the caption buttons'
   60, so the zone browser stays reachable and its tiles clickable. A graveyard
   card Forge makes clickable while bands are on screen must be clicked in the
   browser panel rather than on the strip.
6. **ACCEPTED, and now said where it prints.** 9b prints
   `MULTISET DIFFERS: 2 frame instance(s)` under machine load. Two frame shapes
   drift between runs of the same seed and neither is emitter drift:
   `input {prompt:"Waiting for Forge AI..."}` (ticks of `awaitNextInput()`'s
   250 ms `java.util.Timer` re-push — ×16 against ×14 with vite and a browser on
   the same machine) and a trailing `act {"action":"buttonCancel"}` (whether the
   last priority window of a finished game gets one more press). M6 measured the
   second one directly: re-recording `human-auto-42` gave 45 `buttonCancel`
   against the M3-era fixture's 46, and a later fresh seed-42 run gave 46 again.
   The choice offered here was "teach the diff about it or leave it loud": the
   decision is **leave it loud and say so at the point of failure** —
   `tools/fixture-multiset-diff.mjs` now prints a NOTE naming both shapes and
   telling the reader to check the per-frame listing before believing it.
   Teaching the diff to ignore them was rejected: a filter that hides two frame
   shapes hides them for every future defect that happens to wear one.
7. **The board picker reaches exactly one kind here** — 3 of the 108 asks in
   `fixtures/games/`, all `assign_damage`. The `choose_list` branch is exercised
   only by `fixtures/synthetic/sample-handwritten.jsonl`, so half the picker is
   pinned by a file we wrote. Not a gap in the rule (§1 above says why every
   other card-optioned ask is modal *by* a stated rule), and
   `web/test/picker.test.ts` prints the census every run so the number moves
   visibly the day a live card picker appears.
8. **`assign_amount` is not a picker** even when its targets are entities the
   board draws: §5.3's keys may be colours and the corpus's eleven all are. A
   one-line change to `boardPick` on the day a recording shows entity keys.
9. **STILL OPEN after M6.** **`clickAbility` still never leaves the browser.** It is proven end-to-end
   over the socket (`check-all.sh` 10f, 7 acts) and from `AutoTransport`, but the
   board's own path for a multi-ability card is still the asynchronous
   `ability_menu` (**D20**/**D22**), which reaches the same
   `IGameController.selectAbility`.
10. **STILL OPEN after M6** (`docs/evidence/m6-engine.md` §9 item 3).
    **`input.weak` is still `[]` on the wire** (M4's tile style has no data), and
    `input` still carries no typed *"the engine is collecting mana"* field. The
    second is the protocol row that would let a client offer the mana pips only
    during a payment without matching a button label — **M30** leaves it to M6
    explicitly.
11. **Two M4 follow-ups carry over unchanged**: report 10 §2.2's middle-row
    arithmetic is 23 px out against the built board (spec debt — do not "fix" the
    CSS to match the table), and `check-redaction.mjs` still cannot read a
    four-line M11 session, which is why 10e asserts the stronger property
    directly instead.
12. **`docs/evidence/m5-probes.md` §12 overstates its own un-recorded corners**,
    and the correction is appended there: `reveal: true` is **22** asks across
    five engine fixtures and `maySkip: true` is **2**, so the only corner of an
    otherwise-evidenced kind that no engine recording carries is `order` with
    `sideboardMode: true` — which is the `sideboard` row's neighbour and blocked
    on the same M6 work.
13. **The user still has not pressed the space bar.** Unchanged from M3
    follow-up 9 and **unchanged by M6**: the browser driver delivers `Space` as
    `{key:"", code:"", keyCode:0}`, so the binding is covered by `keys.test.ts`
    and by the buttons being clicked directly, and by nothing else. M6 bound
    Space to `input.buttons.focus` (amendment M39) and everything *around* the
    space bar is measured — `focus` is `"ok"` on 546 of 844 input frames in
    `human-comfort-13` and never `"cancel"`, the focused button carries
    `btn--focus` and is the document's `activeElement`, and `planKey` returns
    null for a focused button so the browser's own activation is not doubled —
    but the key itself is still pressed by nothing but a human.

### What M5 hands to M6

Read [`docs/research/11-engine-comfort-features.md`](docs/research/11-engine-comfort-features.md)
in full first — the corrections under **M6** below are its summary, not a
replacement for it. What follows is only what M5 changed about M6's starting
position.

**Already on the wire, so do not build it twice.**

- **`useMana` is a real control with a real gate.** The pips are buttons, the
  keyboard spends, and `ten-games.sh` assertion 8 asserts both the act *and* its
  effect on the seat's `manaPool`. M6's "auto-pay" is therefore **not** a new
  act: Forge writes `Auto` on `InputPayMana`'s own OK button and M3 already
  renders `buttons.*.label` verbatim, which is why the keymap's `A` row now reads
  *"press SPACE instead: it is the engine's OK button"*. There is no `autoPay`
  act and inventing one is the "board threw the engine's answer away" failure.
- **`clickAbility` works end to end** (`check-all.sh` 10f asserts 7 acts over the
  socket, none unresolvable), so a yield feature that needs to name an ability
  has a proven path.
- **Every M6 key is already a row in the one keymap** — `CTRL+Z`, `E`, `T`, `B`,
  `CTRL+A`, `Y`, `N` — flashing their milestone rather than doing nothing
  quietly. M6 adds acts and a row's `milestone`, never a new branch in the
  handler (`web/src/keys.ts`, CLAUDE.md §"The web client" rule 4).
- **The session header records what shaped a run** (**M31**): `policy: "probe"`
  and `prefs: ["UI_MANA_LOST_PROMPT"]`, optional and omitted when unset. A
  multi-game session has to keep that honest per game.
- **The wedge banner has a seventh clause** (**M28**): an **enabled `Cancel`** is
  by construction not a wedge. M6's yields put an enabled Cancel on screen
  constantly (`InputLockUI` labels it while a yield runs), so that clause is what
  keeps the red banner off an ordinary auto-yield.

**The three things M6 has to do that M5 proved it has to do.**

1. **A session that survives `matchOver: false`** — `HostedMatch.restartMatch`,
   a **new `hello_ok`** so the client drops its card map (§2.1), and the
   `ReplyPool`, the cached ids, the phase-stop map and the frame log all rebuilt
   from `openView`. That single piece of work unlocks the `sideboard` ask
   (follow-up 1), `order` with `sideboardMode: true` (follow-up 12) and the
   `nextGame` act at once.
2. **A typed field for "the engine is collecting mana"** on `input`
   (follow-up 10, **M30**). Without it, a client that wants to offer the pips
   only during a payment has to match an engine button label, which
   `CLAUDE.md` §Scope forbids.
3. **`players[].phaseStops`** (**D31**) — the dots are Forge's documented
   defaults and read-only until the field exists, answered from `WireGuiGame`'s
   own map and never from `FPref` or `YieldController` (the `isRemoteClient()`
   branch is dead code for us).

**And one comfort decision M5 deliberately left to M6 and to the user:**
whether `UI_MANA_LOST_PROMPT` goes on for real games (follow-up 2). If it does,
nothing else has to move — the board already renders a `confirm`, and the
automated seat answers one terminatingly.

## M6 — Comfort

**Status: done, 2026-09-12.** What shipped and what it was measured against are
in [`docs/evidence/m6-engine.md`](docs/evidence/m6-engine.md) (the bridge half)
and [`docs/evidence/m6-board.md`](docs/evidence/m6-board.md) (the browser half);
the wire is `docs/protocol.md` amendments **M32–M40**, promoted out of that
file's §10 and into the live sections. The corrections below were the plan and
they held: five of the features were already on the wire, one was already a
rendered button, and **one piece of work — `HostedMatch.restartMatch` —
unblocked three separate rows at once** (New Game, the `sideboard` ask, and
`order` with `sideboardMode`, of which the first two landed).
**Effort: 2 evenings.**

**Command**

```bash
./scripts/play.sh   # three games back to back, one command typed
```

That command means what it says as of M6, and it did not at first: `play.sh`
now defaults to **`--games 3`** and **`--keep-open`** (override with your own
`--games`, or `--no-keep-open`). Both are load-bearing — without the first the
JVM stops after game 1, and without the second the socket closes the instant the
last `over` lands, which is the moment the board draws its **New Game** row.
The first verification pass found exactly that dead end on this line.

**Deliverable.** New Game without restarting the JVM (`HostedMatch.restartMatch`),
Undo, Concede, phase stops, Pass-To, always-yes/no, keyboard shortcuts mirroring
Forge's own `SHORTCUT_*` keycodes, mana-font pips, error toasts.

**Every one of these is an engine feature rendered, not a client state machine.**

**What the evidence actually shows** (`docs/evidence/m6-engine.md` for the bridge,
`m6-board.md` for the browser, plus the verification pass below):

- **Three games in one JVM, from one command.** `act: newGame {mode}` →
  `nextGameDecision(CONTINUE|NEW)` → `HostedMatch.continueMatch()` /
  `restartMatch()`. **`openView` is the reset hook**: a new `gameId`
  (`<base>-g<n>`), a new `var/games/<gameId>/frames.jsonl` with its own session
  header, and the card / player / ability indexes, the concealed-id set, the
  yield-handle table, the phase-stop map, the `input` struct, the over-latch and
  the `ReplyPool` all rebuilt (**M38**, **D44**). The client is told by the **new
  `hello_ok`**, whose changed `gameId` is what makes the reducer drop its card
  map. Gate step **10g** plays three games over one socket in **85.7 s**, one
  JVM, and exercises both `continueMatch` and `restartMatch`.
- **The five typed acts are gated by their EFFECT, not by a count.**
  `setPhaseStop`, `yieldTo`, `setYield` and `undo` are each asserted by the
  `state` that followed them; `passPriority` is asserted by a count, which is all
  it can be, and the gate step **says so** rather than claiming five effects. The
  push that makes the other four visible
  while the engine is parked is `WireGuiGame.refreshState()`, and it walks the
  view graph only under **D39**'s two-part guard (D22's generation stamp **plus**
  a positive "the engine is parked" predicate), with skips counted and printed.
- **The phase-strip dots are live and the engine really stops.** 24 dots drawn
  from `players[].phaseStops` (**M32**, the `{own, opp}` shape of **D41**), a
  click is `act: setPhaseStop {phase, turn, stop}` (**M33**), and the next
  `state` says what happened. Measured in the browser: after setting the `DRAW` /
  own dot, turn 3 gave this seat priority at ***Your draw step*** — which Forge
  does not do by default.
- **Auto-yield's behaviour is asserted, not merely measured.**
  `decks/yield-probe.dck` (22 Thallids, one mandatory upkeep trigger each) puts
  the same `yieldKey` back on top of the stack every turn, and after
  `yielded:"yes"` the engine raises **zero** `input` frames carrying
  `buttons.ok.enabled` while that key is on top:
  `fixtures/games/human-yield-13.jsonl`, `repeats=4 promptsWhileOnTop=0`, gate
  step **10g** with `--require-yield-repeat`. The handle itself is opaque
  (`"y3"`) and never rendered (**D42**).
- **The `sideboard` ask has an engine recording at last** — game 2 of a
  `--games 2` match, gate step **9d**, `fixtures/games/human-sideboard-7.jsonl`
  — which makes it **nine of the eleven ask kinds** evidenced, the other two
  being the documented ceilings `options` and `manipulate_list`.
- **`input.buttons.focus` is on the wire and Space follows it** (**M39**,
  **D45**): `"ok"` on **546 of 844** `input` frames in `human-comfort-13` and
  never `"cancel"`, the focused button is the document's `activeElement`, and
  `planKey` returns *no* plan for it so the browser's own activation is never
  doubled into a second `buttonOk`.
- **`UI_MANA_LOST_PROMPT` is on by default** (**M40**, **D43**): `config.json`'s
  `"manaLostPrompt": true`, set in memory and never `save()`d, so the floating-mana
  `confirm` now occurs in ordinary games and every session header carries
  `prefs: ["UI_MANA_LOST_PROMPT"]`. The same seed plays the same game (1,587
  lines, one fewer `buttonCancel` — a frame that swings both ways on its own).
- **Undo is the engine's undo and nothing more.** `state.undo {can, depth}` is
  `canUndoLastAction()` / `getUndoStackSize()` (**M35**) — mana abilities only,
  cleared at every phase change — and the board's button promises exactly that.
- **The browser half computes nothing.** A dot draws `players[].phaseStops`, a
  yield line draws `state.yield`, the Undo button draws `state.undo`, a badge
  draws `stack[].yielded`; not one of them remembers anything between frames, and
  D31's **hold-priority toggle is gone** rather than enabled, because Forge has no
  such feature. Every M6 field is optional in `protocol.ts` behind one reader
  apiece, so the fourteen recordings that predate 2026-09-12 still render.
- **The gate grew two steps and about two and a half minutes, and stayed green.**
  Thirteen numbered steps with **five** lettered sub-steps (9b, 9c, **9d**, 10f,
  **10g**) and **seven** ws servers. The count and the wall time live in
  CLAUDE.md §"Build and run" and in one place only — two dated numbers in two
  files is how this repo once said "five servers, 3 m 19 s" and "seven servers,
  eleven and a half minutes" on the same day.

**Corrections from [`docs/research/11-engine-comfort-features.md`](docs/research/11-engine-comfort-features.md)
— read it before planning the two evenings.**

- **Half of M6 needs no new wire, and evening 1 ships it.** `InputPassPriority`
  already labels the *Cancel* button `Undo (n)` or `End Turn`; `InputPayMana`
  labels the *OK* button `Auto`; `InputLockUI` labels Cancel while a yield runs.
  `docs/protocol.md` §4 already requires us to render `buttons.*.label` verbatim
  and send `buttonOk` / `buttonCancel`. **So Undo, End Turn, Auto Pay and
  cancel-a-yield are on the wire as of M3** — M6's job is to stop hiding them.
  **There is no `autoPay` act and no `endTurn` act**; inventing one is the
  "board threw the engine's answer away" failure.
- **Phase stops are answered from `WireGuiGame`'s own map**, not from `FPref` and
  not from `YieldController`. `PlayerControllerHuman.isUiSetToSkipPhase` consults
  `YieldController` **only** `if (isRemoteClient())`, and we are not one — that
  map is dead code for us. Forge's desktop holds the state in the GUI object,
  seeds it once per match from `FPref.PHASES_HUMAN` / `PHASES_AI`, and never
  calls `save()`. Do exactly that. The polarity is **stop**, not skip, which is
  what `act: setPhaseStop {stop}` already says.
- **`YieldController` is `forge.gamemodes.match`**, not `forge.gui.control`.
- **A `yieldKey` is a card name.** `StackItemView.getKey()` is
  `CardView.toString() + ": " + …`. Ship an opaque **bridge-minted handle** in
  `stack[].yieldKey` and never render it (`docs/protocol.md` §10.1).
- **Undo undoes mana abilities, not spells**, and the stack is cleared on every
  phase change. Do not build UI that promises more. `GameSnapshot` is a different,
  experimental mechanism and is never wired to `undoLastAction`.
- **"Pass to" is three engine features** (end of turn, the per-(player, phase)
  marker, let-the-stack-resolve) behind one call, `sendYieldUpdate(YieldUpdate)`,
  and all three are cancelled by the same `buttonCancel`. One `act: yieldTo {kind…}`
  covers the set.
- **`endCurrentGame()` empties `getHumanControllers()`** and replaces every
  `PlayerView`. Every cached id, the `ReplyPool`, the phase-stop map and the frame
  log are rebuilt from `openView`, and a **new `hello_ok`** tells the client to
  drop its card map (`docs/protocol.md` §2.1).
- **Space and Escape are not Forge shortcuts.** Space activates the *focused*
  button — `updateButtons(..., focus1)` decides which — so bind it to
  `input.buttons.focus` (`docs/protocol.md` §10.2), not to "OK".
- **There is no "hold priority" in Forge.** Do not render a toggle with no engine
  behind it.

### M6 verification pass — one major and seven minors, all closed, 2026-09-12

An independent pass played the board in a browser, re-ran the gate from a deleted
`bridge/out` and read the jar. Its verdict was that M6's features are engine
features rather than client state — four proved behaviourally in a live browser,
the fifth (auto-yield) at the wire and bytecode level — and it found **one
major**, which was M6's own headline flow dead-ending on itself.

1. **[major] New Game had a 30-second fuse that fired with a client connected.**
   `MtgTable`'s two post-`over` waits were a flat wall clock that ran whether or
   not anybody was attached, so the board's **New Game** row — which appears at
   `over` — had half a minute to live, and `./scripts/play.sh` defaults to
   `--games 3`. **Fixed** by applying the rule the ask timeout already uses
   (**D24**, CLAUDE.md §"The socket's own two rules"): `MtgTable.awaitNextGame`
   waits with **no deadline while a `WsTransport` reports a connected client**,
   falls back to 30 s while none is, and returns at once when a client that
   *was* connected leaves — so no scripted client in the gate pays for it.
   `WsTransport.keepOpen(long)` is deleted. Decision **D40**. Measured: a client
   silent for **40,046 ms** after game 1's `over` still got game 2, 39 ms after
   the act. The board's half: `NewGameRow` disables both buttons and says why
   when the socket is not `open` (`Board`'s new `connected` prop).
2. **[minor] `web/src/protocol.ts` numbered the M6 rows `M1..M8`,** which are
   real amendment ids meaning something else. **Renumbered** to `M32..M41`.
3. **[minor] Amendment `M34` said `playerId` is null for two of the three yield
   kinds.** It is the yielding seat for all three; only `phase` is null.
   **Corrected**, matching §3.1 and the emitter.
4. **[minor] `hello_ok.gameNumber` / `.gameCount` were read by the client and
   written by nobody.** **Fixed by emitting them** — amendment **M41** — because
   the client's fallback (its own count of `hello_ok`s) restarts at 1 on a page
   reload and can never say *of 3*. `gameLabel()` still falls back for the
   recordings that predate it, and now says nothing at all for a one-game match.
5. **[minor] `scripts/play.sh`'s banner still said "Space press the engine's OK
   button",** which M6 itself retired, and listed none of M6's keys.
   **Rewritten**: the focused button, plus `E`/`T`/`B`, `P`, `CTRL+Z`, `Y`/`N`
   and `H`.
6. **[minor] Two dated statements disagreed about the gate.** PLAN's M3 bullet
   said five ws servers and 3 m 19 s; CLAUDE.md said seven and eleven and a half
   minutes. **The count and the wall time now live in CLAUDE.md only.**
7. **[minor] `tools/check-redaction.mjs` relaxed the hidden-information gate in
   two places for M6** and the verifier asked for a second signature on one of
   them. Added: **`reveal: true` on any `ask` kind other than `choose_list` is a
   failure**, so a flag the emitter writes cannot switch amendment P12's
   option-card audit off for a kind nobody argued for. Negative control
   `fixtures/negative/redaction/a7-reveal-flag-on-the-wrong-ask-kind.jsonl`.
8. **[minor] Auto-yield's BEHAVIOUR was measured, never asserted** — no run
   anywhere had shown the engine skipping a prompt because of `setYield`, and
   the committed proof set its yield on a creature *spell*, which the engine's
   ability-scoped store can never consult. **Both closed.**
   `decks/yield-probe.dck` (18 Forest + 22 **Thallid**, one mandatory upkeep
   trigger each) puts the same `yieldKey` back on top of the stack every turn;
   gate step **10g** plays it with `--require-yield-repeat`; and the rule is now
   an assertion on every deck — after `yielded:"yes"`, **zero** `input` frames
   with `buttons.ok.enabled` while that key is `stack[stack.length-1]`.
   `fixtures/games/human-yield-13.jsonl` is the recording:
   `repeats=4 promptsWhileOnTop=0`. `human-comfort-13` is re-recorded and its
   yield is on a triggered ability; `docs/evidence/m6-engine.md` §4's line
   references were redone against it.

<a id="fu-m6"></a>

### M6 follow-ups — thirteen, 2026-09-12

From the two builders' own "problems" notes, the verification pass and the fix
pass. **None of them stops a game or blocks M7**: the milestone's command plays
three games back to back in a browser, every M6 control is an engine feature
rendered, and the gate is green. Four are gaps in *evidence* (1, 2, 5, 13), two
are protocol rows nobody has needed yet (3, 9), two are a test that does not
exist yet or a reading that wants a second pair of eyes (7, 8), three are
deliberate non-changes named here so they stay decisions rather than becoming
oversights (10, 11, 12), and two are carried forward unchanged (4, 6).

**After M7, 2026-09-13: none of them is closed, and none was expected to be.**
M7 added a second *renderer* and touched no Java — `bridge/` is byte-identical to
M6 — so every item below stands exactly as written. The one M7 change that
touches this list's subject matter is a **document** fix: `docs/protocol.md`'s
counter-type rows were wrong from M1 (amendment **M43**, **D46**), and the bridge
is deliberately not changing. See *"M6 follow-ups closed by M7"* under §M7 below.

1. **`order` with `sideboardMode: true` is still unrecorded** (M5 follow-up 12's
   last corner). `sideboard` itself now has a recording; the *reorder* the same
   between-games hook can raise needs a deck whose main/sideboard swap forces
   one, and `decks/sideboard-probe.dck` does not.
2. **Only the `endOfTurn` yield has an engine recording.** `marker` and `stack`
   are on the wire, in the synthetic fixture and driven from the board (`T`,
   `B`, the stack's own controls), but no committed recording carries one —
   pressing `T` in a browser session and copying that log under `fixtures/` is
   the whole of the work (`docs/evidence/m6-engine.md` §9.2).
3. **`input.weak[]` is still `[]` and `input` still carries no typed
   `payingMana`** (M5 follow-up 10, amendment **M30**) — so the mana pips stay
   live whenever the pool is non-empty, and the "Auto would tap this" outline is
   not drawn on the tile. **Do not** solve either by matching a button label.
4. **`clickAbility` still never leaves the browser** (M5 follow-up 9, unchanged).
   It is proven end to end from a script (gate 10f) and the board's own path for
   a multi-ability card is still the asynchronous `ability_menu` (**D20**/**D22**),
   which reaches the same `IGameController.selectAbility`.
5. **`newGame` is absent from the frame log.** The act is applied before the log
   for the next game exists, so a reader of `var/games/` alone sees only the
   stderr line and the next game's header; a client log has the act
   (`docs/evidence/m6-engine.md` §2.3).
6. ~~**The undo race is Forge's own and is caught, not fixed.**~~ **Closed on
   2026-09-28 by the undo-race lane (D136, amendment M48)** — and the row was half
   wrong. The race was between Forge's unlocked undo stack and **our** act,
   applied from the EDT whenever it arrived; and it was not always caught: the
   story branch's gate run hit it on `Game-0` (`MagicStack.clearUndoStack`,
   `ArrayIndexOutOfBoundsException`), where nothing of ours catches anything, and
   D115 turned it into a failed run. `undo` and `useMana` are now applied only
   while the engine is quiet on this seat and are otherwise refused with
   `notice {title:"Not now"}`; `tools/undo-race-repro.sh` reproduces the race
   every run and gate step 10g asserts the refusal. *The undo race*, below.
   Forge's undo stack is still not transactional; the bridge no longer writes it
   while anything else might.
7. **D40's fix is not in the gate.** Proving "a connected client waits as long as
   it likes" costs ~40 s of wall clock, so `ws-auto-play --new-game-delay-ms`
   defaults to 0 and `tools/check-all.sh` does not pass it: the major is
   evidenced by a manual socket run (40,046 ms of silence, game 2 39 ms after the
   act) and by the browser, and **a regression would not turn the gate red**.
   Adding it is an eighth ws server and about a minute.
8. **`tools/check-redaction.mjs`'s two M6 relaxations want a second human
   reader.** An `ask` may now justify the `state` **immediately** before it (and
   nothing further back), and a `reveal: true` `choose_list` is its own delayed
   reveal. Both are negative-controlled in `fixtures/negative/redaction/`, and
   the verification pass narrowed the second (the flag on any other kind is now a
   failure, control `a7-…`) — but this file is the last automated thing between
   an emitter regression and shipping the opponent's hand, and both edits were
   made by the agent that needed them. Re-read `preAskReveals` and the
   `reveal === true` branch before trusting them.
9. **Three protocol rows are still specified and not emitted**:
   `state.autoPassNoActions`, `attachedToPlayerId` and `input.selectable.playerIds`
   (protocol §10). Nothing on the board needs them today.
10. **No AI profile picker and no yield settings, deliberately.** The profile
    picker is report 11 §9 and stays on the deferred list (it is one string
    passed as `profileOverride`, and the no-override branch **saves** a pref);
    `YIELD_*` prefs, yield suggestions and `DeclineScope` are out of scope by
    report 11 §12 and nothing in the bridge reads or writes them. *(The profile
    half came forward on 2026-09-27 as **match setup** — `--ai-profile`, always
    a non-empty `profileOverride` through `Bootstrap.createAiPlayer`, lint-held;
    protocol amendment **M44**, **D105**–**D108**, `docs/evidence/match-setup.md`.
    The yield half is unchanged.)*
11. **Phase stops are reseeded for every game** (**D38**), which Forge's desktop
    does not do: a stop set in game 1 must be set again in game 2. The decision
    and its rejected alternative are written down; this line exists so the
    comfort cost is on the follow-up list rather than only in the rationale.
12. **`useMana` still has no post-act snapshot push**, so the mana pool is one
    frame stale after it and the board marks the pips *provisional* (M5's
    mechanism, extended). The four M6 acts got `refreshState()`; `useMana` did
    not, because Forge's own flush usually follows it — measure before widening
    D39's guarded hop to a fifth caller.
13. **The user still has not pressed the space bar** (M3 follow-up 9, M5
    follow-up 13, unchanged by M6). Everything *around* it is measured —
    `buttons.focus`, the focus ring, `planKey` declining to double the
    activation — and the browser driver still delivers `Space` as
    `{key:"", code:"", keyCode:0}`.
14. **The gate never enters amendment M42's branch.** `RESYNC BEFORE THE FIRST
   INPUT` appears in none of check-all's ws-server logs, because the /health poll
   sleeps a second between tries and no gate client connects inside the ~130 ms
   pre-input window. The branch is proven only by the forced-race harness under
   `var/` (gitignored; `docs/evidence/m6-engine.md` §11). Close it with a fast
   /health poll on one of the seven ws servers asserting that line and no `input`
   before the engine's first push.
15. **`comfortNotYet()`'s retry path in `tools/ws-auto-play.mjs` has no automated
   test** — it is unreachable against a fixed bridge. Extract the comfort
   bookkeeping into an importable module and unit-test it under `node --test`.
16. **`WsTransport` caches `lastState` and does not clear it on `hello_ok`**, so a
   client connecting between a new game's handshake and its first snapshot could
   be re-delivered the previous game's final `state` (possibly one carrying
   `gameOver`). Unmeasured; the reducer's per-game reset (M38) partly masks it.
   Clear it the way `lastInput` is now cleared, and decide whether a connect
   before the first snapshot should send `hello_ok` alone.

### What M6 hands to M7

Written 2026-09-12, from the tree as it stands. M7 is a **second renderer over
the same frame stream** (`docs/ideas/arena-mode.md`, `docs/research/09-arena-tier1-plan.md`),
so what matters is what that stream now carries and what it does not promise.

**The animation vocabulary is already on the wire, and it has a shape.**
`state.events` (protocol §3.6) was added in M1 *for* M7 and M6 did not touch it:
every `state` carries the engine events that snapshot already reflects, in engine
order, **ids only**. Across the eighteen committed recordings —
**15,866 frames, 3,677 `state` frames, 3,291 of them carrying at least one
event** — there are **19,184 events in 21 kinds**:

| | |
|---|---|
| the bulk | `stats` 8,232 · `phase` 4,049 · `tap` 1,949 · `zone` 1,881 |
| the film | `cast` 412 · `resolved` 412 · `unstacked` 412 · `turn` 318 · `attackers` 317 · `combat_end` 300 · `land` 258 · `damage` 236 · `life` 113 · `blockers` 109 |
| the long tail | `counters` 55 · `shuffle` 54 · `attach` 28 · `outcome` 18 · `scry` 17 · `mulligan` 9 · `sacrificed` 5 |

That distribution is the schedule: six kinds carry the cinematic, four are
bookkeeping a renderer will want to *suppress*, and the tail is one animation
each. A kind that never fires here cannot be tuned here either.

**M6 gives the arena its first multi-game corpus, and it is one command away.**
One `frames.jsonl` **per game** (**M38**, **D44**), each with its own session
header, its own `gameId` and its own `hello_ok`, so `./scripts/play.sh` — three
games back to back — writes **three replayable files in one sitting**. Copy them
under `fixtures/` (the only tree the dev server mounts) and each one scrubs on
its own; a three-game arena reel is three loads, not one stream with three games
in it. Nothing multi-game is *committed*: `fixtures/games/` is 18 files and every
one of them is a single game — though one, `human-sideboard-7.jsonl`
(`gameId: sideboard-7-g2`), is **game 2** of a `--games 2` match and is therefore
what a second game's header and its opening `hello_ok` actually look like.

**Five things a second renderer must not assume away** — four are old and one is
M6's:

- **An `over` can arrive with no `gameOver` `state` in front of it** (**M11**).
- **`seq` is not an ordering primitive.** A `resync` re-delivers cached frames
  verbatim, so a client log's series is neither contiguous nor monotonic
  (**M10**/**M17**); the reducer's order is arrival order.
- **Events carry ids only, and an id that does not resolve is correct** — it is a
  card the viewer may not see (§3.6 rule 1). The one string, `cast.text`, is
  gated and swept by `Snap.stackText`; an arena that captions an animation must
  use *that* string and never rebuild one from a name it has cached.
- **A `hello_ok` mid-stream invalidates every cached id** (**M38**, invariant 10)
  — the arena's own scene graph is a card map by another name, so it drops on a
  changed `gameId` exactly as the reducer does.
- **Every M6 field is optional.** Fourteen committed recordings predate
  2026-09-12; `protocol.ts`'s five readers are where "absent" is turned into
  "this recording is older", and a new renderer reads *them*, not the raw field.

**And the renderer's half of hard rule 8 does not come for free in 3D.** On the
board it is mechanical — `CardTile` is the one card renderer, imported by exactly
ten files, and `render.test.tsx` checks every `data-card-name` in the markup
against what that frame serialised in the clear. A Three.js scene draws no such
markup, so **M7 owes an equivalent assertion before it draws its first textured
plane**: the per-frame check that nothing on screen names a card this frame
concealed. `drawnEntities()` in `web/src/render/picker.ts` is the other file that
has to learn about a new surface that mounts cards (**D33**).

## M7 — Arena mode: the game as a cinematic

**Status: Tier 1 done** — six evenings E1–E6 of
[`docs/research/09-arena-tier1-plan.md`](docs/research/09-arena-tier1-plan.md)
§11, then two independent verification passes (eight findings, then six; all
fourteen closed, each with a test that goes red without the fix). Evidence:
[`docs/evidence/m7-arena.md`](docs/evidence/m7-arena.md). **Nothing is
committed** — the work is the `m7` branch in a worktree, per CLAUDE.md.
**Effort: Tier 1 was 6 evenings + 2 verification passes. Tier 2 is complete in
four slices — T0–T7, T8 and the camera views, T9–T12, then the bodies, T13 and
T14 — each built and verified; see *M7 Tier 2* below.**

**Command**

```bash
npm --prefix web run dev:arena            # a recorded AI-vs-AI game as a cinematic
./scripts/play.sh --arena                 # a LIVE game, played in the arena
```

`dev:arena` is `vite --open "/?replay=games/g1.jsonl#arena"`. **Another fixture
is a URL edit, not a positional argument** (`?replay=games/g3.jsonl#arena`) —
`vite` takes no positional file, so the command line M6 wrote here was never
runnable. `./scripts/play.sh --arena` appends `#arena` to the URL it already
prints and changes nothing else: same bridge, same socket, same `--games 3`
default. **`V` switches renderer mid-game**, over the same socket, without
dropping a frame.

**Deliverable, delivered.** A second renderer for the same frame stream, in
Three.js via react-three-fiber inside the existing Vite app, under
`web/src/arena/`. It shares `reduce.ts`, `protocol.ts`, the transports, the art
index, the keymap and M5's `<AskModal>` with the 2D board, and it imports no
transport of its own (`web/test/liveness.test.ts` asserts that from the source).
The board is a 3D table, every card is a textured plane, `state.events` play as
animations, the camera is choreographed, and the seat is playable: a click is
`act: clickCard` sent verbatim, the prompt and the two buttons are the engine's
own strings, and every question is answered in the same modal component the
board uses.

**What the evidence shows.**

- **Chunk sizes** (`npm --prefix web run build`, 682 modules, 0 TypeScript
  errors). The 2D entry chunk went **83.99 → 85.62 kB gzip** across the whole
  milestone: **+1.63 kB**, and not one byte of it is `three` — it is `useView`,
  the view toggle, the `Suspense` boundary, two keymap rows, the `?arena=off` /
  `?dpr=` parses and the arena's CSS. The arena itself is **996.38 kB / 274.30 kB
  gzip in a lazy chunk** (`lazy(() => import('./arena/Arena.tsx'))`), fetched on
  the first `#arena` and never before; `dist/index.html` carries no
  `modulepreload` for it.
- **Cue coverage.** All **25** of `protocol.ts`'s `EVENT_KINDS` have a default
  cue, and the table is exhaustive *by type* (`defaults.ts` is a
  `Record<EventKind, CueSpec>`, so a new kind on the wire will not compile until
  it has one). Over the eighteen committed recordings, printed by
  `replay-cues.test.ts` on every run: **3,679 `state` frames · 3,293 non-empty
  batches · 19,208 events**, of which **1,156 resolve to a per-card cue** (40
  distinct entries from `cues.json`'s 28 cards) and **1,007 to an archetype**;
  **16,083 event targets resolve and 483 do not — and an unresolvable target is
  correct**, it is a card the viewer may not see (§3.6 rule 1). **0 effects over
  the §9.3 cap.** After every one of the 3,293 batches the offset map is
  **empty**, which is the mechanical form of the one property the whole design
  rests on (**D50**).
- **Performance — and the fps number is the honest part.** The scene is **40 draw
  calls, 80 triangles, 1 geometry** in a production build, against §9.1's budget
  of ≤120 / ≤2,000 / ≤12, and the frame *body* (tick, offset write, effect bind,
  camera, `gl.render`) measured **p50 0.1 ms / p95 0.2 ms / max 0.5 ms** over 200
  frames of a live game. The renderer is **fill-rate** bound, so the control that
  matters is resolution, and `arena/perf.ts`'s `DprGovernor` steps it on a
  48-frame window of frame intervals. `tools/arena-bench.mjs` (headless Chromium,
  SwiftShader, the production build over `vite preview`) is §9.4's measurement:
  **default, no pin — p50 8.6 ms, p95 13.8–15.5 ms, ladder settling on render
  dpr 0.75, which passes §9.4's p95 ≤ 20 ms gate**; pinned `?dpr=1` is p95
  22.4–23.6 ms and **fails** it. Two caveats are load-bearing and are not
  rounded off: **SwiftShader is a software rasteriser and an explicit lower
  bound** — no measurement on the user's own GPU or iGPU is possible in this
  sandbox — and the **`max ≤ 50 ms` half still fails on a cold table** (1–3
  frames in the first ~40, at every resolution including pinned ones), which is
  the first GPU upload of a card's Scryfall texture and is a hitch when a card
  first appears rather than a frame rate. **No frame-*rate* figure from the
  Claude browser pane is real**: `requestAnimationFrame` fires 0 times there, so
  drei's `<Stats>` reads `0 FPS` and every mid-cue screenshot in the evidence was
  taken by advancing the cue queue's virtual clock by hand.
- **Tests.** `npm --prefix web test` is **534 `node --test` + 79 vitest (5
  files)** standalone, up from 456 + 75 at M6, and **544 / 536 pass / 0 fail /
  8 skipped** inside `check-all.sh` (where `MTGTABLE_WS_LOGS` names the logs step
  10 just produced). The arena's suites are `layout.test.ts`,
  `colour.test.ts`, `replay-cues.test.ts`, `cues-exhaustive.test.ts`,
  `camera.test.ts`, `liveness.test.ts`, `perf.test.ts` and `arena-hud.test.tsx`;
  all but the last run under `node --test` with no DOM, because `cues/`,
  `camera.ts`, `layout.ts` and `colour.ts` import neither three nor React.
  `tools/check-all.sh`'s web step runs every one of them.

**Hard rule, and it held.** The arena is a *renderer*. It never decides anything;
it plays back what the engine said. Rules stay in Forge. The three mechanical
halves of that: no file under `web/src/arena/` imports a transport or a rules
predicate (`liveness.test.ts`), a click is never gated on `selectable`
(`HitProxy` has no such prop to gate on), and every concealed card in every frame
of every committed recording is placed as a **back** before anything asks for a
face (`layout.test.ts`'s corpus sweep — the assertion *"What M6 hands to M7"*
asked for above).

### M6 follow-ups closed by M7 — none, and that is the expected answer

M7 added a renderer and touched no Java: `bridge/` is byte-identical to M6 and
all sixteen M6 follow-ups are open exactly as written. What M7 *did* close, and
what it found, belongs on other lists:

- **The hooks-order half of M5 follow-up 4 is closed.**
  `web/test/hooks-order.test.ts` was a scan of `Board.tsx`'s one early return;
  it now walks **every `.tsx` under `web/src/render/` and `web/src/arena/` — 27
  files, 65 components** — finds each component's own early returns by tracking
  braces through blanked strings and comments, and flags any `use*(` below one.
  Negative-controlled at both ends. The rest of that follow-up (there is still no
  DOM test environment) is unchanged.
- **The assertion *"What M6 hands to M7"* owed is delivered**, in the form a 3D
  scene allows: `layout.test.ts` asserts `isHidden(card) ⇒ placement.back` for
  **84,418 placements across 3,679 frames**, and `CardPlane` branches on
  `placement.back` before it reads `art.json` at all. It is a check on the
  *placement*, upstream of the texture, because a canvas has no `data-card-name`
  for `render.test.tsx` to scan — see M7 follow-up 9.
- **`docs/protocol.md` §3.1, §3.2 and §3.6 were wrong about counter types since
  M1** (amendment **M43**, decision **D46**): the wire carries Forge's *display*
  name (`+1/+1`, `Spore`) and there is no `P1P1` anywhere in `fixtures/`. The
  doc is corrected; the bridge is not changing. The arena found it because its
  selector grammar was written from the doc and matched nothing.
- **The space bar is still unpressed by a human** (M3 follow-up 9 → M5 13 → M6
  13). E6's live arena game did activate the engine's focused button with SPACE
  three times through the browser pane's key driver
  (`docs/evidence/m7-arena.md` §4), which is more than any previous milestone
  managed — but the standing item is a *person* pressing it, and that has still
  not happened.

<a id="fu-m7"></a>

### M7 follow-ups — twelve, 2026-09-13

From the four builders' own "problems" notes and the two verification passes.
**None of them stops a game or blocks Tier 2**: the milestone's two commands both
work, the seat is playable end to end in 3D, the gate is green. Three are
measurement limits of this sandbox (1, 2, 3), two are deliberate non-changes
named here so they stay decisions (7, 8), two are dev-loop conveniences that were
specified and not built (4, 5), and the rest are small debts with a stated cost.

1. **`max ≤ 50 ms` fails on a cold table, and the cause is measured.** 1–3 frames
   over 50 ms in the first ~40 after a scrub (max 63.6–80.7 ms), at *every*
   resolution including a pinned `?dpr=0.75` with the governor and every canvas
   resize out of the picture — so it is not the ladder. It is the first GPU
   upload of each card's Scryfall texture, and the bench prints how many outliers
   coincided with the texture count going up. **Pre-warming the textures a scrub
   is about to reveal would remove it; nothing does that today.**
2. **Every performance number in this milestone is from SwiftShader**, a software
   rasteriser and an explicit lower bound — a fair proxy for draw-call and CPU
   work, one to two orders of magnitude off for fill rate, which is what this
   scene is bound by. The measurement report 09 §9.4 also asks for (the actual
   iGPU, `DRI_PRIME=1`) is impossible here: no display, and headless Chromium has
   no path to that device. **"Passes the gate" means "passes it on a CPU
   rasteriser at 1920 × 993."**
3. **The dpr governor cannot climb back on a vsync-locked display.** A browser
   pinned to 60 Hz reports 16.7 ms whether the GPU had 2 ms of work or 16, so
   there is no headroom to read out of frame intervals. It therefore sits where
   it is — right for the common case, since it never declined, and a stale low
   resolution only for a machine that was slow earlier in the same session. A
   reload starts at the ceiling; `?dpr=` pins it outright.
4. **§10.7's `?cue=<id>` loop route is not built.** What exists is the dev handle
   (`window.__mtgArena`, `import.meta.env.DEV`-only): pause the queue, advance
   its virtual clock by hand, look. That is strictly more general — it works on a
   real frame of a real recording — and it is what every mid-cue photograph in
   the evidence was taken with, but a route that loops one cue on a dummy card
   against a neutral table would still be nicer for tuning. It is a
   `queue.enqueueBatch` away.
5. **§7.1's `?cues=<url>` override is a documented refusal, not an omission.**
   Loading a cue file over the network is a `fetch`, and §2.1 rule 1 says the
   arena never calls one. Written down in `Arena.tsx` and in the README rather
   than left implied.
6. **`<AdaptiveDpr />` is mounted and dormant.** It acts on
   `performance.current`, which only moves when something calls `regress()`, and
   the only candidate is drei's `<OrbitControls regress>` — a prop we do not
   pass. It is harmless and the plan asks for it, but its trap is real and is
   written next to it: it writes `current × viewport.initialDpr`, the resolution
   the canvas *started* at, so turning `regress` on would undo a governor
   decision on every mouse-up. **Turn one on and the other off.**
7. **`drawnEntities()` in `web/src/render/picker.ts` was deliberately not
   extended** (**D33**). The arena answers **every** ask in the modal; a shared
   `drawnEntities` would be wrong for one of the two renderers, and wrong in the
   direction hard rule 8 cares about. The file says so at the top, including what
   it would take to change.
8. **`COUNTER_LABELS` in `web/src/render/labels.ts` is keyed by the enum-constant
   spelling** (`P1P1`, `M1M1`), so on the **2D board** `counterLabel('+1/+1')`
   falls through to its default: correct text, generic class, no `mana-font`
   glyph. Found while fixing the protocol doc (**D46**) and deliberately left —
   it is a board rendering change with its own evidence to gather.
9. **There is no canvas equivalent of `render.test.tsx`'s `data-card-name`
   sweep.** The arena's half of hard rule 8 is asserted one step upstream, on
   `Placement.back` (above), plus `arena-hud.test.tsx` over the DOM layer. A
   check on what is actually *on the quads* would need to read back a rendered
   texture, which needs a GPU and a DOM. Know which assertion you have.
10. **`tools/arena-bench.mjs` is not in `check-all.sh`**, and should not be
    without a decision: it wants a built `dist`, a `vite preview` server and a
    headless Chromium, and it takes tens of seconds per configuration. A
    performance regression therefore does **not** turn the gate red.
11. **The frozen React-18 3D line prints one deprecation warning at runtime** —
    `THREE.Clock: This module has been deprecated. Please use THREE.Timer
    instead.`, once per `<Canvas>` mount, from fiber 8.18.0's loop against three
    0.186.0. The loop runs, so §1.2's trip-wire has not fired (**D48**), but it is
    the first visible crack in a line with no maintenance branch.
12. **A second JVM started at the same `--seed` truncates the first's frame log.**
    `var/games/human-ws-42/frames.jsonl` was left beginning with NUL bytes when
    `play.sh` was started twice at seed 42 and the second process opened the
    per-`gameId` log path before dying on the port bind. A pre-existing property
    of that path, triggered by a mistake rather than by the arena; the file is
    under `var/` and gitignored, and no redaction check is claimed on it.

### What Tier 1 hands to Tier 2 — avatars and creature manifestations

Tier 2 is [`docs/ideas/arena-mode.md`](docs/ideas/arena-mode.md)'s second tier:
*"a small library of stylised generic models keyed by creature type and colour
with idle / attack / hit / die animations… two duelist avatars stand at either
end; creatures appear as holograms between them."* When this was written it was
**not scheduled**, and the honest summary was that Tier 1 built the *routing* it
needs and none of the *assets*. (It has since been scheduled and its first slice
built: *M7 Tier 2* below. The hand-over is kept as written, because it is what
slice 1 was built against.)

**What already supports it, unchanged:**

- **The archetype key is the Tier 2 model key.** `cues/archetype.ts` already maps
  a `Card` to `creature/W`, `land/*`, `equipment/*`, `instant/*` from fields the
  protocol ships (the first recognised word of `types`, plus `colour.ts`'s parse
  of `manaCost`), with a documented fallback for a hidden card (it archetypes as
  the colourless wildcard and takes the defaults, because we are not allowed to
  know what it is). *"About eight archetypes cover the deck"* is the same eight
  keys the cue ladder already resolves through, and a mesh library keyed by them
  needs no new classification code and no new protocol field.
- **The cue file is already the place a per-card override goes.**
  `cues/cues.json` is one validated data file (**D51**): `archetypes` and `cards`
  maps, values naming a cue in `registry.ts` plus `ms` and `params`, `_`-prefixed
  keys as comments, closed key sets so an unknown field is an error, and a
  validator that drops a bad *entry* and never the file. A Tier 2 entry is a new
  cue id in the registry and a row in this file; the ladder (per-card → archetype
  → §6 default) needs no change to reach it.
- **The offset model is already what an animated mesh wants.** `finalTransform =
  layout(state) ⊕ offsets[id]` (**D50**): `layout.ts` owns the resting pose,
  including `presence` (a hover and a bob folded *into* the pose — the Helicarrier
  and the Aerial Doombot already float), and a cue only ever contributes a
  transient that starts and ends at identity. A creature manifestation is another
  thing anchored to a placement; skip, scrub, `resync` and a new `gameId` stay one
  call (`flushAndSnap()`) whatever is anchored there.
- **The scene already has one `useFrame`, one geometry and a fixed effect pool.**
  `CueRunner.tsx` is the only frame loop (begin frame → tick → write offsets →
  bind effects), `effects.ts` is a fixed pool of 26 meshes, and the hot path
  allocates nothing — checked field-for-field by `cues-exhaustive.test.ts`, not
  claimed in a comment. A model library plugs into the same loop; it must keep
  the same two properties, and §9.1's budget (≤120 draw calls) is where the
  headroom is: Tier 1 uses 40.
- **The camera is a separate, pure module.** `camera.ts` has no three and no
  React: orbit coordinates, §3.5's clamps, a framing solver, the projection, and
  a `CameraDirector` with one lane, priority preemption, dwell caps and a bounded
  shake. A Tier 2 shot is a request on that lane, not a second camera.
- **The corpus is the test input.** `replay-cues.test.ts` runs every committed
  recording through the real reducer and the real queue against a `NullStage` —
  no GPU, no DOM — and prints the per-kind and per-card census every run. A Tier 2
  cue that never fires will say so there on the day it is added.

**What Tier 2 must bring, and the two things it must not assume:**

- Assets: rigged meshes, an animation set per archetype, two duelist avatars, and
  a licence story for every one of them. **Nothing derived from card art may be
  committed** (Marvel art is licensed to Wizards; NOTICE §2 and the Fan Content
  Policy) — the same rule the Scryfall images already live under.
- Lights and materials. Tier 1 has **no lights at all** (every material is unlit,
  which is why 40 draw calls buy a whole table); a lit, shaded model library is a
  different renderer budget and should be measured before it is designed.
- **It must not learn anything the engine did not say.** Two Tier 1 findings are
  the standing examples, both written up in the evidence: §3.6's `counters` event
  carries no *source*, so "Coulson gave this counter" is not on the wire and a
  badge keyed to Coulson can never fire; and the engine never says which card
  caused another card's tap, so Quake's ring is centred on **her own** tap.
  Inventing either link is rules logic in a renderer.

---

## M7 Tier 2 — the manifestation stage (slice 1: T0–T7; slice 2: T8 and the camera views; slice 3: T9–T12, per-card identity; slice 4: T13, proportioned bodies in costumes, T14)

**Status: Tier 2 is complete.** Every evening of report 13 §11, T0–T14, is
delivered across four slices, each verified and documented: slices 1–3 are
committed on `main` (`4f84613`, `5891444`, `0368a90`), and slice 4 — built,
verified once and documented on branch `tier2-slice4` — since as `23e26b3`.
What remains is follow-ups, none of which stops a game (each slice's list
below), a play-test of slice 4, and one question that only the user can settle:
whether **likeness** — Tier 3, which would be personal-only — is part of the end
goal at all (*Tier 2 is complete — what is left* at the end of this section, and
question 14).

**Slice 2 (2026-09-27) is further below** — *Slice 2 — T8*, its own follow-ups,
and *What slice 2 hands to T9–T14* — **and slice 3 (2026-09-27) below that** —
*Slice 3 — T9–T12*, its follow-ups, and *What slice 3 hands to T13–T14* — **and
slice 4 (2026-09-27) below that** — *Slice 4 — T13, proportioned bodies in
painted costumes, and T14*, the earlier follow-ups it closed, its own follow-ups,
and *Tier 2 is complete — what is left*. **The user played several games on slice 1
before slice 2 was built and reported nothing major** ("this seems to be on
track"), so nothing in slice 1 was redesigned; that play-test is the one slice
1's hand-over asked for before T8, and it did not flag the live combat budget
(follow-up 1, question 12).

**Status: slice 1 built and verified — T0 to T7 of
[`docs/research/13-arena-tier2-plan.md`](docs/research/13-arena-tier2-plan.md)
§11, then one independent verification pass (verdict: passed; ten findings, all
minor).** Evidence:
[`docs/evidence/m7-tier2.md`](docs/evidence/m7-tier2.md), in three parts (T0–T2,
T3–T4, T5–T7) plus a status section. **The user committed it on `main` as
`4f84613`**; it was built on branch `tier2-slice1` in the worktree
`/home/justin-a/code/mtg-table-t2`, and slice 2 branches from that commit.
The user's nine Tier 2 decisions are recorded as **D53–D62**, and the builders'
own as **D56, D57, D59, D60, D63**. The spec is report 13; the asset landscape it
rests on is [`docs/research/12-arena-tier2-assets.md`](docs/research/12-arena-tier2-assets.md).

*Tier 2 in one sentence:* every creature on the battlefield now has a figure
standing at its card, auras sit on the figure they enchant, lands are terrain,
tapping a land sends mana to its controller's side, and a spell on the stack is a
form at its caster's side with a tether to what it targets — **and all of it is a
pure function of the snapshot except the transitions**, which are cues that decay
exactly like Tier 1's (**D56**).

**Command**

```bash
npm --prefix web run dev:arena                 # the replay cinematic, now with Tier 2
#   /?replay=games/g1.jsonl#arena, scrubbed to transport index 316-376, is the
#   crowded table (>= 10 modelled figures) every T7 number was measured on
./scripts/play.sh --arena                      # a live game in 3D, with Tier 2
#   ?bloom=0 / ?bloom=1 sets where bloom starts; the cue strip carries the checkbox
node tools/build-figures.mjs --src var/assets/figures   # rebuild figures.glb + models.json
npm --prefix web run build && npm --prefix web run preview -- --port 5182 &
node tools/arena-bench.mjs --index 316 --gpu gl --settle 4000   # the bench frame, on the real GPU
node tools/arena-bench.mjs --index 316 --settle 4000            # ... and under SwiftShader
#   --bloom / --no-bloom, --reduced-motion, --dpr 1, --settle 600 (cold); NOT in check-all
```

A fresh checkout with no `web/public/models/figures.glb` plays the whole film:
every creature draws its stand disc, the console says so once, and nothing errors
(evidence §4.3). Rebuilding the file needs the CC0 sources under
`var/assets/figures/` exactly as downloaded — **four since slice 2** (the
Universal Animation Library joined the three) — and `tools/assets-manifest.json`
has their download URLs, byte counts and sha256s. **Since slice 2 nothing is
unzipped by hand**: the build verifies every archive against the manifest,
refuses one that differs, reads the members it needs out of the verified zips,
and records the output's own bytes and sha256 in `models.json`
(`--verify-only` checks the sources and stops; **D67**).

### The evenings

T0–T7 are slice 1; **T8 and the camera views are slice 2** (the camera views are
not one of report 13 §11's evenings — the user asked for them with T8, and they
are the row below it); **T9–T12 and per-card identity are slice 3** (identity is
not one of the evenings either — it is the answer to the user's verdict on slice
2, *"everything still looks very generic"*); **T13, the bodies and costumes, and
T14 are slice 4** (the bodies are not an evening either — they are the answer to
the verdict on slice 3, *"the avatars are still pretty generic"*, and they are the
row before T13, because the duelists stand in them).

| | deliverable | status | what proves it |
|---|---|---|---|
| **T0** | the spike and the go/no-go | **passed with room** — the named billboard fallback was not needed | 12 cloned figures = **12 draw calls, 1 material, 1 geometry, 1 program**, frame body p50 0.30 / p95 0.50 ms; 21 figures = 21 calls, p95 0.60 ms (SwiftShader; `web/t0-spike.html`) |
| **T1** | the pose layer, no assets | **done** | `figures.test.ts` + `figure-pose.test.ts` over all 3,679 board frames: 26 distinct creatures resolved, 11,901 poses, max 21 in a frame, **1,138 face-down instances all anonymous**; one instanced disc per creature |
| **T2** | the loader and the first models | **done — three archetypes, not one** | `figures.glb`, 126,404 bytes, CC0: agent (Kenney), drone and insect (Quaternius, via Poly Pizza); `g1.jsonl`@355 = 12 figures, 11 models, 59 draw calls, one figure program used 11 times; the missing-file fallback proved by removing the file |
| **T3** | the clip lane | **done** | `stage.clips` empty after all 3,293 batches; every `mixer.update` is a literal `0` (negative-controlled); 23 of 57 cues drive a clip; the per-card alias works end to end (the Doombot's `jet`) |
| **T4** | lands as terrain, and the mana motes | **done** | 29,389 tile-instances, a tile and its card never disagree about tapped; 20 lands of one kind = **1** draw call, `g1`'s 17 = **3**; motes in flight photographed; the casting anchor |
| **T5** | one aura, properly, and the default halo | **done** | all 985 attachment frames show their aura; Quantum Reduction holds its host at 0.45× through a skip; every other attachment draws the halo |
| **T6** | the stack | **done** | 389 stack frames, 417 forms, max depth 4; the ghosted creature spell *is* the figure that lands; 44 tethers; **41 aimed strikes** from one frame of look-behind (**D63**); the combat freeze spares the spell; the fizzle shown with a synthetic event (the corpus has none) |
| **T7** | measure and tune | **done** | busts; the width clamp; the bench on SwiftShader **and on the GTX 1080**; bloom's default decided by measurement; a live game on port 8660 |
| **T8** | the rest of the humanoids | **done (slice 2)** — plus two things T8 found: the death, and slice 1's drone | hero `character-female-b` and scientist `character-male-e` on the agent's one 7-joint rig (**D73**); the Universal Animation Library retargeted offline and judged clip by clip — its `hit` and `die` kept, the rest of the pack's own clips better (**D68**); `figures.glb` 143,920 B, five models, 9,759 triangles, **no texture**, two builds byte-identical, every source verified by the build (**D67**); the width clamp strict for every archetype, 7,331 neighbouring pairs, worst overlap 0.000 (**D65**); the back row on its own card, 216 → 0 stand points inside another card (**D66**); **a creature that dies is seen dying**, all 17 corpus deaths drawn without a gap from the snapshot to the end of the death cue (**D64**) |
| **cam** | camera views | **done (slice 2)** | five views on keys `1`–`5` (table, shoulder, opponent's shoulder, side-on, low), each the camera's home; the three that keep the seat's hand and ranks on screen usable live, the other two spectator-only (**D69**); spectator mode `O`, on by itself in a replay and when a live game ends; the auto director `6`/`0`, pure, 596 cuts over all 19 recordings at two paces with no shot under 2.4 s and no cooldown violation (**D70**); rule 5 at a live seat only, `change` only under the user's hand, the choice kept in `localStorage` (**D71**); three keymap rows, `inert` on the board (**D74**) |
| **T9** | drone and insect | **done (slice 3)** | the Doombot with a red laser eye, a red visor band round its head, twin thrusters and a lit exhaust that flares with its jet (**D83**'s `visor`); Ant-Man's Air Force as **five procedural bees in a turning ring**, one instanced draw call, its insect rig kept hidden at the centre for the clip lane (**D88**); the Giant-Sized Flying Ant **0.867 tall against 0.490** because it flies side-on, with a crouching rider baked from the hero body — no exemption from the strict clamp (**D76**) |
| **T10** | the vehicle | **done (slice 3), with no asset** | a procedural carrier silhouette (hull, flight deck with runway lights, island, four rotor pods; 456 triangles, one draw call) for every Vehicle through the `subtype:vehicle` trait rung, **crewed or not** (599 uncrewed poses in the corpus); yours at `SILHOUETTE_ALTITUDE` 2.05 over your rank, the opponent's lower, a fifth smaller, over the centre line and clear of the HUD's keep-out band; table-view cover of any figure **0.000** over 5,103 pairs (**D77**, **D85**); the manifest's `_deferred.carrier` closed |
| **T11** | per-card beats | **done (slice 3)** | the `figure` anchor puts a beat ON the body and follows it through a lunge, a hover, a shrink and a death; every cue param closed and ranged (`PARAM_SPECS`, 15 negative controls); shapes (badge, shield, reticle, web, circuit, star, hex) and a travelling particle cloud; suppression rule 7; the pool 38 → 45 with `MAX_LIVE_EFFECTS` unmoved (**D79**); an attacker turns to face its defender for the length of its attack (**D82**); Quake keyed off her trigger's resolution, never a paired tap (**D89**); four quiet beats made to read (**D87**); the census prints fired and aimed per beat every run |
| **T12** | the remaining attachments | **done (slice 3)** | Super Suit's armour shell, the Spy Kit's glints, Robotics Mastery's circuits — per-name rows in `figures.json`, **944 shrink · 409 shell · 362 glints · 315 circuit** over the corpus, nothing of this deck on the halo; Web Up **measured first** (no exile card is ever linked to anything) and drawn as a cocoon over its own card; Strategic Intervention's ops console as a 3D station in its own rank slot rather than a DOM widget (**D80**); an attachment lies under its host so a click on the host hits the host, 765 of 765 (**D86**) |
| **id** | per-card identity | **done (slice 3)** | `figures/traits.json`, validated like `cues.json`, and a closed kit of **eighteen** shared, procedural, instanced prop kinds plus three derived ones — **one draw call per kind on the table, never per figure** (**D75**); every deck card's props rasterised through the table camera on **both** seats, standing and kneeling, ≥ 48 px each with the real `figures.glb` and the real prop field (**D83**); the Agents three heads side by side (**D84**); `g1`@355 **78 draw calls, 27,906 triangles, 12 programs** with bloom off, against ≤ 90 and ≤ 30,000; idle still **0 frames in 5 s** |
| **body** | proportioned people in painted costumes | **done (slice 4)** | every humanoid card in a Quaternius *Universal Base Characters* body (CC0, badge recorded on the day) on the animation library's own 65-joint rig, every clip the library's retargeted by world-space delta, no face-plant, the tapped kneel composed, the head ×1.3 (**D95**); 1,400 triangles a body, the drone 1,900 and the bee 1,700, `figures.glb` **373,236 B**, two builds byte-identical (**D96**); a costume slot per vertex and a palette per figure, still one program and no texture — Peggy a blue jacket over a white shirt under a red hat (**D97**); the chibis kept as a `body: chibi` fallback, props fitted per body family, Agent 13's pistol in her hand (**D98**) |
| **T13** | duelists | **done (slice 4)** | one full figure per seat instead of a flat bust — the director (yours) and the villain (the opponent's), 1.6× a creature, props baked into one mesh, one draw call each and no new program (**D99**); yours beside your hand, the opponent's at the table's right beside its creature rank because the far end is under the chrome from every seat-safe view (**D100**); a raised hand on a cast, a red flinch on damage, a raised arm or a kneel at the end, as a `gesture` param on the existing cues (**D101**); `g1`@355 **79 / 27,416 / 12** with both duelists; the busts kept as the fallback, standing where the duelists stand |
| **T14** | verification pass | **done (slice 4)** | slice 1 one pass, slice 2 two, slice 3 two, **slice 4 one — passed, eleven minor findings**, all carried as slice 4's follow-ups below — plus a documentation pass per slice (**D95–D101** are slice 4's) |

### What the evidence shows

- **The corpus resolves, and says how.** `figures.test.ts` prints the figure
  census every run: by frame-instance, the disc 5,120 (the probe decks' beasts,
  the face-down creatures, the Helicarrier), agent 4,272, drone 1,431, insect
  1,078 — and it names the four declared rungs that never fire, so an entry that
  is decorative says so on the day it is added. Hard rule 8's new shape is
  asserted rather than trusted: a face-down creature is always the anonymous
  disc, and a redacted permanent gets no figure at all.
- **The scene, at T7's bench frame** (`g1.jsonl` index 316, 11 figures, 17
  tiles, 2 busts, 1920 × 993): **64–66 draw calls** against report 13 §8.2's
  ≤ 90, **21,305–24,351 triangles** against ≤ 30,000, **11 programs** with bloom
  off and **25** with it on, against ≤ 14 — the one budget line that is over, paid
  once at mount (Tier 2 follow-up 5).
- **Frame times** — `tools/arena-bench.mjs`, production build, `vite preview`,
  headless Chromium, `--disable-gpu-vsync --disable-frame-rate-limit`:

  | rasteriser | configuration | render dpr | p95 | max | verdict |
  |---|---|---:|---:|---:|---|
  | SwiftShader | warm, bloom off (×4) | 0.6 | **16.2–17.2 ms** | 33.7–35.9 ms | **passes** T7's gate |
  | SwiftShader | cold (`--settle 600`), bloom off (×2) | 0.6 | 17.6 / 30.8 ms | 78.2 / 65.0 ms | fails on max (M7 follow-up 1's first-upload hitch, plus the governor settling) |
  | SwiftShader | warm, reduced motion (×2) | 0.6 | 17.1–17.2 ms | 34.4–34.7 ms | passes |
  | SwiftShader | warm, pinned `?dpr=1` | 1.0 | 29.1 ms | 43.5 ms | fails, as Tier 1 did |
  | SwiftShader | warm, **bloom on** | 0.6 | **82.3 ms** | 102.1 ms | fails by 4× |
  | **GTX 1080** | warm, bloom off (×3) | 1.0 | **0.4 ms** | 17.7–17.8 ms | passes |
  | **GTX 1080** | warm, bloom on, after priming (×4) | 1.0 | **1.1 ms** | 18.1–19.3 ms | passes |
  | **GTX 1080** | cold, bloom on, after priming | 1.0 | 1.0 ms | 18.2 ms | passes |

  **Read the caveats with the numbers.** SwiftShader is a software rasteriser and
  an explicit lower bound, and on it Tier 2's 66 draw calls push the governor
  down to its **floor** (0.6), where Tier 1's 40 settled at 0.75. The GTX 1080
  numbers are **headless Chromium reaching this machine's GPU through
  ANGLE-on-GL** (`--gpu gl`, which T7 found works) — not a headed browser on the
  user's desktop compositor, and not the integrated GPU report 13 §8 was sized
  for, which is still unmeasured. The live game on the GTX 1080 (bloom on, five
  figures, vsync-locked) ran at **60 fps, rAF p95 16.8 ms**, with 0.2 ms p50 /
  0.3 ms p95 of frame work. The verification pass re-measured the GTX 1080 with
  bloom on at p95 0.7–0.8 ms, max ~18 ms, warm and cold.
- **Bloom is ON by default (D61)**, because user decision 6's condition — "within
  budget on this machine" — holds on the GTX 1080: +0.7 ms at p95, and the one
  long frame per run disappeared once `EffectPool.prime()` moved a lazy shader
  compile to mount. On a machine that cannot afford it the DPR governor now has a
  **rung below its floor** that turns bloom off: under SwiftShader that takes
  ~40 frames over 50 ms first, and a 15-second sample containing the switch reads
  p95 32.4 ms because the ladder then oscillates between 0.6 and 0.75. The
  checkbox in the cue strip and `?bloom=0` are the manual escape.
- **Idle is still zero.** `frameloop='demand'` holds with figures on the table:
  0 renders in 5 s on `human-comfort-13` @1262, bloom on and off (verification
  pass). Breathing runs only while a cue is already running (**D58**).
- **The 2D board did not move.** Entry chunk **85.72 kB gzip** (Tier 1: 85.62;
  still no `three` in it); the arena chunk 315.13 kB gzip (Tier 1: 274.30); the
  bloom composer is its own lazy `Post` chunk, 16.54 kB gzip, fetched only when
  bloom is first on. `render.test.tsx` still renders every frame of every fixture
  twice.
- **Tests.** `npm --prefix web test` is **610 `node --test` + 79 vitest**
  standalone (Tier 1: 534 + 79); the new suites are `figures`, `figure-pose`,
  `clips`, `tiles`, `attach` and `stack`, and `liveness.test.ts` grew from 8
  clauses to 19 — among them the zero-delta mixer, the lazy bloom pass as the
  only post pass, the pose layers bound only from `CueRunner`, and "no arena
  module names a CDN".
  **`./tools/check-all.sh` was run once during the documentation pass
  (`WSPORT=8661`): exit 0 in 727 s (12 min 7 s)** — 9b's re-recording of
  `human-auto-42` multiset-identical, 9c's ten games 10/10 in 269 s, all seven ws
  servers, every fixture and fresh recording through `check-redaction.mjs`, and
  the web step at **620 `node --test` (612 pass / 0 fail / 8 skipped) + 79
  vitest**. It ran concurrently with edits to documentation files only, none of
  which any step reads. Log: `var/check-all-t2-docs.log` in the worktree.
- **The live seat.** A whole game on port 8660, seed 7, driven by real CDP mouse
  events on the card's own hit proxy: a two-tone water tile, Quantum Reduction
  on the stack with its tether, the AI's insect shrunk to 0.268 tall, Agent 13 as
  a ghost at the casting anchor becoming the same object on the battlefield, her
  `pistolDraw` alias as her attacking stance, the live combat freeze, a live
  `block` clip, a concede. The frame log passes `check-redaction.mjs`, and
  `~/.forge/decks` hashed the same before and after.

### Deviations from report 13, each argued in the evidence

Three archetypes rather than one at T2, and three tile kinds rather than five
(**D59**). The disc is drawn under every creature, not only as the fallback
(**D55**). `ClipRequest` lives in `figures/clips.ts` and carries a `key`
(**D57**). A `tap` cue carries its card's controller, read off the snapshot
(**D60**). `mote` is a seventh `Effect` kind with its own cap (**D60**). The spell
form arrived in T4 because the motes needed somewhere to land. `land.tap` /
`land.untap` replace `fx.ripple` on the five land entries of `cues.json`. The
strike reads the previous frame (**D63**), and the fizzle's fall added
`casting.ground` to `AnchorRef` and `arc` to `Effect`. The busts are one draw call
with a `vigour` term (**D62**). Quantum Reduction's shrink is on `attach:on`
through `params.hostClip` / `params.collapse`, because `queue.ts`'s rule 5 drops a
`cast` whose card lands in the same batch, which is how the AI plays. `resolved.*`
defaults are 480 / 460 ms, up from 320, so the strike can travel. Shell, circuit,
glints and cocoon still draw as the halo (T12). **The benchmark frame is not
report 13's**: `human-sideboard-7`'s 21-creature frame is all probe-deck beasts on
the disc — the busiest board in the corpus has no models in it — so T7 measured
`g1.jsonl` at 316, the first of 61 consecutive frames with ≥ 10 modelled figures.
**`docs/protocol.md` needs no amendment**: Tier 2 changed nothing on the wire,
`bridge/` is untouched, and no fixture was re-recorded.

### The verification pass — passed, ten minor findings

An independent verifier re-ran the evidence and found nothing blocking. Two of its
ten findings are **closed by the documentation pass**: the docs lagged the code
(CLAUDE.md still said the effect pool was 26 meshes — it is 38 — quoted M7's test
counts and had no Tier 2 conventions, and DECISIONS.md had no entry for the
changes that contradict earlier documents; now **D53–D63** and CLAUDE.md's Tier 2
section), and NOTICE did not list the two bloom packages bundled into the `Post`
chunk (now §6). The other eight are follow-ups 2, 3, 4, 5, 7, 8, 9 and 10 below.

<a id="fu-t2s1"></a>

### Tier 2 follow-ups — nineteen from slice 1, 2026-09-27; six closed by slice 2, one by slice 3, one by slice 4, one (17) by the hardening pass

From the builders' own "problems" notes and the verification pass. **None of them
stops a game, and the gate is green.** **Slice 2 closed 2, 3, 8, 9, 11 and 18**
(struck through below, each with what closed it) and added a second cause to 1;
**slice 3 closed 15** (Web Up measured before its cocoon was built); **slice 4
closed 10** (the duelists, and the busts with them, stand out from under the
chrome) and made 17 weightier; the other eleven are open, and slice 2's, slice
3's and slice 4's own lists follow their sections. Three are properties of the wire or of
Tier 1's queue policy that a renderer must not paper over (1, 2, 13), four are
measurement limits or caveats (4, 6, 12, 14), and the rest are small debts with
a stated cost.

1. **In the human's own combat the transient clips mostly do not play live.**
   Forge hands the human priority with each combat batch, so the 250 ms
   awaiting-human budget applies, the batch would need compressing below
   `MIN_COMPRESSION` (0.25), and a snapped cue is applied at `t = 1`, where clip
   weight is 0. The attack lunge and the damage hit were therefore **not
   observed live** (the block clip and the summons were); both were photographed
   in replay, where the budget is 2.5 s. The land's *rise* could not be
   photographed live for the same reason. Loosening this — exempting the clip lane
   from `MIN_COMPRESSION`, or an attackers batch keeping a ~400 ms floor while the
   human is awaited — is a **Tier 1 policy change**, and it wants the play-test
   (report 13 §13 question 7), not a guess. **A second cause, found and fixed by
   slice 2's second verification pass (D72):** the cue clock added the whole idle
   gap of a parked loop to the next batch's first frame (the verifier measured
   live AI-turn batches jumping 734–1000 ms), so after any pause a batch could be
   consumed by its first tick whatever its budget. The budget cause above is
   unchanged and still open, and now measured live: after the D72 fix, 17 of a
   live game's 44 batches still finished on their first tick with the clock
   advanced 0 ms — which can only be zero-duration cues, the 250 ms budget
   compressed below `MIN_COMPRESSION`. The user's play-test of slice 1 did not
   flag it (question 12).
2. ~~**The `die` clip never plays anywhere**~~ — **closed by slice 2 (D64)**: a
   creature that dies is drawn as a departing body from the snapshot it dies in
   until its own death cue ends, the fate decided by the queue
   (`CueQueue.deathPending`), stepped out of the rank that closed up. The first
   version (drawn only while the `die` request was on the stage) blinked on every
   death; the verification fix and `clips.test.ts`'s corpus timeline are in
   `docs/evidence/m7-tier2-slice2.md`. The original text, for the record:
   **The `die` clip never plays anywhere** (**D56**). The snapshot carrying a
   creature's `zone → graveyard` event already shows it in the graveyard, so it
   has no figure; in a full 1× replay of `g1` the verification pass saw 69
   `die` requests reach `stage.clips` and no rig ever show a death clip. Not a
   renderer bug, and not to be worked around: a figure that outlives its frame
   would be the renderer remembering something the engine did not say. `die`
   stays in `CLIP_FOR` so that the day the wire says "dying" one frame earlier it
   plays.
3. ~~**A wrapped rank's second-row figures stand inside the first row's cards.**~~
   **Closed by slice 2 (D66)**: a back-row figure stands on its own card (216 stand
   points inside another card → 0), and its disc is drawn in a second pass after
   the cards (the verification pass found five discs a seat hidden under their own
   back-row cards). Originally:
   `standPointOf`'s row falloff is report 13 §3.1's own formula, and the
   verification pass found it still lands row-1 figures on row-0 cards. Measured
   during the documentation pass: only `human-sideboard-7` ever has ten or more
   creatures on one seat (22 frames, at most 11), and its creatures are discs, so
   no model has yet stood in the wrong place in a recording.
4. **Bloom's default rests on one headless measurement.** It is the GTX 1080
   through ANGLE-on-GL in headless Chromium — not a headed desktop browser, not an
   iGPU. With the default on, the SwiftShader bench **fails** until the governor
   switches bloom off (~40 slow frames). M7 follow-up 2 is answered for this GPU
   and still open for an integrated one; the check is a real browser on the
   user's desktop with `?stats=1&glinfo=1`, bloom on and off. **Slice 2 is under
   the same caveat**: every browser number it has — the views, the director, the
   deaths, the loop — is headless Chromium on the GTX 1080.
5. **The program budget is exceeded under bloom**: 25 programs (22 after the
   governor turns it off) against report 13 §8.2's ≤ 14; bloom off is 11. Draw
   calls and triangles are inside budget. Either the budget line is amended to
   exclude the composer's own passes, or bloom's variants are reduced.
6. **With bloom on, `gl.info.render` counts only the composer's last pass**
   (`calls: 1`), so every draw-call number above was read with bloom off. A bench
   that reports draw calls must say which.
7. **The idle cost of a table with a bobber on it rose** (**D58**). Tier 1's
   `presence` bob (the Doombot, the Helicarrier, Wasp) keeps the loop at `always`
   while such a card is on the table — from `g1` frame 176 onward in that replay —
   and since Tier 2 every pose layer is bound on each of those frames. A table
   without one still renders nothing while idle. **Slice 3 declined to add a
   fourth**: the giant ant's "wing hum" was built as a `presence` bob and taken
   out after measuring `human-comfort-13`@1262 go from 0 to 300 frames in 5 s of
   idle for a vibration of about a pixel; its flight is `traits.json`'s
   `idle: hover`, which moves only while frames are drawn.
8. ~~**The "no CDN" liveness clause is a hostname denylist**~~ — **closed by
   slice 2's verification fix**: the clause is now an allow-list over every string
   literal under `web/src/arena/` that carries a URL scheme (only the Scryfall
   credit link is allowed, with its reason), plus provenance-only keys in the
   arena's JSON, with the negative controls — `'https://example.com/figures.glb'`
   among them — in the test itself. Originally: **the clause was a hostname denylist** (**D54**): the
   verification pass pointed the loader's fallback at `https://example.com/…` in a
   scratch copy and the clause stayed green. The robust form is "no string
   literal with a URL scheme anywhere under `web/src/arena/`", negative-controlled
   the same way.
9. ~~**`tools/build-figures.mjs` never verifies a source's sha256**~~ — **closed
   by slice 2 (D67)**: the build checks every source's bytes and sha256 against the
   manifest before building, records the built file's own in `models.json`, and
   `figures.test.ts` fails when the committed `figures.glb` is not that file (the
   check lives there rather than in a separate `tools/check-models.mjs`).
   Originally: **`tools/build-figures.mjs` never verified a source's sha256** against
   `tools/assets-manifest.json` (it prints them when a file is missing), and
   **nothing checks the built file's own hash**. The documentation pass recorded
   it — 126,404 bytes, sha256 `c870a53330cf…5c5658fa` (NOTICE §7, **D54**) — so the
   next rebuild can be compared by hand; making the build assert both is the code
   half, and report 13 §9.2's `tools/check-models.mjs` is where it was meant to
   live.
10. ~~**The busts sit badly at 1600 × 1000**~~ — **closed by slice 4 (D100)**:
    the busts are T13's fallback now, and they stand where the duelists stand —
    yours 0.4 outboard and 0.4 back from your HUD anchor, clear of a seven-card
    hand in every seat-safe view; the opponent's at the table's right beside its
    creature rank, ≥ 90% visible on a 1600 × 1000 window, because the far end of
    the table is under the chrome from every seat-safe view (0% visible from the
    table view). The residue — `visibleShare` models the chrome band but not the
    player plates — is slice 4's follow-up 3. Originally: **the busts sat badly
    at 1600 × 1000**: the opponent's is mostly hidden under
    the top-left decision panel and cue strip, and the viewer's takes the
    bottom-left corner (**D62**). **Measured by slice 2's second fix pass**, as the
    share of the opponent's bust quad where `elementFromPoint` is not the canvas:
    **37–38% at 1600 × 1000, 33% at 1280 × 720, 89% at 1024 × 700** — unchanged by
    folding the camera switcher into the cue strip's row, because what covers it
    is the decision strip, the cue strip and the credit line. The anchor is
    **T13**'s to move.
11. ~~**The drone overlaps its neighbours**~~ — **closed by slice 2 (D65)**: the
    drone was mismeasured, not too wide (1.66× wider than tall, not 2.97×); the
    clamp is strict for every archetype and the worst overlap over 7,331 pairs is
    0.000. Originally: **the drone overlapped its neighbours** by up to 0.634 units — every
    overlapping pair in the corpus has a drone in it. It is mostly wingspan and
    the width clamp's floor keeps it from vanishing; a narrower drone is **T9**'s.
12. **The fizzle is evidenced only by a synthetic event**: 0 of the corpus's 412
    resolutions fizzled.
13. **Engine order puts `attach` before `resolved`** in an Aura's batch, so the
    Aura snaps on and *then* the bolt flies. The planner never sorts; reported,
    not reordered (**D63**).
14. **The SwiftShader cold start** is still max 65–78 ms: the first GPU upload of
    a card face plus the governor settling inside a 600 ms window (M7 follow-up 1,
    unchanged). The GTX 1080's cold run has no hitch.
15. ~~**Web Up's cocoon is measurable now and unmeasured.**~~ — **closed by
    slice 3 (D80)**: measured over the whole committed corpus before anything was
    built (`human-comfort-13` plays Web Up, cast at 1034 and resolving at 1044) —
    **no card in any exile zone ever carries an `attachedToId`**, and Web Up's own
    is `null` in every frame, which `attach.test.ts` now asserts. So the wire never
    relates Web Up to what it exiled: the cocoon hangs over **Web Up's own card**
    as a station, and the wrap is a cue on its own `cast` and `resolved`, aimed by
    the stack. (The local `human-ws-7` recording this item named was not the one
    read.) Originally: **Web Up's cocoon was measurable and unmeasured.** The live game played
    Web Up (the AI cast it on our Quantum Reduction), so report 13 §4.5's
    "measure before building" recording exists — `var/games/human-ws-7/frames.jsonl`,
    **local and gitignored** — and nobody has read it for `attachedToId` on the
    exiled card. T12's first step.
16. **The minified chunks carry no licence banners** — measured during the
    documentation pass: the entry, Arena and Post chunks contain no `Copyright` and
    no `@license` comment, so NOTICE §6's M7 claim that the bundler preserved them
    was wrong. NOTICE now says so and is where the notices live; a `web/dist/` that
    leaves this machine must carry NOTICE with it, or the build must be told to
    keep legal comments. Pre-existing since M7; found now.
17. ~~**`@gltf-transform/cli` floats on a caret (`^4.5.0`)**~~ — **closed by the
    hardening pass (2026-09-27)**: `web/package.json` pins the CLI at `4.5.0` and,
    through `overrides`, its nested meshoptimizer at `1.2.0` and the three
    `@gltf-transform` libraries the build imports at `4.5.0` (slice 4 follow-up 9;
    *The 2026-09-27 hardening pass*, below). While it was open: every Tier 2
    runtime dependency is exact. A minor release could change the bytes of
    `figures.glb`; pin it if the built file is committed. Since slice 2 such a
    change can no longer pass silently — `figures.test.ts` fails when the file on
    disk is not the one `models.json` records — but the pin is still open.
    **Weightier since slice 4 (D96)**: the build now also imports the
    meshoptimizer nested UNDER the CLI (1.2.0) to decimate the bodies, so the
    caret decides the simplifier's version as well as the writer's.
18. ~~**`tools/build-figures.mjs`'s comment gives the wrong reason**~~ — **closed
    by slice 2**: width is now measured on the skinned mesh along the axis that
    becomes x after the facing turn, and the comment says so. Originally: **the
    comment gave the wrong reason for measuring
    `max(x, z)`** ("a figure turns to face the other seat" — a π turn keeps x along
    x). The number is right for all three models. Left for the file's owner.
19. **`web/t0-spike.html` is kept** as T0's go/no-go page. It is not reachable
    from the app and never reaches `dist/` (`vite build`'s only input is
    `index.html`); keep it or delete it, but decide.

### Slice 2 — T8 (the humanoids, the retarget, the death) and the camera views, 2026-09-27

**Status: built in two tracks, verified twice, fixed twice, and documented** — in
the worktree `/home/justin-a/code/mtg-table-t2b`, branch `tier2-slice2`,
**nothing committed** — since **committed by the user on `main` as `5891444`**,
which slice 3 branches from. The first verification pass found one major (every death
blinked) and six minors; the second found one major and three minors, the major a
**Tier 1** defect (the cue clock played an idle gap as film). All eleven are fixed
— the bust-coverage minor only partly (follow-up 10 above). Evidence:
[`docs/evidence/m7-tier2-slice2.md`](docs/evidence/m7-tier2-slice2.md) — the
camera track, the figure track, both fix passes and a status section. Decisions
**D64–D74**. **`docs/protocol.md` needs no amendment**: nothing on the wire moved,
`bridge/` is untouched, no fixture was re-recorded, and no npm dependency was
added (the build runs the three already installed, in Node, for the retarget).

**Command**

```bash
./scripts/play.sh --arena                  # live: 1 table · 2 shoulder · 5 low
npm --prefix web run dev:arena             # a replay: all five views, 6/0 the director,
#                                            O spectator (on by itself in a replay)
#   g1.jsonl scrubbed to 322-348 is the evidence's director sequence (two combats);
#   g2.jsonl at 200 has all three humanoid bodies on the table at once;
#   human-auto-7.jsonl stepped 794 -> 795 after a pause is two deaths (D64, D72)
node tools/build-figures.mjs --verify-only # the four sources against the manifest
node tools/build-figures.mjs               # figures.glb (143,920 B) + models.json
node tools/build-figures.mjs --clip-source experiment --no-manifest \
     --out var/assets/figures/build/figures-ual.glb   # every clip retargeted (+24 kB)
```

**What it built**

- **Three humanoid bodies on one rig** (**D73**, **D68**): the agent
  (`character-male-a`), the hero (`character-female-b`, two round buns — the
  outline that reads from every side) and the scientist (`character-male-e`,
  glasses and tie — the one body that reads as a scientist face-on), all on
  Kenney's one 7-joint rig with **one clip set**: the pack's own clips, plus the
  Universal Animation Library's `Hit_Chest` and `Death01` retargeted **offline by
  the build** as `hit` and `die`. The experiment's verdict, from renders: the
  library's recoil and death read on a head-heavy chibi; its idle, punch, landing
  and crouch pitch the head block into a face-plant, and Kenney's hand-made clips
  win every one of those.
- **A library that is verified and reproducible** (**D67**): every source checked
  by bytes and sha256 before a build, zips read by the build itself, no texture,
  the output's own hash in `models.json` and checked by `figures.test.ts`; two
  builds byte-identical at **143,920 B** (five models, 9,759 triangles). The new
  build also found that **slice 1's drone was never whole** (its arms were joined
  onto the eye's skin and drawn floating) and that every width it measured for a
  skinned mesh was wrong.
- **The strict width clamp** (**D65**) and **the back row on its own card**
  (**D66**), closing follow-ups 11 and 3 above.
- **The death is seen** (**D64**, closing follow-up 2): a creature that dies is
  drawn as a departing body from the snapshot it dies in until its own death cue
  ends, its fate decided by the queue (`CueQueue.deathPending`), stepped out of
  the rank that closed up behind it. The first version blinked on every death for
  0.5–1.3 s; after the fix, 0 frames without a body on all three of `g1`'s
  modelled deaths in the browser, and all 17 corpus deaths drawn without a gap by
  `clips.test.ts` at three paces.
- **Five camera views, spectator mode and an auto director** (**D69–D71**,
  **D74**): the views are homes the cue swoops leave from and return to; table,
  shoulder and low keep the seat's hand **and** its own ranks on screen and are
  usable live, the opponent's shoulder and side-on are spectator-only; spectator
  mode is on by itself in a replay and the moment a live game ends; the director
  is pure, cuts on combat, casts, strikes, turns and the outcome, and is held to
  its three numbers over the whole corpus. A switcher in the cue strip's row
  (collapsing to its keys below 1,400 px) does the same by click, and the choice
  persists in this browser.
- **Two Tier 1 defects, found by measuring D64's promise** (**D72**): the cue clock
  added a parked loop's whole idle gap to the next batch's first frame
  (`human-auto-7` 794 → 795 after a 3 s pause: 0 body frames before, 86 of 89
  now, the same as with no pause; live, the first tick of 42 batches that landed
  on an idle queue advanced the clock 0 ms, where the verifier had measured
  734–1,000 ms), and a literal `<Canvas frameloop="demand">` froze a running
  batch on any re-render (11 frames in 3.5 s with six cues queued → 88).

**What the evidence shows**

- **Budgets** (dev build, GTX 1080, bloom off): `g1`@316 — T7's bench frame —
  **60** draw calls and **20,982** triangles; `g1`@355 **65** / **24,406**; `g2`@200,
  all three bodies, **51** / **19,669**; against ≤ 90 and ≤ 30,000. No frame-time
  bench was run by slice 2: nothing it added costs more per frame than slice 1's
  agent did.
- **The 2D board did not move.** Entry chunk **86.23 kB gzip** (slice 1: 85.72 —
  the three keymap rows' text; still no `three` in it, and `camera.ts`'s strings
  appear only in the Arena chunk); Arena chunk **322.48 kB** gzip (slice 1:
  315.13); `Post` unchanged at 16.54.
- **Tests.** `npm --prefix web test` is **655 `node --test` + 79 vitest**
  standalone (slice 1: 610 + 79). `camera.test.ts` grew from 16 tests to 35,
  `keys.test.ts` from 23 to 27, and `liveness.test.ts` gained the camera's purity,
  the one director caller, `localStorage` only inside `try`, the switcher's
  pointer events, the URL allow-list (follow-up 8), the frame-loop allocation scan,
  the layout-effect intake and the loop-mode ref — each with its negative control.
  `./tools/check-all.sh` passed three times on this branch: **731 s** (first fix
  pass, `WSPORT=8662`), **729 s** (second fix pass, `WSPORT=8665`) and **727 s**
  (the documentation pass, `WSPORT=8666`, `var/check-all-t2s2-docs.log`) — each
  exit 0, 9b's re-recording multiset-identical or within its documented noise,
  9c 10/10, all seven ws servers, and the web step at **665 `node --test` (657
  pass / 0 fail / 8 skipped) + 79 vitest**.
- **Behaviour a reviewer should know is deliberate**: `reset()` and `K` now snap
  the camera home; camera cues now play in replays of human games (rule 5 waits
  for a live seat); "Low" is a corner now rather than a crouch, the price of
  keeping the land rank in view.

<a id="fu-t2s2"></a>

### Slice 2 follow-ups — ten, 2026-09-27; two closed by slice 3, one partly; one closed by slice 4 for the bodies it drew, one partly

From the builders' and fixers' own "problems" notes and both verification passes.
**None stops a game.** Two are the renderer declining to remember (4, 5), three
are limits of how slice 2 was measured (6, 7, 10), and the rest are small debts
with a stated cost. **Slice 3 closed 2 and 3 and partly answered 10** (struck
through or marked below); **slice 4 closed 1 for the proportioned bodies and
partly answered 6** (marked below).

1. **`shrink` and `block` still borrow `crouch`** — **closed by slice 4 for every
   body a card stands in today (D95)**: on the proportioned bodies each has a
   clip of its own (`block` Sword_Idle, `shrink` Crouch_Idle_Loop, `crouch` the
   composed kneel), and `clips.test.ts` asserts they borrow none. It stays true
   of the chibi fallbacks, which no row asks for. Originally: No CC0 library read has a
   shrink or a cower — the Universal Animation Library's 44 clips were read, and
   its crouch face-plants on the chibi; UAL 2's list has none either (the
   manifest's `_deferred`). `clips.test.ts` pins the borrowing so a new one shows
   up on the day it is added (**D68**).
2. ~~**The scientist is the agent's outline from behind**~~ — **closed by slice
   3 (D75, D83)**: from behind a scientist now reads by what it carries rather than
   by its body — the lab bench at its left hand (both scientists), Bold
   Biochemist's long white lab coat and A.I.M.'s bucket hood — and `traits.test.ts`
   rasterises each through the table camera from the OPPONENT's seat, where the
   figures show their backs: coat 1,912 px, hood 2,345, benches 165–171.
   Originally: **the scientist was the agent's outline from behind** — on the viewer's own
   side the braces and the lab tint tell them apart, not the shape; face-on, the
   glasses read (**D73**).
3. ~~**The Giant-Sized Flying Ant is not giant.**~~ — **closed by slice 3
   (D76)**, and with neither a wider slot nor an exemption: it flies side-on
   (`traits.json`'s `turn` 90), so the clamp measures its body's length rather than
   its wingspan, and at `scale: 1.35` it stands **0.867** tall against any other
   insect's 0.490, inside the same 0.720 slot, with a rider on its back.
   Originally: **the Giant-Sized Flying Ant was not giant.** Its `scale: 1.35` clamps to the
   same 0.49 as any insect under the strict clamp (**D65**), as it already did
   under slice 1's floor. A giant needs a wider slot — a `layout.ts` question —
   not an exemption, which D65 rejected. **T9**'s.
4. **The dying body steps out in the frame the rank closes.** `departureStand`
   puts it one `DEPARTURE_STEP` (0.85) into its combat lane in the same frame its
   neighbours snap together; there is no slide, because the only clock outside a
   cue is the cue clock — the same snap Tier 1's cards make, but visible.
5. **A death flushed before its first frame has no body**: 2 of the corpus's 17
   at the replay's 1× pace (§5.2's cap flushes the batch on arrival), 0 when
   drained. Deliberate — a snapped clip on a living figure is the same — but a
   very busy live batch can still skip the fall.
6. **No live death has been seen, and the retargeted `hit` was not photographed
   in the arena.** The second fix pass's live check used a scripted autopilot that
   never got a creature of ours onto the battlefield; deaths are evidenced by
   stepping replays in headless Chromium and by the corpus test. The `hit` was
   judged from lab renders (`clips-compare.png`) and clip-state readings; only the
   retargeted `die` was photographed in the arena. The photographs themselves are
   in `var/shots-t8/` and the session scratchpad — local, not committed. —
   **Partly answered by slice 4**: the retargeted `hit` (Hit_Chest, now on the
   proportioned rig) was photographed in the arena as the director's flinch
   (`g1` 358 → 359, `var/shots-t2d4/ev/flinch-cu-sheet.png`), and every clip of
   both bodies was rendered at four phases in the lab. No live death has been
   seen yet.
7. **The in-browser checks are not repeatable from the repo.** The loop-mode
   guard (**D72**) and the intake-order guard (**D64**) are source scans, because
   node and vitest have no WebGL; the behaviour behind them was measured only by
   scratch CDP drivers that are not in `tools/`. `tools/arena-bench.mjs` is the
   pattern if they are ever worth keeping.
8. **The views' trade, and a flash nobody sees.** To keep the land rank above the
   hand, the shoulder moved from polar 66° to 55° and low from 74° to 59°; the
   Plains' near third is still behind the hand in both (41 of 96 and 34 of 86
   raycast samples on the card), and clearing the whole card would put both views
   back near the table's (polar ≈ 50°). Separately, the board's inert-key flash is
   invisible on a recording with no `input` frame (**D74**'s known cost — a
   `DecisionPanel` change, pre-existing).
9. **A spectator's swoop is a close-up.** With no hand band to keep, the
   lethal-damage cue's jolt becomes a real push-in for a spectator (clamped at
   0.45× the rest distance). It reads well in `g1`; if it is too much, the fix is a
   `cues.json` parameter, not the director.
10. **Nobody has play-tested slice 2.** The user's games were on slice 1; the
    views, the director and the deaths have been seen only by headless Chromium on
    the GTX 1080 (follow-up 4's caveat). The first play-test of slice 2 is the
    input T9–T12 should be ordered by. — **Partly answered before slice 3**: the
    user played slice 2 (committed as `5891444`) and the verdict was about
    identity — *"everything still looks very generic"*, with a screenshot of Wasp
    as a full-size gold chibi standing on her card — which is what slice 3 was
    ordered around. The three questions this item asked (the deaths, the views'
    trade in follow-up 8, and the live combat in slice 1 follow-up 1) were not
    reported on either way, so they stay open.

### What slice 2 hands to T9–T14

*Kept as written; slice 3 built T9–T12 from it, and* **What slice 3 hands to
T13–T14** *below is the current table.* Report 13 §11's second table, updated for both slices. **Before T9, play three
games in the arena** — `./scripts/play.sh --arena` — once from the shoulder and
once from low, and write down, in the moment, what reads wrong: the deaths, the
views' trade (slice 2 follow-up 8) and the live combat (follow-up 1) are the
three questions it answers.

| | deliverable | what slices 1 and 2 already did | what is left |
|---|---|---|---|
| **T8** | the rest of the humanoids | **done (slice 2)**: hero and scientist bodies of their own on the agent's rig (**D73**), the retarget experiment run and decided (**D68**), and the death seen (**D64**) | slice 2 follow-ups 1 and 2 (the `crouch` borrowings; the scientist from behind) |
| **T9** | drone and insect | both archetypes; **the drone rebuilt whole and measured correctly, so no narrower drone is needed** (**D65**); the Giant-Sized Flying Ant at `scale: 1.35`; the Doombot's attack aliases `jet` | `Ant-Man's Air Force` as a small swarm of the insect (`figures.json` deliberately has no `swarm` key until something reads it); the Doombot's eye; the insect's missing `summon`, the drone's missing `hit` (deliberate absences today); **a giant ant that reads as giant** (slice 2 follow-up 3) |
| **T10** | the vehicle | the Helicarrier keeps its Tier 1 `presence` hover and draws its disc | a CC0 vehicle silhouette overhead — none has been chosen (the manifest's `_deferred.carrier`), and `figures.json` declares no `creature/subtype:vehicle` rung until one exists |
| **T11** | per-card clips, as `params.clip` | Agent 13's `pistolDraw`; Fury's `radioCall` aliased on `channel`; **a CC0 clip library now builds in** — any UAL clip can be retargeted onto the humanoid rig by naming it `ual:<name>` in the manifest, and `--clip-source experiment` is the side-by-side bench | Fury's radio call on his agents beat; the S.H.I.E.L.D. squad stepping forward together; Coulson's badge gesture — **each judged on the chibi the way D68 judged the library**, because most of its clips face-plant; any entry that needs a model used by exactly one card is **Tier 3**, not T11 |
| **T12** | the remaining attachments | Quantum Reduction's shrink; every other aura and equipment draws the default halo (metallic for an Equipment) | Super Suit's shell, Spy Kit's glints, Robotics Mastery's circuits, Web Up's cocoon **after** follow-up 15's measurement, Strategic Intervention's mission-control overlay (a DOM widget in `.arena__layer`, which must carry its own `pointer-events: auto`) |
| **T13** | duelists | **done in T7**: two silhouette busts in one draw call | follow-up 10's placement, now measured at three window sizes (37–89% of the opponent's bust under chrome) — the bust's anchor, not the chrome, is what moves; full avatars stay Tier 2.5, only if the play-test says anyone missed them |
| **T14** | verification pass | slice 1: one pass (passed, ten minors); slice 2: two passes (two majors and nine minors, all fixed) and this documentation pass | the same for T9–T13; the bench on the user's own desktop browser (follow-up 4); and a person watching a live death and the seat views (slice 2 follow-ups 6 and 10) |

**The one line Tier 2 must not cross, restated.** A per-card entry in
`figures.json` may choose a model and alias a clip; it may not introduce a model
used by exactly one card — that is Tier 3, and it is the seam where "a small
library of archetypes" quietly becomes "a model per card" (report 13 §12).

### Slice 3 — T9–T12 (per-card identity, the carrier, the beats, the looks), 2026-09-27

**Status: built in two tracks (identity — T9/T10; cues and attachments —
T11/T12), verified twice, fixed twice, and documented** — in the worktree
`/home/justin-a/code/mtg-table-t2c`, branch `tier2-slice3` (from `5891444`),
**nothing committed**. The first verification pass found three majors and five
minors, the second four majors and five minors; every one has a fix in the tree,
**but the second pass's fixes have not been through a third, independent
verification** — they were checked by the pass that made them (the gate, the new
raster test, photographs) — **and one of its majors is only partly answered by
that pass's own account**: Nick Fury reads as a dark figure in a long black coat,
and his eyepatch at 1× as a dark disc ringed pale (follow-up 10).

It answers the user's verdict on slice 2 — *"everything still looks
very generic"* — with **identity as data**: `figures/traits.json` (size, hover,
tint, props, swarm, silhouette per card and per subtype rung) and a kit of
eighteen shared, procedural, instanced prop kinds (one draw call per kind, never
per figure; the second verification pass added the eighteenth, `visor`); Ant-Man's Air Force as a ring of five bees, the Agents as a squad,
the Giant-Sized Flying Ant giant because it flies side-on, the Helicarrier as a
carrier silhouette overhead; T11's per-card beats drawn ON the body; T12's
attachment looks and the two stations. Evidence:
[`docs/evidence/m7-tier2-slice3.md`](docs/evidence/m7-tier2-slice3.md) — the cue
track, the identity track, the verification fixes and the second verification
pass's fixes. Decisions **D75–D81**, **D82–D87** from the second pass, and
**D88–D89** written up by the documentation pass (the swarm and squad as
instanced members; Quake's resolution). No
asset was added (`figures.glb`, `models.json` and the manifest's sources are
unchanged, and NOTICE §7 gained only a paragraph saying what is built in code),
nothing on the wire moved, `bridge/` is untouched, no fixture was re-recorded and
no npm dependency was added.

**The verification pass** (headless Chromium on the GTX 1080, every deck card
photographed in views 1 and 4, both corpus cinematics played in real time, one
live game) found **three majors and five minors**, all fixed:

- **The two tracks disagreed about which way a figure faces** (major): the effect
  binding's `figure` anchor resolved `fwd` backwards, so the Doombot's exhaust
  streamed out of its face while its flame prop burned behind it, and every
  front-anchored beat landed behind its prop. Now one definition in `layout.ts`
  (`FIGURE_FRONT_Z`, `seatFacingY`, `figurePointInto`), and `facing.test.ts`
  holds every beat to its prop for both seats (**D81**).
- **T12 was not delivered in real games** (major): the three attachment rows were
  never committed to `figures.json`, so Super Suit, the Spy Kit and Robotics
  Mastery drew the plain halo. Committed, with `attach.test.ts` reading the
  committed file (**D80**).
- **Agent 13 and Coulson were not recognisable at table distance** (two majors),
  and Fury, Peggy, Ant-Man and Bold Biochemist only partly (minor). Agent 13 is in
  indigo with a 0.3 silver pistol raised at chest height and a lit muzzle (new
  kind `muzzle`; her muzzle-flash cue lands on it); Coulson is darker navy with a
  0.13 normal-blended gold badge and a white shirt-front and tie (new kind `tie`);
  Peggy wears a red hat (new kind `hat`) and a 1.5× shield turned out; Fury's
  patch and strap are bigger and his coat closes further; Ant-Man's helmet has a
  crest and thick lit antennae; Bold Biochemist wears a white lab coat.
- **The ops console and the carrier covered figures from the table view**
  (minor): stations now stand figure-sized in their own rank slot; the carrier
  flies at 2.05 and is 1.5 long. Both are asserted by projecting through the table
  camera (**D77**, **D80**).
- **A dying figure dropped its props; the prop field read reduced motion once;
  Wasp and the ant attacked with the Doombot's eye** (minor): the departing bodies
  are a second input to `PropField.commit`, the field listens for the media
  query's change, and `attack.jet` takes `eye: false` (**D78**, **D79**).
- **The docs were stale** (minor): this section, **D75–D81**, CLAUDE.md's slice-3
  conventions and pool count (45), and the manifest's `_deferred.carrier`.

**Budgets** (bloom off, GTX 1080): `g1`@355 is **77 draw calls, 27,474
triangles, 12 programs** (slice 2: 65 / 24,406 / 11), of which the prop field is
8 kinds and 3,062 triangles — inside report 13 §8.2's ≤ 90 and ≤ 30,000. The
census asserts ≤ 12 prop kinds and ≤ 96 instances in any corpus frame (measured
10 and 19). Entry chunk 86.23 kB gzip (unchanged, no `three`); Arena 346.14 kB,
`Post` 16.54 kB. **The gate**: `rm -rf bridge/out && WSPORT=8666
./tools/check-all.sh` — **731 s, exit 0**, node --test 708 / 700 pass / 0 fail /
8 skipped plus 79 vitest inside it, every one of 9c's ten games, 9d and 10a–10g;
standalone `npm --prefix web test` is **698 + 79**, 0 failures.

**Command**

```bash
./scripts/play.sh --arena                  # live
npm --prefix web run dev:arena             # a replay; `1` table, `4` side-on
#   g1.jsonl @355 — the budget frame; @316 — your carrier over your rank, the opponent's over the centre line
#   g2.jsonl @224 — the ops console in its own slot beside Ant-Man
#   disjoint.jsonl @109 — Coulson's badge; @265 — Fury (`3` shows his back); @179 — Peggy's hat
#   human-comfort-13.jsonl @1279 — the opponent's Agents (three heads) and Coulson's back emblem
#   g2.jsonl @125 — the opponent's Agent 13 from behind; human-auto-7.jsonl @916 — yours
#   g2.jsonl 156 -> 157 and g1.jsonl 231 -> 232 — an attacker turning to face you as it fires
```

**The second verification pass** (headless Chromium on the GTX 1080 again, 4×
zooms of the committed frames, both seats; a live game at seed 11) found **four
majors and five minors**, all fixed — decisions **D82–D87**, evidence in
[`docs/evidence/m7-tier2-slice3.md`](docs/evidence/m7-tier2-slice3.md)'s *Second
verification pass*, stills in `var/shots-t2s3/fx5/` (local, gitignored):

- **The opponent's figures show the table view their backs, and every front prop
  vanished there** (major): Coulson's badge, Agent 13's pistol, Fury's patch, the
  Doombot's eye. The badge kind has a back emblem, the pistol is at her hip out
  beside her body, the new shared `visor` kind is a robot's eye as a band round its
  head, and `traits.test.ts` rasterises every deck card's props through the table
  camera on BOTH seats with the real bodies and the real prop field — ≥ 48 px each,
  one-sided details with a named partner (**D83**, `web/test/prop-raster.ts`).
- **The Agents did not read as a squad** (major): a wedge 0.46 aside and a step
  back, clamped into one slot, in a steel blue of its own; the test requires three
  heads side by side from both seats, and slice 3's formation fails it 8 of 8
  (**D84**).
- **Nick Fury was a grey agent in sunglasses** (major): a slate body in a nearly
  opaque black coat flared wider than his head with slate trim, a black patch with a
  pale rim and a black strap that runs DIAGONALLY (**D83**).
- **Front-anchored attack beats fired away from their target** (major): an attack
  now turns its attacker to face its defender and back (`dRotY`, `Stage.yawTo`),
  whichever way figures rest; `facing.test.ts` runs the real cues on both seats
  (**D82**). Question 13 is still the user's — it now decides only how the table
  looks at rest.
- **The opponent's carrier sat under the HUD** (minor): it flies over the centre
  line, low and a fifth smaller; the chrome is a keep-out band in
  `figure-pose.test.ts` (**D85**).
- **Coulson and Agent 13 only partly readable on your own side** (minor): the
  badge is lower and bigger (0.155, tilted up), the tie runs to the belt, the
  pistol shows its length (**D83**).
- **Four beats did not read** (minor): Peggy's aegis in her shield's blue with red
  and white rings (`rim`, `rim2`), the strike's beam doubled with a star on the
  body, the sweep's bright core, the power-up's card lingering (**D87**).
- **A click on an enchanted creature hit its aura** (minor, a Tier 1 layout
  defect): attachments lie under their hosts; `attach.test.ts` raycasts the real
  proxies (**D86**).
- **The evidence cited scratchpad paths** (minor): the fix pass's stills are now in
  `var/shots-t2s3/fx4/`, this pass's in `var/shots-t2s3/fx5/`, and the evidence
  cites those.

**Budgets after it** (bloom off, GTX 1080): `g1`@355 is **78 draw calls, 27,906
triangles, 12 programs**; sweeps of `g1` 300–376, `g2` 140–225 and
`human-comfort-13` 1100–1316 peak at 78 / 27,906. Idle `human-comfort-13`@1262:
**0 frames in 5 s**. Entry chunk **86.24 kB** gzip (no `three`; +0.01 is the
lazy chunk's hashed file name), Arena 347.70 kB, `Post` 16.54 kB.
`npm --prefix web test`: **704 + 79**, 0 failures. **The gate**: `rm -rf
bridge/out && WSPORT=8665 ./tools/check-all.sh` — **`check-all OK`, exit 0, 729 s**;
node --test 714 / 706 pass / 0 fail / 8 skipped and 79 vitest inside it.

**The documentation pass** changed no code: this section and the evenings table,
the follow-ups below, the Tier 3 note and question 14, **D88** (the swarm and the
squad as instanced members) and **D89** (Quake keyed off her trigger's resolution,
and the tap heuristic declined), README's *Tier 2, slice 3 — every card reads as itself* (with how to
give a card its identity as data), CLAUDE.md's slice-3 conventions,
`docs/ideas/arena-mode.md`'s cue table marked row by row, NOTICE §7's list of
what is generated in code, and a status section at the end of the evidence.

**The gate, once more**: `WSPORT=8666 ./tools/check-all.sh` (without deleting
`bridge/out`) — **`check-all OK`, exit 0, 726 s** (`var/check-all-t2s3-docs.log`):
9b's re-recording multiset-identical (1,587 frames), 9c's ten games in 269 s, 9d
and 10a–10g, `check-redaction` over every fixture and fresh recording, node --test
**714 / 706 pass / 0 fail / 8 skipped** and **79** vitest; entry chunk 86.24 kB
gzip, Arena 347.70 kB, `Post` 16.54 kB — the second fix pass's numbers exactly,
as a pass that changed no code should. Standalone, `npm --prefix web test` is
**704 + 79**, 0 failures.

<a id="fu-t2s3"></a>

### Slice 3 follow-ups — fourteen, 2026-09-27 (updated by its second verification pass and its documentation pass; one closed by slice 4, three partly)

From both tracks' "problems" notes, both verification passes and both fix passes'
own admissions. **None stops a game, and the gate is green.** One is the user's
call (1), four are limits of how slice 3 was measured (8, 11, 12, 13), one is
the wire not naming what a beat would aim at (3), and the rest are small debts
with a stated cost. **Slice 4 closed 7's owed rebuild** and partly answered 8, 10
and 11 (marked below); 2 changed shape (the eyepatch joined the one-sided list).

1. **Your figures face you** — measured, not changed: PLAN question 13 below.
   Since the second verification pass an ATTACKER turns to face its defender
   (**D82**), so the question now decides only how the table looks at rest.
   — **Answered 2026-09-28: they face the opponent (D143, Lane LOOK).**
2. **Three props sit on one side of a body by nature** — Coulson's shirt and tie
   (front), the Doombot's laser eye (front) and its exhaust (back) — so each shows
   from one seat only, and `traits.test.ts` asks them only half the bar (24 px) on
   their own side while a partner carries the card on the other (**D83**): the
   tie is 37 px at its worst from your seat and 0 from the opponent's, where the
   badge's back emblem carries Coulson (273 px); the laser eye 48 / 0 and the
   exhaust 0 / 43, with the `visor` band (135 / 87) and the thrusters carrying
   the Doombot. A partner list is extended only with a reason. — **Slice 4
   extended it with one** (**D98**): on a proportioned head 12 px tall the
   **eyepatch** cannot show 48 px from both seats without being a mask, so it is
   one-sided now (56 px from the front, 42 from behind), with the coat as its
   partner; the tie reads 32 / 3.
3. **Most beats are unaimed in the corpus, and Wasp's never is** (0 of 10
   recordings): the AI puts her trigger on and takes it off the stack inside one
   snapshot, so the wire never names its target; her shrink beam works on a
   synthetic resolution, and a human game where her trigger waits on the stack
   would show it live. Pym Particles only ever chose its vigilance mode, so its
   grow/shrink branch (`strikeGrew`) is evidenced by `stack.test.ts` and not by a
   game; Quake's fissure is aimed in 4 of 13 resolutions. The census prints fired
   and aimed per beat every run, and `replay-cues.test.ts` asserts that Wasp is
   never aimed, so the day a recording aims one the evidence is told.
4. **At the table view the T12 looks are small**: the shell's rim and the glints
   read, the circuit traces read as a sheen; the shoulder views show them properly.
5. **The carriers**: your carrier over your rank still projects onto the far rank
   from the two over-the-shoulder views (**D77**'s known cost), and since the
   second pass the opponent's — over the centre line, out from under the HUD
   (**D85**) — does the same from views 2 and 5, and where BOTH seats have one at
   overlapping x (mirror games: `g1`@316) the two hulls overlap on screen like a
   formation. A layout rule that separates them in x would be the next step.
6. **Cast cues on a TRIGGER still rise out of the hand** (Tier 1's `cast.rise` on a
   card already on the battlefield); Strategic Intervention's freeze rides it.
7. **The CDP drivers that took every photograph are scratch scripts**, not in
   `tools/` (slice 2 follow-up 7's pattern), and the photographs themselves are
   local and gitignored (`var/shots-t2c3/`, `var/shots-t2s3/`). **Still owed: `node
   tools/build-figures.mjs --verify-only`** (and a rebuild compared byte for byte
   with the committed `figures.glb`) once the user has re-downloaded the four CC0
   sources into `var/assets/figures/` — neither this worktree nor the main
   checkout has them, and fetching them is the user's call. `figures.glb` is
   unchanged since slice 2 (sha256 `c09ac552…a981a3`, which `figures.test.ts`
   checks), and slice 3 added no asset, so nothing it built depends on that run.
   — **The owed run is done (slice 4)**: all four sources were downloaded again
   into the `tier2-slice4` worktree (the three direct links by curl, the
   Animation Library through itch.io's free flow), all four matched their
   manifest bytes and sha256 (`--verify-only`), and a rebuild with slice 3's
   manifest came out **byte-identical** to the committed `figures.glb`
   (143,920 B, `c09ac552…a981a3`) before slice 4 changed anything. **But the
   downloads were made by the builder on the workflow's instruction, not by the
   user** — this item had called fetching them "the user's call" — which is slice
   4's follow-up 12. The CDP drivers are still scratch scripts.
8. **Nobody has play-tested slice 3.** It was seen only by headless Chromium on the
   GTX 1080 and a few scripted live games (seed 11: a land, Peggy cast and declared
   an attacker by canvas clicks). No live game has seen a death, a carrier or a
   T11 beat in the human's own turn — the live combat budget snaps those batches
   (slice 1 follow-up 1, question 12). — **Partly answered before slice 4**: the
   user played slice 3 (committed as `0368a90`) and the verdict was *"the game
   looks generally improved. The avatars are still pretty generic"* — which is
   what slice 4 was ordered around. The death, the carriers and the live beats
   were not reported on either way, so they stay open.
9. **Four attachments in one crowded `g3` board have no clickable strip** (the
   second pass, **D86**): each lies wholly under its host and a wrapped rank's back
   row, and is not drawn either — the click order is the drawing order. A layout
   rule for attachments in a wrapped rank would give them one.
10. **Nick Fury is still the least legible identity** — the user named him ("Nick
    Fury with a coat and eyepatch"), both verification passes flagged him, and the
    second fix pass says so itself: at 1× from the table view he is the darkest
    figure on the table, in a long black coat, but the eyepatch reads as a dark
    disc ringed pale (arguably a monocle), and nobody has judged him on a real
    desktop GPU. A hologram is translucent (core alpha 0.38), which is why the
    body is slate and not black (**D83**); a bigger patch or a lit rim would be
    the next thing to try, judged at 1× in views 1 and 4 on both seats. — **Still
    open after slice 4.** He is a proportioned man all in black now (a costumed
    hologram is more solid: core alpha 0.74, **D97**) in a long black coat re-cut
    for a person, and the patch is a dark oval with a slate edge, one-sided
    (**D98**). But the verification pass read him at 1× on the GTX 1080 as still
    *"a man in a long black coat"* with the eyepatch illegible (slice 4's
    follow-up 6).
11. **The second verification pass's fixes have not been independently
    verified.** **D82–D87** were checked by the pass that made them — the gate
    (729 s, exit 0), the new raster test, `facing.test.ts`, photographs — and by
    this documentation pass's gate run, which proves the tree is green and not
    that the table reads. A third look, by a verifier or by the user (follow-up 8),
    is owed before the slice is called done. — **Partly answered**: the user
    played the committed slice 3 and called it "generally improved", and slice
    4's verifier photographed the whole deck at 1× from both seats with slice 3's
    fixes underneath (its identity finding is slice 4's follow-up 6). No pass has
    re-checked **D82–D87** one by one.
12. **The raster test counts pixels, not contrast** (**D83**'s rejected
    alternative): a prop that clears 48 px in a colour close to its body's passes.
    Legibility was judged from photographs at 1× and 4×, not measured.
13. **No frame-time bench was run on slice 3.** Its budget numbers are
    `gl.info` counts — `g1`@355 **78 draw calls, 27,906 triangles, 12 programs**
    with bloom off, against ≤ 90 and ≤ 30,000, and idle **0 frames in 5 s** — and
    the prop field's frame-loop body is a fixed walk over 192 preallocated
    bindings; `tools/arena-bench.mjs --index 316 --gpu gl` (and under SwiftShader)
    was not re-run, and the draw-call headroom left under the budget line is 12.
    Tier 2 follow-up 4's caveat (headless Chromium on the GTX 1080, never an
    integrated GPU) applies to every number here.
14. **A dying Air Force is not seen dying** (**D88**'s known cost — deliberate in
    the code's own comments, but reported by no pass and never photographed): a ring swarm's
    insect rig is never drawn, so `FigureLayer` collects no departing body for it
    and the prop field binds no bees to a departed ring — it leaves the table with
    its snapshot, the one exception to **D64**. A beat aimed at it (Helicarrier
    Strike at `g3`@116) still lands where it stood. Letting the bees fall and fade
    with the hidden body would close it. (A squad's followers do fall with their
    leader.)

### What slice 3 hands to T13–T14

*Kept as written; slice 4 built T13 and T14 from it (and the bodies, which this
table did not ask for — the user's verdict on slice 3 did), and* **Slice 4**
*below is the current state.* Report 13 §11's table, updated for three slices. **Before T13, play three games in
the arena** — `./scripts/play.sh --arena` — and write down, in the moment, which
cards do NOT read as themselves at the table view (the answer to "everything still
looks very generic" is only as good as that list; follow-ups 2, 4 and 10 are the
suspects), and decide **question 13** by looking at the table rather than at this
page. The deaths, the views and the live combat (slice 2 follow-up 10) are the
same game's other three questions.

| | deliverable | what slices 1–3 already did | what is left |
|---|---|---|---|
| **T9** | drone and insect | **done (slice 3)**: the Doombot's eye, visor, thrusters and exhaust; the Air Force as a swarm of five instanced bees (**D88**); the giant ant side-on with a rider (**D76**) | the insect's missing `summon`, the drone's missing `hit` (deliberate absences) |
| **T10** | the vehicle | **done (slice 3)**: a procedural carrier silhouette, crewed or not (**D77**, **D85**) | follow-up 5 |
| **T11** | per-card beats | **done (slice 3)**: the `figure` anchor, the closed params, the shapes, rule 7 (**D79**); the attacker's turn (**D82**); Quake's resolution (**D89**); four quiet beats (**D87**) | follow-ups 3 and 6 |
| **T12** | the remaining attachments | **done (slice 3)**: shell, glints, circuit, the cocoon and the console (**D80**); a click on the host hits the host (**D86**) | follow-ups 4 and 9 |
| **id** | per-card identity | **done (slice 3)**: `traits.json`, the eighteen-kind prop kit (**D75**), read from both seats as a number (**D83**), the Agents' wedge (**D84**) | follow-ups 2, 10 and 12, and question 13 |
| **T13** | duelists | **done in T7**: two silhouette busts in one draw call | slice 1 follow-up 10's placement (37–89% of the opponent's bust under chrome); full avatars stay Tier 2.5, only if the play-test says anyone missed them |
| **T14** | verification pass | slice 1: one pass (passed, ten minors); slice 2: two passes (two majors and nine minors, all fixed); slice 3: two passes (seven majors and ten minors, each with a fix in the tree) and this documentation pass | a third look at slice 3's second fix pass (follow-up 11); the bench on the user's own desktop browser (Tier 2 follow-up 4, slice 3 follow-up 13); a play-test by the user, and question 13 |

**The one line Tier 2 must not cross, restated for slice 3.** A per-card row in
`traits.json` may choose a size, a hover, a colour and props from the shared kit; a
new kind goes into the kit for every card, and nothing in the kit is a model used
by exactly one card. Slice 3's two baked kinds are the library's own CC0 bodies
frozen in a pose (the rider, the squad followers), and the carrier is an archetype
rung — which is why none of it is Tier 3.

### Slice 4 — T13, proportioned bodies in painted costumes, and T14, 2026-09-27

**Status: built in two tracks (the bodies and the costume; the duelists — T13),
verified once (verdict: passed; eleven findings, all minor, none fixed in code),
and documented** — in the worktree `/home/justin-a/code/mtg-table-t2d`, branch
`tier2-slice4` (from `0368a90`), **nothing committed**. The user committed slice
3 as `0368a90`, played it, and said *"the game looks generally improved. The
avatars are still pretty generic."* Slice 4 took both readings of "avatars". The
creature figures were chibi toys whose only identity was one tint and what they
carried, because the hologram kept geometry only (Peggy could not have a blue
jacket AND a red hat). The two duelists at the table ends were blank silhouettes
by design (**D62**). Evidence:
[`docs/evidence/m7-tier2-slice4.md`](docs/evidence/m7-tier2-slice4.md) — the
duelist track, the bodies track and a status section. Decisions **D95–D101**
(**D90–D94** are `main`'s card-library entries, which landed on `main` first, so
slice 4 starts at D95). **`docs/protocol.md` needs no amendment**: nothing on the
wire moved, `bridge/` is untouched, no fixture was re-recorded and no npm
dependency was added. **One asset was added**: Quaternius's *Universal Base
Characters* [Standard], CC0, its badge recorded verbatim on the download day
(`tools/assets-manifest.json`, NOTICE §7). `figures.glb` was rebuilt (373,236 B).

**`main` moved during verification.** The user fast-forwarded `754f504` (*Card
library and browser*, 43 files) at 19:00, so this branch is one commit behind
`main`. `main`'s commit changed NOTICE, CLAUDE.md, PLAN.md, README.md and
DECISIONS.md, and this documentation pass changed all five here, so **a merge
will conflict in all five** (follow-up 14).

**Rebased onto `754f504`, 2026-09-27.** Slice 4's one commit was replayed on top
of `main`'s card library. NOTICE merged by itself; CLAUDE.md, DECISIONS.md,
PLAN.md and README.md conflicted where both sides wrote at the same place (the
appended sections, the test-count paragraph, the docs tables' rows and the
questions table), and every conflict kept both sides' text. **D90–D94** stay the
card library's and slice 4's **D95–D101** needed no renumbering; the
card-library sections are `main`'s verbatim; the counts are the merged ones —
**817 `node --test` + 91 vitest** standalone
and **827 / 819 pass / 0 fail / 8 skipped** inside the gate. The merged tree's
`check-all.sh` at `WSPORT=8665` failed once at step 10g — the three-game
session's `restartMatch()` game ended 2 ms after its `hello_ok`, with no `state`
(follow-up 13) — and passed on the re-run: **849 s**, exit 0
(`var/check-all-t2s4-rebase-pre2.log`). Follow-up 14 is closed.

**Command**

```bash
./scripts/play.sh --arena                  # live: the director at your left, the villain at the table's right
npm --prefix web run dev:arena             # a replay; `1` table, `2` shoulder, `3`/`4` spectating, `5` low
#   g1.jsonl @355 — the budget frame: eleven figures (seven people in costume) and both duelists (views 1, 2, 3 and 5)
#   g1.jsonl 354 -> 355 — the villain casts (a hand raised toward the table); 369 -> 370 — the director casts
#   g1.jsonl 358 -> 359 — the director takes 2 and flinches red; 372 -> 373 — the end: the villain kneels, the director's arm goes up
#   disjoint.jsonl @242 — Peggy, Coulson (kneeling), Fury and the Biochemist in costume
#   g2.jsonl @181 — A.I.M. in yellow under its hood and Ant-Man in red; human-auto-7.jsonl @916 — Agent 13, pistol in hand
node tools/build-figures.mjs --verify-only # the FIVE sources against the manifest
node tools/build-figures.mjs               # figures.glb (373,236 B) + models.json
```

**What it built**

- **Proportioned people** (**D95**). Every humanoid card stands in a Quaternius
  *Universal Base Characters* body — the man (`agent`, and `scientist` as the same
  node) or the woman (`hero`) — on the Universal Animation Library's own 65-joint
  rig, so every clip is the library's, retargeted by world-space delta, with no
  face-plant. The tapped kneel is composed (the kneeling clip's legs under the
  idle's upright torso), the head is ×1.3, and a hairstyle is grafted on. Every
  clone starts at its idle, which hid a T-pose flash (follow-up 8).
- **1,400 triangles a body** (**D96**), the drone 1,900 and the bee 1,700,
  decimated over the costume slots with the shirt and belt locked.
  `figures.glb` is **373,236 B**, 8,573 triangles and 63 clips, and two builds
  are byte-identical.
- **The costume** (**D97**). A slot per vertex (skin, hair, top, shirt, legs,
  shoes, gloves, belt) and a palette per figure, written at commit. The rim is
  still the card's tint, and it is still one program with no texture.
  `traits.json`'s `costume` merges slot by slot: Peggy wears a blue jacket over a
  white shirt, Coulson a navy suit, Fury black, Quake black with teal, Agent 13
  indigo and blonde, Wasp gold and black, Ant-Man red and silver, A.I.M. yellow
  and the Biochemist a white coat.
- **The chibi as a flag** (**D98**). `body: chibi` stands a card in slices 1–3's
  Kenney body, and no row asks for it. Props are fitted per body family; Agent
  13's pistol is in her hand (`PropAnchor.pose`); the eyepatch joined the
  one-sided details; the Agents' heads test was recalibrated.
- **The duelists** (**D99**–**D101**). One full figure per seat: the director
  (yours) in a navy suit, gold-trimmed coat and badge, and the villain (the
  opponent's) in iron armour, a green cloak and an iron great helm. Each is 1.6×
  a creature, with its props baked into one mesh. Yours stands beside your hand;
  the opponent's stands at the table's right beside its creature rank, because
  the far end of the table is under the chrome from every seat-safe view. They
  face each other. A cast raises a hand, damage flinches red, and the end of the
  game raises the winner's arm and kneels the loser — all as a `gesture` param on
  the existing cues, on reserved clip-lane ids, with suppression rules 5b and 8.
  The stances are a pose, read from `board.gameOver`. The busts are the fallback
  and stand where the duelists stand.
- **One live defect, found and fixed**: a Vite hot update disposed the duelist
  bodies in a passive effect's cleanup after the layout effect had rebuilt them,
  and the busts came back mid-game. Build and disposal are now one layout effect.

**What the evidence shows** (headless Chromium on the GTX 1080 through
ANGLE-on-GL, the dev server, bloom off — not a headed desktop browser):

- **Budgets.** `g1`@355 **79 draw calls, 27,416 triangles, 12 programs** with
  both duelists (slice 3: 78 / 27,906 / 12 with busts). `g1`@316 is 73 / 24,316
  / 12, `disjoint`@242 55 / 13,624 / 12, and with `figures.glb` blocked the
  fallback reads 59 / 3,078 / 10 — all against ≤ 90, ≤ 30,000 and ≤ 14. Idle
  `human-comfort-13`@1262: **0 frames in 5 s**, bloom off and on. The frame loop
  allocates nothing new (liveness, including the costume and duelist clauses).
- **The 2D board did not move.** The entry chunk is **86.23 kB** gzip, still with
  no `three`. The Arena chunk is **359.81 kB** (slice 3: 347.70), and `Post` is
  16.54 kB.
- **Tests.** `npm --prefix web test` is **724 `node --test` + 79 vitest**
  standalone, 0 failures (slice 3: 704 + 79). New: `duelists.test.ts` (9 tests,
  14 negative controls, the corpus census and empty lanes after every batch, and
  the aimed joints against the real rig) and three `camera.test.ts` tests (yours
  never behind your hand, the opponent's visible and out from under the chrome,
  neither in the solver's required set). `liveness.test.ts` gained three clauses
  (a costume written only at commit, and the duelists bound only from the bust
  field with frame-loop bodies that allocate nothing), and `traits.test.ts` reads
  every deck card's costume back off the poses.
- **The census** (`duelists.test.ts`, printed every run): over 3,293 batches, opp
  casts 207 · flinches 22 · loses 2 · wins 16, and you cast 178 · flinch 90 ·
  lose 16 · win 2. Over 3,679 board frames there are 7,298 `ready` stances, 30
  `won` and 30 `lost`. No duelist lane holds a request after any batch.
- **A live game** (port 8660, seed 5, view 2). The director stands clear of a
  seven-card hand. Canvas clicks played two lands and opened Borough Backup's
  `ability_menu`. The villain's cast gesture played live, and a concession left
  the stances right. The frame log passes `check-redaction.mjs`.
- **What the table reads as.** The bodies track judged the table at 1× from views
  1 and 4 as *"a table of small painted miniatures rather than of toys"*, every
  humanoid card a person in a costume. The verifier found the cards' identities
  uneven at 1× (follow-up 6).

**The verification pass** (headless Chromium on the GTX 1080, two live games at
seeds 5 and 11, one gate run that failed at 10b and a re-run that reached the web
step — its per-step logs are under `var/check-all-*.log`) returned **passed, with
eleven minor findings**. None was fixed in code. One — DECISIONS.md not yet
updated — is **closed by this documentation pass** (**D95–D101**), and the other
ten are follow-ups below: the gate's intermittent step-10 failure (13); the duelists'
weak roles and artifacts (5); the plates `visibleShare` does not model (3); the
flinch never seen live (7); uneven card identity (6); the T-pose flash hidden
rather than fixed (8); the build's transitive dependency (9); the downloads (12);
`main` moving (14); and a camera mis-aim seen once (15).

**The documentation pass** changed no code: this section and the evenings table;
the earlier follow-ups marked where slice 4 closed or moved them; **D95–D101**;
README's *Tier 2, slice 4 — people in costumes, and a duelist at each end* (with
how to dress a card and how to change a duelist); CLAUDE.md's slice-4 conventions
and the lines slice 4 made stale; NOTICE §7's paragraph on what slice 4 draws;
`docs/ideas/arena-mode.md`'s status; and a status section at the end of the
evidence.

**The gate**: three runs of `WSPORT=8666 ./tools/check-all.sh` in this
documentation pass, without deleting `bridge/out`, and **none passed**. The
machine's load average was 42–73 during the first two, from other work's gate
runs and headless Chromium GPU processes (none of it this worktree's), and about
30 during the third.

- **Run 1** (19:31:29): **exit 141 after 63 s, at step 6.** The fresh seed-42
  `RecordMatch` had one extra `state` frame against `fixtures/games/g1.jsonl` (a
  second `MAIN1` at seq 340) and played the same game to the same `over`. The
  step's `diff | head` then took a SIGPIPE under `set -euo pipefail`, so the gate
  died with 141 instead of its own message.
- **Run 2** (19:36:37): **exit 141 after 56 s, at step 6 again**, this time one
  extra `COMBAT_DECLARE_ATTACKERS` frame at seq 342.
- **Run 3** (19:49:17): **exit 1 after 622 s, at step 10b.** Steps 1–9d passed:
  step 6's 377 lines were identical, 9b's advisory multiset differed by 7 / 25
  frames, 9c was 10/10 in 347 s, and 9d's sideboard ask passed. 10a passed too.
  10b failed exactly as the verifier's first run had: in the bridge's frame log
  for the drop-and-reconnect smoke, an `input` frame (the mulligan's
  Keep / Mulligan prompt, seq 10) follows `over` (seq 9) in the same millisecond.
  The concede at the mulligan raced the engine's mulligan prompt.

The logs are `var/check-all-t2s4-docs-run1.log`, `-run2.log` and `-run3.log`,
and run 3's frame log is `var/check-all-t2s4-run3-ws-drop-frames.jsonl`. No run
reached steps 11–13 (`check-redaction` over the fixtures, its self-test, the web
build and test). The verifier's re-run reached them on the same code, and this
pass changed no code. Both failure classes are timing in the bridge (follow-up
13): `bridge/` is untouched by Tier 2, and `WireGuiGame.java` last changed in M6.
Standalone, `npm --prefix web test` was **724 + 79**, 0 failures, in both
tracks' runs.

### Earlier follow-ups slice 4 closed or moved

Marked in place above. **Closed**: Tier 2 follow-up 10 (the busts' placement —
**D100**), slice 2 follow-up 1 for every body a card stands in (each clip its own
— **D95**), and slice 3 follow-up 7's owed rebuild (byte-identical, from sources
the builder downloaded). **Partly answered**: slice 2 follow-up 6 (the retargeted
`hit` photographed in the arena), slice 3 follow-ups 8 and 11 (the user's
verdict on slice 3), and 10 (Fury — reworked, and still the least legible).
**Moved**: slice 3 follow-up 2 (the eyepatch joined the one-sided list, **D98**)
and Tier 2 follow-up 17 (the caret now also decides the simplifier, **D96**).

<a id="fu-t2s4"></a>

### Slice 4 follow-ups — nineteen, 2026-09-27; 3, 8, 9 and 13(b)/(c) closed by the hardening pass

From both tracks' "problems" notes, the verification pass's eleven findings and
this documentation pass. **None stops a game.** Four are the user's calls (1, 2,
11, 12), four are limits of how slice 4 was measured or seen (4, 7, 15, 18), two
are about the gate and the merge (13, 14), and the rest are debts with a stated
cost.

1. **Were the duelists wanted?** **D62** was user decision 8 — "silhouette busts,
   avatars deferred … only after a play-test says anyone missed them". Slice 4
   superseded it (**D99**) on the workflow's reading of *"the avatars are still
   pretty generic"* as covering the duelists as well as the creatures, and the
   user's words do not say which. The busts are kept: a seat with no valid look in
   `duelists.json` draws its bust, at the duelists' stand point. The user's call,
   after a game.
2. **The opponent's duelist is not at the far end of the table** (**D100**): the
   whole far end is under the chrome from every seat-safe view (0% visible from
   the table view), so it stands at the table's right-hand side beside its
   creature rank. That is not the Yu-Gi-Oh composition `docs/ideas/arena-mode.md`
   describes. Putting it at the far end means moving the chrome band, the table
   view's pose or the table's depth — a camera or layout decision, and the user's.
3. ~~**`visibleShare` models the top chrome band, not the player plates**~~ —
   **closed by the hardening pass (2026-09-27)**: `camera.ts`'s `PLAYER_PLATES`
   and `visibleShareOnCanvas` model both seat plates as keep-outs (held to
   `styles.css` by `camera.test.ts`), and **no duelist number changed**: the
   "y ≈ 180" was a WINDOW coordinate, and in canvas pixels the opponent's plate
   ends at 126.0, inside the 128-px band (*The 2026-09-27 hardening pass*, below).
   **On the rebase onto match setup** the plate had grown a deck line and a
   profile that wrapped its name row — 143 and 162 px down, below the band and
   over the duelist in the shoulder view — and it is four one-line rows again,
   with the band asserted (the hardening section's *The rebase*). The
   original finding: (the
   verifier). The top-right AI plate reaches y ≈ 180 at 1600 × 1000, so the
   villain can be under it; at 1024 × 768 in the seat-safe shoulder view the
   villain's helm is under it. The camera test's ≥ 90% is therefore optimistic by
   the plate. Modelling the plates as a keep-out, like `HUD_TOP_PX`, is the fix.
4. **Two views and one window shape lose a duelist.** Side-on (view 4) does not
   show yours (49.6° off its axis against a 33° half-width at 16:9); the
   opponent's shoulder (view 3) shows it at 31%, partly under the chrome; and at a
   square (1:1) window the opponent's is 0% visible in the shoulder and low views
   — printed by the test, not asserted. Views 3 and 4 are spectator-only, and the
   duelists are never in the solver's required set.
5. **The duelists read weakly as a *director* and a *villain*, and each has a
   visible artifact.** That is the verifier's reading at 1× on the GTX 1080: from
   the default table view the director is seen from above and behind in the
   bottom-left corner, a teal-grey bell of coat. The artifacts the duelist track
   itself reported are these. The coat is rigid on `spine_03`, so its lapel strip
   shows a seam when the win clip twists the torso. The villain's great helm is
   the kit's A.I.M. bucket hood stretched, and it moves whenever a body is
   refitted. The winner's "fist" is an open hand (the fingers keep the clip's
   pose).
6. **Card identity is uneven at 1× from the table view** (the verifier, on the
   GTX 1080). Nick Fury is still *"a man in a long black coat"* with an illegible
   eyepatch (slice 3 follow-up 10), and Coulson reads as a generic suited agent
   with a gold chest blob; the bodies track's own reading was kinder (*What the
   evidence shows*). The raster test counts pixels, not contrast (slice 3
   follow-up 12). This is the input the next identity pass should be ordered by —
   ideally the user's own list, from a game.
7. **The duelists' headline gesture is not seen in the most common live case.**
   When the human takes damage, the batch arrives while the engine waits on the
   human and the 250 ms awaiting-human budget snaps it, so the flinch plays at
   `t = 1`, where its weight is 0. The verifier's 5 ms in-page sampler over the
   AI's combat-damage batches in two live games (seeds 5 and 11) never saw one.
   The live concession's outcome entry did not visibly play either: the stances
   appeared at once. The gestures are evidenced in replay and by the corpus test.
   This is Tier 2 follow-up 1 and question 12 with a third casualty.
8. ~~**The T-pose flash is hidden, not fixed**~~ — **closed by the hardening
   pass (2026-09-27)**: `driveClips` gives the one action that is both lanes
   weight 1, and `web/test/clip-lane.test.tsx` holds it on a model with no
   `idle` (fails without the line: the bone drifts to 0.92 of the way to its bind
   pose). The original finding (**D95**): `CueRunner.driveClips`
   still returns early when a stance's rest action IS the transient, leaving the
   blend weights below 1 for the ramp. Every clone now starts at its idle's first
   frame, so the mixer's fallback pose is the idle and nothing flashes, but a model
   with no `idle` would still flash its bind pose. The fix is one line in
   `CueRunner.tsx` (weight 1 on that action), which neither track owned.
9. ~~**Byte reproducibility rides a transitive dependency**~~ (**D96**) — **closed
   by the hardening pass (2026-09-27)**: the CLI is pinned at `4.5.0` and its
   meshoptimizer at `1.2.0` (`overrides`); `npm ci` installs the same versions the
   lockfile always recorded. **Not re-proved by a rebuild**: the five source
   archives are not on this machine and downloading them (~130 MB) is the user's
   call (follow-up 12), so `figures.glb`'s reproducibility rests on the toolchain
   being unchanged (*The 2026-09-27 hardening pass*, below). The original finding: the build
   decimates with the meshoptimizer nested under `@gltf-transform/cli`, which
   still floated on `^4.5.0`. Pin the CLI exactly (Tier 2 follow-up 17).
10. **The budget headroom is thin on three lines at once** (**D96**):
    `figures.glb` is 373,236 of 400 kB (27 kB to spare, most of the file is the
    humans' clips); `g1`@355 is 27,416 of 30,000 triangles, and a frame at
    `MAX_FIGURES` (12) with both duelists has under 1,000 to spare; and 11 draw
    calls remain. Question 11 — commit `figures.glb`? — is now about a 373 kB file.
11. **Every humanoid is a Superhero body.** The free Standard zip holds only the
    Superhero proportions; the Regular bodies are in the paid Source zip ($19.99).
    Coulson and the scientists are broad-shouldered. Buying it is the user's call,
    not a builder's.
12. **Five archives were downloaded without the user's approval in chat.** The
    bodies track fetched the new 128,968,391-byte *Universal Base Characters* zip
    and re-downloaded the four earlier sources (curl, and itch.io's free
    "No thanks, just take me to the downloads" flow) on the workflow's
    instruction. Slice 3's follow-up 7 had said "fetching them is the user's call". They
    are data files only, in the gitignored `var/assets/figures/`, verified by
    sha256, and the licence badges are recorded. Whether to keep this asset — and
    so this slice — is the user's decision.
13. **The gate is flaky under load, in two ways (a third since the rebase) — all
    timing in the bridge, and none slice 4's.** **(b) and (c) are closed by the
    hardening pass (2026-09-27)**: (b) by **D113** (step 6 compares what load
    cannot move, `tools/wire-drift.mjs`, and prints its own verdict), (c) by
    **D114** / amendment **M45** (an early `newGame` is queued until Forge has
    finished the game, and 10g now holds that window open on every run) — *The
    2026-09-27 hardening pass*, below. (a) is match setup's, on `main` (`7364bea`: `emit`
    re-checks `over` under the log's monitor). The original findings: (a) **Step 10's "the last frame is `over`" check.** The
    verifier's first run failed it at 10b (543 s), this documentation pass's third
    run at 10b (622 s), and a run in another worktree at 10a the same evening. The
    documentation pass's frame log shows the cause: after a concede at the
    mulligan, the engine's mulligan prompt (`input`, seq 10) was emitted AFTER
    `over` (seq 9), in the same millisecond
    (`var/check-all-t2s4-run3-ws-drop-frames.jsonl`). Either the bridge drops any
    `input` once `over` is out, or `docs/protocol.md` §8.4 says that shape is
    legal and the gate reads it that way; the first is the protocol's intent.
    (b) **Step 6's byte-strict diff.** At a load average of 42–73 the
    documentation pass's first two runs recorded seed 42 with one extra `state`
    frame (a phase flushed twice), the same game to the same `over`. Step 6 is
    strict where 9b is a multiset, and its `diff | head` exits 141 under
    `pipefail` instead of printing its own message. `bridge/` is untouched by
    Tier 2, and `WireGuiGame.java` last changed in M6. (c) **Step 10g's
    restarted game** (the rebase onto `754f504`, 2026-09-27, once in two runs, at
    a load average of 15–32): the server logged `NEW GAME REQUESTED
    mode=restart` before its own `WAITING for act: newGame`, then game 3 began
    and ended at once (`OVER WITHOUT A gameOver STATE`), leaving a four-frame log
    with no `state` that `check-redaction.mjs` fails
    (`var/check-all-t2s4-rebase-pre1-ws-3g.log`,
    `var/check-all-t2s4-rebase-pre1-3g-g3-frames.jsonl`); the client counted it
    as game 3 of 3 and exited 0. Worth fixing before the next gate is trusted to
    be deterministic on a busy machine. **(a) is closed** by match setup's fix
    commit on the rebased branch (2026-09-27): `WireGuiGame.emit` checked
    `overEmitted` outside the monitor that numbers a frame, so an `input` that
    read it false could be numbered one past `over`; the flag is now re-checked
    under that monitor, and `logC2s` and the ask path's numbering got the same
    re-check. `bridge/build.sh`'s new `OverRaceSelfTest` parks the racers on the
    monitor so the losing order happens every run (all 11 checks fail with the
    re-check removed), and twenty back-to-back 10b sessions at a load average of
    up to 43 passed, one of them dropping a racing `input` live (match setup's
    evidence §R.3). (b) and (c) are open. (d) **The ask path's PUSH is still
    outside the monitor** (match setup's verifier, 2026-09-27; open).
    `WireGuiGame.ask` numbers its frame under the log's monitor, so in the FILE an
    ask is ahead of `over` or absent, but it is pushed later, inside
    `Transport.ask`, after the monitor is released; a concede's `over` can be
    numbered after that ask and still reach the socket before it, so on the WIRE
    `over` would not be the last frame. Never seen in a gate run. Closing it means
    restructuring the transport's ask (numbering and pushing under one monitor
    while the pool registration still precedes the push), which the fix pass did
    not do. `OverRaceSelfTest` does not cover the ask path: `ask` asserts a game
    thread, and reaching one from the self-test would take a fourth
    `ThreadUtil.invokeInGameThread` hop (hard rule 3) or a thread of ours named
    into the `Game` prefix, which the thread-name rule forbids.
14. **`main` moved, and the merge will conflict.** `754f504` (the card library)
    landed on `main` after this branch was cut. Both sides changed NOTICE,
    CLAUDE.md, PLAN.md, README.md and DECISIONS.md. Slice 4's decisions are
    numbered from **D95**, so both sets survive a merge without renumbering;
    CLAUDE.md's docs-table counts, the test counts and the check-all paragraph
    need a hand merge. **Closed 2026-09-27 by the rebase onto `754f504`**:
    NOTICE merged by itself, the other four were merged by hand keeping both
    sides, and no decision was renumbered (*Rebased onto `754f504`* above).
15. **A camera mis-aim, seen once and unconfirmed** (the verifier). In the live
    seed-11 game, 3 s after Peggy's cast, a screenshot showed the shoulder view
    mis-aimed, with the director almost entirely off the left edge. It is
    probably the camera track's (slice 2), not slice 4's, and was not reproduced.
16. **The damage number rises from the HUD anchor** (`playerAnchorFor`), which is
    at your duelist's feet but not the opponent's. Moving it to the duelist is a
    `layout.ts` change neither track made.
17. **Small debts, each deliberate or cheap.** Skin is one tone for every card —
    deliberate (**D97**: a complexion is not identity data), but worth the user's
    eye. The coat does not drape: a kneeling Biochemist is a white box, and a
    lunging Fury swings his whole coat. The composed kneel is a build-side
    invention, and a CC0 clip with an upright kneel would replace it. The chibi
    fallback's pistol sits in front of the chibi's face (no row asks for
    `body: chibi` today).
18. **Every number is headless Chromium on the GTX 1080, no frame-time bench was
    run, and nobody has played slice 4.** The budgets are `gl.info` counts (Tier
    2 follow-up 4's caveat); `tools/arena-bench.mjs` was not re-run on slice 3 or
    slice 4; and the live games were scripted. The first play-test is the input
    for everything above that says "the user's call".
19. **The duelists' stand offsets live outside `layout.ts`** (found by the
    documentation pass). `figures/duelists.ts` declares `YOU_STAND_DX`,
    `YOU_STAND_DZ`, `OPP_STAND_X` and `OPP_STAND_DZ` and adds them to
    `layout.ts`'s anchors, while Tier 2 convention 2 says `layout.ts` is the only
    module that knows a coordinate. It is pure and `camera.test.ts` holds it, so
    nothing is wrong on screen; moving the four offsets into `layout.ts` restores
    the rule, and is also where follow-up 16's damage-number anchor would move.

### Tier 2 is complete — what is left

**Every evening of report 13 §11 is delivered** — T0–T7 (slice 1), T8 and the
camera views (slice 2), T9–T12 and per-card identity (slice 3), the bodies and
costumes, T13 and T14 (slice 4) — and each slice has had at least one
independent verification pass and a documentation pass. What Tier 2 leaves
behind is **follow-ups, not evenings**: the lists above. A few of them need the
user rather than a builder: the live combat budget (question 12), which way the
figures rest (question 13), whether the duelists were wanted and where the
opponent's stands (slice 4 follow-ups 1 and 2), and whether to buy the Regular
bodies (11). Slice 4 is committed (`23e26b3`), and nobody has played it.

The one question Tier 2 cannot answer is whether there should be a **Tier 3** at
all — **likeness**, below and question 14.

### Tier 3 — a note, not a plan (likeness models, personal-only)

Slices 3 and 4 are as far as **identity** goes inside Tier 2: a card reads as
itself by what it wears, what it carries, how big it is and where it flies, on
one of two proportioned CC0 bodies (or the drone, the bee or the carrier). What
the user may have in mind by "the desired end goal" — a Wasp who LOOKS like Wasp,
a Fury who looks like Fury — is **likeness**, and likeness is Tier 3: a model per
card, which report 13 §13 option (c) describes as the most work by an order of
magnitude and the option with a real licence problem, and which the user's art
direction for Tier 2 set aside (**D53**). If it is ever wanted, three things are already decided and would bind it:

- **Likeness models are personal-only.** A mesh that depicts a Marvel character is
  a depiction of someone else's property whoever made it; like the Scryfall card
  images (NOTICE §2 and §4), it may live on this machine, **gitignored, never
  committed, never published, never redistributed**, and recorded in
  `tools/assets-manifest.json` as `committable: false` (report 13 §13 question
  2's rule; *superseded 2026-09-28 by D190: the personal tier records a model in
  its own gitignored folder, never in the committed manifest — The personal tier,
  below*). The public repo stays CC0-and-code, and the arena must still play
  every card without one — the disc, the archetype body and its traits are the
  fallback, exactly as a missing `figures.glb` is today.
- **D54 still stands**: no model is made from card art by any image-to-3D tool,
  hosted or local, and nothing from Mixamo. A likeness model would have to come
  from somewhere else — hand-made, or a CC0 / personally-licensed source the user
  chooses — and choosing one is the user's decision, not a builder's.
- **The seam is already there**: `figures.json`'s `cards` block can point a card
  at a model, and `traits.json` layers on top of whatever body it names, so a
  Tier 3 model would replace a card's body without touching the ladder, the prop
  kit, the pose rules or hard rule 8 (a face-down card is still the anonymous
  disc).

**What Tier 3 would be, concretely, after slice 4.** A card's row in
`figures.json` would name a personal-only model — a likeness of *that* character,
hand-made or from a source the user licenses — in place of the man's or the
woman's body. The model would ideally be rigged on the same 65-joint Unreal-named
rig (**D95**), so every clip, the kneel and the clip lane keep working with no
retarget of its own. It could carry its own costume slots (**D97**) or none, and
then be drawn in its tint as the drone is. Everything around it stays Tier 2's:
the traits ladder, the prop kit fitted per body family (**D98**), the costume
palette, the width clamp, the hologram and its one program. The same seam would
let a duelist (**D99**) stand in a likeness of a character. And the whole of it
would sit in a gitignored folder the build reads if present, so a checkout
without it draws exactly what slice 4 draws. That is the size of the decision:
not a new renderer, but a folder of models the user chooses and keeps to this
machine.

Tier 3 is **not started and not scheduled**; it stays on the deferred list below,
and it needs a decision of its own before it becomes work — **question 14** in
*Only the user can decide*, which is now **the one question Tier 2 leaves open**.

---

## The card library and the card browser — off the plan, 2026-09-27 (D90–D94)

**Status: built, reviewed twice, every finding fixed, documented; not
committed** — in the worktree `/home/justin-a/code/mtg-table-t2g`, branch
`card-library` (from `0368a90`). It is the deferred list's *"SQLite + FTS5 card
library, the `oracle_cards` bulk stream, a local image cache"*, brought forward on
the user's request of 2026-09-27 — *"expedite some of these"* — **without** the
`/api/images` proxy, and as **tools**, not a milestone: README's card-library
NON-GOAL is lifted only in part (**D90**). The other half of that request, a
viewer for the arena's models and how they act, is a separate change and not in
this section.

Report 03 §4 is the spec; [`docs/evidence/card-library.md`](docs/evidence/card-library.md)
is what was measured; [`tools/card-library/README.md`](tools/card-library/README.md)
is how to use the library. Decisions: **D90** (what the NON-GOAL lift covers, the
dev-only route, the field-reduced fixture), **D91** (`node:sqlite` + FTS5, no npm
dependency, a fresh file per build), **D92** (the same-origin route in the Vite
dev server, which never fetches), **D93** (the image cache keyed by id + size +
face), **D94** (`CardView` is not `CardTile`, and `#cards` is a view of its own).

**What exists.**

- **`tools/card-library/`** — `build.ts` streams Scryfall's `oracle_cards` bulk
  file (one 24.5 MB gzipped JSONL, found through `/bulk-data`'s
  `jsonl_download_uri` and skipped when the current one is already on disk), pages
  every MSH and MSC print through `/cards/search` at 2 req/s (8 pages), saves
  `/sets` and the two set icons, and indexes it all into a fresh
  `var/cards/cards.sqlite` renamed into place: **38,690 cards, 39,167 prints,
  1,053 sets, ~55 MiB, 8.5 s** for a first build. `images.ts` fills the image
  cache (`var/cards/images/<id>/<size>[.back].<ext>`); `query.ts` is the read side
  and a JSON CLI (name, set + number, search, a set, a deck, an image, stats);
  `deck.ts` parses `.dck` and `.txt`; `make-fixture.ts` cuts the committed test
  slice. No npm dependency, no `package.json`.
- **The card browser, `#cards`** (`web/src/cards/`, a lazy chunk of 9.67 kB
  gzip): search over name, type line and rules text; filters for set, colour,
  type and deck; a results grid whose every image carries `Illus. <artist>`; a
  detail panel with mana-font pips, rules text, flavour, P/T, set and number,
  artist, the copyright line, legalities, `in decks/x.dck ×N`, a *copy .dck line*
  button and every print of the card; `/`, the arrows, `Home`/`End`, `Enter` and
  `Esc`. Its data comes from `/cards/api/*` and `/cards/img/*`, a route that
  exists **only in the Vite dev server** and never talks to Scryfall.
- **`fixtures/cards/`** — 172 `oracle_cards` lines, 84 MSH/MSC print lines and 6
  sets, reduced to the fields the library reads (0.69 MB, no images), so the four
  new suites run offline.

**What the evidence shows.** `resolve decks/pacho-shield.dck`: **28 of 28 lines
resolved**, every one by exact name, on the numbers report 03 §2.5 lists (Peggy
Carter on MSC #523, the only print she has). All ten decks' **41 images,
3.8 MB**, from the CDN — the deck's 28 in 0.9 s — and a second run fetched 0.
Scryfall's API saw **21 requests in the whole session**, never more than 2 in any
second on the search bucket, and no 429. A name lookup is ~21 µs warm and a ranked
search 80 µs–5.4 ms;
the route's broadest real search (`creature` over MSH + MSC, 1,021 cards) is
127 ms. The review's major — filters applied after the 1,000-hit cap, so
`creature` over both sets answered **1** card and `creature` in the deck **0** —
is fixed by putting every filter into the SQL, and negative-controlled.
`npm --prefix web test`: **797 `node --test` + 91 vitest, 0 failures** (704 + 79
before; the difference is exactly `cards-lib` 49, `cards-api` 15, `cards-ui` 29
and `cards-render` 12). `npm run build`: 0 errors; the 2D entry chunk grew
0.23 kB gzip and carries none of the browser. **Not yet run inside
`check-all.sh`**, where it should read 807 / 799 pass / 8 skipped.

**Command**

```bash
node tools/card-library/build.ts                 # ~24 MB from Scryfall, under ten seconds
node tools/card-library/images.ts --all-decks    # the ten decks' 41 images, ~3.8 MB
npm --prefix web run dev                         # then http://127.0.0.1:5173/#cards
#   /#cards?q=agent&set=msh                       a search, filtered; the URL is the state
#   /#cards?deck=decks/pacho-shield.dck           the deck, in file order, every image cached
#   /#cards?q=coulson, open Agent Phil Coulson   the prints row: MSH #4 and MSH #402
./scripts/play.sh                                # the same dev server, so `▦ cards` should work
                                                 # mid-game too (not yet tried on a live socket)
node tools/card-library/query.ts resolve decks/pacho-shield.dck   # JSON on stdout
```

<a id="fu-cards"></a>

### Card library follow-ups — twelve, 2026-09-27 (12 closed by the workshop)

1. **`tools/fetch-art.ts` can read from the library instead of Scryfall.** Today
   it walks `/cards/named` at 2 req/s, up to four rungs per card, to write
   `web/public/art.json`; `query.ts`'s `resolveDeckFile` and `imageUrl` already
   answer every one of the deck's 28 lines offline, with the same MSH/MSC split
   and the same multi-face rule. Reading the index when it exists (and falling
   back to the API when it does not, so the board never *needs* the library —
   **D90**) would make `art.json` a zero-request, reproducible build. Its header
   comment — *"The SQLite/FTS5 library in report 03 is explicitly deferred"* — is
   stale as of **D90**, and was left alone because `fetch-art.ts` was another
   worktree's file during this pass.
2. **Report 03 §4.5's refresh rules** (**D93**'s known cost): no re-fetch when a
   print's `image_updated_at` advances, and no dated retry for a `missing` /
   `placeholder` image — today it is skipped and listed, and a stale file is
   deleted by hand.
3. **`config.json`'s `scryfallUserAgent` still carries a placeholder contact**
   (`github.com/<user>/mtg-table`). Scryfall asks for an accurate one; only the
   user can supply it (question 16). `build.ts` and `images.ts` warn on every run
   that talks to Scryfall until it changes.
4. **Whether `fixtures/cards/` is committed at all** is the user's call
   (question 15, **D90**).
5. **Every MSH + MSC print's image** (`images.ts --all-prints --yes`, 1,338 images,
   ~104 MiB by the tool's own estimate) has not been fetched, so browsing those
   sets hot-links all but the decks' cards (question 17).
6. The name ladder is local only: report 03 §4.6's last rung,
   `/cards/named?fuzzy=`, is not called; a misspelt deck line comes back
   unresolved with the local FTS5 guess as a `suggestion`, and is never
   substituted.
7. No `resolve --write` (a **copy** of the deck with `|MSC` on its ten unsuffixed
   lines — question 4 says never rewrite it in place), no
   `~/.cache/forge/cdn_uuid` warm start (report 03 §3.5), no `/cards/manifest`
   incremental refresh (**D91** rebuilds instead).
8. **The *copy .dck line* button** writes `|SET` only for MSH and MSC, the two
   sets whose Scryfall code is checked equal to Forge's; any other print copies as
   the bare name. Forge's `|[<collector number>]` grammar for one specific print
   (Coulson #402) comes from the 2.0.15 source and was not checked against the
   2.0.14 jar, so the button does not write it.
9. **The real build is not in the gate**, on purpose: it needs the network. The
   four suites run hermetically inside `check-all.sh`'s `npm test` over
   `fixtures/cards/`; the in-gate count (807 / 799) has not been measured yet.
10. **The browser loses the mode app's UI state across the detour** (an open
    panel, a zoomed card, a camera dragged by hand) — **D94**, by design, because
    a hidden board would still hear the keyboard. A replay's frame and the
    renderer you came from survive (both measured); the live socket is
    page-scoped and should survive too, but no live game has taken the detour
    yet — the first one that does is this follow-up's check.
11. **No production route** (**D92**): `vite preview` and a built `dist/` show the
    browser's empty state. If the browser is ever wanted outside the dev server,
    that is a new decision, not a follow-up.
12. ~~**The browser and the models viewer are not linked.**~~ **Closed by the
    workshop's reconciliation** (2026-09-27, **D102**): the detail panel's *View
    in 3D* opens `#workshop?card=<exact name>` for a card the workshop can show,
    greyed with the reason otherwise, and the workshop's *card text* opens
    `#cards?open=<scryfall id>`.

---

## The workshop — the arena's card viewer, off the plan, 2026-09-27 (D102–D104)

**Status: built, reviewed, every workshop finding fixed, documented, and
rebased onto Tier 2 slice 4 and reconciled with it (2026-09-27).** It is in the
worktree `/home/justin-a/code/mtg-table-t2e`, branch `workshop`, from `0368a90`,
moved onto `754f504` (the card library) by its fix pass, then rebased onto
`main`'s `23e26b3` (slice 4) as two commits: the workshop itself, re-applied with
the docs merged, and **the reconciliation** — the costume row, the links with
`#cards`, and the two arena fixes the workshop had found (*The rebase onto slice
4*, below, says how each checklist item went). It is the other half of the
user's request of 2026-09-27: *"expedite some of these"*
brought the card library above forward, and *"a card viewer that allows the user
to see models and how they act"*, to help workshop the identity work as it
develops, is this. It is **M7 Tier 2's bench**: the identity work of slices 3 and
4, looked at one card at a time. It sits here, beside the card library, rather
than under *M7 Tier 2*, for two reasons. It is a tool rather than an evening, and
every heading inside *M7 Tier 2* is being edited by slice 4.

[`docs/evidence/workshop.md`](docs/evidence/workshop.md) is what was measured,
with 23 screenshots under `var/shots-workshop/` (local, gitignored). README's
*Arena mode → The workshop* is how to use it. There are three decisions:

- **D102**: a lazy page outside `arena/`, drawing with the arena's own scene
  through a listed set of exports, and unmounting the mode app as `#cards` does.
- **D103**: tuning overrides in `localStorage`, never the repo, through the
  arena's own validators, and leaving the page only as a copy of the committed
  text.
- **D104**: the pedestal's boards as synthetic frames from one pure builder,
  folded through the real reducer, with card facts from the corpus. What only the
  engine could choose (aim, blocks, crew) is labelled as the workshop's.

It **supersedes report 09 §10.7's `/#/arena?cue=<id>` dev loop**, which was never
built.

**What exists.** `web/src/workshop/` (16 files; the pure ones import no three and
no React — `links.ts` is the reconciliation's), `tools/build-workshop-catalog.ts`,
`web/test/workshop.test.ts`, and small edits to `main.tsx`, `useView.ts`,
`keys.ts` (`W`), `styles.css` (appended), `vite.config.ts` (the shared chunk's
name), `hooks-order.test.ts` and `keys.test.ts`. The reconciliation added the card
browser's *View in 3D* (`cards/CardDetail.tsx`, and a ⚒ workshop back link in
`cards/CardBrowser.tsx`), and made **two arena edits on the arena's desk**, each
held by an arena-side test: `Arena.tsx`'s state-backed `loopRef` (with a fourth
`liveness.test.ts` clause) and three `resolved:fizzled` rows in `cues.json`. The
workshop's own code still edits nothing under `web/src/arena/`.

- **The route.** `#workshop` or `?view=workshop`; `#workshop?card=<name>` opens
  on a card (a name, or part of one; the query spelling `?card=` works too, and
  the hash wins), and the page keeps the hash in step with the list. `W` in the
  3D arena opens it, so does `⚒ workshop` in the top bar, and so does **View in
  3D** in `#cards`' detail panel — live for a creature or a Vehicle and for any
  other card with its own `cues.json` entry, greyed with the reason otherwise.
  The header's **≡ card text** goes the other way, to `#cards?open=<scryfall id>`
  when `art.json` has the card. It is a lazy chunk, it opens no socket and
  it fetches no log. The mode app is unmounted under it: a live socket survives,
  a replay resumes at its frame, and a chip says when the live game is waiting on
  you. `▣ arena` / `▤ board` / `V` go back.
- **The list** — 59 entries with a search box. Each entry has a chip naming
  the rung its look came from (per-card, subtype, colour, default or concealed),
  and a thumbnail: Scryfall's (through `art.ts`) where `art.json` has the card, an
  empty frame for an archetype, a card back for a concealed entry. The entries:
  - the ten decks' 41 cards, grouped by the first deck that names them;
  - the 5 tokens the corpus saw;
  - 11 generic archetypes (the eight subtypes, `White` / `Blue creature`, `Any
    other creature`);
  - a face-down creature and a redacted five-key stub.

  The facts come from `catalog.json`, generated from the decks and the corpus
  (**D104**).
- **The pedestal** is the arena's own scene pointed at one card: `CardPlane`,
  `FigureLayer` (body, props, disc, the departing body), the tile, casting,
  overlay and effect fields, and `CueRunner`.
  - **Camera.** Three modes: *1× close* (orbit), *table distance* (the size the
    body has in view 1 at 1600 × 900) and *whole table* (view 1 itself).
  - **Seats and facing.** *Both seats* shows your copy and the opponent's side by
    side, from one angle. *Faces the other seat* previews PLAN question 13 without
    touching `layout.ts`.
  - **Stances**: ready, tapped, sick, attacking, blocking.
  - **Extras**: a target dummy, and bloom (single view).
  - **The caption** is the body's *drawn* height in view 1.
  - **The queue bar** is the queue's own controls: play/pause, step, +50 ms,
    skip cue, skip all, speed, reduced motion, "back to rest".
- **The panel.**
  - **Clips**: every clip the body has, alias included (Agent 13's `attack` is
    `pistolDraw`), each played alone through `workshop.clip`. The Air Force's
    buttons say *"hidden rig: the swarm is procedural"* (**D88**).
  - **Cues**: every rehearsal the card's role allows (24 kinds), each a
    synthetic batch through the real `CueQueue`, with the resolved line beside
    it: rung, selector, cue id, ms and clip. It also shows what the rung order
    outranked, and any selector of the card's own entry that nothing reaches.
  - **Tuning**: the `traits.json` row, live — since the reconciliation with its
    `body` flag and slice 4's **costume**, a row per slot with the colour the
    body is drawn in and where it came from (this card, inherited, filled).
  - **Cue params**: the card's `cues.json` params, live.
  - **Legibility**: each prop's on-screen pixels from the table view on both
    seats, standing and kneeling, against the 48-px bar.
  - **Keys**: the page's keymap.

**What the evidence shows.**

- **Tests.** `npm --prefix web test` after the reconciliation, from `npm ci`:
  **862 `node --test` + 93 vitest (6 files), 0 failures** (817 + 91 on `main` @
  `23e26b3`; the `workshop` suite is 43, `keys.test.ts` +2, `cards-render` +2).
  Before the rebase it was 837 + 91 on `754f504` (the `workshop` suite 38).
- **Every rehearsal decays.** Every rehearsal of every card, single-seat and both
  seats — **1,376 batches, 2,432 cues** — plays through the real `CueQueue` and
  decays to identity. **Every `cues.json` selector of every deck card is reached**
  by some rehearsal. The rung-order census prints every run:
  - `attackers` over `attackers:alone` ×4;
  - `resolved` over `resolved:fizzled` ×3 before the reconciliation, **none
    since** (the three spells' own fizzle rows; the test fails if it comes back);
  - `damage` over `damage:lethal` ×1;
  - `counters` over `counters:-` ×2.
- **The meter matches the test.** The legibility meter equals
  `web/test/prop-raster.ts` **pixel for pixel over 40 readings** (Peggy, Coulson,
  the Doombot and Fury × both seats × standing and kneeling).
- **Drawn heights in view 1 at 1600 × 900.** The caption's number is the rest
  clip's skinned vertices projected through the table camera — slice 4's
  proportioned bodies since the rebase (the chibis' before it):

  | body | drawn (slice 4) | nominal (slice 4) | drawn (slice 3's chibis) |
  |---|---|---|---|
  | Peggy | 69.3 px | 95.7 | 61.3 px |
  | the Doombot | 56.0 px | 49.6 | 56.1 px |
  | the giant ant | 127.4 px | 99.8 | 127.4 px |
  | Coulson and Fury | 67.8 px | 95.7 | 61.3 px |
  | Fury as `body: chibi` | 61 px | — | — |

  The test holds the caption within 0.5 px of an independent build, and holds
  the table-distance camera within 6% of view 1 on 540-, 900- and 1200-px canvases.
- **Idle costs nothing.** 0 `gl.render` calls in 3 s with Peggy on the pedestal,
  bloom on. The Doombot's `presence` bob keeps the loop at `always`, as it does in
  the arena.
- **Navigation.** `W` over the `g1` replay in the arena opened `#workshop`. Under
  `?arena=off#arena`, the board kept the key. The replay at frame 250 → `W` → `V`
  → frame 250.
- **Build** (after the reconciliation, against `main` @ `23e26b3`). The 2D entry
  chunk is **+0.93 kB gzip** (86.47 → 87.40, none of it `three`).
  `Workshop-*.js` is **23.30 kB** and `links-*.js` (the catalog and the two links,
  shared with the card browser) 2.69 kB, on the shared `arena-scene-*.js`
  (347.96 kB). The arena's download is 14.34 + 347.96 = 362.30 kB against slice
  4's single 359.81 kB chunk. The stylesheet is +1.49 kB.
- **Gate.** The first pass ran `WSPORT=8671 ./tools/check-all.sh`: `check-all OK`,
  760 s, before the rebase. After the reconciliation, from a deleted
  `bridge/out`: **`check-all OK`, exit 0, 888 s** at `WSPORT=8680` (9c's ten games 317 s, on a desktop at a load average of 17–23), with `node --test` at **872 / 864 pass / 0 fail / 8 skipped** plus 93 vitest inside it (`var/check-all-workshop-reconcile.log`).

**A defect found on the way — the arena's too, and fixed in both.** A batch
enqueued while the clock was paused froze on the pedestal. The cause:
`<Canvas frameloop>` is re-applied on every render, including one fiber makes on
its own for a resize, and the prop was the ref's value at the component's *last*
render. The pedestal backs `CueRunner`'s `loopRef` with React state. On the
reconciliation the arena was checked (headless, GTX 1080, `g1`@100) and had it: a
viewport resize 80 ms into a batch froze it (0 frames in 700 ms, two steps stuck
at 503 ms), and a resize after a batch drained kept an idle table drawing (756
frames in 700 ms). `Arena.tsx`'s `loopRef` is now state-backed the same way —
still `frameloop={loopRef.current}`, so **D72** holds as written — and after it
the same probe ran through (504 frames; the batch drained) and parked (0 frames
idle). `liveness.test.ts` holds it (its frameloop clause's fourth part).

**Command**

```bash
npm --prefix web run dev                       # then http://127.0.0.1:5173/#workshop
#   /#workshop?card=coulson                     opens on a card (a name, or part of one;
#   /?view=workshop&card=coulson                the query spelling too — the hash wins)
#   W in the 3D arena, ⚒ workshop in the board's or the arena's top bar,
#   or View in 3D in #cards' detail panel
node tools/build-workshop-catalog.ts           # regenerate web/src/workshop/catalog.json
node tools/build-workshop-catalog.ts --check   # exit 1 if the decks or the corpus moved
npm --prefix web test                          # the workshop suite (38) runs inside it
```

### The rebase onto slice 4 — the checklist, and how it went

The workshop reaches the arena only through the exports named in
`web/src/workshop/Workshop.tsx`'s header, and `workshop.test.ts` fails on any
arena import that list does not name. So the rebase is: re-apply, then walk the
list against slice 4's tree. Slice 4 does **not** touch any of the non-arena files
this branch edits (`main.tsx`, `useView.ts`, `keys.ts`, `styles.css`,
`vite.config.ts`, `hooks-order.test.ts`, `keys.test.ts`), so those should
re-apply cleanly. PLAN.md, README.md, CLAUDE.md and DECISIONS.md will conflict
where both branches append at the same place. Keep both, slice 4's first, and
renumber **D102–D104** if slice 4 has grown past D101. The arena files slice 4
modifies, and what each means here:

1. **`scene/models.ts` and the new bodies (D95).** `instantiateFigure`, `clipFor`
   and `ModelLibrary` are what the legibility meter and the caption build their
   bodies from. The caption heights above will change, and the caption test
   re-measures them.
2. **`web/test/prop-raster.ts`.** Slice 4 makes the head height per body family
   (`HUMAN_HEAD_FROM = 0.79` beside `HEAD_FROM = 0.53`). `workshop/legibility.ts`
   copies `HEAD_FROM = 0.53` as a constant and must follow. The test *"the
   legibility meter counts what traits.test.ts counts, pixel for pixel"* is the
   tripwire.
3. **`scene/FigureLayer.tsx`, `scene/figureRigs.ts`, `scene/props.ts`,
   `figures/props.ts` (D98's props fitted per body family).** `Pedestal.tsx`
   mounts `FigureLayer` with the props `Arena.tsx` passes. `legibility.ts`
   commits a `PropField` itself, as `FigureLayer` does, and binds it once at
   rest. Both follow slice 4's signatures.
4. **`scene/holoMaterial.ts` (D97, the costume palette written at commit).** The
   pedestal gets it through `FigureLayer` with no change here. **The tuning
   panel's field list is written out**, so the costume's trait key needs a row
   in `Workshop.tsx`'s `TuningPanel`, which already carries a placeholder line
   saying so.
5. **`figures/duelists.ts`, `scene/busts.ts` (D99, the duelists as full
   figures).** The pedestal mounts a `BustField` and imports the `DuelistBust`
   type. Slice 4 may replace both.
6. **`figures/traits.ts`, `figures/validate.ts`, `figures/pose.ts`, `layout.ts`,
   `camera.ts`.** These are pure modules the workshop calls (`traitFor`,
   `validateTraits`, `figurePose`, `layout`, `placementOf`, `anchorsFor`,
   `CARD_W`, `CAMERA`, `REST_POSE`, `VIEW_BY_ID`, `CameraDirector`). Re-check
   each signature. `framing.ts`'s table-distance arithmetic assumes view 1's
   pose.
7. Then run `npm --prefix web run build`, `npm --prefix web test` and a look at
   Peggy, Coulson, the Doombot and the Air Force at table distance on both seats.
   Finally `WSPORT=<free port> ./tools/check-all.sh`.

**How it went (2026-09-27, `main` @ `23e26b3`).** `git rebase main` conflicted only
in CLAUDE.md, DECISIONS.md and README.md, where both sides append; both were kept,
slice 4's first. `main` stopped at D101, so **D102–D104 kept their numbers** (the
`match-setup` branch's own D102–D105 will need renumbering after this lands).
Against the tree, item by item:

1. `instantiateFigure`, `clipFor`, `ModelLibrary` kept their shapes; the caption
   re-measured itself (the table above).
2. `legibility.ts` now finds a body's head as `prop-raster.ts` does — its skin and
   hair slots, and `HUMAN_HEAD_FROM` for the `human` family. Both head and body
   write depth, so the split moves no prop pixel, which is why the
   pixel-for-pixel test had stayed green; it is kept equal on purpose. The meter
   reads slice 4's props on the `human` family (Peggy's shield 99–150 px of area,
   her hat 203–445, over both seats and both stances).
3. `FigureLayer`, `PropField`, `figureRigs` needed nothing: the pedestal passes
   what `Arena.tsx` passes.
4. The costume reaches the pedestal through the pose with no workshop code; **the
   tuning panel's costume row and body flag were added**, and a test now fails
   when `validate.ts`'s `TRAIT_KEYS` names a key the panel does not write.
   `traits.json` had been re-written by slice 4 as `JSON.stringify(…, null, 2)`,
   so the traits copy is printed that way (byte for byte against the file again).
5. The pedestal still mounts a `BustField` and hands `CueRunner` no busts and no
   `DuelistLayer`: the duelists are a seat's (**D99**), not on the pedestal
   (follow-up 14 stays open).
6. Every pure module's signature held; `framing.ts`'s arithmetic held (its test's
   bound on Peggy's nominal height moved from 90 to 110 px — slice 4's bodies stand
   their full height).
7. Build, tests and the gate: above.

<a id="fu-workshop"></a>

### Workshop follow-ups — fourteen, 2026-09-27; seven closed by the reconciliation, five new; 17 closed by the hardening pass

1. ~~**The rebase onto slice 4.**~~ **Closed** (2026-09-27): rebased onto
   `23e26b3`; the checklist above says how each item went.
2. ~~**The costume row in the tuning panel.**~~ **Closed**: a row per slot, the
   `body` flag, and a test holding the panel to the validator's keys.
3. ~~**The arena's own `frameloop` prop.**~~ **Closed**: it froze in the arena
   too (measured above) and `Arena.tsx`'s `loopRef` is state-backed, with a
   liveness clause.
4. ~~**A fizzled Helicarrier Strike plays its full strike.**~~ **Closed** in the
   data: Helicarrier Strike, Pym Particles and Depower carry their own
   `resolved:fizzled` → `resolved.fizzle`; the census reads none, and the test
   fails if one comes back. (Triggers: follow-up 15.)
5. ~~**`check-all.sh` has not been run since the rebase.**~~ **Closed**: run from
   a deleted `bridge/out` after the reconciliation (above).
6. ~~**`#workshop?card=…` is not read.**~~ **Closed**: `links.ts`'s
   `cardFromLocation` reads the hash's query first, as `#cards` reads its own, and
   the page writes `#workshop?card=…` back as the list moves.
7. ~~**The card browser and the workshop are not linked**~~ (card library
   follow-up 12). **Closed**: *View in 3D* one way, *card text* the other
   (**D102**'s reconciliation).
8. **Camera cues are not previewed** (the pedestal's director takes no move, so
   the Helicarrier's fly-in swoop is never seen here). **Bloom is single-view
   only**, because the composer takes over rendering.
9. **The meter's limits.** It measures at 1600 × **1000** (`traits.test.ts`'s
   frame), while *table distance* frames at 1600 × **900**; the page says both.
   It counts pixels, not contrast (slice 3 follow-up 12). It colours a
   one-sided detail (`tie`, `laserEye`, `exhaust`) red where the test forgives
   it, and the note explains.
10. **Never opened from a built `dist/`.** Nothing in the workshop needs the dev
    server (unlike `#cards`, **D92**), and its chunk is in `npm run build`'s
    output. A `vite preview` at `#workshop` has not been tried.
11. **The live-game chip was checked with a stand-in transport object**, not a
    running bridge. The detour over a real live socket (`./scripts/play.sh`,
    `W`, answer nothing, `V`) is the first real check, as card library
    follow-up 10 is for `#cards`.
12. **An override masks the committed row until it is reset** (**D103**). The
    panel says *OVERRIDDEN in this browser*, but it does not notice when the
    committed row has changed underneath the override. A warning when the
    override's base differs from the file would close it.
13. **A synthetic board is one card's world** (**D104**). A crowded rank, a
    wrapped back row or the width clamp under pressure show only in *whole
    table*. For a real crowd, a recorded frame is still the check (`g1.jsonl`
    @355).
14. **The duelists are seats, not cards.** After the rebase, slice 4's full
    duelists (**D99**) are not in the list, on purpose (checklist item 5). A
    "duelist" entry that stands one on the pedestal with its gestures would need
    `DuelistLayer`, `duelistPoses` and a seat on a synthetic board — a page of
    its own more than a list row.
15. **A fizzled TRIGGER still plays its card's plain resolution.** The
    reconciliation fixed the three spells; the per-card `resolved` of a
    permanent — Quake's shockwave, Wasp's scale beam, Web Up's cocoon, the Air
    Force's swarm, Coulson's badge, Strategic Intervention's pop — still outranks
    `resolved:fizzled` if its trigger fizzles, and the workshop rehearses no
    trigger fizzle (only a spell has a `fizzles` row), so nothing shows it. Adding
    that rehearsal and the rows is the next step, if a fizzled trigger is ever
    seen.
16. ~~**`match-setup` numbers its decisions D102–D105 too.**~~ This branch kept
    D102–D104 because `main` stopped at D101; whichever lands second renumbers.
    **Closed 2026-09-27**: match setup landed second and renumbered its four to
    **D105–D108**.
17. ~~**`catalog.json` now reads `cues.json`'s card names**~~ — **closed by the
    hardening pass (2026-09-27)**: `check-all.sh` step **12b** runs
    `node tools/build-workshop-catalog.ts --check`, byte for byte and even under
    `SKIP_WEB=1`; a `cues.json` row for a non-creature deck card (Giant Growth)
    made it fail and removing the row made it pass (a row that changes no card's
    `threeD` — a creature's, or a card in no deck — rightly does not). The original note: (for `threeD`), so a new
    per-card cue entry for a deck card makes the workshop's drift test fail until
    `node tools/build-workshop-catalog.ts` is re-run — on the arena's desk. The
    test says so; the alternative was the card browser importing the arena.
18. **The arena re-renders on every loop-mode change** (the state-backed
    `loopRef`): twice per batch, idle → `always` and back. Not measured as a
    frame-time cost; `tools/arena-bench.mjs` is the instrument if it is ever
    suspected.
19. **A card whose Scryfall name differs from Forge's** by more than a token's
    ` Token` or a double face's `A // B` would show *View in 3D* grey ("not in the
    workshop"). None of the decks' cards does today.

---

## Match setup — the AI's own deck and its Forge profile (2026-09-27)

**Status: built, reviewed, fixed, documented and committed** on branch
`match-setup` (a worktree first cut off `0368a90`), **rebased onto `main`'s
`23e26b3`** on 2026-09-27 — the card library and Tier 2 slice 4 — with a second
commit for three fixes: `over` made terminal under load (`WireGuiGame.emit`,
`logC2s` and the ask path re-check `overEmitted` under the log's monitor, held by
the new `OverRaceSelfTest`; slice 4's follow-up 13(a)), the arena's seat plates
printing the match (follow-up 2 below), and `cards-lib.test.ts` reading only the
deck files in `decks/` now that `decks/README.md` lives there (evidence §R.3).
**Then rebased onto the workshop** (`bf0392b`, the same day), whose D102–D104
had landed first, so match setup's four decisions moved up to **D105–D108**, and
its verifier's four findings were fixed (evidence §R.4): the renumber, CLAUDE.md's
missing *Match setup* paragraph and bridge example, `WireGuiGame.emit`'s stated
invariant and its return value (a dropped `gameOver` `state` no longer counts as
sent), and the ask path's push order, recorded open as slice 4's follow-up 13(d).
This was a deferred item — *"a second
deck, a deck picker, and an AI profile / difficulty selector"* — brought forward
on 2026-09-27, when the user asked for deferred work to be expedited. Protocol
amendment **M44**; decisions **D105–D108**; `docs/evidence/match-setup.md` is
what was measured (§D the deck, §B the bridge and the gate, §P what the profiles
change, §R the review); `decks/README.md` is the new deck and report 08 §8 its
card-by-card fidelity. One review pass found one major and eight minors, and all
nine are closed (evidence §R).

```bash
./scripts/play.sh                               # your deck vs decks/doom-legion.dck, Default, three games
./scripts/play.sh --ai-profile Reckless         # or --mirror, --ai-deck <path>, --deck <path>
./tools/ten-games.sh --seed 13                  # the gate's row: you vs the villains, Reckless
```

What it is:

- **A second real deck.** `decks/doom-legion.dck`, *Doom Legion (Marvel Super
  Heroes villains)*: 40 blue-black cards from MSH (33) and MSC (7), 17 creatures
  and every one a Villain. 27 of 27 cards faithful in Forge 2.0.14, none
  unsupported, Limited-legal, art for all 27. Two cards were cut in testing —
  Kang Prime, whose library reveal fails the redaction gate, and Trickster's
  Stratagem, which the Forge AI never casts — and after the swaps 38 of 38 games
  were clean and **all 20 nonland cards were cast by the AI** (**D108**).
- **The bridge seats the AI with its own deck and profile.** `--ai-deck` (an
  alias of `--deck2`) and `--ai-profile <Default|Cautious|Reckless|Experimental>`,
  validated against `forge-home/res/ai/*.ai` before `FModel.initialize`. Every AI
  seat in every process goes through `Bootstrap.createAiPlayer`, always with a
  non-empty `profileOverride`, because the empty one reaches a branch of
  `GamePlayerUtil` that **saves the preferences file** (a negative control made
  it write one). `tools/lint-bridge.sh` allows the Forge call in `Bootstrap.java`
  alone (**D107**).
- **On the wire:** `hello_ok.match` — each seat's deck by name, the AI's profile
  and the match length. The AI's deck is **its name and card count, never its
  path or list** (**D105**); `tools/check-redaction.mjs` holds the exact key
  sets, negative-controlled by four committed `fixtures/negative/redaction/m44-*`
  files.
- **On the board:** each seat's rail names its deck, and the AI's rail its
  profile, from `seatMatchOf()`, the one reader (`web/test/reduce-match.test.ts`);
  since the rebase's fix commit the arena's seat plates do the same, from the
  same reader.
- **`scripts/play.sh`** takes `--deck`, `--ai-deck`, `--ai-profile` and
  `--mirror`, with defaults in `config.json`'s new `match` block — which **only
  `play.sh` reads**, so the gate never plays what a player last chose (**D106**).
- **Tools:** `tools/check-deck.mjs` (is every card of a `.dck` really in the
  engine — static, engine and Scryfall passes, negative-controlled);
  `tools/fetch-art.ts` now fetches art for every `decks/*.dck`;
  `tools/first-divergence.mjs` reads a same-seed pair of games by its first
  differing choice; `tools/villain-deck.sh` names the gate's villain deck once.
- **The gate:** `tools/ten-games.sh` rows **11–14** play your deck against the
  villains once under each profile, and `check-all.sh` gained **9e** (one
  Reckless game, and a bogus profile refused before the engine boots). Both read
  the profile back **from the in-game AI** and fingerprint every Forge
  preferences file before and after. They prove the profile reaches the engine,
  not that it changes the play. Five more games cost about two minutes; the gate
  ran green from a deleted `bridge/out` in 874 s, then 1,141 s (the fix pass) and
  1,143 s (the documentation pass, evidence §R.2) — the last two on a desktop
  running other gates at once — and, rebased onto `23e26b3` with the second fix
  commit, in 1,106 s and 970 s (evidence §R.3), and rebased onto the workshop's
  `bf0392b` with the verifier's four findings fixed, in 897 s (evidence §R.4).

**What a profile is not.** There is still no difficulty setting. Each profile is
121 heuristic values; against the automated seat Cautious and Reckless were not
measurably different in same-seed pairs, and against a seat that leaves
untapped blockers the first difference was a trade Reckless took and Cautious
declined in 6 of 10 pairs (evidence §P). Question 8 below says the same.

<a id="fu-match"></a>

### Match setup follow-ups — ten, 2026-09-27 (the tenth found on the rebase onto `bf0392b`)

1. **Identity rows for the villain deck, after the arena branches merge.** This
   branch did not touch `web/src/arena/` while Tier 2's slice 4 and the workshop
   were being built there. Only Aerial Doombot and Thriving Isle, which are in
   Pacho's deck too, have rows; the rest — 13 creature names, the Doombot and
   Villain tokens, the Frozen in Ice aura, five other noncreature spells and
   four new lands — stand on the subtype and archetype rungs (report 08 §8.2).
   Owed: rows in `web/src/arena/figures/traits.json`, `figures.json` and
   `cues/cues.json`, judged the way slice 3 judged Pacho's deck (from both
   seats, at 1×).
2. ~~**The arena's HUD does not print the match.**~~ **Closed by the rebase's
   fix commit** (2026-09-27): each plate in `web/src/arena/DecisionLayer.tsx`
   reads `seatMatchOf(state.hello, player.id)` — the deck on a line of its own,
   ellipsised to one line with the whole name in its tooltip, and the profile
   beside the AI's tag, `AI (Reckless)`. `arena-hud.test.tsx` renders it from the
   synthetic sample (and no line for a pre-M44 recording), and a new
   `liveness.test.ts` clause holds the plates to that one reader and to never
   comparing a deck name or a profile (evidence §R.3). **Moved onto the life row by the
   hardening pass's rebase** (2026-09-27): the deck line of its own and the
   profile in the name row's tags took the opponent's plate below the top band
   and over the opponent's duelist; the plate is four one-line rows now, and the
   same reader and the same two facts are on it (*The 2026-09-27 hardening
   pass*, follow-up 5).
3. **A deck and profile picker in the browser** — on the deferred list below.
4. **Dark Deed** was cast once by the AI in 38 games; it holds the card. If a
   later census shows it never leaving the hand, it is the next swap (**D108**).
5. **Paths no recording has reached:** Kang the Conqueror's power-up — an
   **extra turn**, two `turn` events in a row for one player, which nothing in the
   repo has ever drawn on the phase strip or in the arena — Castle Doom's Doombot
   ability, and the seat targeting Pharaoh Rama-Tut into its ward 2. A probe deck
   is the way to reach the extra turn on purpose.
6. **The redaction gate and `DigUntil`'s reveal.** Kang Prime was cut because
   A3 cannot tell a real reveal of the opponent's library from a leak. Whether A3
   should admit `GameAction.reveal`'s window is a question for report 06 and
   `check-redaction.mjs`, with the five frames of evidence §D.3 as test data.
   Until then, rule 4 of **D108** keeps every such card out of an AI deck.
7. **The rest of report 11 §9 is not exposed:** the simulating AI
   (`AIOption.USE_HYBRID_SIMULATION` / `USE_FULL_SIMULATION`),
   `FPref.MATCH_AI_TIMEOUT`, and Forge's two "Random" profile entries. Each needs
   a decision of its own (**D107**).
8. ~~**CLAUDE.md does not describe match setup yet**~~ — **closed by the
   rebase onto `main`'s `23e26b3`** (2026-09-27): step 9e, ten-games' rows
   11–14, the lint rule, the new flags and the decisions are in CLAUDE.md, applied
   from the fix pass's prepared patch; the test counts and the gate's time
   followed once they were measured on the rebased tree. **Only in part**, as the
   verifier of the second rebase found: the patch's second and third hunks had
   lost the bridge example and the *Match setup* paragraph after the `play.sh`
   block. Both are in since the rebase onto `bf0392b` (evidence §R.4).
9. ~~**Decision numbers at merge.**~~ **Closed by the same rebase**: `main`
   landed D90–D94 and slice 4's D95–D101 first, as predicted, so this branch's
   four kept D102–D105 then. **Reopened and closed again by the rebase onto
   `bf0392b`**: the workshop landed on `main` with its own D102–D104 first, so
   these four are now **D105–D108** everywhere they are cited, and DECISIONS.md
   runs D1–D108 with no gap and no duplicate.
10. **The workshop has no facts for the villains** (found on the rebase onto
    `bf0392b`). The workshop's `catalog.json` takes a card's type line, cost and
    P/T only from face-up sightings in the committed `fixtures/games/`
    recordings, and none of them plays `decks/doom-legion.dck`, so 24 of its 27
    names are listed as *never face up* (only Aerial Doombot, Thriving Isle and
    Island have been seen, in other decks' games) and the pedestal can show none
    of its creatures. Follow-up 1's identity rows would be judged there, so
    committing one Doom Legion recording (a `--transport auto` game at a fixed
    seed, through `check-redaction.mjs`) and re-running
    `node tools/build-workshop-catalog.ts` comes first. The catalog itself was
    regenerated for the new deck file on the rebase, as the workshop's drift test
    requires (evidence §R.4).

---

## Engine and sets — Forge 2.0.14 stays; Reality Fracture waits for an official release (2026-09-27, D109–D112)

**Status: preparation only; committed on its branch, and on `main` since `aead79d`** —
worktree `/home/justin-a/code/mtg-table-t2h`, branch `engine-upgrade` (cut from
`754f504`, rebased onto `main`'s `a092d3a` on 2026-09-27: Tier 2 slice 4, the
workshop and match setup underneath it).
**Nothing about how the game runs changed**: `bridge/`, `config.json`,
`tools/check-forge.sh`, `tools/make-forge-home.sh`, `forge-home/custom-cards/`,
`docs/protocol.md` and `fixtures/` are identical to `main`, and
`var/forge/custom/cards/` still holds only D14's `a_i_m_scientists.txt`.
[`docs/research/14-engine-upgrade.md`](docs/research/14-engine-upgrade.md) is the
decision and the plan for the day;
[`docs/evidence/engine-upgrade.md`](docs/evidence/engine-upgrade.md) is what was
measured; report 08 §9 is the deck card by card. Decisions: **D109** (wait for an
official release), **D110** (the engine pin), **D111** (no hand-written card
scripts), **D112** (the draft FRA opponent).

The user played a Reality Fracture pre-release (Scryfall `fra`, released
2026-10-02; Forge edition `FRA`) and wants to play that pool against the AI here,
and to watch AI-vs-AI games with it. Forge 2.0.14, the engine we run, predates the
set: its `Reality Fracture.txt` lists 43 of the set's 461 entries.

### The standing rule

In the user's words, stated after this work had begun and overriding it: *"Let's
not break anything to force in the latest cards. I'm sure things will be available
through official channels soon enough, so no need to create unnecessary friction
and work for ourselves."* It is the rule for every new set, not only this one:

1. **Official releases only** (**D109**, **D110**). The engine is an asset of a
   tagged Card-Forge/forge release. Forge's rolling `daily-snapshots` build may be
   *measured* — in the session scratchpad or a throwaway home under `var/`,
   through `FORGE_JAR=` — but it is never named in `config.json`, never the target
   of a merged bridge change and never the engine of a committed recording.
2. **No development snapshot, early or otherwise.** A bridge port to a newer
   Forge waits as a patch file until an official release is adopted.
3. **No hand-scripted cards** (**D111**), and no overlay of a newer Forge's own
   scripts. A card the pinned engine lacks is absent until a release ships it;
   `forge-home/custom-cards/` keeps exactly D14's one file.
4. **No committed fixture re-recorded as a side effect.** An engine switch and a
   re-record are separate commits and separate decisions (report 14 §5.4).
5. **`~/forge` is never touched** — before, during or after a switch. A release
   is unpacked under `var/forge-engine/<version>/`, and the old engine is the
   rollback.

### What was measured

Two spikes (an overlay of the daily build's card scripts onto 2.0.14; the bridge
ported to the daily build), judged in report 14; the three deck audits were re-run
by the judge and reproduced exactly.

| engine | the user's 50 copies (40 main + 10 sideboard): ok / missing / broken | games |
|---|---|---|
| **Forge 2.0.14, as it runs** | **19 / 31 / 0** — the 17 basics, Woodwork Prodigy, Austere Command | not playable: Forge drops a missing card from the library silently |
| 2.0.14 + the daily's 249 FRA scripts as a user overlay | 47 / 0 / **3** — No Admittance (main), Hexhaven Battalion and Way of the Pyromancer (sideboard) use `ApiType.Empower`, which 2.0.14 does not have | the exact deck: **0 turns** at seeds 7, 8 and 9 (a card that cannot be built crashes zone preparation, sideboard included). Without the three: games finish, with 17 swallowed AI `NullPointerException`s in 10 games on the new haste statics |
| the daily `2.0.15-SNAPSHOT-09.27` (never adopted) | **50 / 0 / 0**, every card Forge's own script | 29 games, 0 exceptions, every frame log PASSes redaction; Forge has no AI logic for `Empower` |

Three findings beyond the cards:

- **Nothing in the deck is unscripted upstream.** "Three of the deck's cards are
  missing from the daily" was a lookup by file name: 249 of the set's scripts live
  under `upcoming/`, and 22 prepared cards' files carry both faces' names. No
  card needs writing by anyone but Forge.
- **The seam moved less than feared.** `IGuiGame`'s abstract set went from 37 to
  28 with no member added, and `IGameController.passPriority()` is gone. The port
  is two files (`WireGuiGame`, `RecordMatch`), +18 / −59 lines of code, and
  compiles only against the daily (5 errors on 2.0.14).
- **The daily changes more than cards.** It exposed a latent race in the bridge's
  M6 next-game lifecycle (a game born dead in 2 of 6 three-game sessions; 0 of 5
  on 2.0.14), and it orders `stats.cardIds` differently, which fails gate step 6
  on any machine and would force a re-record of `g1`. Same games otherwise: the
  same 1,651 events in `g1`, the same ten-games turn counts.

### What is prepared — read by nothing at runtime

| file | what it is |
|---|---|
| `decks/fra-rw-aggro.dck`, `decks/fra-rw-aggro.txt` | **the user's pool**: 40 main and 10 sideboard, checked line by line against the user's own list (`/mnt/e/jalir/Projects/Magic/fra-pool-red-white-aggro.md`, read-only). Every card `\|FRA` except Austere Command, `\|SPG` — the set's Special Guests reprint; `\|FRA` falls back silently to another printing. The `.txt` says in its header that the deck does not play on 2.0.14 |
| `docs/drafts/decks/fra-gb-leftovers.dck`, `docs/drafts/README.md` | **the draft AI opponent** (**D112**): the green-black "leftovers" deck the same notes propose, its 22 named cards plus 18 basics. Outside `decks/` on purpose, until the user accepts it |
| `tools/audit-deck.mjs`, `tools/audit-deck/AuditDeck.java` | per card of a `.dck`, on any jar: **ok**, **missing** or **broken**. Read-only (a throwaway Forge home under `var/audit-deck/`); needs `bridge/out`; negative-controlled (175 of 175 ok on `pacho-shield` and three probe decks) |
| `tools/javap-seam-diff.sh` | the 99 Forge classes `bridge/src` links (95 before match setup), `javap`-diffed between two jars; reproduces spike B's diff line for line. Read-only |
| `docs/research/patches/bridge-forge-2.0.15-snapshot-09.27.patch` | **the port, not applied**: the daily's identity (version, bytes, sha256) and the seam diff in its header. `git apply --check` passes; one-way |
| `docs/research/patches/javap-2.0.14-vs-2.0.15-snapshot-09.27.txt` | the seam the port answers to — the baseline a release's seam is diffed against |
| report 14, its evidence, report 08 §9 | the decision, the measurements, the deck card by card |

```bash
node tools/audit-deck.mjs decks/fra-rw-aggro.dck     # today: 19 ok, 31 missing, 0 broken, exit 1 -- correct
node tools/audit-deck.mjs decks/pacho-shield.dck decks/morph-probe.dck \
    decks/yield-probe.dck decks/sideboard-probe.dck    # the control: 175 ok, exit 0
./tools/javap-seam-diff.sh "$FORGE_JAR" <other.jar>   # read-only; under a second
```

**The gate with all of it present** is green on the unchanged engine: exit 0 in
727 s at `WSPORT=8678` (the preparation pass), and exit 0 in **729 s** at
`WSPORT=8676` (the documentation pass that wrote this section, `bridge/out` kept,
`var/check-all-engine-docs.log`): step 6 identical to `g1` (377 lines), 9c 10/10,
10g three games each played through (816, 1,118 and 1,830 frame-log lines, no
`OVER WITHOUT A gameOver STATE`), and step 13's `node --test` 807 / 799 pass /
0 fail / 8 skipped with vitest 91 / 91.

**Rebased onto `main`'s `a092d3a`** (2026-09-28; slice 4, the workshop and match
setup underneath, with the workshop's `catalog.json` regenerated for the FRA deck)
the gate is green again, from a deleted `bridge/out`: **exit 0 in 906 s** at
`WSPORT=8695` (`var/check-all-engine-upgrade.log`) — step 6 identical to `g1`
(377 lines), 9c 14/14 in 373 s, 10g's three games 816, 1,120 and 1,840
frame-log lines with no `OVER WITHOUT A gameOver STATE`, 9b's advisory the usual
three timing frames, and step 13's `node --test` 880 / 872 pass / 0 fail / 8
skipped with vitest 94 / 94 (870 + 94 standalone, the same as `main`: this branch
adds no test). The saved bridge port was refreshed onto `a092d3a`'s bridge (the
same changed lines; it applies, compiles against the snapshot with no warning,
passes the build's four self-tests there, and still fails on 2.0.14 with the same
five errors), and the seam baseline regenerated (99 classes).

### On the day an official release ships Reality Fracture — the checklist

Report 14 §0 is the list, with every command. In short: each step is its own
reviewable change on the switch's branch, merged only on a green gate (**D201**),
any failure **stops the switch**, and rollback is reverting `config.json` and the
patch.

**Before the day, on `main`:** follow-up 1 (the next-game race) must land before
any engine moves; follow-ups 2 and 3 (the gate) should.

1. **Is it the day?** A new tag on Card-Forge/forge's releases that is not
   `daily-snapshots`, whose `res/editions/Reality Fracture.txt` lists the full set
   (461 entries in the daily), and that loads it outside `upcoming/` — a release
   build skips that directory.
2. **Get it, pinned.** `tools/forge-engine.json` written by hand from the real
   release page; `tools/get-forge.sh` verifies bytes and sha256 into
   `var/forge-engine/<version>/` (both new on the day, **question 21**).
   `sha1sum` the `~/forge` jar and `~/.forge/decks/constructed/` first.
3. `FORGE_JAR=<release jar> ./tools/check-forge.sh`.
4. **Audit before any code changes:** both FRA decks (expect 90 ok) and the MSH +
   probe decks (expect 175 ok) against the release jar.
5. **Diff the seam** against the saved one: apply the patch if the release moved
   the way the daily did; re-port by the same method if it moved further; no
   patch if it did not move. `MtgTable`'s `of 37` becomes `of 28`.
6. **Point the repo at it:** a relative `forgeJar` plus `forgeJarSha256` and
   `forgeVersion` in `config.json`, `tools/config.sh` and `check-forge.sh` taught
   to resolve and assert them (new on the day); `make-forge-home.sh`;
   `bridge/build.sh`.
7. **The gate.** If the release behaves like the daily, step 6 fails on the
   `stats.cardIds` order and on nothing else; every other step passes. Re-recording
   `g1` (probably `g2` / `g3`) is a separate decision (**question 21**).
8. **Play**: the user's deck against the draft opponent (AI vs AI, recorded and
   checked by `check-redaction.mjs`), then a human seat — cast No Admittance first,
   the first Empower spell a human will have cast through the bridge. Read
   `player turns`, not just `MTGTABLE OK` (follow-up 4).
9. **Record it:** a DECISIONS entry for the switch, and D14's follow-up — retire
   the A.I.M. Scientists overlay (the daily's own script already dropped
   `K:Trample`) and with it `ALLOW_CUSTOM_CARDS_IN_DECKS_CONFORMANCE`, once the
   release's script is confirmed.

<a id="fu-engine"></a>

### Engine and sets follow-ups — fourteen, 2026-09-27 (2 and 3 closed by the gate-speed lane, 2026-09-28)

**Found while measuring, engine-independent, latent on 2.0.14 today.** None is
fixed here; each is its own small change on `main`.

1. **The M6 next-game race — a blocker for any engine switch.** Game N's late
   `finishGame` can land after game N+1's `openView` has reset `overEmitted`
   (`WireGuiGame.java:877`; `:816` before match setup), so game N+1 is born dead
   (`OVER WITHOUT A gameOver STATE`, a six-line frame log). 2 of 6 three-game
   sessions on the daily, 0 of 5 on 2.0.14 — but `main` has since seen it on
   2.0.14 under load: CLAUDE.md records slice 4's first gate run after its
   rebase onto the card library failing at step 10g when the `restartMatch()`
   game sent `over` 2 ms after its `hello_ok` with no `state` (a four-frame log),
   the same signature. Match setup's
   `7364bea` made `over` terminal under load; it did not touch this reset. The
   evidence gives two fixes — defer `nextGameDecision` until this
   game's `finishGame`, or key `finishGame` to a per-game generation — and
   choosing one is a DECISIONS entry (**question 19**).
2. ~~**Gate step 6 dies without its message.**~~ — **closed** by the hardening
   pass's **D113** (`tools/wire-drift.mjs` replaced `diff … | head -20`) and swept
   by the gate-speed lane (**D132**, 2026-09-28): no `| head`, `| tail` or
   early-exiting reader is left in a pipeline `check-all.sh` or `ten-games.sh`
   judges under `pipefail` (two latent ones were — 9e's and ten-games'
   `grep | grep -qv` UNIMPL test would have read FALSE on a log with the most
   UNIMPL lines), and a job that dies without its own message now gets a
   `check-all FAILED at step N` line anyway (**D130**). *Was:* `diff … | head -20`
   under `set -o pipefail` exited 141 on a diff longer than 20 lines, and `set -e`
   ended the gate before "FAILED at step 6" printed. Step 6 is also
   load-sensitive on 2.0.14 itself (the forwarder's 500 ms flush moves frame
   boundaries) — D113's six questions are what hold under load.
3. ~~**Step 10g does not assert that each game was played.**~~ — **closed** by the
   gate-speed lane (**D134**, 2026-09-28): each of its three logs must carry a
   `state` frame at turn 1 or later, and the step prints `OK: <gameId> was played:
   N state frames, up to turn T`. *Was:* it printed "OK: three games" over a game
   that died at birth; only `web/test/ws-log.test.ts` caught it, at step 13.
4. **`MtgTable` prints `MTGTABLE OK` and exits 0 on a 0-turn game** (a card crash
   at game start). Still true at `a092d3a`: match setup's `MtgTable`, now on
   `main`, checks only that the game reached `over`.
5. **`check-redaction.mjs` A10 raises a false alarm** when a counter-unless-pay
   prompt against the seat names a counterspell that is already public on the
   stack: `lastZoneOf` is filled from `players[].zones` and never from
   `stackCards`. Advisory (the file still PASSes); fix it with a negative control
   before FRA's counterspells make it routine.

**For the day, or after it.**

6. **Arena identity for the FRA creatures.** The main deck has 14 creature names
   (16 cards), the sideboard adds Ghalta, and the draft opponent thirteen more;
   `figures.json`, `traits.json` and `cues.json` are keyed by card name and know
   none of them. Of the fourteen, only Mabel, Valley Hero and Thalia, the Survivor
   (Soldiers) meet an existing subtype rung, and the colour rungs cover W and U
   only, so the red creatures stand as `creature/*`. Rows are art direction for
   after the release (card names verbatim from the wire, M7 Tier 2 convention 1),
   on slice 4's bodies (on `main` since `23e26b3`). Lands and Medic's Kitesail
   (Equipment) already fall to existing rungs. Since the rebase the workshop lists
   every card of `decks/fra-rw-aggro.dck` (its catalog reads every `decks/*.dck`),
   all 28 names with no corpus facts — `catalog.json`'s `missing`, `threeD: null` —
   the state 24 of Doom Legion's 27 names are in (match setup's follow-up 10).
7. **Card art and the card library.** *Half closed by the rebase:* since match
   setup `tools/fetch-art.ts` reads every `decks/*.dck`, and on `a092d3a` it
   resolved all 28 of `fra-rw-aggro.dck`'s names on Scryfall (27 in `fra`,
   Austere Command in `spg`; 91 entries across the twelve decks, 0 misses). The
   draft opponent is outside `decks/`, so its art waits until it is accepted (or
   `--deck` names it). `tools/card-library/` still indexes MSH and MSC only, so the
   dev card browser lists `fra-rw-aggro.dck` with its cards unresolved; a `fra`
   sync closes that.
8. **Prepare on the board.** Pyre Rhymer, Woodwork Prodigy and Whiplash Wordsmith
   have a castable spell face. 2.0.15's `CardView.hasPreparedSpell()` and a
   face-up card's spell face are not on the wire — hard rule 8 keeps
   `getAlternateState` inside the face-down `alt` block. The game plays; the board
   cannot say "prepared". A protocol amendment plus a hard-rule-8 review, never a
   port detail.
9. **`input.openZones`' `{hand}` hint does not arrive on 2.0.15** (the
   `tempShowZones` path is gone; the wire shape is unchanged). Deriving it again
   from `Snap`'s per-id zones would be a new decision.
10. **D14's retirement** (checklist step 9), once the release's A.I.M. Scientists
    is confirmed correct.
11. **Forge's to close, ours to re-check:** Forge has no AI logic for `Empower`
    (on the daily the AI cast No Admittance once in 11 recorded games and 0 times
    in 152 others), and Pyre Rhymer's Molten Tide text reads "additonal".

**At merge.**

12. **Two deck audits.** Match setup's `tools/check-deck.mjs` (a static pass,
    `Smoke`, and a Scryfall diff) and this branch's `tools/audit-deck.mjs`
    (per-card build checks on any jar) overlap: fold them, or give each one job.
    Both are hand tools; neither is in the gate. On `a092d3a` `check-deck.mjs
    decks/fra-rw-aggro.dck` **fails, by design** (**D109**): 17 of the main deck's
    20 names (22 of its 40 cards) have no script in 2.0.14, `Smoke`'s audit names
    the same 17 as dropped silently, the basics' `|FRA` is not in 2.0.14's
    `Reality Fracture.txt`, and Limited conformance rejects the deck — so
    `check-deck.mjs decks/*.dck` exits 1 until the release, and its header and
    `decks/README.md` say so (`var/check-deck-fra.log`).
13. **`decks/README.md` against the card library's test.** *Closed by the
    rebase.* Match setup added the README and changed the test to read only `.dck`
    and `.txt` (`7364bea`), so `fra-rw-aggro.txt` — a deck list under a `#`
    header — is parsed with nothing skipped and the README is not. This branch's
    two deck files are now rows in that README's table, with a section of their
    own.
14. **Numbers.** *Closed by the rebase onto `a092d3a`.* Match setup kept report
    08 §8 (its villains deck) and the FRA deck is **§9**; slice 4, the workshop and
    match setup landed as D95–D108, so **D109–D112 kept their numbers**; `main`'s
    open questions stop at 17, so 18–22 stand. The one collision it foresaw, the
    `hardening` branch also numbering from D109, was settled as DECISIONS.md's
    italic note above D109 said it would be: `hardening` landed second and
    renumbered its own D113–D115.

---

## The 2026-09-27 hardening pass — the small-defect backlog

**Status: done, verified once, fixed, and rebased onto `main`'s `aead79d`
(engine and sets)** on branch `hardening`. Built on `bf0392b` (the workshop's
tree) while match setup was open, rebased onto it with both sides' behaviour kept
(*The rebase*, below), then through its first verification round and a second
rebase (*Verification round 1*, below). Seven defects from the follow-up lists
above, each fixed at its cause, each with a test or gate assertion that fails
without the fix, and each negative control actually run.
`docs/evidence/hardening.md` is what was measured. **D113–D115** are its
decisions, numbered after the engine and sets' D109–D112: they were written as
D109–D111 and renumbered on the second rebase, as DECISIONS.md's note above D109
asks of whichever lands second. Protocol amendments **M45** and **M46**,
numbered after M44.

| # | Defect | Fix | Proved by |
|---|---|---|---|
| 1 | Gate step 6 exited 141 with no message under load, and failed a byte-strict diff on an identical game (slice 4 follow-up 13(b)) | **D113**. `tools/wire-drift.mjs` compares the non-state frames, the event stream, the phase walk, the final board, **every board cut at a turn, phase or outcome event** and **the stack on every id-set both files caught** (the last two since verification round 1: the first four compared no stack, `priority` or mid-game combat), prints its own verdict and exits 0 or 1. `STRICT_G1=1` is the old byte diff. 9b's multiset was measured and rejected: it fails the same loaded runs | seed 42 re-recorded with the JVM pinned to one core shared with 2/4/8 busy loops. 383/387/395 lines against 377: strict fails, the multiset fails, all six questions hold. `tools/wire-drift-selftest.mjs` (in step 6) has 18 cases: 5 re-partitions accepted, 12 drifts rejected, 5 of them (the stack reversed, a stack key renamed, `priority` nulled, a combat key renamed, no stack) accepted by the first version |
| 2 | 10g's restarted game ended at once (13(c)) | **D114** / **M45**. The cause was not a wait armed late. It was game n's late `finishGame()`, queued on the EDT by `FControlGameEventHandler` after `GameEventGameFinished`, landing on game n+1 once an instant `newGame` had restarted first. An early `newGame` is now queued and released from game n's own `GameEventGameFinished` | `MTGTABLE_HOLD_GAME_END_MS` holds the window open. With the queue disabled, game 2 ended at once (`OVER WITHOUT A gameOver STATE`) and `ws-auto-play` exited **8**, its new check. Fixed, both acts queue and release and all three games play in full. 10g runs held (2000 ms) and asserts it |
| 3 | `MtgTable` exited 0 when the engine crashed before turn 1 | **D115** / **M46**. `EngineCrash`, a default uncaught handler that chains, and a game-loop death ends the game (error `notice` + null `over`). The process exits 1 with the cause. `RecordMatch` closes its log the same way | `tools/check-engine-crash.sh` (gate step **12c** since the rebase, ~8 s): a scratch Forge home with a Depower that uses the 2.0.15 ApiType `Empower`. Pre-fix: MtgTable exit 0 after 65 s, RecordMatch's log stopped at `hello_ok` (9 assertions fail). Fixed: exit 1 in 4 s and 3 s, both logs end in `over` |
| 4 | The T-pose flash hidden, not fixed (slice 4 follow-up 8) | the stance holds on an action of its own, on the clip's `restTwin` (`FigureRig.restActions`, since verification round 1; first it was weight 1 on the shared action, which jumped at both ends of every attack and block cue) | `web/test/clip-lane.test.tsx`: a one-bone model with no `idle` (y 0.92/0.52/0.24/0.68/0.96 on `main`, not 0.2), and a stance → cue → stance walk with no jump (a 0.44 jump with weight 1). Measured on the shipped models: the largest joint jump at an attack cue's ends on the proportioned bodies, 0.61–0.66 body heights on `main`, 0.41–0.46 with weight 1, 0.03–0.05 now |
| 5 | `visibleShare` ignored the player plates (slice 4 follow-up 3) | `camera.ts`: `PLAYER_PLATES`, `underRect`, `visibleShareOnCanvas` (pure) | `camera.test.ts` recomputes every duelist share with both plates, and holds the rectangles to `styles.css`. Negative control: the plate alone hides exactly the 24 samples under it. **No view × aspect changed**: the opponent's plate ends at canvas y 126.0, inside `HUD_TOP_PX`. **On the rebase:** the plate is four one-line rows (a long `--ai-name` ellipsised, match setup's deck and profile on the life row), and the band is asserted; match setup's own plate fails the duelist threshold in 4 cells and is the negative control |
| 6 | `catalog.json` drift reached the gate only through a web test (workshop follow-up 17) | step **12b**: `build-workshop-catalog.ts --check` | mutation: a `cues.json` row for a non-creature deck card (Giant Growth) fails it, removing the row passes it |
| 7 | `@gltf-transform/cli` on a caret (slice 4 follow-up 9, Tier 2 follow-up 17) | exact `4.5.0`, and `overrides` for its meshoptimizer 1.2.0 and the three libraries | `npm ci`, then `npm ls`: every version is the one the lockfile recorded. **The rebuild itself was not run** (below) |

**Commands**

```bash
./tools/check-engine-crash.sh                                   # item 3's self-check, ~8 s, gate step 12c
node tools/wire-drift.mjs [--strict] fixtures/games/g1.jsonl var/check-all-record.jsonl
node tools/wire-drift-selftest.mjs                              # step 6 runs it
STRICT_G1=1 ./tools/check-all.sh                                # step 6 byte for byte, as before D113
MTGTABLE_HOLD_GAME_END_MS=2000 ./bridge/run.sh mtgtable.MtgTable --transport ws ...   # 10g's held window
node tools/build-workshop-catalog.ts --check                    # step 12b
```

<a id="fu-hardening"></a>

### 2026-09-27 hardening follow-ups — seven; 2, 5 and 6 closed on the rebase, 4 by verification round 1

1. **`figures.glb` was not rebuilt.** The pin makes the toolchain exact. Whether
   `node tools/build-figures.mjs` still reproduces 373,236 bytes needs the five
   CC0 archives in `var/assets/figures/`. None of them is on this machine, and
   downloading ~130 MB is the user's call (slice 4 follow-up 12).
2. ~~**`tools/check-engine-crash.sh` is not in the gate.**~~ — **closed on the
   rebase (2026-09-27)**, as decided on review: it is step **12c**, after 12b, and
   the gate requires all twenty of its assertions (about 8 s; it needs no
   `node_modules`, so it runs under `SKIP_WEB=1` and `SKIP_TEN=1`).
3. **An exception that kills a `Game-n` thread other than the game loop is
   only printed** (`THREAD DIED (not the game loop)`). If one ever strands a
   game, it still ends by timeout as before.
4. ~~**Item 4 has a visible side:** when the stance's clip and the cue's clip are
   the same action, the cue's own fade no longer shows.~~ — **closed by
   verification round 1 (2026-09-28)**, and it was wider than it said. Every
   model has an `idle`, so the weight-1 line prevented no T-pose on a shipped
   model. What it changed was every attack and block cue on every figure: it
   jumped from the stance's held frame (45% into `attack`, 60% into `block`) to
   the clip's first frame and back, 0.41–0.46 body heights in one frame on the
   proportioned bodies' attack (`main`'s blend toward idle frame 0 jumped 0.61–0.66).
   The fix is two actions: the stance holds on the clip's `restTwin`, a second
   action map built at commit, so the cue crossfades off the held pose and back
   (0.03–0.05; evidence §9.2, with the table for every model).
5. ~~**A long `--ai-name`, or a counters row,** would wrap the opponent's plate
   below the band.~~ — **closed on the rebase (2026-09-27)**, as decided on
   review (ellipsise the name) and for a reason the rebase found: match setup's plate
   was already below the band on every live game — its deck on a line of its
   own (101.4 px, ending 143.0) and its profile in the name row's tags, which
   wrapped the row on the AI's own turn (120.1 px, ending 161.7), both measured
   in Chromium — and in the shoulder view at 745 px, 16:10, it left 60% and 44%
   of the opponent's duelist visible against the test's 70%. The plate is now
   four one-line rows: the name ellipsised (whole in its `title`), the
   opponent's name row unwrappable, and the deck, the profile and any player
   counters on the life row. `camera.test.ts` asserts it ends inside the band
   (126.0 px, measured 125.95 with a 77-character name, a counter pair, poison
   and the `Experimental` profile) and fails without any of its seven one-line
   rules; the old plates are its negative controls. `arena-hud.test.tsx` holds
   the markup to four rows (six with match setup's plate).
6. ~~**The rebase onto `main` (`a092d3a`, match setup).**~~ — **done
   (2026-09-27)**; *The rebase*, below.
7. **Step 6 checks the stack's ORDER on one id-set.** Question 6 compares
   `stack` and `stackCards` on every id-set both recordings caught, but order
   only means something with two or more items. g1 has one such id-set, the
   three-item stack in turn 14's declare-attackers step. Every loaded
   re-recording caught it, but a load heavy enough to cut that frame
   differently would leave order unchecked for that run (the verdict would
   still be honest: it prints how many id-sets it compared). A second
   committed seed with more responses on the stack would widen it; that is a
   new fixture, so it is the user's call.

### The rebase onto match setup (`a092d3a`, 2026-09-27)

`WireGuiGame.java`, `MtgTable.java`, `RecordMatch.java` and
`tools/ws-auto-play.mjs` merged without a textual conflict, and were read for a
semantic one. **Both sides' post-`over` behaviour is kept**: match setup's
re-check of `overEmitted` under the log's monitor in `emit`, `logC2s` and the
ask path (once it is set only `over` is emitted; `emit` returns whether the
frame went out, and `gameOverStateEmitted` is set only when it did) sits beside
this pass's queued `newGame` (released from the game's own
`GameEventGameFinished`), the 10g hold, and the crash path — whose error
`notice` is emitted before `emitOver` sets the flag, so it is never one of the
dropped frames. The conflicts were all prose plus `check-all.sh`'s usage lines
and `docs/protocol.md`'s amendment list (M45–M46 above M44, newest first). No
decision was renumbered then (`main` stopped at D108; the second rebase, below,
renumbered them D113–D115). `web/src/workshop/catalog.json`
was already current: match setup regenerated it for `decks/doom-legion.dck`, and
this branch changes no deck and no `cues.json` row. Three things changed on the
rebase itself: step **12c**, the plate (follow-up 5 above), and `RecordMatch`'s
`emitOver` javadoc, which the crash method had separated from its method. The
gate from a deleted `bridge/out` at `WSPORT=8685`: **`check-all OK`, exit 0, 938.8
s**, at a load average of 5–10 — 9c's fourteen games in 379 s, 10g's two early
`newGame` acts queued and released, 12c's twenty assertions, and **881 / 873
pass / 0 fail / 8 skipped** `node --test` plus 96 vitest in step 13
(`var/check-all-hardening-rebased.log`,
evidence §8).

### Verification round 1, and the rebase onto engine and sets (`aead79d`, 2026-09-28)

The verifier re-ran every claim against `3e4acbd` and returned `passed: false`
on one major finding and five minors. All six are fixed, and none is left as a
follow-up. Evidence §9 has the numbers.

- **Major: step 6 compared no stack.** The four questions never looked at a
  mid-game board, and g1's final board has no stack and no combat. So the stack
  reversed, a stack key renamed, `priority` nulled and a combat key renamed
  (all mid-game) each passed. Two questions were added, the boundary boards and
  the stack by id-set, and each is invariant by construction. Both held on all
  four loaded re-recordings. The selftest has 18 cases, and the five new drifts
  pass the old tool and fail the new one. D113 is amended, with a dated note, to
  say what the first version understated. Follow-up 7 above is the one limit
  left.
- **The weight-1 line** was replaced by two actions per clip (follow-up 4
  above, closed).
- **`MTG_TABLE_CONFIG`**: `check-all.sh` and `scripts/play.sh` unset it, and
  `bridge/run.sh` names any other config on stderr.
- **The crash check's duration** is quoted as ~8 s everywhere, and the script
  prints its own time.
- **The catalog claim** now names what it proves: a row for a non-creature deck
  card.
- **The rebase onto `aead79d`.** The engine and sets had landed first with
  D109–D112, so this branch renumbered its own to D113–D115. It did this before
  rebasing, on its own tree, where every D109–D111 was its own (92 lines in
  16 files). The conflicts were prose only. `catalog.json` is current.

The gate ran from a deleted `bridge/out` at `WSPORT=8685`: **`check-all OK`,
exit 0, 940.5 s**, at a load average of about 9–16. Step 6's selftest was 18/18
and all six questions said `same`, byte for byte too. 9c's fourteen games took
384 s. In 10g, 2 early `newGame` acts were queued and released. 12c passed 20/20
in 6 s. Step 13 ran **881 / 873 pass / 0 fail / 8 skipped** `node --test` plus 97
vitest (`var/check-all-hardening-fix1.log`, evidence §9.7). 9b's advisory
reported 3 more `buttonCancel` acts and 4 more `input` frames under load, with
the same 233 `state` frames. After the gate, two seed-42 recordings on a loaded
core, with this bridge, said SAME to all six questions and DIFFERENT under
`--strict`. `~/forge` and `~/.forge` are unchanged.

---

## More villains — three more AI decks, and the smoke that plays them (2026-09-28, D116–D117)

**Status: built, measured and committed** on branch `more-villains` (a worktree
off `main`'s `a092d3a`). The user asked, on 2026-09-27, *"I'd also like to watch
AIs vs each other with my deck vs different decks so I can see how they play
it."* Decisions **D116** (the decks and the spec builder) and **D117** (the
smoke's spell count); `docs/evidence/more-villains.md` is what was run;
`decks/README.md` is what each deck is and how the AI plays it.

```bash
./scripts/play.sh --ai-deck decks/masters-of-evil.dck   # or hulk-family.dck, wakanda.dck
node tools/build-deck.ts --check                        # every AI deck is its spec's
./tools/deck-smoke.sh --jobs 4                          # 20 games, ~2.5 min; NOT in the gate
```

What it is:

- **Three decks**, 40 cards, 17 lands, MSH + MSC, each a colour pair and an
  archetype of its own: **Masters of Evil** (black-red villain aggro, 19
  Villains), **Hulk Family** (red-green gamma stompy, 22 creatures, red a splash)
  and **Wakanda** (green-white go-wide, 21 creatures). `config.json`'s default AI
  deck is still Doom Legion, and so is the gate's.
- **Every AI deck is a spec** (`decks/specs/*.json`, a reason per card), written
  into its `.dck` by `tools/build-deck.ts` through the local card library — which
  reproduces Doom Legion byte for byte — with `--check` and `--pool`, and a
  hermetic test (`web/test/deck-specs.test.ts`) that fails on a hand edit or on
  an AI deck with no spec.
- **`tools/check-deck.mjs`** warns on two more things an AI deck must not carry
  (a library reveal; a flavour-named print), and no longer calls Forge's
  `K:etbCounter` a keyword the printed card lacks. All three decks pass it with
  0 warnings, Scryfall pass included.
- **`tools/deck-smoke.sh`** — five `--transport auto` games per AI deck, each
  held to `over`, redaction, an attack and a spell count — ran **20 of 20** green
  on seeds 1–5, and 39 of 40 on seeds 1–10 (Doom Legion's seed 6 is the miss).
  It is **not** a gate step, on purpose (the gate is already 15–20 minutes).
- **The gate**, from a deleted `bridge/out` at `WSPORT=8700`: **923 s**, exit 0
  (`var/check-all-more-villains.log`); no step added.
- **Rebased onto the hardening pass** (`4d26637`, 2026-09-28), which had landed
  the engine and sets' D109–D112 and its own D113–D115 first: this lane's
  D109–D110 became **D116–D117**, its two open questions **23–24**, and
  `web/test/deck-specs.test.ts` now excludes both of the user's decks
  (`pacho-shield.dck` and the engine and sets' `fra-rw-aggro.dck`) from "every
  AI deck has a spec". `art.json` (15 decks, 158 names, 0 misses) and the
  workshop catalog were regenerated. The gate, from a deleted `bridge/out` at
  `WSPORT=8725`: **936 s**, exit 0 (`var/check-all-more-villains-train.log`);
  evidence §11.

<a id="fu-villains"></a>

### More villains follow-ups — ten, 2026-09-28

1. **The flat 8 spells (D117).** The brief asked for at least 8 AI spells a
   game; against the automated seat the AI wins in five to eleven of its turns
   at about one spell a turn, so 5 of 40 games reach 8. The smoke asserts
   `min(8, AI turns − 3)` and keeps the flat 8 behind `DECK_SMOKE_STRICT=1`.
   It comes back as the default the day the smoke has a seat that makes the
   game last — a blocking seat, or an AI-versus-AI transport — which is not this
   lane's to build. Question 24 below.
2. **Identity rows for the three decks** (as match setup's follow-up 1): none of
   the 67 new names has a row in `figures/traits.json`, `figures.json` or
   `cues/cues.json`; they stand on the subtype and archetype rungs.
3. **The workshop has no facts for them** (as match setup's follow-up 10): the
   catalog lists every new name as *never face up*, because no committed
   recording plays them. One committed game per deck, through
   `check-redaction.mjs`, then `node tools/build-workshop-catalog.ts`.
4. **A hand review of the ability lines**, report 08 §1-style, for the 67 new
   names. `check-deck.mjs --scryfall` diffed cost, type, P/T, keywords and Oracle
   text mechanically; nothing read the `A:` / `T:` / `S:` lines against Oracle.
5. **Doom Legion at seed 6**: 4 spells in 8 turns, under the floor, outside the
   default seeds. Dark Deed and Doctor Doom were cast in none of its ten smoke
   games — D108's watch on Dark Deed now has twenty more games without a cast.
6. **The top of the Hulk curve seldom arrives**: Hulk, Gamma Goliath and Red Hulk
   were cast in a probe and in earlier lists, not in the final list's fifteen
   games (the AI wins first). Worth watching against a real player.
7. **Pinning a print.** `build-deck.ts` writes `Name|SET` and lets Forge pick the
   print; a card whose every print is plain is fine, but it cannot pin a
   collector number (`Name|SET|[n]`) to dodge a flavour-named one. Fleecemane
   Lion was cut instead.
8. **`fixtures/cards/`** does not carry the new decks' cards (`make-fixture.ts`
   would add them on its next run; nothing reads them from there today, and
   whether the slice is committed at all is question 15).
9. **The smoke's advisory** cannot tell a land never drawn from a nonland never
   cast; it says so on the line. Reading the land list from the spec would fix
   it.
10. **Paths the smoke did not show reaching the seat**, each a prompt the new
    decks can raise for you: Klaw's "reveal cards from your hand" (it was cast in
    two games; the redaction gate passed, but nothing counted what the seat was
    asked), and the monarch passing to you when you deal combat damage to the AI while
    it holds it (Okoye, Mighty and Adored makes it the monarch).

---

## Spectating — watch two AIs play your deck (2026-09-28, D118–D122)

**Status: built, tested, documented and committed on branch `spectate`** (a
worktree cut from `main`'s `a092d3a`), **then rebased onto more villains'
`90b97bb`** (which sits on the hardening pass's `4d26637`, on `main`'s
`aead79d`) with both sides' behaviour kept (*The rebase*, at the end of this
section). The user's ask, verbatim: *"I'd also like
to watch AIs vs each other with my deck vs different decks so I can see how they
play it. With the animations, some of it should become more intuitive and just
generally more visually stimulating."* Protocol amendment **M47**; decisions
**D118–D122** — written as M45 and D109–D113 on the branch and renumbered on the
rebase, after the engine and sets' D109–D112, the hardening pass's D113–D115 and
M45–M46, and more villains' D116–D117, which land first; `docs/evidence/spectate.md`
is what was measured.

```bash
./scripts/spectate.sh                                   # your deck vs config.json's match.aiDeck, followed in the arena
./scripts/spectate.sh --seed 7 --seat 1                 # the same game from the other chair
./scripts/spectate.sh --ai-deck decks/morph-probe.dck --profile Cautious --ai-profile Reckless
./scripts/spectate.sh --no-follow                       # record first (~7 s), then replay
node tools/same-game.mjs a.jsonl b.jsonl                # two recordings of one seed: the same game?
```

What it is:

- **One command.** `scripts/spectate.sh` — check-forge, build, then
  `mtgtable.RecordMatch` with both seats AI (each on its own deck and Forge AI
  profile) in the background, and vite opening
  `/?replay=spectate/<name>.jsonl&follow=1#arena` at once. Defaults come from
  `config.json`'s `match` block, which is now read by the two commands a person
  types and still by nothing the gate runs (**D122**, amending **D106**).
- **The recorder** gained `--profile` (seat 0) and `--ai-profile`/`--profile2`
  (seat 1), tied to the DECK and never to `--seat`, validated before the engine
  boots and seated through `Bootstrap.createAiPlayer` (**D107**'s seam); `--match`
  (either profile flag implies it) to write M44's `hello_ok.match` plus the
  viewer's own `yourProfile` (**D119**); `--pace <ms>` to make the engine play at a
  watchable speed (**D120**); and `--ai-deck` as `--deck2`'s alias, as on
  `MtgTable`. A bare `RecordMatch` writes exactly what it did.
- **Follow mode** (**D118**): the page polls `/spectate/<name>.jsonl?from=<byte>`
  — a dev-server-only route over `var/spectate/` that answers complete lines
  only (**D122**) — from `web/src/transport/follow.ts`, and appends to a
  follow-mode `LogReplayTransport`, which plays each frame 600 ms after the
  recorder wrote it, keeps the recorder's gaps from the cursor after a pause, and
  jumps a page that joins late to the live edge. An `over` ends following; the
  replay controls remain.
- **One seat's eyes**: `--seat 0` sees your hand and the other seat's backs, as at
  the table; `--seat 1` is the other chair. No omniscient viewer (hard rule 8).
- **In the arena**: in the decision strip's place, *WATCHING <deck> (<profile>) ·
  seen from here vs <deck> (<profile>) · ● following* — every word from the
  handshake, through `matchupOf()` (which is `seatMatchOf()` per seat); the seat
  plates carry both profiles; no Concede button, because nobody sits at that
  table. The app bar says how far behind the recorder the page is.
- **The gate**: step **6b** (~20 s) records seed 5 paced from seat 0 and unpaced
  from seat 1 through the script itself, checks both handshakes and the header,
  and requires `tools/same-game.mjs` to call them the same game and a
  one-life-point mutant not. Step 6's value-level diff now compares the ids
  inside a `stats` event as a set (**D121**).

**The determinism finding** (evidence §D): one seed is one game — two runs, a
paced and an unpaced run, and a seat-0 and a seat-1 run all played the same game
event for event (seeds 5, 7 and 11). Two things are not the game and do move: the
ORDER of the ids inside a `stats` event, which follows HotSpot's identity hashes
and was reordered by a few `println`s added before `FModel.initialize` (11 of 14
seed-42 runs against 15 of 15 from `main`'s build — which is why step 6 compares
them as a set now); and, rarely, a frame boundary, because Forge's event forwarder
also flushes on a 500 ms wall clock (once in 41 seed-42 recordings on a loaded
desktop).

<a id="fu-spectate"></a>

### Spectating follow-ups — ten, 2026-09-28

1. **A live observer socket** — a read-only second client on the seated game's
   `WsTransport`, truly live, and the way to watch a HUMAN seat's game from
   another tab. Not built (**D118**): `WsTransport` is one client at a time by
   decision (**D25**), an observer needs its own viewer and so its own `Snap` pass
   per frame on the game thread, and `MtgTable` always seats a human — an AI-vs-AI
   session over the socket does not exist. Follow mode was the deliverable; this is
   the next step if "live" has to mean zero lag, or a human game is to be watched.
2. **The outcome cue speaks for the viewing seat.** A spectated game ends in
   *Victory* or *Defeat* from `--seat`'s side, and the players are `AI-Seat0` /
   `AI-Seat1` (their names are in every committed fixture's handshake, so renaming
   them is a wire change). A spectator's ending might name the winning deck.
3. **`Snap.sweepText` conceals a seat's own spell text when it says "surveils
   (1)"** — found comparing the two chairs of seed 11: *Hour of Defeat (42) -
   Destroy Agent Phil Coulson (30). AI-Seat1 surveils (1).* is `""` for the seat
   that cast it, because `(1)` reads as a card id and card 1 is in the other hand.
   Over-concealment, not a leak (report 06; the sweep's id heuristic).
4. **The director is one key away, not the default.** Spectating opens on the
   table view; **6** hands the camera to the auto director. A `?camera=director`
   URL flag (an arena change, D71's stored view) would let `spectate.sh` open on it.
5. **The pace is one number.** 600 ms after a frame that did something, 150 ms
   after a bare phase change, measured on a handful of games. A busy turn still
   runs the arena's cue queue a few steps (about two seconds) behind; a dwell
   scaled by the frame's own events (a combat longer than a land drop) is the next
   refinement, and the user's taste decides the number.
6. **Commit a Doom Legion recording.** Match setup's follow-up 10 (the workshop has
   no facts for the villains) could be closed by one `./scripts/spectate.sh
   --no-serve --no-follow --seed <n>` recording copied into `fixtures/games/` —
   from seat 1 it shows every villain face up — but committing a fixture is its own
   decision, and a recording there is served under `vite preview` too.
7. **No picker in the page.** Decks, profiles and the seed are chosen on the
   command line; starting a spectated game from the browser would need a launcher
   process the dev server does not have (the deferred "picker in the page").
8. **Reloading a followed page restarts following** at the live edge; `#cards` /
   `#workshop` and back does the same (the replay cursor map is not applied in
   follow mode). *Half closed 2026-09-28 by the story page (D128): switching
   between the page's own views — `#story`, the arena, the board, `#cards`,
   `#workshop` — puts a viewer who had PAUSED back on that frame, and one watching
   live back at the live edge; a reload still restarts at the live edge.*
9. **The page's clock and the bridge's are compared** (the live slot is `t` +
   600 ms). Sound on one machine — the only place the dev route exists — and a
   slot more than 5 s out is treated as a disagreeing clock; a remote page would
   need the lag measured from arrival instead.
10. **Spectate recordings are not in step 11's corpus sweep** — the script checks
    each one itself (and fails without a server if it does not pass), and the gate
    checks 6b's two. A `var/spectate/` sweep would re-check the user's own.

**The rebase** (2026-09-28, onto more villains' `90b97bb`, the `mtg-table-t2o`
worktree). Both sides' behaviour kept; what met:

- **Step 6.** The hardening pass had replaced the byte diff this branch taught
  to sort `stats` ids with `tools/wire-drift.mjs` (**D113**), whose event-stream
  question compared those ids in ORDER. D121's canonicalisation moved into
  wire-drift's own normalisation (both modes), and `tools/wire-drift-selftest.mjs`
  gained its two halves: every `stats` event's ids reversed is accepted by both
  modes, one id dropped is rejected by both (20 cases: 2 accepted, 5
  re-partitions, 13 drifts). Without the sort, the reversed copy is `DIFFERENT`.
  Step **6b** keeps its letter: the hardening pass lettered 12b and 12c, nothing
  else.
- **`RecordMatch`** carries both the hardening pass's crash path (**D115**: an
  error `notice` and a null `over`, exit 1) and this branch's pacing; a paced
  game's timeout still grows with `--pace`.
- **`scripts/spectate.sh` unsets `MTG_TABLE_CONFIG`**, as `scripts/play.sh` and
  the gate do since the hardening pass: it reads `config.json`'s `match` block,
  and the bridge must read the same file (`bridge/run.sh` honours the variable
  for `tools/check-engine-crash.sh` alone).
- **The arena's plate** is the hardening pass's four one-line rows, and the
  decision strip's "watching" line is this branch's; `arena-hud.test.tsx` holds
  both.
- More villains' three decks are spectatable like any other
  (`./scripts/spectate.sh --ai-deck decks/wakanda.dck`); the gate's 6b plays
  `tools/villain-deck.sh`'s deck, as 9e does.

The gate from a deleted `bridge/out` at `WSPORT=8730`: **916 s**, exit 0, 9c's
fourteen games 370 s, at a load average of 3–5 (`var/check-all-spectate-train.log`).
Step 6 said `SAME` (and byte for byte too, once sorted) — and the same fresh
recording compared WITHOUT the sort differs from `g1` in the event stream, at event
#1026, a `stats` event's id order: without the move above, this very run would
have failed step 6. 6b: `SAME GAME`, seat 0 paced (151 dwells; 4,023 ms of game
wall time, 2,464 ms of it asleep in the dwells — not engine time, as this line
once implied; polish-1) and seat 1 unpaced (1,630 ms), the mutant rejected. `npm --prefix web test` standalone is
**893 `node --test` + 98 vitest (7 files)** (more villains' 877 + 97, plus this
branch's 16 + 1); inside the gate **903 / 895 pass / 0 fail / 8 skipped** plus 98.

---

## The narrator — a frame log read back as a story (2026-09-28, D123)

**Status: built, gated and documented** on branch `narrate` (the worktree
`mtg-table-t2q`, off `main`'s `a092d3a`; rebased on 2026-09-28 onto the
`spectate` branch's `a5c8e39`, with the engine and sets, the hardening pass, more
villains and spectating underneath it — *Rebased onto spectating* below). The
user is learning Magic and wants to *see how they play it* when watching
AI-vs-AI recordings; `tools/narrate.mjs`
turns any per-seat frame log — an AI-vs-AI recording, a human-seat game, a
client's own log — into a turn-by-turn story, and `tools/narrate-selftest.mjs` is
its gate, run by `check-all.sh` as sub-step **12d** (about a second). Decision
**D123**; `docs/evidence/narrate.md` is what was measured, with a whole villain
game told this way; README's *Reading a game back* is how to use it.

```bash
node tools/narrate.mjs fixtures/games/g1.jsonl               # the whole story
node tools/narrate.mjs fixtures/games/g1.jsonl --turn 1-3    # a range; --turn 0 is before the game
node tools/narrate.mjs fixtures/games/g1.jsonl --summary     # per-seat totals, the winner, how
node tools/narrate.mjs fixtures/games/g1.jsonl --seat        # whose view the log is
node tools/narrate.mjs fixtures/games/g1.jsonl --json        # the facts, with card ids and names
node tools/narrate-selftest.mjs [--write-golden]             # the gate; regenerates fixtures/narrate/
```

What it is:

- **The events say what happened, the snapshots say what each id is.** One
  heading per turn, one line per step that had anything in it; passes, mana taps
  and P/T recomputes are left out. Mulligans and who goes first before turn 1;
  the winner and *how* (life, poison, an empty library, a concede, or M11's
  concede with no outcome) at the end; the seat's sideboarding when it answered a
  `sideboard` ask.
- **Hard rule 8 by construction** (D123): one face reader; every name from the
  event's own frame or the one before and never remembered; the latest view for
  everything but a zone move. Held by an oracle written apart from the narrator,
  over all 19 committed logs and every log the gate records: 67 ids concealed in
  every appearance, none named; no card name in `decks/*.dck` that a log never
  shows ever printed; every name backed by its two frames; five negative controls.
- **Client logs**: verbatim re-deliveries skipped by `seq`, gaps judged against
  the whole file and told only when the battlefield changed across them; 12d
  pairs each of step 10's client logs with the bridge's own log of the game and
  requires the client's story to tell no moment more often.
- **Golden files**: `fixtures/narrate/g1-turns-1-3.txt` and
  `fixtures/narrate/g1-summary.txt`, byte for byte.

<a id="fu-narrator"></a>

### The narrator's follow-ups — nine, 2026-09-28 (1 closed by the story page, 1 by polish-1)

1. ~~**A `#story` page in the web client**~~ — **done 2026-09-28** by the story
   page (*The story page*, below; D124–D128): a page of its own beside `#cards`
   and `#workshop`, not a drawer on the board, and the panel inside the arena is
   its own follow-up 1. What this item said when it was open:
   **A `#story` page in the web client** — the obvious next step, NOT built here.
   `narrate()` and `renderStory()` are pure functions of parsed frames; a page
   would run them over a `ReplayTransport`'s frames (the replay already has
   them), scroll with the replay cursor and highlight the turn on screen. It
   would be a new surface to hold to hard rule 8, so it wants its own tests over
   the corpus the way `render.test.tsx` holds the board — and a decision on
   whether it lives beside `#cards` and `#workshop` as a page of its own or as a
   drawer on the board.
2. **Commit one Doom Legion recording.** The by-names check has content only on a
   two-deck log (§8.3's own caveat), and the committed corpus has no game against
   the villain deck — the same gap as match setup's follow-up 10, and one
   recording would close both. The evidence's villain game is in `var/` and is
   not reproducible byte for byte (§8.7).
3. **The engine paths no committed log reaches**: poison, phasing and foretell
   (only the hand-written synthetic log), a change of control, a fizzle and a
   countered spell. Each is narrated by code no engine recording has driven.
4. **The seat's own decisions are not told** beyond mulligans, concedes and
   sideboarding. An `ask`'s prompt and the chosen options' labels would say *why*
   a card was chosen ("Human chooses Plains to search for"), but `ask.prompt` is a
   string `check-redaction.mjs` only warns on (report 06 §10, residual risk 3),
   so it would need the by-names check extended to prompts first.
5. **"gets +1/+1 until end of turn" is invisible.** A pump is only a `stats`
   event and a changed P/T in the next snapshot; the narrator could say *"Quake is
   now 4/4"* by diffing P/T, at the cost of noise on every static effect.
6. **`--json` is unversioned.** It is for other tools, and nothing reads it yet;
   give it a `v` the day a second consumer does.
7. **Coalescing hides the middle of a flush.** When a creature is damaged, dies
   and returns face down in one AI-vs-AI flush, the latest-view rule tells its
   combat as "a face-down card"'s (D123's known cost). A per-event snapshot is not
   on the wire and is not coming (§3.5); a human-seat recording, flushed at every
   input, has far fewer such frames.
8. **A multi-game client log** is narrated game by game (a new `gameId` starts a
   new story), but the corpus has no single file holding two games — the bridge
   and `ws-auto-play.mjs --games` both write one file per game (M38) — so that
   path is exercised by nothing but its own reading of the protocol.
9. ~~**The client/bridge pair check is one-directional**~~ **Closed by polish-1**
   (*Polish 1*, below): the check runs both ways. A moment the bridge's log tells
   more often than the client's fails unless its frame never reached the client
   — the client file does not hold that seq, and it lies before the client's
   first snapshot, inside a gap the client's own story counts, or after the last
   frame it holds — and control N6 (a skip rule that drops a real `state` the
   client holds) fails it, where the one-sided check found nothing. The original
   note: **The client/bridge pair check is one-directional** (the branch's verifier,
   2026-09-28, a minor). 12d fails a client log that tells a moment — a `(kind,
   seq, card ids)` triple — MORE often than the bridge's own log of that game
   (a re-delivery narrated twice), but not one that tells a moment LESS often, so
   a skip rule that dropped a real frame from a client's story would pass. The
   converse is not simply the same assertion turned round: a client legitimately
   misses what the bridge sent before it connected and what fell in a gap, so it
   would have to exempt the moments inside the gaps the client log itself
   announces. The verifier's other minor, an `EPIPE` stack trace when
   `narrate.mjs … | head` closed the pipe, was fixed on the rebase (stdout's
   `EPIPE` now exits 0).

### Rebased onto spectating — 2026-09-28

Rebased onto the `spectate` branch's `a5c8e39` (the engine and sets, the
hardening pass, more villains and spectating underneath it). Five files
conflicted, all prose or the gate script, and each kept both sides, the base's
first: CLAUDE.md, DECISIONS.md, PLAN.md, README.md and `tools/check-all.sh`.
What moved:

- **D109 became D123**, in every file that cites it (the engine and sets' D109
  is untouched), and DECISIONS.md runs D1–D123 with no gap and no duplicate.
- **Sub-step 12b became 12d**: the hardening pass had already lettered 12b (the
  workshop catalog) and 12c (the engine crash), so the narrator runs after both.
- **6b's two spectate recordings are in 12d's list**, and the story's opening
  line now names the viewing seat's own profile when the handshake carries
  `yourProfile` (amendment M47) — in a spectated game both seats are AIs. The
  `paceMs` header needed nothing: the narrator reads the session header's seat,
  seed and decks, and ignores what it does not use.
- **The `EPIPE` fix** above (follow-up 9's second half).

The gate from a deleted `bridge/out` at `WSPORT=8735`: **912 s**, exit 0, step 6
`SAME`, 6b `SAME GAME`, 9c's fourteen games 368 s, 12d **106 checks in 0.8 s**
over the 19 committed logs and the run's own 18 (6b's two among them, 87 facts
each), at a load average of 2–4 (`var/check-all-narrate-train.log`).
`npm --prefix web test` standalone is **893 `node --test` + 98 vitest (7 files)**
and inside the gate **903 / 895 pass / 0 fail / 8 skipped** plus 98 —
spectating's counts, because this branch touches nothing under `web/`.
`docs/evidence/narrate.md` §8.

---

## The story page — the narrator in the browser (2026-09-28, D124–D128)

**Status: built, gated and documented** on branch `story` (the worktree
`mtg-table-t2r`, off `main`'s `4408283`). The user is learning Magic and wants to
*see how the AIs play*; the arena shows it, and this is the other half — the same
game told in words, beside the replay's cursor. It closes the narrator's
follow-up 1. `docs/evidence/story.md` is what was measured; README's *The story
page — `#story`* and *Spectate* (`--story`) are how to use it; CLAUDE.md's *The
story page — the conventions D124–D128 added* are its rules. Its decisions were
written as D150–D154 in the lane's reserved range and are **D124–D128** since the
merge onto `4408283`, in every file that cites them; the verification pass's two
cheap minors were fixed with the renumbering (evidence §1's line count, and §5's
negative control, whose by-names half now finds a real deck card's name from the
decks alone).

```bash
npm --prefix web run dev            # then /?replay=games/g1.jsonl#story (☰ story in any replay's bar)
./scripts/spectate.sh --story       # a spectated game, followed live on the story page
node tools/narrate.mjs <log>        # the same narrator in a terminal (now a shell over web/src/story/narrate.ts)
node tools/story-shot.mjs --url 'http://127.0.0.1:5196/?replay=games/g1.jsonl#story' \
    --frame 208 --out var/story/story-g1.png          # a picture of it (headless; not in the gate)
```

What it is:

- **One narrator (D124).** `tools/narrate.mjs`'s narration moved whole into
  `web/src/story/narrate.ts` — erasable TypeScript, no import at all, which Node
  24 runs by type stripping — and the CLI keeps the file read and the flags.
  Every fact knows its `frameIndex`; `--json` strips it. Every CLI output over the
  corpus (19 logs × 7 modes), eight error paths and a spectated recording's five
  modes are byte for byte what they were; the selftest (12d) and its goldens pass
  unchanged.
- **A page over the replay (D125).** Lazy, the mode app unmounted, its own keymap
  (`story/keys.ts`), CSS in `styles.css`, pure `page.ts`, components in
  `hooks-order`'s scan. `main.tsx`'s `StoryReplay` loads the log through the
  replay app's own `useReplayLoad` and draws the same replay bar; the page is
  handed frames, the cursor, the folded state and four callbacks, and imports no
  transport. The column: one section per turn, a margin word per step, the moment
  on screen highlighted and kept in view, what comes after dimmed; at the head the
  `--summary` card; beside it the frame on screen (turn, step, life, card counts,
  the moment, the named cards' Scryfall images). Click a moment to go there;
  `←`/`→` moments, `↑`/`↓` turns, `,`/`.` frames, Space plays, `V`/`B` the arena
  and the board at this frame.
- **Re-told, never patched (D126).** Narration is ~4 ms for g1, so the page
  re-tells the held log as a followed one grows; with the future hidden (`S`, the
  default while following) it tells only `frames.slice(0, cursor)`, so the
  summary is the game so far.
- **Hard rule 8 (D127).** `web/test/story-render.test.tsx` renders `<Story/>` over
  every fixture at seven cursors, dimmed and hidden — 266 renderings, 16,225 marked
  names — against an oracle apart from the narrator: by ids, by backing, by the
  decks' names, hidden-means-hidden; a real deck card's name the log never shows,
  injected into an always-hidden stub, is caught by two checks (the by-names one
  from the decks alone), and with the flag kept is never printed.
- **One cursor (D128).** The story's `▣ arena` and the bar's `☰ story` leave at
  the frame on screen — for a finished replay through `replayCursors`, for a
  followed one through `followCursors` when the viewer had paused (watching live,
  the live edge is where they were). Spectating's follow-up 8 is closed for the
  page's own views; a reload still starts at the live edge.

<a id="fu-story"></a>

### The story page's follow-ups — nine, 2026-09-28 (1 closed by the undo race)

1. **A story panel INSIDE the arena** — not built here, because `web/src/arena/`
   is three visual lanes' desk this week. The mount point is
   `web/src/arena/Arena.tsx`, inside `<div className="arena__layer">` (the DOM
   sibling layer over the canvas), after `<ArtCredit … />` and before the
   `hotkeysOpen && <HotkeysOverlay …/>` line: a `StoryPanel` widget whose root
   class joins `web/test/liveness.test.ts`'s layer-widget table with a
   `pointer-events: auto` rule (M7 convention 6 — the layer is `none`). Its data
   is a new optional plain-data prop beside `follow` (`story?: { header, frames,
   total, cursor, onScrub } | null`, filled by `ReplayApp` from its transport),
   so the arena still imports no transport (M7 convention 1); the panel imports
   only `story/narrate.ts` and `story/page.ts` (pure) and renders
   `outlineGame`'s runs, which relaxes `story.test.ts`'s "nothing but `main.tsx`
   imports `story/`" for `arena/` — say so there. A key is a row in
   `web/src/keys.ts` (e.g. `N`), dispatched in `Arena.tsx` and inert on the board
   with a reason (D74's pattern). Where it sits is the arena's call: the right
   edge between the two seat plates is free at the table view, and anything at the
   far end is under the chrome (`camera.ts`'s `keepOutTop`, D100) — measure it.
2. **A live seat's story.** `#story` needs a `?replay=`; a live game's frames are
   in the WebSocket transport, which keeps no frame list. Either the transport
   keeps one (a memory cost for a long session) or the page reads the bridge's own
   `var/games/<gameId>/frames.jsonl` through a dev route like `/spectate/` (D122's
   rule: the dev server alone). A story of your own game while you play it is also
   a question of what it shows you mid-game — nothing the board does not.
3. **Reloading a followed story restarts at the live edge** (the cursor maps live
   as long as the page), as the arena does — spectating's follow-up 8's other half.
4. **Tokens have no image** (`art.json` is built from the decks; *Soldier Token*
   draws its name on a text frame). `tools/fetch-art.ts` could take the tokens the
   corpus shows, by the same Scryfall rules.
5. **A quoted name is not marked.** *"Uses S.H.I.E.L.D. Spy Kit: 'Attach to Aerial
   Doombot'"* marks the Spy Kit, not the Doombot inside the ability's words: the
   fact's refs are the source only. Marking it would need the target in the fact
   (`stack[].targetCardIds` is there for spells, not for every ability).
6. **One line per moment is long for a combat.** An AI-vs-AI flush can tell ten
   moments in one frame; the CLI joins a run into one wrapped paragraph, the page
   lists them. A compact mode (the CLI's paragraphs) is a toggle away if the list
   reads too long.
7. **The frame count is the replay's, not the story's.** The replay bar steps
   frames (inputs and notices included); `←`/`→` step moments. A scrubber marked
   with the turns (`storyViewOf`'s `turnStarts`) would make the bar speak the
   story's language.
8. **Measured in Node, not in the browser.** Narration's ~4 ms is Node 24's; the
   page's re-render per cursor step (a memoised column, one live turn redrawn) was
   not profiled. A 30-turn game in follow mode with the future dimmed is the case
   to time if it ever feels slow.
9. ~~**Seen in this branch's gate, not caused by it: `act: undo` can crash Forge's
   game loop.**~~ **Closed by the undo race (D136, amendment M48)**: `undo` and
   `useMana` are applied only while the engine is quiet on this seat and are
   otherwise refused with `notice {title:"Not now"}`, and gate step 10g now holds
   exactly this window open and asserts the refusal (*The undo race*, below). The
   original note: the first gate run (`var/check-all-story-run1.log`) failed at step
   **10g**: the automated client's `undo`, applied while the engine was paying a
   Thallid's cost, raced the game thread, and `MagicStack.clearUndoStack` threw
   `ArrayIndexOutOfBoundsException` inside `PhaseHandler.mainGameLoop` — an engine
   crash, so D115 closed the log with an error `notice` and a null `over`, and
   `ws-auto-play.mjs` reported "over with no `gameOver` state"
   (`var/check-all-story-run1-ws-3g.log` has the stack). M6's evidence (§4.3) saw
   the same race throw out of `undoLastAction()` itself, where `applyAct` caught
   it; this time the corrupted undo stack surfaced on the game thread. `bridge/` is
   untouched here; the re-run passed. The fix belongs to the bridge's desk — apply
   `undo` on the game thread, or only while the engine is parked (D39's predicate).

---

## Gate speed — `check-all.sh` in parallel (2026-09-28, D129–D135)

**Status: built, measured and documented** on branch `gate-speed` (the worktree
`mtg-table-t2s`, off `main`'s `4408283`, rebased onto the story page's
`0af97a9`). The gate had grown to 900–990 s; it
now runs its steps concurrently, **`GATE_JOBS`** at a time (default
`min(4, nproc/4)`, 4 here), and takes **242–258 s** at four and **151 s** at
eight from a deleted `bridge/out` (at merge, after the last edit to the script),
with every assertion where it was — and, since the merge, every job and every
ten-games row in a Forge home of its own. `GATE_JOBS=1` is
the serial gate. Decisions **D129–D135** (written as D160–D166 in the lane's
reserved range, renumbered at merge); `docs/evidence/gate-speed.md` is what was measured; CLAUDE.md's gate
paragraph and README's *Running it* say how to use it.

```bash
./tools/check-all.sh                              # GATE_JOBS = min(4, nproc/4)
GATE_JOBS=1 ./tools/check-all.sh                  # the serial gate: the old order and lines, then the table
GATE_JOBS=8 WSPORT=8770 ./tools/check-all.sh      # step 10 on 8770..8776
./tools/ten-games.sh --jobs 4                     # 9c standalone, four rows at a time (~2 min)
cat var/check-all/<run>/timing.txt                # a run's table; gate.log beside it
```

What it is:

- **A job table and a scheduler** (D129): 46 jobs in parallel mode — 6b split
  in three, 9c into fourteen rows (`ten-games.sh --run-row N`) and a report,
  step 10 into its seven servers, step 11 in two, step 13 into `npm run build`,
  vitest and `node --test` — each with its own log under
  `var/check-all/<run>/`, started when its dependencies have passed. The
  dependencies are the order that matters: lint and build first; 6 after 5; 9c's
  rows and 9e after Smoke; `node --test` after the step-10 logs it replays;
  step 11's fresh half and 12d after every recorder.
- **Step 10 on seven ports** (`WSPORT+0` .. `+6`) and **only `node --test`
  waiting for it** (D131).
- **A table and a serial log** (D130): a line per job start and end, the TIMING
  TABLE, `gate.log` in the serial order; a failure stops everything this gate
  started, prints the failed job's tail and a `check-all FAILED at step N` line
  even for a job that died without one, and exits 1. Nothing is retried (D135).
- **Three fixes found on the way**: no `| head`, `| tail` or early reader left in
  a judged pipeline — two UNIMPL checks would have read FALSE on a log with the
  most UNIMPL lines (**D132**); the preferences fingerprint is of files, because
  an empty `var/forge/preferences/` failed every fresh checkout's first
  ten-games row (**D133**); 10g asserts each game was played (**D134**) — which
  closes the engine-and-sets follow-ups 2 and 3.

Measured (evidence §2–§6): three `GATE_JOBS=4` runs back to back, **253.4,
253.5 and 253.6 s**, exit 0, at a load average of 9–16 beside other worktrees'
gates; **151.0 s** at `GATE_JOBS=8`, load 14–19; serially, `main`'s script **921 s** and `GATE_JOBS=1` **933 s**;
and the final run, from a deleted `bridge/out` at the default four and
`WSPORT=8790`, **274.4 s**, exit 0, at a load average of 5.8–18 beside other
lanes' work (`var/check-all-gate-speed.log`). No job failed in any parallel run;
an achievements file that a JVM's exit leaves empty — serially too — cost a
printed stack trace and nothing else (follow-up 1).
**At merge** (evidence §10): rebased onto the story page's `0af97a9`, D160–D166
renumbered D129–D135, the verifier's four minors fixed — the per-job Forge
homes among them, which close follow-up 1 for the gate — and, after the last
edit to `tools/check-all.sh`, from a deleted `bridge/out`: **242.3, 258.4 and
246.6 s** at `GATE_JOBS=4` (`WSPORT=8820`/`8830`/`8840`, load 2.5–12), **151.2 s**
at eight (`8850`, load 6–14) and **906.9 s** serially (`8860`), every one exit
0, 60 distinct Forge `userDir`s a run and no `SAXParseException` anywhere. A first
attempt at the second four-slot run failed at step 8 on an engine race that is
not the gate's (follow-up 8) and was run again.

<a id="fu-gate"></a>

### Gate speed follow-ups — eight, 2026-09-28 (1 closed at merge, 1 by the undo race, 1 by polish-1)

1. ~~**A JVM's exit can leave `var/forge/achievements/constructed.xml` EMPTY,
   serially too.**~~ **Closed at merge, for the gate**: every job — and every
   ten-games row — now boots Forge in a home of its own (D129's amendment), so no
   JVM the gate runs reads an achievements file another JVM saved, and the
   merge's five runs printed no `SAXParseException` anywhere (evidence §10).
   What stays open is Forge's and the bridge's, not the gate's: the save is
   still a truncate and a write, so a JVM that exits between them still leaves
   an empty file in its OWN home — harmless there, since nothing boots in it
   again — and `var/forge/` (a hand-run `MtgTable`, `scripts/play.sh`,
   `tools/deck-smoke.sh --jobs`) still shares one. The original note:
   **A JVM's exit can leave `var/forge/achievements/constructed.xml` EMPTY,
   serially too.** Forge saves the constructed achievements at a human seat's
   game end by a truncate and a write, and an `MtgTable` that exits between the
   two leaves 0 bytes (seen at the end of this lane's final run with no other JVM
   running, and in another worktree's serial gate the same hour). The next JVM
   that updates achievements prints a `SAXParseException` (caught inside Forge's
   `load()`) — one log in the `GATE_JOBS=8` run, four in the final run, every step
   green, no assertion reading it (evidence §3.2). Concurrency does not cause it;
   it only changes which JVM reads the empty file. What it can lose is the
   checkout's own achievement counters. The fix is in the bridge's exit path
   (let the game thread's save finish first), not the gate.
2. **10g is the critical path from about six slots up** — ~134–139 s, three
   games on `decks/yield-probe.dck` with the 2 s holds of D114, and it starts
   first. Splitting it would change what it proves (one socket, three games,
   `continueMatch` and `restartMatch`), so the floor at `GATE_JOBS ≥ 8` is ~150 s
   unless the step itself gets shorter.
3. **The default is conservative.** `GATE_JOBS=8` measured 151 s with eight
   ~1 GB JVMs beside other worktrees' work; four is what the brief asked for.
   Raising the default is the user's call (memory, and the other lanes).
4. ~~**`var/check-all/<run>/` is never pruned**~~ **Closed by polish-1**: the
   gate keeps the last `GATE_KEEP_RUNS` runs (default 20, the running one
   included), pruning the oldest as it starts; only directories named like a run
   id are touched (*Polish 1*, below). The original note: **`var/check-all/<run>/`
   is never pruned** — about 660 KB a run before the
   merge, and 4.1–4.2 MB since each job keeps its Forge home there (~140 KB for
   a home a JVM booted in, ~36 KB for an unused one; evidence §10).
5. **The serial gate's console merges stderr into stdout** (each job runs under
   `2>&1 | tee`), where the old script wrote `die` to stderr; a caller that
   split the two streams now reads everything on stdout. The bytes are the same.
6. **`tools/deck-smoke.sh` could be jobs now.** D117 kept its twenty games out
   of the gate because they cost ~10 minutes serially; as jobs of this pool they
   would cost ~100 slot-seconds, ~25 s of wall at four. Whether the decks belong
   in the gate is still D117's question.
7. **One gate per worktree, still.** Two gates in one checkout collide on
   `var/` paths (and `$TEN_GAMES_DIR`) exactly as before; two worktrees never
   did, as long as their `WSPORT` ranges (`WSPORT` .. `+6`) do not overlap.
8. ~~**An engine race at step 8, twice.**~~ **Closed by the undo race's deferred
   concede (D136)**, by its mechanism — the race is load-dependent and was not
   re-run into here. The stack is `Game-0` iterating `Game.getPlayers()` in
   `forEachCardInGame`; the concede ran `PlayerControllerHuman.concede()` on the
   EDT, whose `checkGameOverCondition` → `Game.onPlayerLost` removes the loser
   from that same `PlayerCollection` (read with `javap -c` on the pinned jar).
   Since D136 a concede that arrives while no input is up writes only
   `Player.concede()` — `setOutcome`, one field — and `Game-0` ends the game at
   its own next check, so nothing of ours mutates the list it walks; the
   undo-race gate runs print `CONCEDE DEFERRED … no input is up` at step 8 and
   end in `over` (`docs/evidence/undo-race.md` §8 and §10). The original note:
   **an engine race at step 8, twice** — the verifier's `GATE_JOBS=1` run (load
   13) and the merge's first attempt at its second `GATE_JOBS=4` run (load 9):
   the scripted console session's `q` conceded while Forge's game thread was
   still inside `GameAction.runPreOpeningHandActions`, and
   `Game.forEachCardInGame` threw a `ConcurrentModificationException` — D115's
   engine-crash path, so `MtgTable` failed the run correctly
   (`var/check-all/20260928-121706-3076795/08-console.log`,
   `var/check-all-gate-speed-merge-p2-failed-console.log`; evidence §3.3). Not
   retried by the gate (D135) and not the gate's: the same class as the story
   page's follow-up 9 (an `act: undo` racing the game thread), and probably
   older than it looks, because before D115 a game-thread exception after a
   concede still printed `MTGTABLE OK`. The fix belongs to the bridge's concede
   path — apply it only while the engine is parked (D39's predicate), deferring
   one typed ahead of that — and step 8 is its reproduction.

---

## The undo race — `undo` waits for a parked engine (2026-09-28, D136, amendment M48)

**Status: built, gated and documented**, committed on branch `undo-race`
(worktree `mtg-table-t2t`, off `main`'s `4408283`, rebased onto the gate-speed
lane's `6b35054` — *Rebased onto gate speed*, below). Decision **D136** was
written as D170 on the lane's instruction and renumbered at merge, after the
story page's D124–D128 and gate speed's D129–D135; protocol amendment **M48**
kept its number. `docs/evidence/undo-race.md` is what was measured.

**The defect.** `WireGuiGame.applyAct` applied `act: undo` on `mtg-table-EDT`
whenever it arrived. Forge's undo stack is a plain `java.util.Stack` that
`Game-0` walks every time it puts a non-undoable spell on the stack
(`MagicStack.add` → `recordUndoableActions` → `clearUndoStack`: a
`lastIndexOf`, then a `remove(int)`), and the one `state` that offers the undo
of a mana payment is flushed by the payment's `stop()` after it has removed the
input and just before it releases `Game-0` into exactly that walk. The story
branch's first gate run (step 10g) sent the undo on that state and `Game-0`
threw `ArrayIndexOutOfBoundsException` inside `PhaseHandler.mainGameLoop` — an
engine crash, a failed run (D115); M6's evidence §4.3 had seen the same race
throw on the EDT. `useMana` writes the mana pool from the EDT the same way.

**The fix, on the bridge's desk.** `undo` and `useMana` are applied only when
`ActGuard.whyNotNow` finds the engine quiet on this seat, read on the EDT just
before the write: live; no ask outstanding; an input up (D39's positive
predicate); the input generation the act arrived under (D22's stamp); no
`InputPayMana` activation on a worker; no OK/pass still with the engine; none of
our hops walking; no engine thread running. Otherwise `notice {level:"warn",
title:"Not now"}`, the reason on stderr, a count in the summary (`acts not now`),
and the engine untouched. **`concede` was found to race too** (the
natural-timing sweep, evidence §5: `Game-0` threw
`ConcurrentModificationException` walking the player list under the EDT's own
`checkGameOverCondition`), and it is never refused: from a running engine only
the seat's outcome is written and `Game-0`'s own state-based check ends the
game; the seat is asked nothing more, and if the engine parks here first the
rest of the concede is applied there. **No fourth hop** — D136 says why one
would have excluded nothing. Every other act goes through Forge's input protocol, or
writes only what desktop Forge writes from its own EDT; the evidence §3
classifies all sixteen of `applyAct`'s cases.

```bash
./tools/undo-race-repro.sh      # both halves, ~15 s: guarded refuses; the guard off writes under a held engine thread
MTGTABLE_HOLD_UNDO_WINDOW_MS=1500 ./bridge/run.sh mtgtable.MtgTable --transport ws --port 8642 \
    --seed 13 --deck decks/yield-probe.dck               # the held window, by hand
node tools/ws-auto-play.mjs --port 8642 --undo-race     # exit 0 = "Not now", 9 = applied (the race)
```

- **The reproduction** (deliverable 1): `MTGTABLE_HOLD_UNDO_WINDOW_MS` holds the
  game thread, spinning, at the first state of a game that offers an undo while
  no input is up, and `ws-auto-play --undo-race` sends `undo` on that state, so
  the act lands in the window every run. Guarded: refused, the undo stack
  untouched across the hold, client exit 0. `MTGTABLE_TEST_UNGUARDED_ACTS=1` (the
  negative control, the old code path): no notice, the undo stack **1 → 0 while
  the engine thread is held inside the engine**, client exit 9.
- **`bridge/build.sh`** runs a fifth self-test, `ActGuardSelfTest`: the decision
  table (each of the eight conditions refuses on its own, and removing any one
  from `ActGuard` fails its row — negative-controlled) and the thread-state
  reading on real threads.
- **The concede** in the same reproduction: the client concedes the moment it
  has its verdict, inside the held window, and the guarded run defers it
  (`concedes = 0 at once, 1 deferred`) where the negative control applies it at
  once; the natural-timing sweeps (evidence §5) are where it crashed and stopped.
- **Gate step 10g** holds the window (`MTGTABLE_HOLD_UNDO_WINDOW_MS=1000`),
  passes `--require-late-undo` (the late undo must draw "Not now") and asserts
  the server's `undo window` line; `undo`'s EFFECT (M6 convention 4) is proven by
  a second undo that floats one of the seat's own lands at priority and undoes
  it while the engine is parked. The M6 line's `undo 1` now counts undos
  APPLIED.

<a id="fu-undo"></a>

### The undo race's follow-ups — five, 2026-09-28 (1 closed at merge)

1. **The yield acts can start the mana-lost worker unmarked** (D136's residual).
   `setPhaseStop`, `yieldTo` and `setYield` can press OK through Forge's own
   `tryAutoPassNow()`, and D136's condition 6 marks only a direct OK/pass,
   because there it cannot tell a press from no press without refusing good
   undos until the next re-render. The gap is the microseconds before that worker
   enters the bridge (it reads `Localizer` and `ManaPool.hasBurn()`); an undo that
   begins in it can overlap the worker's first walk. Closing it wants a signal
   from Forge that `tryAutoPassNow` pressed, which the jar does not give.
2. **Clicks are not guarded against our own refresh walk.** An EDT click that
   makes Forge write input-owned state on the EDT (declaring an attacker, a
   target) can overlap a D39 refresh walk started a moment earlier. It is D39's
   own hazard, predating this lane; a lock is ruled out (D136's rejected
   alternatives: Guava's synchronised subscriber), so the fix, if one is wanted,
   is a refusal like this one or deferring the walk while an act is on the EDT.
   The same read of the jar found a sibling in D39's predicate itself: it counts
   an outstanding ask as "parked", but that ask's answer wakes its game thread
   from the transport thread, not the EDT (D136's condition 2), so a refresh
   walk can overlap a game thread that has just been answered. D39's walk and
   `Game-0` between `setInput` and parking (D136's condition 8) is a third.
3. **The real crash was not reproduced at natural timing here.** The held window
   reproduces the write under a running engine thread every run; the
   `ArrayIndexOutOfBoundsException` itself needs the EDT's `remove` to land
   between `Game-0`'s `lastIndexOf` and its `remove`, nanoseconds apart, and the
   thirty-seed natural-timing sweep in the evidence (§5) is its own count. The
   story run hit it at gate load.
4. ~~**The story branch's follow-up 9 closes with this lane.**~~ **Closed at
   merge**: the story page landed first, and its follow-up 9 is marked closed by
   D136 and points here. So is gate speed's follow-up 8, the scripted console
   concede at step 8 racing `Game-0` into a `ConcurrentModificationException` —
   the same class as this lane's concede sweep, closed by the deferred concede.
5. **Slice 4's follow-up 13(d) is not this defect.** It is the ask path's push
   order against `over` (`Transport.ask` pushes outside the log's monitor), and
   nothing here touches it; it stays open.

### Rebased onto gate speed — 2026-09-28

Rebased onto `main`'s `6b35054` (the story page and the gate-speed lane
underneath it). DECISIONS.md and PLAN.md conflicted, both prose, and kept both
sides, `main`'s first. `tools/check-all.sh` merged cleanly: 10g's three changes
(the held undo window, `--require-late-undo`, the `undo window` assertion) sit
in the `s10g_three` job, and the job table and scheduler did not change.
`bridge/build.sh` still runs five self-tests. What moved:

- **D170 became D136**, in every file that cites it; DECISIONS.md runs D1–D136
  with no gap and no duplicate.
  **M48 kept its number**, after spectating's M47.
- **The story page's follow-up 9 is closed** (this lane's follow-up 4).
- **Gate speed's follow-up 8 is closed by the deferred concede**, by mechanism:
  step 8's `q` arrives with no input up, so the EDT writes only the outcome and
  never removes the loser from the player list `Game-0` is iterating. All three
  merge runs took that path at step 8 (`CONCEDE DEFERRED`, then `CONCEDE
  COMPLETED`, `over` last). The race depends on load and was not forced.

Each gate ran from a deleted `bridge/out`, all exit 0: at `GATE_JOBS=4`
**238.6 s** (`WSPORT=8800`) and **242.0 s** (`8810`), with 10g's job 121.9 s and
121.7 s; serially **907.4 s** (`8820`), with 9c's fourteen games 371.2 s, at a
load average of 2–12 (`var/check-all-undo-race-merge-{p1,p2,s1}.log`). 10g's
late-undo assertions passed in every run (`lateUndo=not-now`, `undo window = 1
hold(s) … 1 refused, 0 applied`). `./tools/undo-race-repro.sh` passed 13 of 13,
and `npm --prefix web test` gave `main`'s counts (932 + 120 standalone). Evidence
§10.

---

## Polish 1 — the skeptics' nine minors (2026-09-28)

**Status: built, gated and documented** on branch `polish-1` (the worktree
`mtg-table-t2u`, off `main`'s `f6bad35`). Nine minors that the skeptics of the
undo race, the story page, the narrator, spectating and gate speed left behind,
each fixed with a test or a negative control that fails without the fix, or —
item 8, whose file belongs to another lane this week — written down here for the
merge pass to apply. No wire change, no new step and no new decision.
`docs/evidence/polish-1.md` is what was run.

1. **`ActGuard`'s wiring has a control** (the undo race's skeptic).
   `ActGuardSelfTest` held only `whyNotNow`'s table; which live read fed each of
   D136's eight conditions had no check, so a condition fed a constant or another
   condition's read passed every build. `ActGuard.facts(Feeds, genAtArrival)` now
   assembles the `Facts` from an `ActGuard.Feeds` — one method per read (the four
   `live` flags, `ReplyPool.pending()`, the input on the stack, the generation,
   `isActivatingManaAbility`, the OK/pass mark and the ask count, our hops, the
   engine threads) — and `WireGuiGame.engineFacts` is `facts(new GuardFeeds(c),
   gen)`, whose methods are one read apiece. The self-test drives `facts` with a
   fake: each feed turned busy on its own refuses with its condition's reason,
   a stale condition-6 mark does not, the input and the generation are read
   once, a terminated engine thread is pruned and a running one refuses. 39 → 74
   checks; eleven mis-wirings in a scratch copy of `ActGuard.java`, one at a
   time, each fail it. Hard rules 1–3 hold: the GUI is installed first and every
   thread is `HeadlessGuiBase`'s `mtg-table-bg`.
2. **10g holds both halves of the late undo** (the undo race's skeptic). The
   gate grepped only the server's `undo window` line; taking `--require-late-undo`
   off the client left 10g green, because the client sends the late undo in any
   `--comfort` run and the server still refuses it. 10g now also requires
   `undo(late)=ok` in the client's summary. Proven both ways: the flag removed
   fails the new grep; `MTGTABLE_HOLD_UNDO_WINDOW_MS` removed fails the server's
   (the client still said `undo(late)=ok` there — the late undo was refused
   naturally — so each half needs its own grep).
3. **The narrator's N1 finds the leak in `decks/*.dck` on its own** (the story
   page skeptic's finding, in the narrator's own control). N1 injected a made-up
   name and handed it to check 3 as an extra forbidden name; it now injects
   `Borough Backup` (a card of `decks/pacho-shield.dck` that `disjoint.jsonl`
   never shows) and hands check 3 nothing. With `DECK_NAMES` emptied, the new N1
   fails and the old one passed; with `faceOf()`'s `hidden` guard taken out, N2
   fails — checks 2, 3 (from the decks alone) and 4 all fire.
4. **The pair check runs both ways** (the narrator's follow-up 9, closed above).
   A client story that tells a moment less often than the bridge's own log fails
   unless its frame never reached the client (before its first snapshot, in a gap
   its story counts, or after it left) — or, for a moment told from the seat's own
   frames (a concede, a sideboard answer), unless the client log records no c2s
   frame at all (`tools/ws-smoke.mjs --log` writes only what it received; the
   first gate run found that on 10a, 10b and 10e). New control N6 (a skip rule
   that drops a real frame the client holds) fails it where the one-sided check
   found nothing; N5 now also asserts the first half fires; the cut-out client log
   sets its missed moments aside as a counted gap. 12d prints, per pair, how many
   moments were set aside and why.
5. **A 416 is `lost`, not `stalled`** (spectating's skeptic). The follower's
   status for a re-recorded file is `lost` (it stops polling for good);
   `main.tsx`'s `followWordOf` maps it to `lost`, the app bar's chip says
   *recording lost — …* with no live dot, `#story`'s tail says so, and the arena
   — whose `ArenaFollow` has no such word and is not this branch's to change — is
   handed none (`arenaFollowOf`), so its watching line drops "● following".
   `spectate.test.ts` evaluates `followWordOf` and `arenaFollowOf` from
   `main.tsx`'s own source for every `FollowStatus` (taking the `lost` case out
   fails it) and holds that a lost follower polls no more; `story-render.test.tsx`
   renders the tail.
6. **`tools/same-game.mjs` says what it set aside** (spectating's skeptic). Its
   header claimed two logs of one seat compare with nothing set aside; the
   projection is the same for every pair. The header now says so, the output
   prints what was set aside per log (and, for one seat's pair, that it was set
   aside anyway), and 6b asserts both lines.
7. **6b's paced run is 4,023 ms of game WALL time**, 2,464 ms of it the dwells —
   not engine time; `docs/evidence/spectate.md` and *Spectating* above corrected.
8. **The liveness clause for a `setTimeout` poll** (gate speed's skeptic): written
   as follow-up 1 below, not applied — `web/test/liveness.test.ts` belongs to the
   visual lanes this week.
9. **`var/check-all/<run>/` is pruned** (gate speed's follow-up 4, closed above):
   the last `GATE_KEEP_RUNS` (20) runs are kept, the oldest pruned as the gate
   starts; only directories named like a run id are touched, and the gate exits 2
   if its own run id stops matching that pattern (so a format change cannot turn
   the pruning off without a word). Shown on the first gate run below with 42
   seeded old runs; CLAUDE.md's gate paragraph says so.

```bash
./bridge/build.sh                               # ActGuardSelfTest: 74 checks (the wiring among them)
node tools/narrate-selftest.mjs                 # N1-N6; the pair check both ways
npm --prefix web test                           # spectate.test.ts: the follow word; story-render: the lost tail
GATE_KEEP_RUNS=50 ./tools/check-all.sh          # keep more runs than 20
```

**The gate**, each run from a deleted `bridge/out` at `GATE_JOBS=4`, both exit 0:
**243.0 s** at `WSPORT=8850` (46 jobs, 954.4 s summed, load 1.6–9.5; it printed
`keeping the last 20 runs under var/check-all/ (46 there, 26 pruned)` over 42
seeded old runs, and left `not-a-run/` alone) and **264.8 s** at `WSPORT=8860`
(1,004.5 s summed, load 9.0–18.6 with other lanes' work beside it; `21 there, 1
pruned`) — `var/check-all-polish-1-p{1,2}.log`. In both: `ActGuardSelfTest: 74
check(s)`, 10g's new `undo(late)=ok` line, 6b's two set-aside lines and its
same-seat line, 12d's 114 checks with every client/bridge pair held both ways,
and `node --test` **943 / 935 pass / 0 fail / 8 skipped** with vitest **120 (8
files)**. A rehearsal run before them (233.8 s,
`var/check-all-polish-1-p0-rehearsal.log`) failed at 12d, and that is item 4's
`own` rule: the first cut of the two-sided check read the receive-only ws-smoke
logs' missing concede as a dropped fact. Standalone: `./bridge/build.sh` (five
self-tests), `tools/undo-race-repro.sh` 13 of 13, `node
tools/narrate-selftest.mjs` 87 checks, `npm --prefix web test` **933 + 120**
(`main`'s 932 + 120, plus the follow-word test), `npm --prefix web run build`.
`~/forge` and `~/.forge` were fingerprinted before and after: unchanged.

<a id="fu-polish1"></a>

### Polish 1's follow-ups — four, 2026-09-28 (1 and 2 closed at the art-direction lanes' merge onto `a08c15f`)

1. ~~**For the merge pass: the arena's liveness clause misses a `setTimeout`
   poll.**~~ **Closed at the art-direction lanes' merge** (Lane BODIES applied
   it on its own branch from this text, and the three lanes' merge onto
   `a08c15f` kept it): liveness's follow-mode test runs the predicate below
   over the merged `web/src/arena/`, holds the ALLOWs to `art.ts`'s two
   one-shots (the idle callback and its Safari stand-in, each tagged `// ALLOW
   timer: <reason>`), and keeps the four probes and the spliced recursive poll
   as its negative controls. The request, for the record: spectating's clause in `web/test/liveness.test.ts` (*follow mode
   reaches the arena as a word*) bans `fetch(`, `setInterval(`, `new
   EventSource(`, `new WebSocket(` and `XMLHttpRequest` under `web/src/arena/`,
   but a recursive `setTimeout` — `const tick = () => { void load();
   setTimeout(tick, 500); }` — is a poll that passes it. No arena file calls
   `setTimeout` today (52 files, 0 lines). Replace the clause's loop with:

   ```ts
   /** A request, a connection, or a timer that can re-arm itself: how a poll is spelled. */
   const POLLS = /\bfetch\s*\(|\bset(?:Interval|Timeout)\s*\(|\brequestIdleCallback\s*\(|new\s+(?:EventSource|WebSocket)\s*\(|\bXMLHttpRequest\b/;
   /** A one-shot timer the arena genuinely needs carries its reason on its own line. */
   const ALLOW_TIMER = /\/\/ ALLOW timer: \S/;
   for (const file of arenaFiles()) {
     codeOf(file.source).split('\n').forEach((line, i) => {
       if (ALLOW_TIMER.test(line)) return;
       assert.ok(!POLLS.test(line),
         `${file.path}:${String(i + 1)} fetches, polls or opens a connection — how frames arrive is transport/'s business (D118)`);
     });
   }
   // The negative control: the shapes the old clause let through must be caught,
   // and a copy of a real arena file with a recursive poll spliced in must fail.
   for (const probe of [
     'const tick = () => { void load(); setTimeout(tick, 500); };',
     'function poll() { window.setTimeout(poll, 500); }',
     'globalThis.setTimeout (() => refresh(), 500);',
     'requestIdleCallback(function again() { requestIdleCallback(again); });',
   ]) assert.ok(POLLS.test(probe), `the poll clause misses: ${probe}`);
   const layerSrc = readFileSync(fileURLToPath(new URL('../src/arena/DecisionLayer.tsx', import.meta.url)), 'utf8');
   const spliced = `${codeOf(layerSrc)}\nconst tick = () => { void load(); setTimeout(tick, 500); };\ntick();\n`;
   assert.ok(spliced.split('\n').some((l) => !ALLOW_TIMER.test(l) && POLLS.test(l)), 'a spliced recursive poll passed');
   ```

   Before applying it, grep the three visual lanes' merged `web/src/arena/` for
   `setTimeout(` and `requestIdleCallback(`: each use is either a one-shot
   timer (put `// ALLOW timer: <reason>` on its line) or a poll (move it to
   `transport/`). The predicate was run offline over today's 52 arena files (no
   line rejected), the four probes (each rejected; the old regex missed all
   four) and the spliced file (rejected; the old regex passed it) —
   `docs/evidence/polish-1.md` §8. Its header comment should name
   `setTimeout` beside the others.
2. ~~**The arena's own `lost` word.**~~ **Closed at the art-direction lanes'
   merge onto `a08c15f`**, as written: `ArenaFollow` is `following | stalled |
   finished | lost`, `DecisionLayer`'s watching line says *recording lost —
   re-recorded under the same name; following stopped* with no dot and an
   `arena__watch-follow--lost` class (`--error`'s colour), `main.tsx` hands the
   arena `followWord` as it is and `arenaFollowOf` is gone, `spectate.test.ts`
   holds `ArenaFollow` to `FollowWord`'s four words, `liveness.test.ts` spells
   the new union, and `arena-hud.test.tsx` renders the lost line (no `●`, the
   matchup kept). The request, for the record: `ArenaFollow` (`arena/Arena.tsx`) is
   `following | stalled | finished`, and `liveness.test.ts` asserts that line;
   a lost follow reaches the arena as no word (`main.tsx`'s `arenaFollowOf`).
   On the arena's desk: add `lost` to `ArenaFollow` and to `DecisionLayer`'s
   `WatchLine` (*recording lost*, no dot, a `--lost` class), update the
   liveness assertion that spells `ArenaFollow`, and pass
   `followWord` straight through (drop `arenaFollowOf` and its test rows).
3. **`GuardFeeds` itself is read, not driven.** The self-test holds the
   assembly; `WireGuiGame.GuardFeeds`' twelve methods are one-line reads of
   the fields they are named after, and a wrong field there would pass it (a
   self-test that drove them would need a live `PlayerControllerHuman` and
   private hooks into `WireGuiGame`). End to end, `tools/undo-race-repro.sh`
   and 10g see conditions 3 and 8 fire in the held window every run.
4. **The pair check's "after it left" cannot tell leaving from a log that
   stopped being written.** A client log truncated at its end sets the missing
   moments aside as *after it left*, and says how many; nothing in the gate
   writes such a log, and the count is printed for every pair.

---

## Guards — the lint proves itself, counts the hops and reads `tools/` (2026-09-28, D180–D183)

**Status: built, gated and documented** on branch `guards` (the worktree
`mtg-table-t2w`, off `main`'s `b9af15d`). The structure review's second-ranked
change: the repo's mechanical guards were weaker than their prose. Four
decisions in the lane's reserved range, **D180–D183**; no wire change, no web
change. `docs/evidence/guards.md` is what was run.

1. **Two lint rules were dead, and now fire** (D180). `GameView.getDeck` and
   `GameView.getGame` searched for that literal text, which no call contains —
   `main`'s lint passed a file calling `gameView.getDeck(p)` and
   `view.getGame()` that compiles against the pinned jar. They now watch the
   type, as rule 4b does: every identifier declared `GameView`, `getGameView()`,
   `getView()`, a cast, `GameView::`. Nothing calls either, so no ALLOW.
2. **Every lint rule is proven to fire** (D180). A rule is one `ban` /
   `ban_except` / `rule` line and fails only through `lint_fail` (`LINT FAIL
   [<id>]`); `tools/lint-bridge.sh --list-rules` names the 31.
   `tools/lint-bridge-selftest.sh` reads that list and runs 60 cases — a snippet
   planted in a scratch copy of both trees under `var/lint-selftest/`, the lint
   required to fail with that rule's id and no other — plus five PASS cases, the
   real tree, and coverage both ways: **a rule with no case fails it**. About a
   second. `bridge/build.sh` runs it before the lint (`--quiet`), the gate as
   step **2b**, CI's `bridge` job before the lint. It caught a gap in this
   lane's own new cast pattern on its first run; four mutations of the lint
   (the dead patterns back, a rule with no case, a raw `LINT FAIL`, a rule
   behind an `if`) each fail it.
3. **The three game-thread hops are counted** (D181, hard rule 3). Rule
   `game-thread-hop` requires every `invokeInGameThread` in either tree to carry
   `// ALLOW hop: D<n> <method>` naming the method it sits in and a decision
   heading, and the set to be exactly `HOP_ALLOW`'s three (`captureOutcome` D39,
   `asyncAbilityMenu` D22, `refreshState` D39). A fourth hop fails the build
   even tagged. javap: `invokeInGameThread` is the only public way onto the
   `Game`-named pool, so `game-pool-reflection` bans the private routes, and
   `thread-builder` bans `Thread.ofPlatform()` / `ofVirtual()`, whose names
   section 6 cannot read.
4. **The lint reads `tools/**/*.java`, and the audit helper no longer risks the
   preferences file** (D182). Exemptions are repo-relative paths.
   `tools/audit-deck/AuditDeck.java` seated its two throwaway AIs with the
   two-argument `GamePlayerUtil.createAiPlayer`; with a planted
   `UI_CURRENT_AI_PROFILE=NoSuchProfile` that saved 8,045 bytes of preferences
   (D13's and D14's in-memory prefs among them) into the audit's home. It now
   goes through `Bootstrap.createAiPlayer(…, DEFAULT_AI_PROFILE)`, which touches
   nothing, and `tools/audit-deck.mjs` fingerprints the home's preferences before
   and after and exits 2 on a change (the old helper under it: exit 2). Verdicts
   unchanged: `pacho-shield` 40 ok, `fra-rw-aggro` 19 / 31 / 0.
5. **The AI decks are checked against their specs in the gate** (D183). Step
   **12e** runs `node tools/build-deck.ts --check`; it needs
   `var/cards/cards.sqlite`, fails without it (naming the build command), and
   `SKIP_DECKS=1` skips it and says so. It is **not in CI**: the index comes only
   from Scryfall's bulk file, and `fixtures/cards/` holds one to three of each AI
   deck's 24–27 names. CI's header says so; the hermetic half,
   `deck-specs.test.ts`, stays in CI's `web` job. What 12e adds: a `|MSH` →
   `|MSC` swap on an unpinned line passes the hermetic test and fails `--check`.

Also: `tools/README.md`, every script under `tools/` in one table (what it does,
in the gate?, needs the engine?); no script moved.

```bash
./tools/lint-bridge-selftest.sh             # every lint rule fires (step 2b; build.sh runs it --quiet)
./tools/lint-bridge.sh --list-rules         # the 31 rule ids
./tools/lint-bridge.sh --root <dir>         # lint another tree (the self-test's scratch copies)
node tools/build-deck.ts --check            # step 12e; needs var/cards/cards.sqlite
SKIP_DECKS=1 ./tools/check-all.sh           # a checkout with no card index: 12e skipped, and says so
```

**The gate**, each run from a deleted `bridge/out` at `GATE_JOBS=4`, all exit 0,
48 jobs (46 plus `02b-lintself` and `12e-decks`): **259.9 s** at `WSPORT=8960`
(1,006.2 s summed, load 4.8–12.4) and **249.1 s** at `WSPORT=8970` (968.1 s,
load 7.9–11.5), after a 257.0 s rehearsal at 8960, beside another lane's gate —
`var/check-all-guards-p{1,2}.log`. In each: the self-test's 73 checks twice
(2b and inside the build), the lint over 24 + 1 files and 31 rules, 12e's four
decks byte for byte, and `node --test` **943 / 935 pass / 0 fail / 8 skipped**
with vitest **120 (8 files)** — `main`'s counts. Standalone: `./bridge/build.sh`
(3.0 s from a deleted `bridge/out`, the self-test included), `npm --prefix web
test` **933 + 120**, the CI workflow's commands run locally in order (its YAML
parses), and `tools/audit-deck.mjs` on both decks with no preferences file
changed. `~/forge` and `~/.forge` were fingerprinted before and after:
unchanged.


<a id="fu-guards"></a>

### Guards follow-ups — six, 2026-09-28

1. **Every lane worktree needs a card index now, or `SKIP_DECKS=1`.** Only the
   main checkout has `var/cards/cards.sqlite`; the gate in any other worktree
   fails at 12e, with the command that builds one (a Scryfall download) or the
   flag. These runs used a read-only copy of the main checkout's index. Whether
   a missing index should instead skip 12e by default is the user's call; D183
   chose failing, after `SKIP_WEB`'s precedent.
2. **The lint is still a grep.** It cannot see a call split across lines
   (`gameView\n.getDeck(p)`), a receiver typed by `var` (no bridge file uses
   `var` today) or a `GameView` reached through an unnamed expression
   (`views.get(0).getGame()`), and 4b has the same limits. A lint over javac's
   own syntax trees — `com.sun.source` is in the JRE's `jdk.compiler` module —
   would type every receiver; it is a bigger job than this lane's.
3. **The self-test's snippets are text, not compiled code.** Only §1's probe
   was compiled. One javac pass over the planted files that are meant to be
   valid Java would prove each case is code the compiler accepts.
4. **`enclosing_method` needs a modifier.** A hop inside a method declared with
   none (package-private, no `static`) cannot be tagged — the lint fails closed
   and says the tag disagrees. Every method in `WireGuiGame` has one today.
5. **Forge's own hops are not counted.** `InputPassPriority`,
   `InputConfirmMulligan`, `InputBlock` and `GameAction` call
   `invokeInGameThread` inside the engine; that is Forge's input protocol, which
   D136 classifies act by act, and no grep of ours can see it.
6. ~~**CLAUDE.md's rule 10 still lists the banned accessors by hand.**~~
   **Closed by the docs block** (2026-09-28, its step 3): rule 10 points at
   `./tools/lint-bridge.sh --list-rules` and keeps only why each section of the
   lint exists. The item, for the record: The docs
   block should point at `tools/lint-bridge.sh --list-rules` instead of keeping
   a second copy of the list that can drift from the one that runs.

---

## Lane LOOK — the comic look, to production (2026-09-28, D137–D146)

**Done on branch `look`**, one of report 15's three art-direction lanes
(`docs/research/15-art-direction.md` §9.1), after the user judged the spike's
pictures beside their card art and approved the direction, **and rebased onto
the undo race's `f6bad35`** (2026-09-28, *At merge* below) — the first of the
three to land. It also carries the user's answer to **question 13**. Decisions
**D137–D146**, written as D120–D129 in the lane's reserved range and
renumbered contiguously at merge, where `main` had taken D120–D136 (**D146** and
the dated amendments to D139, D141, D142, D143 and D145 are the verification
pass's, below).
`docs/evidence/look.md` is what was measured; the pictures are in `var/look/png/`
(gitignored, local).

**What it is.** The arena's figures — every creature, dying body, duelist and
painted prop — are drawn in the **comic look** by default (**D137**): the costume
palette painted in three flat bands from one lens-fixed key (**D138**), halftone
in the core shadow, a specular dot, the card's colour as a shadow-side rim; an
ink line from a depth-edge effect inside bloom's own pass, the spike's inverted
hull deleted, and the floor rung shedding ink with bloom (**D139**); a contact
shadow as a pose layer in the disc field (**D140**); a mid-value stage in each
seat's shown colours, a backdrop and a combat burst (**D141**). The hologram
keeps the anonymous figure and the ghosted spell (**D142**). **A seat's own
figures face the opponent** (**D143**). The figure material gained a paint input
path — vertex colours and a texture, behind defines (**D144**) — and the look is
written at commit only, with `uMaterialize` as the frame loop's one look number
(**D145**).

```bash
npm --prefix web run dev                           # then:
#   /?replay=games/g1.jsonl#arena                  the comic look (the default)
#   /?replay=games/g1.jsonl&look=holo#arena        the hologram, as before
#   ?ink=none ?halftone=0 ?key=world ?stage=felt ?shadow=0   one part off each
#   /#workshop?card=Nick%20Fury%2C%20Spymaster     opens on "1× front"; the A/B:
#                                                  holo · comic, and the ink (with
#                                                  bloom) / halftone / shadow / stage /
#                                                  world-key toggles; "1× from your
#                                                  seat" is what the arena shows
#   ?ink=always                                    the ink without bloom (measurement)
node tools/arena-bench.mjs --index 316 --gpu gl    # and without --gpu for SwiftShader;
#                                                  append &look=holo to --url for the A/B
```

**The budget** (`g1.jsonl`@355, GTX 1080, dpr 1, one whole frame; the
verification pass's census, `var/look/fix1/census/`):

| | bloom | draw calls | triangles | programs cached | programs drawn | figure programs |
|---|---|---:|---:|---:|---:|---:|
| hologram (`main`'s, and `?look=holo`) | off | 79 | 27,416 | 13 | 8 | 1 |
| **comic (default)** — no composer, no ink (D146) | **off** | **81** | **27,540** | 14 | 10 | 1 |
| comic, `?ink=always` (a composer for the ink) | off | 82 | 27,541 | 25 | 10 | 1 |
| hologram | on | 96 | 27,433 | 25 | 8 | 1 |
| **comic (default)** | **on** | **98** | **27,557** | 28 | 10 | 1 |

The combat burst is +0 since the verification pass (painted into the ground's
texture); the production bench reads 81 against the hologram's 79 at 355 with
bloom off, where the first round read 82 with its burst mesh.

Report 13 §8.2's lines (≤ 90 calls, ≤ 30,000 triangles with bloom off) hold, and
so do report 15 §9.1's: ≤ +2 calls, ≤ +500 triangles, ≤ +2 programs with bloom
off, and the ink +0 with bloom. One program draws all 13 skinned meshes (11
figures and both duelists) under either look.

**Frame times after the verification pass** (`g1`@316, three production builds
interleaved — `c81f674`'s hologram, the first round's `49b183c` and this one; raw
output in `var/look/fix1/bench/`; the machine shared with other lanes' gates):

- **GTX 1080 p95, bloom off: 0.6 ms against the hologram's 0.6** in the quietest
  series (three rounds each, load 2.6–6, GPU idle; `exp-alpha/`), 0.8 against 1.4
  (medians) in a busier one. With bloom off the comic look draws no composer
  since **D146** — the first round's +1.65–2.4 ms is gone;
- **GTX 1080 p95, bloom on (the default): 1.6 against 1.2** (medians of three
  rounds; `gl316-quiet/`) — inside +1.5;
- **SwiftShader p50 at the 0.6 floor, bloom off: 19.0 against 17.0 (+2.0)**,
  medians of three rounds at a load of 11–15 — inside +3. The first round's
  bloom-off ink composer measured 27.5 in the same series.

**The first round's frame times** (before the verification pass; raw output in
`var/look/bench/`). Most of that day the machine was shared: other lanes'
gates put the load average at 3.5–16.7, and a PyTorch job held the GTX 1080 at
59–100 %. The two **quiet** series, run after the lane's gate with the GPU idle:

- **GTX 1080 p95, bloom on (the default): hologram 5.5 ms, comic 5.25** (median
  of 4 alternating rounds; +0.5 over all 13 runs of each) — inside the brief's
  +1.5;
- **GTX 1080 p95, bloom off: 2.0 against 3.65 (+1.65)**, just over the +1.5
  line. Here the comic look draws the ink's composer and the hologram draws none.
  The frame counts put the cost on the composer itself: any composer halves this
  headless path's unthrottled rate. Follow-up 9;
- **SwiftShader p50 at the 0.6 floor with the ink dropped** (what the floor rung
  leaves): **15.25 against 17.35 (+2.1)**, the median of 8 runs each — inside the
  brief's +3. The ink on at the floor costs +9.

**The bench found a defect the spike had** (fixed, **D139**):
`@react-three/postprocessing`'s `EffectComposer` rebuilt every pass whenever
`Post` re-rendered — every snapshot and every loop-mode change — and with the
ink's depth read that relinked a program mid-game: comic p95 35.5–39.1 ms against
the hologram's 8.5–10.3 on the GTX 1080. `Post` is `memo` and its children are memoised;
no program links during playback now, and a second, smaller one (the combat
burst's render-target variant on the first combat) is closed by `prime.ts`'s
`compileFor`, which primes for the target the frames are drawn into — the
composer's or the canvas — rather than for both (its first form cached every
primed program twice).

### The verification pass, round 1 (2026-09-28)

A verifier read the lane's pictures and numbers and found two majors and seven
minors. What changed, each in the lane's own files (**D146** and the dated
amendments):

- **No card is inked** (major). The ink inked every card edge that stands off the
  table — the hand, the stack, every hovering flier's card, the pedestal's. A
  painted figure now writes alpha 0 as the ink's mark and the ink draws only
  where a painted sample is among its five; the canvases are opaque. Still
  screenshots: 349 / 406 / 354 / 182 / 1,508 ink pixels on the card rectangles →
  0 (`var/look/png/fix1/cardink-*`).
- **Bloom off is the hologram's cost** (major): the ink rides bloom's composer
  only; `?ink=always` draws it without bloom for measurement.
- **Summoning sickness is half hologram** (report 15 §9.1 item 8, which the
  first round had deferred): `look.ts`'s `figureLookOf`, a pose, swept over the
  corpus (1,487 sick of 6,781 painted).
- **The combat burst is +0 draw calls**, painted into a second copy of the
  ground's light and swapped on the pose.
- **The workshop opens on `1× front`**, the figure's identifying side; `1× from
  your seat` is the arena's view.
- **The raster measures the comic look**: `prop-raster.ts`'s `comicVisibility`
  applies the ink's rule and counts the halftone's dots; the both-seats test holds
  every identity prop's PAINT (visible and not under the ink) at ≥ 48 px, with one
  recorded shortfall (follow-up 17). That measurement drove two changes to the
  line itself: its inner half is one pixel (`COMIC.inkInnerCssPx`) and a light
  burns through it.
- **Dark costumes keep their bands**: a dark paint's lit band is lifted, hue kept
  (`COMIC.darkLift`) — black is blue with blue highlights.
- **The rim's dots are finer** (7-px screen), CLAUDE.md's two stale passages
  point at D137 and D143, and the orphaned headless Chromium was closed.

`npm --prefix web test`: 887 `node --test` + 94 vitest, 0 failures. The gate from
a deleted `bridge/out` at `WSPORT=8710`: **exit 0, 932 s**
(`var/check-all-look-fix1.log`). `~/forge` and `~/.forge` unchanged.

### At merge (2026-09-28)

Rebased onto `main`'s `f6bad35` in the same worktree, as report 15's
art-direction merge pass asks, its first stage. The rebase replayed five
commits — report 15 and its spike (`c81f674`, which had never been on `main`)
and the lane's four — over what `main` gained since `a092d3a`: the hardening
pass, more villains, spectating, the narrator, the story page, gate speed and the
undo race.

- **Conflicts, each kept on both sides.** `scene/FigureLayer.tsx` (the hardening
  pass's two actions per clip, `restActions`, against the spike's hull and then
  its deletion: the rig keeps `restActions`, and the hull stays gone);
  `Arena.tsx` and `main.tsx` (spectating's `follow` prop and the look's
  `lookQuery` — both Arena mounts pass both); CLAUDE.md, DECISIONS.md and PLAN.md
  (the story page's section and the comic look's, both decision blocks, both
  plan sections). `liveness.test.ts`, `prop-raster.ts`, `workshop.test.ts`,
  `legibility.ts`, `figureRigs.ts` and README merged by themselves; before the
  renumbering below, every code file's diff against `main` was line for line the
  lane's own diff against `a092d3a`. `clip-lane.test.tsx`, the hardening pass's
  two-action test, passes, and names `FigureMaterial` from `figureMaterial.ts`
  now rather than the shim's `HoloMaterial` — part of follow-up 4.
- **Renumbered**: D120–D129 → **D137–D146**, in the order they were written, in
  every line the lane wrote (253 lines in 31 files — this file, CLAUDE.md,
  DECISIONS.md, README.md, `docs/evidence/look.md`, and comments and test names
  under `web/src/arena/`, `web/src/workshop/` and `web/test/`); `main`'s own
  D120–D129 untouched. DECISIONS.md holds D1–D146 once each, and each of the ten
  says both numbers.
- **The follow-ups.** None of the twenty-one is both in the lane's own files and
  under half an hour. Follow-up 11's first half came closest and was built, then
  taken back out (below, under 11); the others are edits owed by MOTION and
  BODIES (1–4, 17), the user's (20), measurements (18, 21) or limits of what was
  built. Follow-up 4's shim lost one importer at merge, as above.
- **Tests.** `npm --prefix web test`: **949 `node --test` + 120 vitest (8
  files)**, 0 failures — `main`'s 932 + 120 and the lane's 17.
- **Build.** The 2D entry chunk is **90.35 kB** gzip (`main`: 90.27) and carries
  no `three`; `arena-scene` 348.07 → 353.91, `Arena` 14.77 → 15.11, `Post`
  16.58 → 17.71, `Workshop` 23.31 → 24.39 (`main` built from `f6bad35`'s tree
  beside it).
- **Bench** (`g1`@316, the production build the gate wrote, three interleaved
  rounds against `&look=holo` on the same build, load 4.6–14): GTX 1080 p95
  with bloom on **1.3 against 0.9**, bloom off **0.5 against 0.5**; SwiftShader p50
  at the 0.6 floor, bloom off, **15.7 against 15.2** — all inside report 15's
  lines. At `g1`@355 with bloom off, **81 calls / 24,490 triangles** against
  79 / 24,368, as the verification pass read. `docs/evidence/look.md`, *At merge*.
- **Gate**, from a deleted `bridge/out` at `GATE_JOBS=4`, `WSPORT=8900`: **exit 0
  in 260.6 s**, 46 jobs (1,016.4 s of work), the load 4.7 at the start and 12.1
  at most; `node --test` 959 / 951 pass / 0 fail / 8 skipped plus 120 vitest, 6b
  `SAME GAME`, 10g's three games played (`var/check-all-look-merge.log`).
- `~/forge` and `~/.forge`: unchanged (the jar `3c0a7c38…8e5dd9`).

<a id="fu-look"></a>

### Lane LOOK follow-ups — twenty-one, 2026-09-28 (1 and 2 closed by Lane MOTION's merge, 17 by Lane BODIES')

Four are edits owed in files this lane does not own (1–4, and 17); four were
questions (5–8), three of them closed by the verification pass; the rest are
limits of what was measured or built.

1. ~~**MOTION — the summon's hologram-to-ink.**~~ **Closed by Lane MOTION at its
   merge** (**D148**, amended): `applyMaterialize` writes `uMaterialize` from
   `applyFigures` and names no `uLook`. The request, for the record: The figure material's
   `uMaterialize` (identity 1) is waiting. The edit, in `scene/CueRunner.tsx`'s
   `applyFigures`, beside the `uOpacity` write:
   `rig.material.uniforms.uMaterialize.value = offset.materialize;` (with
   `Offset.materialize` in `cues/stage.ts`, identity 1). Never `uLook`: the Lane
   LOOK liveness clause fails on it, by design.
2. ~~**MOTION — the death's ink draining back to hologram**~~ **Closed by Lane
   MOTION at its merge**: `DepartureField.bind` writes the dying card's
   `Offset.materialize` (the dissolve's 1 → 0) into `uMaterialize` beside its
   `uDrain` write. The request, for the record (report 15 §2.3): The
   departing body's frame loop is `DepartureField.bind` in `FigureLayer.tsx`
   (LOOK's file); the edit is one line beside its `uDrain` write,
   `uniforms.uMaterialize.value = 1 - departureDrain(t);`, if MOTION wants it.
3. **MOTION / BODIES — props have one look per KIND**, not per instance: a
   summoning figure's props are painted while its body is still a hologram. An
   `aLook` instanced attribute beside `aOpacity` would fix it (`props.ts`'s
   `addKind` and `bind`, and `propMaterial.ts`'s shader).
4. **BODIES — retire `holoMaterial.ts`.** `scene/models.ts` line 60 still imports
   `COSTUME_ATTRIBUTE` from `./holoMaterial.ts`; point it at
   `./figureMaterial.ts`, delete the shim, and drop the shim's assertion from
   `liveness.test.ts`'s Lane LOOK clause. (At merge the hardening pass's
   `clip-lane.test.tsx` was the other importer, of the `HoloMaterial` type; it
   names `FigureMaterial` now, so `models.ts` is the last.) A new prop kind (a
   `hair:*`, the `face`) picks a `PROP_LOOK` preset in `props.ts`'s `LOOKS` —
   `fabric` for hair.
5. ~~**Question: `sick` as half hologram?**~~ **Closed by the verification
   pass**: it is report 15 §9.1's item 8, so it is built (**D142**, amended). Its
   summoning ramp, when MOTION builds it (follow-up 1), multiplies the 0.5.
6. ~~**Question: ink on the cards?**~~ **Closed by the verification pass**
   (**D146**): the verifier read it as a defect, and it was one — no card, tile
   or table edge is inked now, with no extra target (the painted mark rides the
   colour buffer's alpha).
7. ~~**Question: the workshop's default camera.**~~ **Closed by the verification
   pass**: `1× front` is the default (**D143**, amended). From the far side the
   card is upside down — the truth of that view; follow-up 20.
8. **Question: the backdrop per seat.** Report 15 §4.2 imagined a city, a
   Helicarrier deck or a lab picked per seat; there is one skyline all round.
9. ~~**Bloom off on the GTX 1080 is +1.65 ms p95, just over report 15's +1.5.**~~
   **Closed by the verification pass (D146):** the ink rides bloom only, so bloom
   off draws no composer, and the comic look measured 0.6 ms p95 against the
   hologram's 0.6. What remains is the last sentence: a headed browser on the
   user's desktop and the integrated GPU are still unmeasured (follow-up 21).
   The first round's text, for the record:
   That is the quiet series: the GPU idle, load 3–5, 4 alternating rounds, 2.0
   against 3.65 ms. All 13 runs of each give +1.7. With bloom off the comic look
   draws the ink's composer and the hologram draws none, and on this headless
   ANGLE path any composer halves the unthrottled frame rate. Report 15 measured
   +0.1–0.2 ms on the same GPU the evening before, against a lower baseline. Bloom
   on, the default, is within noise (−0.25 quiet, +0.5 over all runs), and the
   governor's floor rung drops the ink with bloom. A headed browser on the
   user's desktop, and the user's integrated GPU (report 13 §13 question 3),
   decide whether the bloom-off line matters. If it does, the ink could stay off
   with bloom until a machine proves it can pay: one line in `Arena.tsx`.
10. **The raster counts paint, not contrast.** Since the verification pass it
    subtracts the ink (the shader's rule over the raster's depth) and counts the
    halftone's dots, printed per prop (4,868 of 93,399 visible identity pixels;
    the most on a one-sided detail is the tie's 6). It does not model colour: a
    dot darkens the prop and the body round it by the same factor, so their
    contrast ratio holds — argued, and the halftone is the only term left to
    argue.
11. **Shadows the stage does not show.** A figure standing ON its own card (a
    wrapped rank's back row) has its shadow under the card; a dying body casts
    none. *At merge* the first half was built — a second instanced pass after the
    cards, on the ground pass's material, with a corpus test over the 29 painted
    figures that stand on their cards (six frames of `g3` and `human-auto-2026`)
    — and taken back out, because a shadow drawn over the cards has to stay on
    its own card (D140 rejects darkening one), and a back-row stand is not always
    at its card's centre: `layout.ts`'s `placeStands` steps it away from a card
    that covers the centre, so it sits near that neighbour's edge (`g3`@271's
    Soldier token, 0.1 off centre, reached 0.428 against the card's half-width
    0.358). Done right, the pose carries how far its stand is from its own card's
    edge (a `layout.ts` helper beside `footprintContains`, one field in
    `figures/pose.ts`, BODIES' file) and the pass clamps to it. The dying body's
    half needs `DepartureField` to write into the shadow pass, whose count is
    committed before the departures are bound.
12. **The stage's colours come from what a seat has shown**, so a table starts
    teal and plum and changes when each seat shows its first coloured card (ten
    vertex colours at commit). Doom Legion (U/B) against Pacho (W/U) is a blue
    violet and a slate teal.
13. **Report 15 §4.2's rest** — fog, ambient motes, a comic panel border — is not
    built.
14. **The paint input path has no committed user.** It is checked in the
    browser (four variants compile and multiply); the first model to use it will
    be a personal-only Tier 3 one, if any (question 14, **D54**).
15. **The spike's `?ink=hull` URLs now draw the post line** (the hull is gone);
    report 15's `after-*-hull*.png` pictures are the only record of it.
16. **Under SwiftShader the governor reaches its floor later with the comic
    look** (with bloom on; since D146 bloom off has no composer to shed). The composer carries bloom AND the ink, so its frames are slower, each
    governor window takes longer to fill, and the rung below the floor fired
    inside the 5 s sample in every governed after-run (programs "29 → 32"),
    against two of five before-runs. The floor state it settles into is inside
    the budget (+1.9 ms p50). Dropping the ink one rung earlier than bloom would
    be a one-line change in `perf.ts`'s `postOnFloor` and `Arena.tsx`'s governor.
17. ~~**BODIES — Coulson's chest badge, seen from the front.**~~ **Closed by Lane
    BODIES at its merge**: 0.075, 58 px from the front after the ink, and the
    `SHORTFALL` row gone (the table is empty). The request, for the record: The
    raster's one recorded shortfall (`traits.test.ts`'s `SHORTFALL`, floor 44): 52 px on
    screen before any ink, 46 after the ink's one-pixel inner line, against the
    bar of 48. The edit, in `figures/props.ts` (BODIES' file):
    `badge.anchors.human[0].size` **0.065 → 0.075** (≈ 69 px by area). Then
    remove the `SHORTFALL` row — the test fails until you do. The verifier also
    read the back emblem (`human[1]`, 0.1, ≈ 200 px) as "an emblem, not a
    badge": 0.085 keeps it above 140 px.
18. **Aliasing.** The composer runs `multisampling={0}` (a SwiftShader cost,
    `Post.tsx`), so with bloom on every edge — the ink's included — is aliased at
    1×. Measure `multisampling={4}` on the GTX 1080 and under SwiftShader, or an
    FXAA / SMAA effect merged into the same `EffectPass` (+0 calls), before
    turning either on; the governor's floor rung would shed it with bloom.
19. **The raster's lights are optimistic.** It takes every pixel a light is drawn
    on as lifted past paper white (so un-inked); in the browser a dim light's
    edge can still take the line. `comicVisibility(…, { lightsInked: true })` is
    the pessimistic bound: the visor, the muzzle and the exhaust then fall under
    the bar from one seat each.
20. **The workshop's front view shows the card upside down** — the truth from
    the far side. *Faces its player* (the preview turn) shows the front with the
    card upright, and misstates the arena's facing.
21. **Headed and integrated-GPU measurements are still owed** (report 13 §13
    question 3): every number here is headless Chromium, SwiftShader or ANGLE on
    the GTX 1080.
    It was not made, because the brief asks for the ink and bloom to go
    together. Measure it on the integrated GPU first.

---

## The comic motion lane — report 15's Lane MOTION, 2026-09-28 (D147–D155)

**Status: built, tested, measured, documented and gated** (`check-all.sh` from a
deleted `bridge/out`, 929 s, exit 0, `var/check-all-motion.log`) on branch `motion` (worktree
`mtg-table-t2m`, from `c81f674` — `main` at `a092d3a` plus the art-direction report
and its `?look=comic` spike), **then verified once and fixed** (round 1, below;
the gate again from a deleted `bridge/out`, 872 s, exit 0, `var/check-all-motion-fix1.log`),
**and merged: rebased onto Lane LOOK's `4c76785`** (`main`'s `f6bad35` plus report
15 and LOOK's four commits, 2026-09-28; *At merge* below) — the second of report
15's three lanes to land. Decisions **D147–D155**, written as D130–D138 in the
lane's reserved range D130–D139 and renumbered contiguously at merge;
`docs/evidence/motion.md` is what was measured; README's *The comic motion lane* is
how to use it. Lanes LOOK and BODIES ran in parallel and own the files this lane
did not touch (report 15 §9.4); every change this lane needed in LOOK's was a
follow-up below, with its exact edit, and the merge made them (1 and 2).

```bash
npm --prefix web run dev     # then /#workshop?card=Nick%20Fury%2C%20Spymaster, or /?replay=games/g1.jsonl#arena
#   ?fx=classic   the film exactly as it was before the lane (default: comic)
#   ?twos=0       smooth motion (default: on twos; off under reduced motion)
```

What it is: impact stars on struck bodies (lettered POW on lethal damage), a
closed list of five words lettered on the stars for the headline cards' beats, an
ink splat under every creature that dies on the battlefield, halftone dots behind
a struck player's life and on Coulson's badge rings, speed lines (the one new
effect kind, `streak`; the pool 45 → 49) on every dash, the hologram inking in on
every arrival (`Offset.materialize`, visible under `?look=comic`), impact shakes
through `camera.ts`'s own shake, and every cue on twos. Comic FX and on twos are
both switches (URL, the arena's cue strip, the workshop's queue bar); with comic
FX off the cue engine's op log over all 19 committed recordings is identical to
`c81f674`'s (evidence). No new cue id, no new `synthetic.ts` frame (every beat
plays from an existing rehearsal — a workshop test holds it), `catalog.json`
current (no new card rows). The T-pose one-liner is the hardening branch's and was
not touched.

### Verification round 1 — what the verifier found, and what was done

Two majors and eight minors (`docs/evidence/motion.md` §V1 has the numbers and the
pictures):

- **An attacker's POW covered the attacker's own head** (major) — Peggy's hat and
  shield, Fury's head, at 250 and 420 ms of the attack. **Fixed (D154)**: a star at
  a `figure` anchor is pushed in SCREEN space beside the body (`Effect.aside`),
  toward the screen's centre from the card's rest slot, and drawn in front of it
  with the same footprint —
  clear of the head for an attacker, on the body's edge for a hit (which also
  answers "Coulson's lethal POW replaced his body"). `motion.test.ts` projects 345
  stars over `g1`@355/@359 from all five views: 0 over a head; centred, 345 of 345.
- **An allocation the loop's scan could not see** (major) — `burstTexture` built
  `burst:${word}` on every call. **Fixed**: the cache is keyed by the word, both
  lookups (`burstTexture`, `shapeTexture`) split from their drawing and added to the
  liveness clause, with the junk-line controls and the verifier's own control (an
  allocation in the hit path now fails).
- **The comic-off test proved less than its name** (minor). **Fixed**: the test
  pins the digest of the comic-off, twos-off film (310,369 ops, `3710d0b4…`, the
  pre-lane engine's) and is named for both switches.
- **The ink was drawn and uploaded mid-cue** (minor). **Fixed**: `EffectPool.prime`
  draws all eight ink textures at mount onto parked glow slots; a probe of the live
  arena shows all eight uploaded before the first cue.
- **Ownership** (minor): the three out-of-brief edits are named in the merge notes
  below.
- **The splat read as milk** (minor). **Fixed (D155)**: an ink body with a paper rim
  and a gloss.
- **Aimed words off-frame at the workshop's 1× close-up** (minor) — **skipped**, a
  workshop framing decision: follow-up 9, extended.
- **Leftover headless Chromium** (minor). **Done**: the verifier's (pid 2223266)
  closed over CDP `Browser.close`, the builder's (pid 1541916, whose CDP port had
  gone) stopped from inside the snap's own confinement (`snap run --shell chromium
  -c 'kill 1541916'` — a plain `kill` answers EACCES); `var/verify/profile-bench`
  deleted.
- **The summon is invisible under the default hologram** (minor) — by construction
  until the merge with LOOK: follow-up 2, which now ends in a re-shoot.

### Merge notes — the lane's edits outside report 15 §9.2's list

Three files the brief did not name, each deliberate and each small; reconcile them
on purpose at the merge rather than by whichever side lands second:

- **`web/src/arena/Arena.tsx`** (report 15 §9.1 gives it to LOOK): `motionFromSearch`
  read once, `comic` / `onTwos` passed into the `CueQueue`, and the cue strip's two
  checkboxes (*comic FX*, *on twos*). LOOK's merge of the same file keeps both
  halves — its look switch and these two.
- **`web/src/arena/camera.ts`'s director** (the brief says "only to call the existing
  shake"): `CameraRequest.key` and a per-key dedup of SHAKE-ONLY requests
  (`#lastShakeKey`), because a cue is a pure function of its `t` and re-asks on every
  frame of its impact window, which on a slow replay outlives the ≤ 300 ms shake.
  Moving the dedup into the cue would need the cue to know whether it has asked —
  state a cue does not keep — so it stays with the one object that already keeps
  the shake's clock. A request without a key behaves as before.
- **`web/src/arena/scene/figureRigs.ts`**: two optional fields, `lookHeld` /
  `lookWritten`, used only by `applyMaterialize`'s `uLook` fallback — deleted with it
  (follow-up 2). **Done at merge**: the file is LOOK's again, line for line.

`web/src/workshop/Workshop.tsx` carries the *on twos* switch the brief allows.

### At merge (2026-09-28)

Rebased onto Lane LOOK's merged tip `4c76785` in the same worktree — report 15's
art-direction merge pass, its second stage. The rebase replayed the lane's two
commits (`5a4f186`, `c492b0b`) over what `main` gained since `a092d3a` (the
hardening pass, more villains, spectating, the narrator, the story page, gate
speed, the undo race) and over report 15 and LOOK; the spike's own commit
(`c81f674`) was not replayed, LOOK having carried it as `3da33ac`.

- **Conflicts, each kept on both sides.** `Arena.tsx` (LOOK's `inkPass` with bloom
  and the lane's two switches), `liveness.test.ts` (LOOK's clause, then the lane's —
  each lane's one appended test), and CLAUDE.md, DECISIONS.md, PLAN.md and README
  (every side's sections). `CueRunner.tsx` (the hardening pass's two actions per
  clip, `restActions`), `effects.ts`, `camera.ts`, `figureRigs.ts`, `Workshop.tsx`
  and the tests merged by themselves; before the merge edits below, every code
  file's diff against `4c76785` was line for line the lane's own diff against
  `c81f674`.
- **Renumbered**: D130–D138 → **D147–D155**, in the order they were written, on
  every line the lane's commits wrote (145 lines in 23 files, read off the diff
  against `4c76785`, so `main`'s own D130–D136 and LOOK's D137–D146 are untouched);
  a code comment's "on branch `motion`" went with its old number, and each
  DECISIONS entry says both. DECISIONS.md holds D1–D155 once each.
- **LOOK's debts to this lane, paid** (LOOK's follow-ups 1 and 2, this lane's 1 and
  2): `applyMaterialize` writes `uMaterialize` and nothing else — the spike
  fallback, `MATERIALIZE_FLOOR` and `FigureRig.lookHeld` / `lookWritten` deleted —
  and `DepartureField.bind` (LOOK's `FigureLayer.tsx`, edited here — the merge pass
  lets a later stage edit an earlier one's files, and says so) writes the dying card's `materialize` into the falling
  body's `uMaterialize`, so its ink drains back to hologram before `uDrain` greys it
  (**D148**, amended). The per-frame `uMaterialize` write is a NUMBER the loop may
  write, as `uDrain` is; LOOK's liveness clause now says so where it is documented
  (edited here too), and the lane's clause holds the two writers and nothing else
  naming the uniform (negative-controlled). **The summon plays**: hologram → ink
  over every arrival's cue — to HALF ink, since an arrival is summoning-sick and
  LOOK draws `sick` half hologram (**D142**), the product LOOK's follow-up 5
  expected; follow-up 13 is the question that leaves.
- **The skeptic's cheap minor, taken: speed lines beside the body, never across its
  card** (**D147**, amended). A card moves with its figure's lunge, so the lines
  trailing straight back from the chest lay on the card's art at every step of every
  dash. The lines are two bands down the quad's edges, and the pool sizes and places
  the lane between them from the body's axis and the card's live corners, each
  carried along its own view ray onto the quad's plane. `motion.test.ts`'s new case
  holds it over every figure of `g1`@355/@359 from all five views at three instants:
  345 dashes, 0 bands on a card or a body (the lane's first geometry: 272 on the
  card). `effects.ts` and `CueRunner.tsx` are the lane's own files; `setFigures`
  gained one argument, the frame's layout.
- **Negative controls**: eleven one-line mutations in a scratch copy
  (`var/motion/merge/nc/`, `nc-results.txt`) — the reverse summon removed, the
  `uLook` write put back, a `uMaterialize` write in `DiscField.bind`, the lane not
  sized from the card, the corners measured along `across` instead of their view
  rays, the lane centred, the head and feet left out, an allocation in `#widen`, a
  key string in `#cardOf`, one band across the whole quad: ten failures, each in
  the suite named. The eleventh (the lines leading from the chest, not ahead of it)
  passes: it is a picture choice the test does not hold.
- **Tests**: `npm --prefix web test` **973 `node --test` + 120 vitest (8 files)**, 0
  failures — LOOK's 949, the lane's 23 and the merge's one. **Build**: the 2D entry
  chunk **90.36 kB** gzip (LOOK merged: 90.35), with no `three` and no lane code;
  `arena-scene` 353.91 → 360.06, `Arena` 15.11 → 15.40, `Workshop` 24.39 → 24.65,
  `Post` 17.71.
- **Bench** (`g1`@316, the production build, `vite preview`, `--settle 4000`,
  1920 × 993, bloom the app's default, load 0.8–5.7): **GTX 1080 p95 1.2 / 1.2 / 1.2
  ms comic against 1.2 / 1.1 / 1.1 classic** (`?fx=classic&twos=0`), p50 0.5, 0 of
  ~6,450 frames over 50 ms; **SwiftShader p50 15.6 / 15.6 / 15.6 against 15.7 /
  15.6 / 15.8**, the same 15 slow warm-up frames in every run of both. Bloom off on
  the GTX 1080: 79 draw calls and 24,362 triangles at the end frame in both.
  `var/motion/merge/bench/`.
- **Pictures** (headless Chromium on the GTX 1080, the dev server, the queue paused
  and stepped; the table view held by `director.noteUserInput` so no swoop takes
  it): `var/motion/merge/png/` — the evidence's merge section lists them.
- **Gate**, from a deleted `bridge/out` at `GATE_JOBS=4`, `WSPORT=8910`: **exit 0 in
  237.6 s**, 46 jobs (934.2 s of work), load 2.4 at the start and 6.0 at most;
  `node --test` 983 / 975 pass / 0 fail / 8 skipped plus 120 vitest, 6b `SAME
  GAME`, 10g's three games played (`var/check-all-motion-merge.log`).
- `~/forge` and `~/.forge`: unchanged (the jar `3c0a7c38…8e5dd9`).

<a id="fu-motion"></a>

### Comic motion lane follow-ups — fourteen, 2026-09-28; 1 and 2 closed at merge

1. ~~**The death's reverse summon has only its cue half**~~ **Closed at merge**
   (**D148**, amended): `DepartureField.bind` writes the offset's `materialize` into
   the falling body's `uMaterialize` (no floor — the handle needs none), and the
   ink drains back to hologram over the first half of the fall
   (`var/motion/merge/png/strip-ws-coulson-lethal-dies.png`). The request, for the
   record: (LOOK's
   `scene/FigureLayer.tsx`). `zone.dissolve` from the battlefield writes
   `materialize` 1 → 0 on the dying card; the departing body is drawn by
   `DepartureField`, which never reads it. The edit, against branch `look`'s
   `DepartureField.bind(source: OffsetSource, deaths)` (`7d91dcd`), once per shown
   entry beside its two `uniforms.uDrain.value = …` lines:
   `uniforms.uMaterialize.value = Math.max(0.001, source.offsetOf(entry.cardId).materialize);`
   — a number in the frame loop, the same kind as `uDrain`, into the handle LOOK's
   liveness clause already reserves for this lane (it names no `uLook`). Without it
   a body that dies stays inked while its card's cue drains; with it the ink drains
   to hologram over the first half of the fall, then `uDrain` greys it.
2. ~~**At the merge with LOOK, delete `applyMaterialize`'s fallback**~~ **Closed at
   merge**: deleted, with `MATERIALIZE_FLOOR` and the two rig fields; the liveness
   clause asserts the handle and no `uLook`; the summon re-shot under the merged
   look (`strip-ws-fury-front-enters.png`, `strip-arena-285-summon.png`). What it
   shows is follow-up 13. The request, for the record: **At the merge with LOOK,
   delete `applyMaterialize`'s fallback**
   (`scene/CueRunner.tsx`, this lane's; D148). LOOK's figure material binds
   `uMaterialize` (identity 1, shaded as `uLook * uMaterialize`), and
   `applyMaterialize` already writes that handle first whenever the material has
   it — so after the merge the code after its first `return` is dead. Delete from
   `// The spike material's fallback` to the end of the function, drop
   `FigureRig.lookHeld` / `lookWritten` (`scene/figureRigs.ts`) and
   `MATERIALIZE_FLOOR`, and cut the liveness clause's
   `uniforms\.uLook` / `look\.value = scaled` assertions to the handle's. LOOK's
   own clause ("`CueRunner.tsx` names no `uLook`") fails until this is done, which
   is the point: it is the only `uLook` in the file. **Then re-shoot the summon**
   under the merged look (the verification pass: under today's default hologram the
   summon is invisible by construction — `uLook` 0 × anything — and under
   `?look=comic` only a subtle change mid-entry was seen).
3. **A summoned figure's props do not ink in with it** (`scene/props.ts`, LOOK then
   BODIES). The prop field's `uLook` is per KIND, written at commit
   (`PropField.setLook`). A per-instance look would be an instance attribute in
   the prop shader; until then a summoning figure's props are inked while its body
   is still a hologram. Measure before building: one attribute per kind.
4. **The pedestal shows no camera shake** — by the workshop's convention
   (`PedestalDirector` drops every camera request: the pedestal's camera is yours).
   If the user wants to judge the jolt there, `workshop/Pedestal.tsx` could let a
   shake-only request (`request.frame.length === 0`) through to the base class's
   `request` and add `frame.shake` to the pedestal camera's position for its ≤ 300
   ms, restoring it after — a workshop decision, not this lane's.
5. **The lettering is the system's heaviest font** (`Impact`, `Arial Black`, else a
   900-weight sans). A comic lettering face (an OFL font such as Bangers, local,
   with a NOTICE row) would read more like the cards' — a download and a provenance
   row, so the user's call.
6. **Every star is POW yellow unless a row says otherwise.** Report 15 §7's
   art-derived accent (`paletteOf`, LOOK's or a later lane's) is the natural source
   for `burstColour` — a card's explosion orange, Coulson's teal — computed at
   commit, never per frame.
7. **The villain deck has no words** (match setup's follow-up 1). Doom Legion's
   cards stand on the defaults: stars, splats, dots and lines, no lettering. Rows
   in `cues.json` when their identity rows are written.
8. **The integrated GPU is still unmeasured** (report 13 §13 question 3). Every
   frame time in the evidence is SwiftShader or the GTX 1080 on a loaded machine;
   the lane's cost was not measurable against either's noise (comic and classic
   within run-to-run spread), which is a statement about those two rasterisers only.
9. **The workshop's 1× close-up crops an attacker's star** (`workshop/Pedestal.tsx`'s
   framing, the workshop's). The close-up frames the card at REST; a lunge carries
   the body up the frame toward the combat lane, and at the top of the dash its star
   (in front of the body at 0.78 of its height) is cut by the canvas's top edge —
   Fury's POW in `var/motion/png/after-fury-attack.png` is half out of frame, as his
   head already was in the before. The arena's table view shows whole stars
   (`after-table-g1-356-laser.png`, `after-table-g1-359-lethal.png`). If the close-up should hold a whole dash, it wants a framing that includes
   the combat anchor while a cue runs — the workshop's decision, not this lane's.
   **Since D154** an attacker's star sits beside its head rather than above it, so
   it is cut less, but the dash still carries the head toward the top edge. **The
   same framing hides every AIMED word** (the verification pass): Quake's KRAK and
   Wasp's ZZAK land beside the target dummy and the Doombot's ZZAK on the player,
   all off-frame at 1×, so the comic and classic close-ups there are identical;
   *table distance* shows them (`var/motion/fix1/png/ws-quake-table-*.png`,
   `ws-wasp-table-*.png`). The fix is `workshop/Workshop.tsx`'s: frame the dummy
   too (or switch to table distance) for a rehearsal whose `fiction` aims at it.
10. **A flier's splat is mostly under its own falling body at table distance**
   (`g1`@359, view 1: the Giant-Sized Flying Ant's ink shows as an edge and a rim
   beside its body, `var/motion/fix1/png/arena-v1-359-1480-comic.png`). The splat is
   on the ground under the stand point (`#groundOf`), where the ink would land, and
   the camera looks down past the hovering body onto it. Judge it again under LOOK's
   lighter stage before moving it; offsetting it toward the camera would be the
   renderer deciding where a body fell. *Judged again at merge*, on LOOK's stage
   (`crop-arena-359-1480-splat.png`): the same — an ink edge at the drained body's
   feet — so it stays where the ink would land.
11. **Every star is still one of five words on one yellow** (the verification pass's
   "still generic"; follow-ups 5 and 6 are the two halves). A sixth word, or a
   per-card star colour that the tint does not turn the red lettering brown, is a
   decision, not a tune: `burstColour` multiplies the whole star, words included.
12. **The workshop's rehearsals leave the pedestal in their AFTER state when
   auto-rest is off**, so a screenshot driver that plays *lethal* and then *dies*
   on one page gets an empty pedestal for the second (both the builder's and the
   verifier's `ws-coulson-lethal-200` shots were blank for this reason). The
   evidence driver now loads a fresh page per rehearsal; `__mtgWorkshop` could offer
   a `rest()` — the workshop's call.
13. **A summon swings from hologram to HALF ink, not to ink** (the merge's
   finding). Every creature arrives summoning-sick, LOOK draws `sick` at
   `COMIC.sickLook` (0.5, **D142**) and the product is the shader's, so the ramp
   ends at half; the figure is painted whole by the snapshot that says it can act,
   with no cue. At table distance the swing is modest
   (`strip-arena-285-summon.png`, the Doombot; the insect-bodied ant, which wears no
   costume, barely changes). Report 15 §2.3 imagined 0 → 1 and then the sick pose;
   that is a ramp overshooting identity — `materialize` up to 2, the shader
   clamping the product at 1, then settling to 1 — one line in `playMaterialize`,
   and it would read as "inked, then not yet able to act". A decision for the user,
   not a merge's (question 28).
14. **A high flier's speed lines stand wide.** The lane holds the body and its
   CARD from the camera that is looking, so a body flying well above its card
   (the Helicarrier's carrier, the Doombot) keeps its bands a card's projected
   width apart, and from a camera swoop low along the lane the near band can come
   close to the lens (`var/motion/merge/explore/arena-v1-356-330.png`). The card is
   still never crossed; whether a flier should clear its card at all, or only its
   body, is a look question for the next pictures.

---

## Lane BODIES — resting poses, hair, faces, coats that drape, and the art's own colours (art direction, 2026-09-28; D156–D165)

**Status: built, measured and committed on branch `bodies`, and rebased onto
Lane MOTION's merged tip `e2aee03` at merge** (*At merge*, below: the third of
report 15's lanes to land; the two majors the verifier's third round left open
are fixed there, and the art rung is drawn). The lane itself was built in the
worktree `mtg-table-t2n`, off `c81f674` — `main`'s `a092d3a` plus report 15 and
its `?look=comic` spike. This is report 15's **Lane BODIES** (§9.3), one of three
lanes built in parallel with **LOOK** (materials, ink, stage) and **MOTION**
(comic VFX). Until the merge it edited no file the other two own — `Arena.tsx` and
`workshop/Pedestal.tsx`, LOOK's, were byte-identical to the base again after the
third fix pass (**D164**) — and what it needed from them was written below as
follow-ups with the exact edit. Decisions **D156–D165** were
numbered D140–D149 in the lane's reserved range and renumbered contiguously at merge;
`docs/evidence/bodies.md` is what was measured, with the before and after
pictures under `var/bodies/`. The lane was cut off once by a usage limit and
resumed from its uncommitted tree; the resumed pass kept the work, split the
coat into a yoke and a body link, added the patched face, and did the
measurements, the docs and the gate. **A verifier's first round** found one
blocker and two majors, all fixed in the fix pass (evidence §7): the palette
plumbing had been written into `Arena.tsx` and `workshop/Pedestal.tsx`, which
are lane LOOK's — reverted, and written out as follow-up 13; the palette test
could not tell a missing gate — it now runs a hostile corpus and fails with any
gate removed; and the coat's calf-riding skirt drew a sliver, ribbons and a flap
— it now hangs from the pelvis (**D162**). **A verifier's second round** found
one blocker (an abandoned, uncommitted attempt at a further pass left the tree
failing a test — discarded, `var/bodies/fix3/abandoned-d147.diff`), five majors
and four minors, and read the pictures; the **second fix pass** (evidence §8)
cut the coat to the body and lined the cloth for the duelists' one-sided bake
(**D163**), switched the art rung on with the pass-through follow-up 13 wrote
out, proved not to collide with lane LOOK's branch (**D164**), and set every
face's jaw in grit while it kneels, attacks or blocks, gave Agent 13 the high
ready, re-aimed the poses a lens looking down misread, and re-cut the bob as hair
(**D165**). **A verifier's third round** found one blocker and seven minors and
read the pictures again; the **third fix pass** (evidence §9) reverted the
pass-through from LOOK's two files (the blocker — the verifier's first and third
rounds called it one, its second asked for the pixel; the lane rule decides, and
follow-up 13 carries the edit, so **the art rung is built, tested and dormant**
until the user or LOOK's merge says otherwise), made "a palette never paints a
costume" the code's rule and not the data's, cut the coat's yoke to the body and
bent the scientists' lean from the waist (the verifier's fan and ledge), gave
Quake the near-black hair her painting draws with cool lit locks and the pistol a
pistol's profile, and re-benched base and branch in interleaved pairs.

```bash
npm --prefix web run dev     # /#workshop?card=Nick%20Fury — the rest, hair, face and
                             # palette rows in the tuning panel; holo · comic in the toolbar
npm --prefix web run dev:arena   # g1.jsonl — frame 355 is the budget frame
```

What landed, in the brief's order of value:

1. **A signature resting pose per card** (**D156**). `figures/rests.ts` is a
   closed table of ten poses — each a frame of a library clip, a few joint aims
   and a breathing clip — derived at load into model variants
   (`agent@folded`). `traits.json`'s `rest`: Fury `folded`, Peggy `ready`,
   Coulson `clasped`, Quake `braced`, Agent 13 `highReady`, the scientists `working`,
   heroes `akimbo`, spies and soldiers `atEase`. Still a pose; still kneels when
   tapped.
   The second fix pass added **`highReady`** (Agent 13: the pistol up beside her
   face) and re-aimed `atEase`, `clasped` and `braced` for a lens that looks down
   (**D165**); the third bends `working` from the waist, so the coat leans with
   the scientist.
2. **Hair as shared kinds** (**D157**): the bodies' own two hairstyles carved off
   at load and baked as kinds, four procedural shells (`crop`, `bob`, `waves`,
   `bun`), one draw call per style on the table. **The pack was not downloaded**
   (follow-up 2). The bob is re-cut as hair — a swept fringe, open temples, lit
   locks (**D165**) — cool since the third fix pass, on Quake's near-black.
3. **A procedural comic face** (**D158**), 88 triangles, on every face-up person,
   and `facePatched` under Fury's eyepatch — **in grit** (`faceGrit`,
   `facePatchedGrit`) while the figure kneels, attacks or blocks (**D165**).
4. **Coats that drape** (**D159**, **D162**): `coat` is now the yoke,
   `coatTails` the coat's body (on the lowest spine joint) and its skirt (a
   two-link chain from the pelvis that follows each thigh part-way and hangs
   toward the upright), `cape` a cloak — Doom's, on the villain duelist. **Cut to
   the body** since the second fix pass — a finger's width off the hips, to just
   below the knee, open down the front — and **lined** for the duelists'
   one-sided bake (**D163**); its yoke **tapered** to meet the coat's body since
   the third (no step at the chest, no gap at the shoulder blades).
5. **The art's palette** (**D160**): k-means over each face-up card's own image,
   off the hot path, as the lowest rung — accent, tint, land tile, aura, never a
   costume (the code's rule since the third fix pass). **Built and tested in
   the lane, drawn since the merge** (**D164**): the pass-through that switches it
   on is in lane LOOK's `Arena.tsx` and `workshop/Pedestal.tsx`, so it was
   follow-up 13, written out; the second fix pass applied it, the third reverted
   it, and the merge applied it for good. The tuning panel shows the card's
   swatches and the tint and accent the pedestal draws with them.
6. **`figures.glb`'s budget** re-set to 450 KiB by measurement (**D161**), read
   by the build from the manifest.

What it costs, measured after the third fix pass (evidence §9.7, base and branch
benched in INTERLEAVED pairs): **+6 to +7 draw calls and ~1,950–2,050 triangles**
over the base — at `g1`@316 with bloom off on the GTX 1080, 84 calls and 26,193
triangles with 10 figures drawn (the base 77 and 24,240), at @355 85 and 26,417
(79 and 24,368), and 88 and 29,397 on a SwiftShader sample that drew 11 (the base
81 and 27,420). The seventh call is a face in grit beside a face at rest; the
third pass's +26 triangles are the pistol's new profile. Report 13 §8.2's lines
are 90 and 30,000; with lane LOOK's own budget (+2 calls, +500 triangles) the
worst sample projects to **90 and 29,897 — on the line**, so the next kind on the
table needs a measurement first. **The frame-time cost on SwiftShader is
unmeasured under load**: three interleaved pairs at a load average of 3.8–11.2
cross (p50 14.8–18.1 ms base, 15.7–18.8 branch), and the second pass's "+0.4 ms"
is withdrawn; on the GTX 1080 every p95 is ≤ 1.5 ms in both trees. The 2D entry
chunk is the base's size (87,413 B gzip) and carries no `three`; `arena-scene`
grows 8.2 kB gzip. `npm --prefix web test` is **889 `node --test` + 94 vitest**
(the base's 870). The gate ran green on the committed tree from a deleted
`bridge/out` at `WSPORT=8720`: **923 s**, exit 0, 9c's fourteen games 381 s
(`var/check-all-bodies-fix2.log`; the second fix pass's 877 s is
`var/check-all-bodies-fix1.log`, the first fix pass's 912 s
`var/check-all-bodies-fix1-round1.log`, the first cut's 893 s
`var/check-all-bodies.log`). `~/forge` and `~/.forge` are unchanged.

### At merge (2026-09-28)

Rebased onto Lane MOTION's merged tip `e2aee03` in the same worktree — `main`'s
`f6bad35`, report 15 and Lane LOOK's four commits and Lane MOTION's three — the
art-direction merge pass's third stage. The lane's three commits were replayed
with `git rebase --onto e2aee03 c81f674` (report 15's own commit was already
there, rebased by LOOK as `3da33ac`). The merge pass may edit any file the earlier
stages own, and says where it did: `Arena.tsx`, `workshop/Pedestal.tsx` and
`scene/FigureLayer.tsx` are Lane LOOK's.

- **Conflicts, each kept on both sides.** `scene/props.ts` (LOOK's prop-shader
  split into `propMaterial.ts` against the lane's new kinds: the split stays, and
  the kit's `LOOKS` table names a `PROP_LOOK` preset for each new kind — `cloth`
  for the coat's skirt and the cape, `fabric` for hair and the four faces, `metal`
  for the sidearm), `traits.test.ts` (LOOK's `comicVisibility` raster and one-sided
  jetpack beside the lane's details and `GENERIC` faces), `liveness.test.ts` (both
  lanes' appended clauses), CLAUDE.md, DECISIONS.md, PLAN.md and README.md (both
  sides' sections). `models.ts`, `Workshop.tsx`, `legibility.ts`, `styles.css` and
  the other tests merged by themselves.
- **Renumbered**: D140–D149 → **D156–D165**, in the order they were written, on
  every line the lane's three commits wrote and on no other — 308 citations in 29
  files, read line by line from `git blame`, because Lanes LOOK and MOTION use
  D140–D149 for their own decisions on every line they wrote (a blanket
  substitution would have renumbered theirs). DECISIONS.md holds D1–D165 once
  each, and each of the ten says both numbers.
- **The two majors the verifier's third round could not fix in the lane** (both
  lived in LOOK's files):
  - **A figure that mounts tapped kept its resting pose blended into the kneel**
    (follow-up 1). On the hardening pass's two-action clip model, `FigureLayer`'s
    `mountRestLane` starts the rest lane's idle (its `restTwin`) and returns it,
    and `newFigureRig` registers it as the clip lane's `rest` — so the first pass
    stops it and the stance plays alone, weights 0 and 1. `clip-lane.test.tsx`'s
    third case mounts a figure tapped, attacking and blocking through those two
    functions and asserts both weights and the bone; its negative control
    re-registers `rest: null` and sees the 50/50 blend, and reverting the fix in
    `newFigureRig` fails it (`crouch: the mount's resting pose is still running
    under the stance`).
  - **The art palette was inert** (follow-up 13). `Arena.tsx` and
    `workshop/Pedestal.tsx` carry the pass-through as written, the workshop's
    framing poses take the card's own palette (its preview memo went), and
    liveness wants the hook EXACTLY once in each and the map handed to both pose
    functions. `palette.test.ts`'s hostile corpus now has a case that only one
    gate stops for each gate — a named back (`back`), a named stub in a face-up slot
    (`isHidden`), and a new one, a face-up card with the face-down empty name and no
    `back` (the empty-name test) — plus its own control (a lookup missing one gate
    must leak over the same layouts). Removing each of the nine gates in
    `paletteNamesOf`, `paletteFor`, `tilePose` and `isTileCard` one at a time fails
    the hostile corpus test every time; the one survivor is `figurePose`'s
    `anonymous ? null :` in front of `paletteFor`, redundant by construction
    (`var/bodies/merge/palette-mutations.txt`).
- **Lane LOOK's follow-up 17 — closed**: Coulson's chest badge 0.065 → 0.075 (58 px
  from the front after the ink, from 46), and `traits.test.ts`'s `SHORTFALL` is
  empty (its count assertion now 0).
- **The eyepatch strap off Fury's bald crown — fixed** (**D157**, amended): a kit
  anchor for a bald head (`PropAnchor.bald`), the skull's own half-extents, and a
  strap pushed onto the head's ellipsoid (`onHeadSphere`), 0.3 of the unit head
  wide, under a patch of 0.42 — 27 px either side after the ink (a one-sided
  detail's half-bar is 24).
- **The polish lane's poll clause — applied** (its PLAN follow-up 1, read from the
  `polish-1` branch, not merged here): liveness's follow-mode test refuses
  `setTimeout(`, `setInterval(` and `requestIdleCallback(` under `web/src/arena/`
  unless the line says `// ALLOW timer: <reason>`, holds the ALLOWs to the art
  rung's two one-shots (and an ALLOW to a real timer), and keeps the lane's four
  probes and its spliced recursive poll as negative controls. `art.ts`'s idle
  runner now spells `requestIdleCallback(` out, so the clause can see it. When
  `polish-1` merges, its follow-up 1 is already done.
- **The merge's own fallout, measured and fixed.** **D143** turned the seats round
  and **D146**'s ink takes a small prop's edge, so the lane's raster and face bars
  were re-measured on Lane LOOK's seats: the face bars restated (**D158**,
  amended — every face the arena shows is on the far seat now, 2–10 px, and the
  workshop's `1× front` is where one is seen close, 42–118 px); Peggy's shield, the
  Agents' parted hair and Wasp's bob become details with partners, and the sidearm
  is the pistol at 70% (**D165**, amended). `web/public/art.json` was re-fetched
  for the villain decks `main` added (158 entries); `catalog.json` regenerated
  unchanged.
- **Tests.** `npm --prefix web test`: **993 `node --test` + 121 vitest (8
  files)**, 0 failures — Lane MOTION's merged 973 + 120 and the lane's.
- **Build.** The 2D entry chunk is **90.36 kB** gzip, as on `e2aee03`, and
  carries no `three`; `arena-scene` 360.06 → 369.35, `Workshop` 24.65 → 25.50,
  `Arena` 15.40 → 15.55 (`e2aee03` built beside it).
- **Bench** (`g1`@316, production builds of `e2aee03` and this tree on one
  `vite preview` port, three interleaved rounds, load 1.0–6.9;
  `var/bodies/merge/bench/`): GTX 1080 bloom off p95 **0.6 against 0.6** every
  round, bloom on **1.4 · 1.4 · 1.3 against 1.3 · 1.8 · 1.2**; SwiftShader bloom
  off p50 **20.9 · 17.0 · 17.0 against 17.7 · 16.1 · 16.3** (p95 34.3–35.2 against
  33.4–34.3). Counts, bloom off: the GTX 1080 draws **86 calls and 26,315
  triangles** against 79 and 24,362 (+7, +1,953 — the lane's +6 to +7 on LOOK's
  tree), and the SwiftShader sample **89–90 and 29,323–29,521** against 83 and
  27,544 — **on report 13 §8.2's 90-call line** and 479 triangles under its
  30,000, as the lane projected: the next kind on the table needs a measurement
  first.
- **Gate**, from a deleted `bridge/out` at `GATE_JOBS=4`, `WSPORT=8920`: **exit 0
  in 253.8 s**, 46 jobs (976.8 s of work), the load 3.5 at the start and 10.3 at
  most; `node --test` 1003 / 995 pass / 0 fail / 8 skipped plus 121 vitest, 6b
  `SAME GAME`, 10g's three games played (`var/check-all-bodies-merge.log`). Before
  it: `./bridge/build.sh`, `npm --prefix web test` and `npm --prefix web run build`,
  each green on its own.
- `~/forge` and `~/.forge`: unchanged (the jar `3c0a7c38…8e5dd9`).

Screenshots, before (`e2aee03`) and after (this tree), comic look, headless
Chromium on the GTX 1080 at 1600 × 1000: `var/bodies/merge/before/` and
`var/bodies/merge/after/` — the workshop's `1× front` for Fury, Peggy, Coulson,
Quake and the Bold Biochemist (`ws-*-1x.png`), and the table view at `g1`@355 and
@316 with both duelists (`table-*-duelists.png`); Fury's strap, old and new, at 3×
in `var/bodies/merge/probe/fury-strap-old-new.png`.

### Onto `main`'s `a08c15f` (2026-09-28) — the three lanes together

Report 15's commit and the three lanes' twelve (LOOK's five, MOTION's three,
BODIES' four) replayed by `git rebase a08c15f` in this worktree, onto `main`'s
CI (`249697e`), Polish 1 (`b9af15d`) and Guards (`a08c15f`). The merge pass edits
any file the four sides own, and says where.

- **Conflicts, each kept on both sides, `main`'s first.** `web/src/main.tsx`
  (Polish 1's `arenaFollowOf(followWord)` beside LOOK's `lookQuery`, then
  follow-up 2 below); CLAUDE.md's docs-table rows (merged word by word — Polish
  1's and Guards' evidence and PLAN sentences, then the lanes'); DECISIONS.md at
  every lane commit (each lane decision placed BEFORE Guards' **D180–D183**, which
  now sit after **D165** with a gap — the numbering policy of 2026-09-28: a lane
  keeps the numbers it reserved, nothing is renumbered and no count phrase moves);
  PLAN.md's status table (the CI and Polish 1 rows, then the lanes'). README.md,
  `styles.css` and the rest merged by themselves. `tools/check-all.sh`, `.gitignore`
  and `web/test/liveness.test.ts` were not touched by the other side at all: the
  gate's **48 jobs** are `main`'s (02b and 12e among them), and liveness keeps
  every lane's clause.
- **PLAN.md's order.** *Polish 1* and *Guards* moved ahead of *Lane LOOK*, so the
  three lanes stay together above *Deferred*, in the order they landed; the status
  rows that said "just above *Deferred*" for Polish 1 and Lane LOOK now say where
  they are.
- **Polish 1's follow-up 1 — already done.** Lane BODIES applied it on its own
  branch; grepping the merged `web/src/arena/` for `setTimeout(`, `setInterval(`
  and `requestIdleCallback(` finds `art.ts`'s two one-shots and nothing else, both
  tagged `// ALLOW timer:`.
- **Polish 1's follow-up 2 — applied** (the arena's desk, which the merge pass may
  edit): `ArenaFollow` gains `lost`; the watching line says *recording lost —
  re-recorded under the same name; following stopped*, with no dot and an
  `arena__watch-follow--lost` class; `main.tsx` hands the arena `followWord` as it
  is and `arenaFollowOf` is gone; `spectate.test.ts` holds `ArenaFollow` to
  `FollowWord`'s four words and refuses a mapping between them;
  `arena-hud.test.tsx` renders the lost line (matchup kept, no `●`);
  `liveness.test.ts` spells the new union.
- **The final skeptic's cheap minors.** CLAUDE.md's Lane BODIES headroom was the
  branch's number (88 calls, 29,397 triangles) — it is the merge's, **90 and
  29,521**, on the call line; the docs-table rows (CLAUDE.md's report 15,
  evidence, PLAN and DECISIONS rows; README's report 15 and evidence rows) name
  all three lanes; `docs/evidence/bodies.md` carries the `g1`@355 bloom-off
  census beside the @316 bench (87 · 26,539 on the GTX 1080, 88 · 26,541 on
  SwiftShader, against `e2aee03`'s 81 · 24,490 and 82 · 24,492) and both frames
  re-measured on this tree; `traits.test.ts`'s three merge details each name
  their side and their partner in a comment of their own, and the two hairs —
  details by measurement, not by nature — are follow-up 29; the two visual
  minors are follow-ups 30 (the villain's armour through his cloak) and 31
  (Peggy's sidearm, a grey slab from above), each with its file.
- **Built.** `node tools/build-workshop-catalog.ts`: `catalog.json` unchanged.
  `node tools/fetch-art.ts`: `art.json` unchanged, 158 entries (Scryfall answered
  429 several times; each `Retry-After` was honoured). `./bridge/build.sh`: the
  lint's self-test (31 rules, 60 firing cases), the lint over `bridge/src` and
  `tools/`, and the five self-tests (`ActGuardSelfTest` 74 checks) green.
  `npm --prefix web test`: **994 `node --test` + 121 vitest (8 files)**, 0
  failures — the lanes' 993 + 121 and Polish 1's follow-word test.
  `npm --prefix web run build`: the 2D entry chunk **90.40 kB** gzip and no
  `three` (no static import of a chunk, no three symbol); `arena-scene` 369.35,
  `Workshop` 25.50, `Arena` 15.58, `Story` 15.53, `Post` 17.72 kB.
- **Bench**, the rebased tree's production build on `vite preview`, two rounds,
  load 0.9–3.4 (`var/merge-main/bench/`): `g1`@316 bloom off, GTX 1080 **86 ·
  26,339**, SwiftShader **90 · 29,521**; `g1`@355 bloom off, GTX 1080 87–88 ·
  26,539–26,541, SwiftShader 88 · 26,541 — the lane merge's counts
  (`docs/evidence/bodies.md`).
- **Gate**, `rm -rf bridge/out && GATE_JOBS=4 WSPORT=<n> ./tools/check-all.sh`,
  twice: **239.0 s**, exit 0, at `WSPORT=8980`, 48 jobs whose seconds sum to
  926.3, load 2.6 at the start and 6.2 at most (`var/check-all-visual-final-p1.log`);
  **240.5 s**, exit 0, at `WSPORT=8990`, 933.3 s summed, load 5.4 at the start and
  7.7 at most (`var/check-all-visual-final-p2.log`). In both: `node --test` **1004 / 996 pass / 0 fail / 8 skipped** plus 121
  vitest (8 files), 6b `SAME GAME`, 10g's three games played and `undo(late)=ok`,
  12d's 114 checks, 12e's four decks byte for byte their specs.
- `~/forge` and `~/.forge`: fingerprinted before the rebase and after the second
  gate — the jar's sha256 (`3c0a7c38…8e5dd9`), `~/forge`'s two top levels' names,
  sizes and mtimes, and every file under `~/.forge` with its size, mtime and
  sha1 — **unchanged**.

<a id="fu-bodies"></a>

### Lane BODIES follow-ups — thirty-one, 2026-09-28 (four closed and three partly by the second fix pass; the third reopened 13 and 6, and closed part of 8 and 15; the merge closed 1, 6 and 13, part of 12 and 23, and added 24–28; the three lanes' merge onto `main`'s `a08c15f` added 29–31, the final skeptic's minors)

1. ~~**A figure that mounts KNEELING blends the stock idle under the kneel —
   `scene/FigureLayer.tsx`, LOOK's file.**~~ **Closed at merge** (**D156**,
   amended): `mountRestLane` and `newFigureRig`, on the two-action clip model,
   with `clip-lane.test.tsx`'s tapped mount. The request, for the record: `FigureLayer` plays the body's `idle`
   at full weight when it mounts; the clip lane stops only the rest action it
   started itself, so a card first seen tapped kneels at half weight for its
   whole life. With the variants that idle IS the signature pose, so the blend
   is the kneel plus, say, Fury's folded arms — and Fury's own ability (a card
   put onto the battlefield "tapped and attacking") takes exactly this path. The
   one-line fix, which reads the variant's own idle: in the rig registered by
   `FigureLayer`'s layout effect, `rest: null,` → `rest: built.actions.get('idle')
   ?? null,` — the lane's first pass then sees a different rest clip and stops
   the mount's idle.
2. **The Universal Base Characters pack — needs the user's approval in chat.**
   The brief's hair plan reads the pack's other hairstyles (and its eye and
   eyebrow meshes) out of `Universal Base Characters[Standard].zip`
   (128,968,391 B, from <https://quaternius.itch.io/universal-base-characters>
   through itch's free "No thanks, just take me to the downloads" flow). This
   worktree does not have it, and a download is a chat approval with the
   filename, the source and the size; one relayed by a workflow script is not
   one. Once approved: save it to `var/assets/figures/` unopened, run
   `node tools/build-figures.mjs --verify-only` (it must match the manifest's
   sha256 `fdbf1804…455f40`), read the licence badge on
   <https://quaternius.com/packs/universalbasecharacters.html> and the itch page
   **and stop if it is not CC0**, list the hairstyles with the build's zip
   reader, and have `build-figures.mjs` write each as a static `hair:<style>`
   node (unit head space, costume slot `hair`); then `scene/props.ts` bakes them
   as the existing `hair*` kinds in place of the shells, and `figures.test.ts`
   asserts every `hair:*` node. Measure against **D161**'s 450 KiB.
3. **The cheaper road to library headroom.** Two thirds of `figures.glb` is its
   JSON chunk, one accessor/sampler/channel per animated joint per clip. Merging
   each body's clips into one long clip with named ranges would roughly halve it;
   the clip lane already scrubs `action.time`, so it is a build change plus a
   range table in `models.json`.
4. **Expressions** — *grit done by the second fix pass (**D165**); pain open,
   and MOTION's.* Report 15 §6.2's neutral / grit / pain. Grit is a POSE: the
   `faceGrit` and `facePatchedGrit` kinds, chosen when `stance` is `crouch`
   (tapped), `attacking` or `blocking`. Pain on `hit` is a cue: it needs the prop
   field to swap a figure's face kind for a cue's length, which is a new
   offset-side API (follow-up 19).
5. **A face on the director duelist.** `figures/duelists.ts`'s validator accepts
   only `PROP_KINDS`, and `face` is derived; `DuelistLayer`'s bake is generic, so
   allowing `face` in a look is a validator change. From three-quarters behind it
   would barely show; the villain wears a helm.
6. **`FigurePose.art` is carried and not yet drawn** — *non-null in the arena
   since the merge applied follow-up 13 (**D164**, amended); still read by
   neither look nor motion.* It is the art rung's vivid
   accent for LOOK's rim and MOTION's burst and mote colours (report 15 §7.2);
   neither lane reads it yet.
7. **The palette's accent pick** — *closed by the second fix pass (**D164**).*
   `share × (0.3 + saturation)` favoured a large muted cluster: Fury's accent was
   `#867448`, not his explosion's. The score is now `× (0.4 + value)`, and
   `palette.test.ts` holds report 15 §7.1's own clusters to the explosion.
8. **The coat close up** — *smaller since **D163** cut it to the body, and the
   yoke's ledge and the scientists' fan closed by the third fix pass (the yoke
   tapered to the body link, `working` bent from the waist, a seam test); still a
   rigid-panel cost.* A pose that bends only at the chest still stands the coat's
   body (on `spine_01`) upright beside the leaning chest — `working` was one, and
   any new pose that leans should bend the lower spine too (CLAUDE.md's lane
   convention 1). Panels are rigid links, so a close view shows small
   ledges where one overlaps the next (**D159**'s known cost; the calf swing it
   also named is gone with **D162**). A kneeling Biochemist's front lower link
   hangs in front of his knee, over the card — a coat draped over a knee, but a
   big white flap from above. A procedurally built skinned coat (one mesh, several
   bones' weights) would remove both; it needs a skinned renderer for props, which
   the instanced prop field is not.
9. **The cape's shoulder panels are rigid on `spine_03`**, as the coat's body was
   before this lane's second pass. The duelists' gestures bend little; a card that
   wears a cape and a bending pose would want the same two-link split.
10. **The procedural hair reads as a cap close up** (`crop` most) — *the bob
    re-cut as hair by **D165** (a swept fringe, open temples, lit locks); `crop`,
    `waves` and `bun` unchanged.* The pack's
    hairstyles (follow-up 2) are the fix; until then the shells are judged at the
    table view, where they pass the identity raster from both seats.
11. **`HEAD_SHAPE` and the face landmarks are measured constants** for the two
    Universal Base Characters bodies. A new body family needs them measured again
    (a test could derive them from the rig's `Head` and the skin slot's extent).
12. **The palette runs on the main thread** in an idle callback, 3–22 ms a card
    at ¼ scale — in the workshop and, since the merge, in the arena.
    A Worker if a board of many new cards ever stutters on its first frames.
13. ~~**Switch the art rung on — `web/src/arena/Arena.tsx` and
    `web/src/workshop/Pedestal.tsx`, lane LOOK's files** (report 15 §9.1, §9.4)~~ —
    **closed at merge, by way (a) below** (**D164**, amended): the merge pass
    applied the edit as written, named `paletteNamesOf` in `Workshop.tsx`'s
    coupling header, passed `palettes` to the framing poses (the preview memo
    went), changed the tuning panel's note and liveness's comment, and tightened
    liveness to exactly once. The record: *The second fix pass applied
    the edit below as written, the verifier's third round called that a blocker
    (ownership; `git merge-tree` of `bodies` and `look` had reported no conflict in
    either file, evidence §8.4), and the third fix pass reverted it: both files are
    the base's again. Two ways on: (a) LOOK, or whoever merges LOOK and BODIES,
    applies it — the default; (b) the user authorises these 17 lines as a
    cross-lane exception now, recorded as a dated decision with LOOK's agreement,
    and it is applied on this branch.* Liveness already accepts it: once applied,
    each file may call `useArtPalettes` once, fed only by `paletteNamesOf`.
    The first cut edited both; the fix pass reverted the hunks so the two lanes
    do not collide. Every pose function already takes `palettes`, so the rung
    switches on the day this lands, in both at once (the workshop must draw what
    the arena draws). The edit, whole:

    ```diff
    # web/src/arena/Arena.tsx
     import { artEntryFor, type ArtIndex } from '../art.ts';
    +import { paletteNamesOf, useArtPalettes } from './art.ts';
     …
       const frozen = useMemo(() => combatFreeze(state.board), [state.board]);
    +  // Lane BODIES (D160): the art rung — each face-up card's own painting, read
    +  // once off the hot path; a new map only when a palette arrives.
    +  const paletteNames = useMemo(() => paletteNamesOf(placed), [placed]);
    +  const palettes = useArtPalettes(paletteNames, art);
       const figures = useMemo(
         () =>
           figurePose(placed, state.board?.combat ?? null, figureData.figures, {
             …
             models: figureData.models,
    +        palettes,
           }),
    -    [placed, state.board?.combat, figureData, frozen],
    +    [placed, state.board?.combat, figureData, frozen, palettes],
       );
       const tiles = useMemo(
    -    () => tilePose(placed, tileDataOf(figureData.figures)),
    -    [placed, figureData],
    +    () => tilePose(placed, tileDataOf(figureData.figures), palettes),
    +    [placed, figureData, palettes],
       );

    # web/src/workshop/Pedestal.tsx (PedestalScene; `art` is already its prop)
    +import { paletteNamesOf, useArtPalettes } from '../arena/art.ts';
     …
       const frozen = useMemo(() => combatFreeze(state.board), [state.board]);
    +  const paletteNames = useMemo(() => paletteNamesOf(placed), [placed]);
    +  const palettes = useArtPalettes(paletteNames, art);
       …figurePose(placed, state.board?.combat ?? null, figureData, { frozen, models, traits, palettes })
       …and `palettes` in that memo's deps;
    -  const tiles = useMemo(() => tilePose(placed, tileDataOf(figureData)), [placed, figureData]);
    +  const tiles = useMemo(() => tilePose(placed, tileDataOf(figureData), palettes), [placed, figureData, palettes]);
    ```

    With it: add `paletteNamesOf` to `Workshop.tsx`'s coupling header beside
    `useArtPalettes` (`workshop.test.ts` fails until it is named), pass
    `palettes` to the `focus` poses in `Workshop.tsx` again (its `artPreview`
    memo can then go: `restPose` carries the rung), change the tuning panel's
    "not drawn yet" note, and rewrite liveness's lane BODIES comment ("called
    today from ONE place"). `palette.test.ts` needs
    no change: it already drives `figurePose`, `tilePose` and `paletteNamesOf`
    with palettes, hostile corpus and all. The verifier's reading of the table
    with the rung on (the first cut): the Giant-Sized Flying Ant went from blue to
    its painting's brown, Wasp's aura from pale blue to salmon — so judge it in
    the workshop's swatch strip first.
14. **A trimmed coat hem.** The coat's hem trim went with the first cut's single
    shell (Fury's slate hem, the director's and the villain's gold). Every
    `coatTails` panel is one kind, so a trim on the chain's LAST links alone needs
    either a second kind (`coatHem`, +1 draw call while a coat is on the table,
    and a `duelists.json` row so the villain's is gold) or a per-instance trim
    colour. The fix pass tried a trim on every panel with the upper hems tucked
    under the lower links (`HANG_FROM`): the upper bands still read as rings round
    the coat from the table view (`var/bodies/fix1/coat-v3/`). The cape keeps its
    trim, which its shoulder panels hide.
15. **Dark procedural hair still reads as a cap from above** — *closed for the
    bob by **D165**: a band of lit locks (`sheen`, a vertex colour over 1); Quake's
    face now shows 8 px at the table view. The third fix pass made the locks COOL
    (`SHEEN_COOL`) so her hair could go back to the near-black her painting draws
    (`#1c1a22`) and still show them; from the workshop's steep 1× a bob still
    reads a little like a cap.* The fix pass
    shaded every other meridian darker toward the hem (`strands`), which turns
    Agent 13's blonde bun into combed locks; on Quake's near-black bob a darker
    stripe does not show, and from the workshop's high framing a bob's hem tips
    are under its silhouette. The pack's own hairstyles (follow-up 2) are still
    the fix; a lighter strand (a highlight) would need the look's shader, not a
    vertex colour.
16. **Fury is bald now** (the fix pass): the card draws him bald, and the
    procedural `crop` read as a dark skullcap. His head is the one skin tone every
    card shares (slice 4's rule), so it is not his complexion — a per-card skin
    slot is a costume question for the user, not this lane's to decide.
17. **The duelists' coats are single-sided — `scene/DuelistLayer.tsx`, LOOK's
    file** — *closed by the second fix pass (**D163**) without editing it: a cloth
    kind's geometry carries its LINING unless the caller asks for none, and only
    the prop field (drawn `DoubleSide`) asks.* The prop field draws every kind `DoubleSide`; `DuelistLayer` bakes the
    same panels into the duelist's own `SkinnedMesh`, drawn by `holoMaterial`'s
    `FrontSide`. So from three-quarters behind, the inside of the director's coat
    is culled and its side panels read as separate planks with the table showing
    between them — the verifier's "tails flare to one side as a detached panel",
    which **D162** does not cure (it only stopped the tails following his legs;
    the before and after crops are identical, `var/bodies/fix1/table-v3/
    director.png`). Two ways, both LOOK's: bake each panel kind (`coatTails`,
    `cape`) a second time with its winding reversed and its normals flipped (+24
    triangles a panel, ~790 for the two duelists), or give the duelist's material
    `side: THREE.DoubleSide` (+1 program).
18. **The workshop cannot show a face at 1×, and the table cannot read one.** Its
    close framing looks down on the head, so a face — neutral or in grit
    (**D165**) — is a few pixels under the hair from there; the second fix pass
    judged the grit from a lens at head height moved by hand through the dev handle
    (`var/bodies/fix3/lowcam.js`, `var/bodies/fix3/it6/s3.png`). **Measured
    (evidence §9.5)**: from the seat that faces the lens a face is 4–8 px at view 1
    and 3–6 px at view 4, 0–1 px from the other seat — present, not legible at play
    distance; its draw call is paid on every face-up person. A *face* framing in the
    workshop's toolbar (`workshop/framing.ts`'s modes — lane LOOK's toolbar) would
    let the user judge expressions; whether the face earns its call at the table is
    the user's to judge from that framing (bigger comic eyes would still be a few
    pixels).
19. **Pain on a hit — lane MOTION's.** Report 15 §6.2's third expression is what
    an EVENT says, so it is a cue: the clip lane's `hit` request would swap the
    struck figure's face kind (`facePain`, a kind like `faceGrit`) for the cue's
    length and hand it back — an offset-side read in `PropField.bind` of a
    per-card face override, decaying to the pose's kind (**D50**). The kit side
    is one more case in `proceduralKind`; the swap is `CueRunner`'s and the prop
    field's.
20. **Coulson's clasp is a judgement call.** The second fix pass lifted it to
    y 0.63 (the belt is at 0.53) with the elbows out; at 0.665 he clutched his
    chest. If it still reads low from the table view, his signature is a new
    `REST_KIT` row (a hand to the earpiece, say), not a third set of aims on
    `clasped`.
21. **The bench on an idle machine.** The verifier could not reproduce
    SwiftShader's numbers at a load average of 16, nor the second fix pass's +0.4 ms
    p50 at about 10 (branch 16.1–25.6 against base 15.2–16.2). The third fix pass
    benched three INTERLEAVED base/branch pairs (evidence §9.6) and reports the
    spread; the machine was not idle then either, so the SwiftShader frame-time
    delta stays **unmeasured under load** and only the draw-call and triangle
    counts are claims. A quiet re-run before the merge is still worth one gate's
    time.
22. **The director duelist's small flap at view 1** (the verifier's third round,
    `var/verify3/cmp/t1-comic-duel.png`): a few pixels of cloth standing proud of
    his coat's outline at the hip, from three-quarters behind. The yoke's taper did
    not change it (`var/bodies/fix4/it3/dir-zoom.png`: base, second pass, third).
    The duelists bake every panel rigid on its `joint` (`DuelistLayer`, LOOK's
    file, ignores `follow` and `hang`), so a skirt link that the prop field would
    swing with the thigh stands where the bind pose put it; a skinned coat
    (follow-up 8) or a per-panel bake that honours `follow` would cure both.
23. **Peggy's sidearm is still small from above** — *partly closed at merge: the
    pistol at 70%, from 60% (34 px from the far seat's front after the ink, where it
    had fallen to 22 under D143's seats).* The third fix pass gave the
    pistol kind a pistol's profile (a slide, a dark raked grip, a trigger guard, a
    hammer — 90 triangles), which reads on Agent 13's raised pistol; Peggy's
    sidearm at 60% points down in her `ready`, and from the table view it is 51 px,
    a small two-tone shape. Aiming her `ready` pistol across the body (a new
    `REST_KIT` row, not new aims on `ready`) would show its side.
24. **A face at play distance is on the far seat only** (the merge's
    re-measurement, **D158** amended). Since **D143** your figures show you their
    backs, so every face the arena draws is the opponent's, 2–10 px at views 1
    and 2; the close look is the workshop's `1× front` (42–118 px). Whether the
    face earns its draw call at the table is follow-up 18's question, now with
    that number.
25. **Fury's strap crosses his good brow.** On the bald anchor the band lies on
    the skull, so its diagonal crosses the forehead over his right brow (the
    patch is on his left eye); from the table view's height that leaves his
    patched face 2 px on the far seat, read with the patch (27). Raising the band
    on the far side (its `[0, 0.1, 0]` offset and its −0.5 tilt in `scene/props.ts`)
    would free the brow; judge it in the workshop's `1× front` first.
26. **The raster's merge details are keyed by KIND** (`traits.test.ts`'s
    `ONE_SIDED`: `shield`, `hairParted`, `hairBob`, with partners `hat`, `squad`,
    `wings`). A card that later wears one of those kinds and falls under the bar
    with no such partner fails the test — intended, but the day it happens the
    right answer may be a per-card table rather than a new partner.
27. **Lane LOOK's follow-up 4 is still open** — `scene/models.ts` imports
    `COSTUME_ATTRIBUTE` through the `holoMaterial.ts` shim, its last importer. The
    merge did not retire the shim (it is a liveness assertion's removal, LOOK's
    to judge); the edit is LOOK's follow-up as written.
28. **A liveness message names a line by its text.** `codeOf` drops block
    comments, so a line number from its output is not the file's; the poll
    clause prints the offending line instead. A `codeOf` that kept the newlines
    would let every clause name a real line.
29. **Two hairs are details by measurement, not by nature** (the final skeptic,
    `web/test/traits.test.ts`'s `ONE_SIDED`). `shield` is one-sided by nature —
    Peggy holds it before her in her `ready`, 1 px from behind and 127 from the
    front, and the red hat carries her from behind (318 / 217). But `hairParted`
    (86 px from behind, 40 from the front) and `hairBob` (56 / 17) are hair,
    which is all round a head: they went on the list at the lanes' merge because
    D143 put their FRONT on the far seat, where a hairstyle is a fringe under the
    brow, and there the squad's three heads (672) and Wasp's wings (212) carry the
    card. Each row now names its side and its partner in its own comment. What
    would take them off the list is a fringe that reads from the front at the full
    48 — the bob is `web/src/arena/scene/props.ts`'s `case 'hairBob'` shell (a
    fringe at `front: 50` on Wasp's half-height body, `traits.json`'s `scale`
    0.55), the parted hair the agent body's own, carved and baked at load
    (`carveHair` in `web/src/arena/scene/models.ts`, `bakeHair` in
    `web/src/arena/scene/props.ts`) — judged in the
    workshop's `1× front` and the raster from both seats; until then the partner
    check is what holds the card (follow-up 26 is the general form).
30. **The villain duelist's armour shows through his cloak** (the final skeptic's
    picture, `var/verify-final/sheets/villain-before-after.png`: grey shards of
    the body's armour poke through the green coat and cloak down his front and
    side). The villain wears `coat`, `coatTails` and `cape` at once
    (`web/src/arena/figures/duelists.json`), and `scene/DuelistLayer.tsx` bakes
    every panel rigid on its `joint` into the duelist's mesh at `scale` 1.6 —
    so the coat's body link, cut a finger's width off the hips for the card-sized
    figures (**D163**; `web/src/arena/figures/props.ts`'s `coatTails` anchors,
    `COAT_CHEST` and `COAT_BODY`), leaves the armour's widest points outside it on
    this body. Either stand the panels further off for a duelist (a per-duelist
    inflation of `COAT_BODY` in the bake) or drop the `coatTails` body link where a
    `cape` already hangs; judge it at view 1 and view 3 in both looks.
31. **Peggy's sidearm reads as a grey slab from above** (the final skeptic's
    picture, `var/verify-final/sheets/zoom-ws-peggy-1x.png`, the workshop's `1×
    front`). Follow-up 23's pistol at 70% points at the floor in her `ready`, so
    from the table view and the workshop's high lens its profile — slide, raked
    grip, guard and hammer (`web/src/arena/scene/props.ts`'s `case 'sidearm'`,
    drawn `PROP_LOOK.metal`) — is foreshortened into its top face, one flat grey
    block. The anchor is `web/src/arena/figures/props.ts`'s `sidearm` row (the
    right hand, pointed down). Turning the pistol to show its side to a lens
    above (a `PropAnchor.turn` toward the body's axis) or a darker slide than
    `metal`'s grey would let it read as a pistol; follow-up 23's new `REST_KIT`
    row is the larger version of the same fix.

---

## The docs block — CLAUDE.md split by directory, and the two policies (2026-09-28, D200–D202)

The structure review of `main` on 2026-09-28 found `CLAUDE.md` loaded whole by
every agent on every task (33,784 words on `102fb1f`), more than a tenth of it
gate-timing and test-count history, and
the owner took three decisions the same day: **decision numbers are final**
(**D200**), **Claude commits on branches and merges to `main` on a green gate;
the user owns pushes, releases and anything public** (**D201**), and
**`CLAUDE.md` is split into nested per-area files**. The docs block (branch
`docs-block`, off `102fb1f`, the `mtg-table-t2y` worktree, the reserved range
D200–D204) did it, in eight commits a reviewer can bisect, and changed no code
but three test files.

- **History out.** The gate's timing history and the web suite's test-count
  history moved verbatim to `docs/evidence/gate-history.md` and
  `docs/evidence/test-count-history.md`; `CLAUDE.md` keeps one current gate
  paragraph and one current count, and cites no `var/` log.
- **The policies.** *Commits, branches and merges* and *Decision numbers* in
  the root `CLAUDE.md`; **D200–D202** (the third: CI's pinned engine fetch is the
  one exception to "this repo never downloads an engine"); no document states a
  decision total any more.
- **Rule 10 points at the lint** (`./tools/lint-bridge.sh --list-rules`), which
  closed Guards follow-up 6.
- **The split.** A root `CLAUDE.md` of about 5,600 words and four nested files —
  `bridge/`, `web/`, `web/src/arena/` and `tools/` — moved byte for byte and
  held so by `web/test/claude-md.test.ts` against `docs/claude-md-rules.txt`
  (every rule line and every bold span of 20 or more characters written exactly
  once, none lost, every link and `#anchor` resolving, the root under 9,000
  words; the spans and anchors were added by the fix pass after review).
- **This file's *Open now*** index, the Java guide's chapter 9 (a map of
  `WireGuiGame.java`, one ask and one act end to end, the five self-tests), and,
  in its last two steps, `tools/README.md` and `README.md` brought up to date.

**The gate**, from a deleted `bridge/out` on `502ad9d` at `GATE_JOBS=4`, `WSPORT`
9010: **259.2 s**, exit 0, 48 jobs whose seconds sum to 994.4 s, at a load
average of 1.95 rising to 16.3 beside other lanes' work; `node --test` inside it
1009 / 1001 pass / 0 fail / 8 skipped, and 121 vitest. Standalone, `npm --prefix
web test` is 999 + 121. `~/forge` and `~/.forge` were fingerprinted before and
after and did not change.

**The fix pass after review** (one verification round, passed with two majors
and four minors). The root's Environment now says CI's `bridge` job asserts the
jar's sha256 on every run (**D202**) and only the local check is unbuilt; the
Java guide's last "don't commit" habit is **D201**'s rule; the personal tier is
cited to report 13 §13 question 2 and this file's *Tier 3* note rather than
**D54** (in the root, README and **D201** itself); the gate paragraph names
`1d08248` as the commit whose message carries the docs block's run; and
`web/test/claude-md.test.ts` now also holds every **bold span** of 20 or more
characters wherever it sits (349 in the manifest beside the 195 rule lines —
the arena's restatement of the board's two click and label rules lost its bold,
the one duplicate it found) and every link's `#anchor`. The commit
attribution line stays the harness's, not the lane brief's. The gate from a
deleted `bridge/out` at `GATE_JOBS=4`, `WSPORT` 9010: **241.9 s**, exit 0, 48
jobs whose seconds sum to 939.6 s, at a load average of 0.59 rising to 4.59;
`node --test` inside it 1009 / 1001 pass / 0 fail / 8 skipped, and 121 vitest.

<a id="fu-docs"></a>

### Docs block follow-ups — two, 2026-09-28

1. **Mirror the Java guide's section table into `WireGuiGame.java`'s header.**
   Chapter 9's table (sections, methods, thread, lock, decision) belongs in the
   file it maps, as a comment the next reader cannot miss; this lane changed no
   code, so it is written in the guide only, checked against `102fb1f`. Copy it
   in with the next bridge change, and keep the two in step.
2. **The Java guide's older citations.** The docs block re-pointed chapters 2–6's
   quoted code blocks at the lines the code has moved to, but seven quotes no
   longer match the code they cite (`bridge/build.sh:32-36`,
   `Smoke.java:130-131` twice, `Smoke.java:152-155`, `Snap.java:291-294`,
   `Snap.java:333-345`, `Json.java:132-140`) and the inline `File.java:N`
   references in chapters 1–8 were not re-checked. Re-quote those seven from the
   tree and re-point the inline ones.

---

## The personal tier — models of the real characters, local only (2026-09-28, D190–D196)

**Status: phase 2 built** (the loader, D194–D196: *Phase 2*, below) **on phase 1,
built, run on Doctor Doom, tested and gated** on branch
`personal-tier` (the worktree `mtg-table-t2x`, off `main`'s `a08c15f`, rebased
onto `main`'s `f2c934d` by fix pass 3). The
user's decision of 2026-09-28: a strictly personal, never-published, never-sold
local overlay — in their words, **"this can never ever ever be sold or
published"** — of rigged models of the actual Marvel characters, downloaded by
the user under whatever personal-use licence the source grants. The repository
tier stays CC0-only (**D54**). Phase 1 is the folder, the manifest and the
pipeline; **phase 2 is the loader** in the arena and the workshop, after the
visual merge — nothing in the game reads `personal/` yet. This is the concrete
form of *Tier 3 — a note, not a plan*, above: its first rule (personal-only,
gitignored, never committed) holds; its `committable: false` idea is replaced by
a manifest inside the personal folder (**D190**'s rejected alternatives).
`docs/guides/personal-tier.md` is the manual, `docs/evidence/personal-tier.md`
what was run. The lane's reserved decision range is D190–D199; it used two.
Fix pass 1 added a third, **D192**, and fix pass 3 a fourth, **D193** (below).

1. **The folder and its rule** (D190). `personal/models/<slug>/` holds the
   download untouched, `source/`, `SOURCE.txt`, `inspect.json`, an optional
   `bones.json`, `model.glb`, `manifest.json` and `preview/`. `.gitignore`
   ignores `/personal/`, anchored — the first cut, unanchored, also hid
   `tools/personal/`, and the test's negative control is what caught it.
2. **`tools/personal/import.mjs`** copies the download in, unpacks it
   (CRC-checked, held inside the folder), drafts `SOURCE.txt` from the file's own
   `asset.extras` and `license.txt`, and writes `inspect.json`: meshes, skins, the
   rest pose from the bind matrices, the automatic rig map, and the control-mesh,
   unskinned-mesh and game-asset-name flags (informational; it refuses nothing).
3. **`tools/personal/prepare.mjs`** (D191): control shapes stripped; the skeleton
   rebuilt as `root` + our 22 joints in the `agent` body's bind rotations;
   A → T re-posed and baked; unskinned meshes skinned by height (`--cloak-to`,
   `--bind`, `--drop` for the rest); +Y up, +Z forward, feet at 0, the `agent`'s
   height; decimated to `--budget` with the CLI's meshoptimizer; base colour and
   normal ≤ 1024; meshopt last. Writes only `model.glb` and `manifest.json`.
4. **`tools/personal/check.mjs`**: the retarget copy reproduces the build's `hero`
   clips from `agent`'s; our five clips on the model move every joint the agent's
   do, by the same world-space delta; the skin is the identity at rest; no NaN,
   no explosion; the cloak follows the spine; a coverage table; previews through
   headless Chromium (ANGLE's SwiftShader). **Since fix pass 1 (D192)** the rig
   map itself is judged against the `agent` body — weight on every core joint,
   at most 2% of the weight placed by position, sides, each foot's vertices in
   front of its ankle, segment directions — because the rotations hold by
   construction for any map; and the preview browser keeps its profile inside
   the slug's folder (deleted after), is answered `no-store`, and must show
   nothing beyond 127.0.0.1 in its own net log. **Since fix pass 3 (D193)** the
   LIMBS are judged too — each spine, arm and leg link's direction, each limb's
   proportion and which side of its joint each limb joint's flesh lies on, and
   the chain ends at attack t = 0.5 — because a map that swapped the forearm and
   the hand passed everything else; the preview browser's HTTP cache and profile
   are measured; and the closing line lists what was judged.
5. **Doctor Doom, through all three**: 17,473 triangles (14,614 to render + 2,859
   in 59 Auto-Rig Pro control meshes) → **5,996** of a 6,000 budget; 339 joints,
   68 weighted → root + 22, the automatic Auto-Rig Pro map 22/22 with no
   `bones.json`; the upper arms **60.0° → 0.0°** below the horizontal; the cloak
   (564 triangles, unskinned) bound by height; 6 textures → 5 (a byte-identical
   copy dropped), all 1024 px; `model.glb` 2,339,352 bytes; `check.mjs` OK with
   21 of 22 joints turning (the left ball joint is still on the agent too), every
   world delta within 0.60° of the agent's. Import 0.16 s, prepare 0.55 s, check
   with previews 2.9 s.
6. **`web/test/personal-tier.test.ts`** (16 cases, `node --test`; 23 since fix
   pass 1): the ignore rule
   both ways, the slug, the manifest validator one defect at a time, our joints
   against the manifest and `figures.glb`, the rig map over synthetic Auto-Rig
   Pro, Mixamo, Unreal (UE5) and VRoid lists plus a VRM table and a `bones.json`
   override, the rest-pose verdict and the flags on a box on two bones built in the
   test, and the retarget against the build's clips. Fix pass 1 added the cloak's
   height rule, `judgeBody` on synthetic bodies (four cases), the net-log reader,
   and **the whole pipeline end to end** — import, prepare, check — on a
   Mixamo-named figure of boxes in an A-pose with an unskinned cape, in a
   throwaway slug the test deletes, failing the verifier's two wrong maps. Fix
   pass 3 (28 cases) added `judgeLimbs` on stick bodies (three cases, the
   skeptic's swaps among them), the profile reader, cache keys in the net-log
   reader, a prepare case on the boxes (the two-bone arms turned A → T with the
   rest skin agreeing to 1e-4 m, and decimation keeping every survivor's own
   weights, traced by its UV), and a third wrong map in the end-to-end case.

```bash
node tools/personal/import.mjs ~/Downloads/doctor_doom.zip doctor-doom
node tools/personal/prepare.mjs doctor-doom --card "Doctor Doom" --seat opp
node tools/personal/check.mjs doctor-doom        # --no-preview to skip Chromium
```

**The gate**, from a deleted `bridge/out` at `GATE_JOBS=4`, `WSPORT=9000`:
**255.3 s**, exit 0, 48 jobs (987.8 s summed) at a load average of 5.3–16.3
beside another lane's gate, `node --test` 959 / 951 pass / 0 fail / 8 skipped and
vitest 120 (8 files) (`var/check-all-personal-tier.log`, evidence §12). The lane
added no step: its test is in the web step. `~/forge` and `~/.forge` were
fingerprinted before and after: unchanged. **Fix pass 1's gate**, the same way:
**246.2 s**, exit 0, 48 jobs (955.5 s summed) at a load average of 1.4–8.8,
`node --test` 966 / 958 pass / 0 fail / 8 skipped and vitest 120 (8 files)
(`var/check-all-personal-tier-fix1.log`, evidence §13); `~/forge` and
`~/.forge` unchanged again.

<a id="fu-personal"></a>
### The personal tier's follow-ups — thirty-four, 2026-09-28 (1–7, 9, 11, 18, 19 and 21 closed; 13 and 16 partly)

**Phase 2, the loader** — **all seven closed by phase 2** (D194–D196, *Phase 2*
below): the index and its one reader (1), the dev-only route and the build grep
(2), the textured material through the paint input (3), the caps (4), the lookup
and its corpus sweep (5), the workshop badge (6), and the clips — BAKED, because
the hip track does not bind as it is (7). The items as they were written:

1. **Which card or seat it dresses.** Read `personal/models/*/manifest.json`
   (`dresses`: a `card` by exact name, a `seat` `you`/`opp`), in the arena and
   the workshop, through ONE module, the way `figures.json` is read; absent
   means the repository figure, with no difference in behaviour.
2. **Served by the dev server alone** — a `configureServer` route beside
   `/cards/img/*` (**D92**), never `vite preview`, never a build; a production
   build must not contain a path to `personal/`, and a test should say so.
3. **A textured material through `figureMaterial`'s colour input** — the LOOK
   lane's one program with a colour/texture input (on the visual merge, not on
   this branch's `main`). A personal model carries base colour and normal
   textures; the loader draws it in the comic look with its own texture, not the
   costume palette, and keeps one program.
4. **A triangle cap.** 6,000 is prepare's default; the loader should refuse (or
   fall back on) a model over a stated cap, and count personal figures against
   the twelve-figure budget (`MAX_FIGURES`), measured against `g1`@355 as the
   Tier 2 bodies were. A duelist is on screen all game at scale 1.6, so its cap
   may be higher than a card's.
5. **Hard rule 8.** A personal model only where `figurePose` already places a
   named figure; never for a face-down or redacted card (the anonymous disc stays);
   a test over the corpus like `figure-pose.test.ts`'s 1,138 face-down instances.
6. **The workshop badge.** `#workshop` should say when a card is wearing a
   personal model (and which slug), so a picture taken there is never mistaken for
   the repository look — and never committed.
7. **Clip binding.** A prepared model is in our joints and our bind rotations, so
   `figures.glb`'s `agent` clips bind by name with the rotations unchanged; only
   the pelvis translation needs the hip-height ratio (1.0 at the default
   `--height`). `retarget.mjs` is the general answer if a model is ever prepared
   otherwise.

**The rest:**

8. **Factor the build's retarget.** `tools/build-figures.mjs`'s `humanClips` and
   `tools/personal/retarget.mjs` are one formula in two places, held together by
   the agent → hero proof. Factoring the build to import the module is right, but
   only beside a rebuild of `figures.glb` from the CC0 downloads, which proves the
   bytes unchanged.
9. ~~**`tools/arena-bench.mjs`'s SwiftShader flags.**~~ **Closed by phase 2**:
   arena-bench's own `--gpu swiftshader` renders on ANGLE's SwiftShader on this
   Chromium again (evidence §17's bench). The item: `check.mjs`'s first preview
   run used arena-bench's `--use-gl=swiftshader`: this Chromium allows only
   `egl-angle`, the GPU process exited, and WebGL rendered nothing with the
   context lost. `--use-angle=swiftshader` works. arena-bench was not re-run here;
   its default may be broken the same way.
10. **`--pose all`.** The re-pose turns the arms only. A posed model (the survey's
    Wasp, a hand on a hip) keeps its legs and spine posed as a permanent offset
    under every clip. Aligning every bone to the `agent`'s bind direction is the
    general form.
11. ~~**The runner-ups.**~~ **Closed by phase 2** (evidence §16): Coulson needed
    `--joints rest`, spec/gloss read as base colour, `--drop` and an 8,000
    budget; the fan Wasp `--joints bind` and `--drop` (and stays disabled, 29).
    The item: Coulson (Character Creator; 92,719 triangles, 25
    materials, 46 textures, a 144.6 MB GLB): the auto map knows `CC_Base_*`; it
    wants `--drop` for the eye, teeth, tongue, tear-line, occlusion and stubble
    layers, and a budget chosen by looking. Wasp (a custom rig, Spanish part names,
    posed, unskinned wings, a base plane and a shadow disc): a hand-written
    `bones.json` from `inspect.json`, `--bind 'Ala=spine_03'`, `--drop` for the
    base and the disc, and item 10 or Blender for the pose. Evidence §10.
12. **What Blender would still do on Doom** (evidence §9): drape the cloak over
    the legs, weight the shoulder plates wholly to the clavicle so the 60° turn
    does not shear them, keep the twist bones. A portable Blender is the user's
    call; nothing here installs one.
13. **Textures.** *Partly closed by phase 2*: the paint step drops the normal
    maps (the arena draws none), and Doom's file is 1,355,636 bytes. The item:
    Doom's five PNGs are 2.24 MB of a 2.34 MB file. A 512 px or
    KTX2 / WebP copy for the arena (the workshop could keep 1024) is phase 2's
    choice, measured on the GPU the user plays on.
14. **A head scale.** The UBC bodies' heads are enlarged (heroic-miniature
    proportions, `headScale`); a personal model's is life-size and will read small
    at 60–100 px. Whether to scale it is a look question for phase 2.
15. **FBX and `.blend` input.** The pipeline reads glTF, GLB and VRM. An FBX or
    `.blend` original needs Blender (or Sketchfab's autoconverted glTF, which is
    what Doom used).

### Fix pass 1 — the verifier's round 1, 2026-09-28 (D192)

The verifier found `check.mjs` unable to fail a wrong rig map — its rotation
columns hold by construction — and its Chromium profile under `var/` holding a
copy of `model.glb`, with Google requests beside it; and two minors (prepare's
helpers untested in the gate; the evidence reading a tautology as a
measurement). All five are fixed, none skipped: `judgeBody` (weight, placement,
sides, facing, shape), the preview browser in the slug's folder with a net-log
proof, the whole pipeline in the test on a figure of boxes, and the evidence's
§5 note and §13. Re-running round 0's controls found one more: the `.gitignore`
negative control had gone blind once `tools/personal/` was committed (git never
calls a tracked file ignored), so `gitIgnores` now asks with `--no-index`.
Evidence §13 has the Doom numbers and the controls. Two follow-ups, neither
blocking:

16. **Chromium's last background attempts.** With every service switch this
    Chromium honours, it still tries signin's `accounts.google.com/ListAccounts`
    and a `www.google.com/async/…` call (and in some runs GCM's
    `android.clients.google.com/checkin`); the resolver rule answers each "not
    found" before any DNS query, and the net log proves nothing left the
    machine. A switch that stops the attempts themselves would make the log
    quieter; none of the obvious ones (`--incognito`, `--disable-sync`,
    `--disable-default-apps`, `--disable-extensions`) did. *Partly closed by fix pass 3:* the
    `www.google.com/async/folae` call is the omnibox's AI-mode eligibility
    request, and `--disable-features=AimServerRequestOnStartupEnabled` stops it
    (it had keyed an HTTP cache entry for `www.google.com`, D193); signin's
    `ListAccounts` and GCM's `checkin` remain, refused by the resolver and keying
    no cache entry.
17. **`tools/arena-bench.mjs` and `tools/story-shot.mjs`** start the same
    Chromium with none of this isolation. They load no personal data, but the
    lane rule "the tools fetch nothing" is the same; the flag list and the
    net-log reader (`lib.mjs`'s `netLogReport`) can move to a shared helper.

### Fix pass 2 — the verifier's round 2, 2026-09-28

The verifier's round 2 passed the lane, re-proved every number from its own
copy of the zip (the same `model.glb`, sha256 `de229ad3…`) and found one major
and three minors. **The major: fix pass 1 was left uncommitted**, on a claim that
was false: that `main`'s `CLAUDE.md` still said *"Do not run `git commit`"*.
`main` had replaced that section with *Commits, branches and merges* (**D201**:
Claude commits on branches and merges when the gate is green) before fix pass
1's gate ran; only this worktree, at `a08c15f`, still carries the old text. Fix
pass 2 commits fix pass 1 and itself on `personal-tier` under D201, and the
branch stays a fast-forward of `a08c15f`. The minors: `CLAUDE.md`'s section
heading said D190–D191 while its text cited D192 (now D190–D192, and the docs
table and this section's heading with it); the snap Chromium launcher's two
writes outside the repo were half named (both are now named, in D192 and
evidence §14 — `~/snap/chromium/common/chromium/Crash Reports/settings.dat` and
the `~/snap/chromium/<revision>/.config/ibus/bus` link); and `retarget.mjs` is a
proven copy of the build's formula rather than a factored import, which needs
nothing now and stays follow-up 8. Doom and all eleven controls were run again,
the verifier's two wrong maps among them (evidence §14): `model.glb` and all
seven previews came out byte-identical. **Fix pass 2's gate**, from a deleted
`bridge/out` at `GATE_JOBS=4`, `WSPORT=9000`: **240.4 s**, exit 0, 48 jobs
(934.4 s summed) at a load average of 2.2–7.6, `node --test` 966 / 958 pass /
0 fail / 8 skipped and vitest 120 (8 files)
(`var/check-all-personal-tier-fix2.log`); `~/forge` and `~/.forge` unchanged.
Two follow-ups, both for the merge:

18. ~~**Move this lane's `CLAUDE.md` text into `main`'s nested files.**~~
    **Closed by fix pass 3**: the paragraph is in the root's hard rule 8, the
    section is `tools/CLAUDE.md`'s *The personal tier — the conventions D190–D193
    added* with a pointer in the root's map, and the manifest was regenerated
    (18 entries added, none removed). The item, for the record: `main`
    split `CLAUDE.md` into a root file and per-area files (`04e69da`:
    `bridge/`, `web/`, `web/src/arena/`, `tools/`), holds every rule line and
    bold span to `docs/claude-md-rules.txt` (`web/test/claude-md.test.ts`), and
    caps the root at 9,000 words. This lane's two edits are written against the
    old single file: the hard-rule-8 paragraph (*A personal model is a statement
    about what a card is, too*) belongs in the root beside hard rule 8; the
    section *The personal tier — the conventions D190–D192 added* belongs in
    `tools/CLAUDE.md` (the pipeline), with a pointer from the root; then
    regenerate the manifest (`CLAUDE_MD_RULES_WRITE=1`) and let its diff show
    the new rules. Phase 2's loader rules will belong in
    `web/src/arena/CLAUDE.md`.
19. ~~**Reconcile `main`'s *Commits, branches and merges* bullet with D190.**~~
    **Closed by fix pass 3**: the bullet points at D190 and the guide, with a
    dated note of what it said. The item, for the record: that bullet (D201) says a personal-only asset is recorded in
    `tools/assets-manifest.json` as `committable: false`. D190 rejected exactly
    that: that manifest is the committed CC0 library's provenance, a personal
    entry in it would publish the fact of the file and blur the line D54 draws,
    and the personal manifest lives in the gitignored slug folder. At the merge,
    the bullet should point at D190 and `docs/guides/personal-tier.md`, as a
    dated note rather than a silent edit.

### Fix pass 3 — the third skeptic round, and the rebase onto `f2c934d`, 2026-09-28 (D193)

**The major**: a `bones.json` that swaps the forearm and the hand, on both sides
or on one, passed `check.mjs` with exit 0 and `OK — takes our clip set … nothing
exploded`. The rotation columns hold by construction, the weight still reached
22 joints, the sides were right, prepare's A → T turned each arm link onto the
agent's direction whatever it pointed at (177.5° for the swapped forearm), and
the bounds test cannot see a fold. **D193's limb check** (`judgeLimbs`, step 3b)
judges each spine, arm and leg link's direction (25°, the spine and neck 45°),
each limb's proportion (1/1.6–1.6× the agent's), where each limb joint's flesh
lies along its link (above 0), and the chain ends at attack t = 0.5. The
skeptic's three controls fail with named reasons — the forearm↔hand swaps on
the flesh (−0.42) and the proportion (0.52×) on each swapped side, `spine_02`↔
`spine_03` on its direction (176°) — and Doom's real map passes; so do Hulk's and
Nick Fury's, from the user's other downloads, which set the limits with the
`hero` body (evidence §15). The closing line lists what was judged.
**The minors**: the test gained the limb cases, a prepare case on the boxes (the
rest skin to 1e-4 m, decimation keeping every survivor's weights) and a third
wrong map, each held by a mutant; evidence §5 says the rotation equality is by
construction and points at the limb check; the preview browser's HTTP cache
was measured, and keyed a `www.google.com` entry with every background flag on
until `AimServerRequestOnStartupEnabled` was turned off, and its profile is
read for a copy of the model before it goes — the profile stays in the slug's
folder rather than moving to `var/` (D192, D193). **The rebase**: onto `main`'s
`f2c934d`, the `CLAUDE.md` text moved (18 and 19 above), D190–D193 kept their
numbers (D200). **Fix pass 3's gate**, from a deleted `bridge/out` at
`GATE_JOBS=4`, `WSPORT=9050`: **262.4 s**, exit 0, 48 jobs (1,001.2 s summed) at
a load average of 7.5–12.0, `node --test` 1,037 / 1,029 pass / 0 fail / 8
skipped and vitest 121 (8 files) (`var/check-all-personal-tier-merge.log`);
`~/forge` and `~/.forge` unchanged.

20. **The limits rest on four correct maps.** `hero` and the user's Doom, Hulk
    and Nick Fury set 25° / 45° / 1/1.6–1.6× / `s` > 0 (the correct maps reach
    7.7°, 36.2°, 0.71–1.20× and 0.16). A stylised body — a chibi's short
    forearm, a monster's long one — may land outside a band with a right map;
    measure it before widening one, and prefer a per-model note in the manifest
    to a looser rule for everyone.
21. ~~**The user's other downloads, as the pipeline prepares them automatically**~~
    **Closed by phase 2** (evidence §16): all eight pass `check.mjs` — two
    `bones.json` for the two-spine rigs, `--joints` for the three whose rest is
    not their bind, a `bones.json` for the Biped. The item
    (calibration only, evidence §15): Peggy Carter and the MCU Wasp (Mixamo,
    `spine_03` synthesised) fail D192's `spine_03 → clavicle` (92°, 78°) and
    Peggy a foot facing backwards; the older Wasp (a mesh posed on a T skeleton)
    fails a foot and both forearms' flesh; Coulson's Character Creator map puts
    the sides, a leg's links and an arm's two joints wrong and reads its rest
    back as 85° / −57°; Doom v2 needs a `bones.json`. Each wants a look at its
    rig before a `bones.json` or a prepare fix — the synthesised `spine_03` and
    Character Creator's twist and share bones first.
22. **The ends at attack t = 0.5 are weak.** They caught no arm fold (the clip
    carries a folded arm's hand the agent's way, cosine 0.98) and fire only on
    the legs. The limb's END FLESH over the whole clip, not its end joint at one
    phase, would be the stronger test.
23. **The preview profile stays in the slug's folder**, not under `var/` as the
    third round proposed (D193's rejected alternatives: D192 moved it out of
    `var/` after a copy of the model was found there). If the owner wants it
    under `var/`, it is one line in `check.mjs` and a sentence in D192/D193 and
    the conventions.
24. **Prepare's fold warning looks only at the forearm.** A leg is not re-posed,
    so its fold shows in the limb check's direction; a WARN in prepare for any
    link whose re-pose turn exceeds 120° would cover a future `--pose all`
    (follow-up 10).

### Phase 2 — the loader, the other seven models, the workshop (2026-09-28, D194–D196)

**Status: built, tested, gated and documented** on branch `personal-tier-2`
(the worktree `mtg-table-t2p2`, off `main`'s `096c952`); the lane's reserved
range D194–D199, five used (D197 and D198 by fix pass 1, below). Evidence
§16–§18; the guide's *In the game*.

1. **The pipeline** (D194): prepare BAKES our twelve clips into `model.glb` (the
   rotations would bind as they are; the agent's absolute hip track would stand a
   personal model 10 cm into the table), runs the paint step (one primitive per
   base colour, the tileable ones in one atlas — every model one draw call but
   Doom's two), reads the joints and the vertices in ONE pose (`--joints`), welds a
   part the simplifier stops on, reads spec/gloss as base colour; `check.mjs`
   holds the baked clips to the retarget (0.72°, ≤ 0.7 mm) and writes
   `check.json`; the manifest is version 2, with `disabled` and the seats by
   look.
2. **The eight downloads**: all pass `check.mjs`; six active (Doom — the card and
   the villain seat —, the three Hulk cards, Fury, Peggy, the MCU Wasp, Coulson),
   two disabled with their reasons (the fan Wasp's akimbo jacket, Doom v2 beside
   Doom).
3. **The loader** (D195): the dev route's index of the models that passed;
   `arena/personal.ts`'s reader, THE lookup (a corpus sweep three ways, hostile
   included, and each gate's removal failing it) and the dressed pose;
   `scene/personalModels.ts` behind `import.meta.env.DEV`; `FigureLayer`'s one
   model-source choice; the seat's duelist; `?personal=0`; the caps in `perf.ts`.
4. **The look** (D196): a personal model in its own colours under the comic
   look, a tinted hologram under `?look=holo`, its paints one figure's materials.
5. **The workshop** (D196): the badge, the personal/repo toggle, the inspect view,
   and the catalog's engine facts (Doom and the Hulks had never been face up in a
   recording; 94 deck cards gained facts from Forge's scripts).

**The gate**, twice from a deleted `bridge/out` at `GATE_JOBS=4`: `WSPORT=9070`
**241.7 s** and `WSPORT=9080` **241.3 s**, exit 0 both, 48 jobs (935.7 s and
934.1 s summed) at a load average of 0.4–9.4, `node --test` 1,050 / 1,042 pass /
0 fail / 8 skipped and vitest 121 (8 files) each time
(`var/check-all-personal2-p1.log`, `-p2.log`). The lane added no step and no job:
its tests are in the web step, its pipeline is by hand (it needs the user's
downloads). `~/forge` and `~/.forge`: unchanged (evidence §17).

25. **The inspect view's depth relief.** Today the art box is a flat picture
    behind the figure. The follow-up the owner named: the painting as a WINDOW —
    the frame panel in front, the art behind it with depth (a relief or a few
    layers), the figure between.
26. **Per-model tuning.** The MCU Wasp's wide wings make the width clamp draw her
    small (a measure that leaves the wings out, or a per-model width note in the
    manifest); Coulson's shirt shows through his decimated jacket (a per-part
    budget, or Blender); Doom's head bows under the hood at rest, so his mask never
    shows from the front; the Hulk's face texture smears up close (the verifier,
    fix pass 1); a head scale for life-size heads (follow-up 14).
27. **A floor rung that sheds personal models.** On SwiftShader three models cost
    about 2.6 ms at the median (the worst case D197 allows, about 4 ms); the DPR
    governor could drop them to the CC0 figures below its floor, as it drops bloom.
28. **Upload a paint at load.** A personal texture is uploaded at its first draw;
    `gl.initTexture` at load (as `useCardTexture` does for a card) would take a
    first-frame spike off the table (SwiftShader's max reached 66.7 ms once).
29. **The fan Wasp and Doom v2.** Both pass `check.mjs` and are disabled: the fan
    Wasp's jacket is an unskinned mesh modelled akimbo (Blender); Doom v2 reads
    worse than Doom. Which Doom dresses the card is the owner's call.
30. **A model prepared again needs a dev-server restart**: the index is built at
    start. Rebuilding it when a `check.json` changes would make the loop shorter.
31. **The inspect view's art box** is the modern frame's, measured once
    (`framing.ts`'s `ART_BOX`); a showcase or full-art frame needs its own.

### Phase 2, fix pass 1 — the verifier's round 1, 2026-09-29 (D197, D198)

**Status: fixed, re-pictured, re-benched, gated and documented** on the same
branch; two more of the lane's reserved numbers used (D197, D198). Evidence §18.
The verifier found two majors and three minors; all five are fixed, none skipped.

1. **The triangle line** (major, D197). The phase-2 caps bounded each model and
   the count, not their product — up to six models at 8,000, about 66,000
   triangles on the table, where the bench had drawn three at 6,000. The personal
   tier now has a line of its own on top of report 13 §8.2's 30,000:
   `PERSONAL_TABLE_TRIS` = 36,000 personal triangles, a SUM `personalChoicesOf`
   spends (the seats first), benched at its worst case — six two-paint models of
   5,996 dressing both seats and four creatures at `g1`@316: 50,225 triangles and
   90 calls on the GTX 1080 with p95 unchanged; 53,407 and 95 on SwiftShader, the
   median about 4 ms slower. `tools/arena-bench.mjs` now fails a frame over
   §8.2's line, and `--personal` adds the tier's.
2. **Doom's own colours** (major, D198). Two causes: "black is blue" mixed his
   dark texels toward navy, and his texture is authored for a lit renderer (85%
   of his surface under linear luminance 0.02). The comic look now lifts a dark
   OWN texel with its hue kept (`comicPaintOwn`), and prepare exposes a paint too
   dark to read unlit (one gain in linear light, Doom ×7.49, Peggy ×1.35; the
   others kept). Doom reads green hood, tunic and cloak over grey steel with gold
   clasps; Coulson's suit is charcoal, not navy.
3. **The build test's race** (minor): `13c-node` now waits for `13a-build`, and
   `13a-build` moved up the launch order so the wait costs nothing.
4. **The dev route applies the per-model caps** (minor): an over-cap model is
   listed as skipped at start, with why, and shadows no other model. The start
   lines also print each model's exposure gain.
5. **The workshop's clip panel** (minor) names "your model" while the pedestal is
   dressed, never the CC0 body it replaced (and never a slug).

**The gate**, from a deleted `bridge/out` at `GATE_JOBS=4`, `WSPORT=9070`:
**241.5 s**, exit 0, 48 jobs (931.4 s summed) at a load average of 0.8–4.1,
`node --test` 1,054 / 1,046 pass / 0 fail / 8 skipped and vitest 121 (8 files)
(`var/check-all-personal2-fix1.log`). `~/forge` and `~/.forge`: unchanged
(evidence §18).

The verifier's reading of the pictures, acted on: the colours (2, above); Doom's
mask under his bowed hood, the MCU Wasp drawn small by her wings and the Hulk's
face texture smearing up close are per-model tuning (follow-up 26, which now
names the Hulk's face too).

32. **One exposure target for every model.** 0.2 at the surface's 90th
    percentile was set on eight models; a model whose brightest surface is small
    (a dark costume with one white emblem) would be judged by the emblem.
    `--exposure <gain>` is the override today; a per-model note in the manifest,
    or a target read off the card's art, would be the next step.
33. **The worst case passes §8.2's 90-call line on SwiftShader** (95; 90 on the
    GTX 1080, and 91 there on the status layer, whose strip is one call more —
    evidence §19): a two-paint model is one call more than the body it replaces.
    Folding a wrapping paint (Doom's tunic) into the atlas — its UVs brought into
    one tile, the texture repeated into it — would make every model one call.
34. **`arena-bench --personal` is a flag the caller must remember.** The page
    could put a count of dressed figures in `info().layers` (a number, never an
    id), and the bench pick its line from what was drawn.

### Phase 2 onto the status layer — the rebase onto `2bd8514` (2026-09-29)

**Status: rebased, tested, benched, gated and documented** on `personal-tier-2`,
now on `main`'s `2bd8514` (the status layer, D210–D212); no decision number used,
no follow-up opened. Evidence §19.

- **The conflicts** (`Arena.tsx`, `FigureLayer.tsx`, `Pedestal.tsx`, the arena's
  `CLAUDE.md`, the root `CLAUDE.md`, this file and the rules manifest) each keep
  both behaviours: `FigureLayer` commits the status strip into its one field,
  bound from `DiscField.bind`, AND chooses a personal model per pose; `Arena.tsx`
  and the pedestal keep the strips, the personal index, the status rehearsal, the
  personal toggle and the inspect view.
- **The join**: the strips are laid out from the DRESSED poses, so a dressed
  figure's strip stands over its model's refitted height, and `strippable` never
  asks which model is worn — a new `personal.test.ts` case, with a hostile
  dressing as its control.
- **The bench** at `g1`@316, bloom off: the real tier 82 calls on the GTX 1080 and
  86 on SwiftShader (a dressed figure wears none of our props); D197's worst case
  91 and 95 (50,305 and 53,297–53,421 triangles), the strip's call on top of §18's
  90 on the GTX 1080 and absorbed by one prop kind fewer in SwiftShader's sample.
- **The gate**, twice from a deleted `bridge/out` at `GATE_JOBS=4`: `WSPORT=9100`
  **242.2 s** and `WSPORT=9110` **242.5 s**, exit 0 both, 48 jobs, `node --test`
  1,075 / 1,067 pass / 0 fail / 8 skipped and vitest 122 (8 files)
  (`var/check-all-personal2-merge-p1.log`, `-p2.log`). `~/forge` and `~/.forge`:
  unchanged.

## The status layer — keywords, a bar, pips and a turn-order bar (2026-09-28, D210–D212, amendment M49)

The owner's idea, with a Final Fantasy XIII screenshot: watching a game should
read like a turn-based RPG. Each creature carries a small status strip — its
keyword abilities as icons, a bar of what is left of its toughness, a pip per
counter and a mark per attachment — and the phase strip becomes a turn-order bar.
Branch `status-layer`, off `main`'s `f2c934d`, the `mtg-table-t2z` worktree, the
reserved range D210–D219 (three used).

- **The wire (amendment M49).** A full card gains `keywords`: Forge's `Keyword`
  constants by `name()` (`FLYING`, `FIRST_STRIKE`), no parameter, `UNDEFINED`
  omitted, `[]` on every face-down card, never on a stub — written in `Snap.card`'s
  full branch, both branches of the null-state check. Optional, with one reader
  (`keywordsOf`); all or none per file in `tools/check-redaction.mjs`, with four
  one-defect controls and a passing one under `fixtures/negative/redaction/m49-*`;
  step 6 and 9b compare a fresh recording against a committed file that predates
  the key with the key removed. Nothing committed was re-recorded (**D210**).
- **One table, two renderers.** `web/src/status.ts`: the procedural glyph kit, the
  keyword map, the bar, the pips, the marks and `cardStatus` — `null` for a stub
  and any face-down card. The board's `CardTile` draws the icons in a row under
  the P/T (titles naming each keyword) and the bar along the bottom; the P/T pill
  and the damage chip are unchanged (**D211**: the bar is a picture of
  `toughness − damage` and decides nothing).
- **The arena's strip** (`figures/status.ts` + `scene/status.ts`, **D212**): one
  instanced mesh for every strip on the table — one draw call — a billboard at a
  fixed 16 px icon size, anchored above the standing height by measurement,
  upright when its figure kneels, riding its cue offset; built and committed by
  `FigureLayer`, bound from `DiscField.bind`, allocation-free, held by liveness.
- **The turn-order bar** at the arena's left edge: the eleven phases, the active
  one lit, the seat's stops as pips that send the board's own `setPhaseStop`.
- **The workshop**: a *status strip* rehearsal (the corpus's damage and counter
  events, a labelled sample of keywords, since no committed recording has any);
  the catalog learned an optional `keywords` fact and rebuilt byte-identical.

**Measured** (`docs/evidence/status-layer.md`): the corpus sweep — 3,679 frames,
10,763 strips, none over any of 1,179 concealed creature instances, and hostile
(every card handed keywords) still none, where an ungated layout would draw 1,138;
the head clearance at the table view through the real `figures.glb`, closest
2.2 px, the no-lift control 5.8 px into a head; the bench, one draw call and
80–92 triangles: `g1`@355 88 (GTX 1080) / 89 (SwiftShader), `g1`@316 87 / **91**
— one over report 13 §8.2's line on SwiftShader, accepted by D212; frame times
unchanged within the pair spread; the 2D entry chunk 93.52 kB gzip, no `three`.
`npm --prefix web test` standalone 1014 + 122 (8 files).

**The gate**, from a deleted `bridge/out` at `GATE_JOBS=4`: **245.5 s** at `WSPORT`
9030 and **249.6 s** at 9040, exit 0 both, 48 jobs; `node --test` inside it 1029 /
1021 pass / 0 fail / 8 skipped, and 122 vitest. A first try failed at `13c-node` on
this lane's own over-strict ws-log case (10g's Thallids have no keyword); fixed
before the two green passes (evidence §9). `~/forge` and `~/.forge` were
fingerprinted before and after and did not change.

<a id="fu-status"></a>

### The status layer's follow-ups — twelve, 2026-09-28

1. **g1 predates M49.** Step 6 compares everything but the keywords' values
   (`tools/wire-drift.mjs`'s `LATER_KEYS`); the next deliberate re-recording of
   `fixtures/games/g1.jsonl` brings them under the drift check, and should remove
   the row.
2. **No committed recording carries keywords**, so the corpus sweeps prove the
   gates on a hostile copy and the workshop shows a labelled sample. A committed
   M49 recording (a deliberate new fixture, with the counts that pin the corpus
   moved in the same change) would let the catalog show real keywords.
3. **The bar does not animate its drain** — it is the snapshot's damage. A drain
   is a cue: an `Offset` field that decays to identity, measured against
   `motion.test.ts`'s pinned classic film first.
4. **`g1`@316 on SwiftShader is 91 draw calls**, one over report 13 §8.2's line.
   The next layer that wants a call there gives one back first (the on-card disc
   pass folded into the front pass on frames that do not wrap, or the contact
   shadows drawn with the discs).
5. **The far seat's strips sit ~30 px above the heads**, over the opponent's
   land rank from the table view: the heads lean toward the lens and the anchor
   is over the stand point. Anchoring at the head's rest-pose position (from the
   rig at commit) would bring them down.
6. **Raised hands and held props can reach the strip** — Quake's gauntlets
   attacking (−9 px), Agent 13's muzzle at the ready (−7.6 px). The test holds the
   head and what is worn on it, not the hands.
7. **The icon size is fixed** (16 CSS px). A tuning row in the workshop — size,
   lift — and an arena setting would let the owner judge it on the table.
8. **The arena has no tooltip for an icon.** A hover over a card could name its
   keywords in the DOM layer, the art credit's pattern.
9. **The glyphs are procedural.** Kenney's CC0 game-icon packs were the brief's
   intended source; downloading them is the owner's call, in chat, with the
   licence badge recorded on the day.
10. **`UNDEFINED` keywords are omitted.** The census found one, engine script
    with an empty title; a deck with an UNDEFINED keyword a player would
    recognise would need a gated display string — re-run the census (§1 of the
    evidence) when a deck is added.
11. **Strip and stack thumbnails, and the zoom, show no keyword row** on the
    board; the zoom has room for one.
12. **`UNTAP` and `CLEANUP` are not cells of the turn-order bar**, so a CLEANUP
    stop (a Forge preference) can be set on the board only.

---

## Deferred — out of scope for M0–M7

Not cancelled, not scheduled. **M6 has landed and M7's Tier 1 with it**, so these
are now revisitable rather than blocked; nothing below is scheduled by that, and
each still needs a decision of its own before it becomes work. The arena's
**Tier 3** (per-card models) belongs on this list too; **Tier 2** left it on
2026-09-13 and is now **complete** — four slices, T0–T14, the camera views,
per-card identity, proportioned bodies in costumes and the duelists (*M7 Tier 2*
above; all four slices are on `main`). **Tier 3 means likeness**, and a likeness model of a Marvel character
would be **personal-only** — local, gitignored, never committed or published, and
never made from card art (**D54**): *Tier 3 — a note, not a plan*, above.

- ~~A second deck, a deck picker, and an AI profile selector.~~ **Done
  2026-09-27 as match setup** — *Match setup*, above: a second real deck for the
  AI, and the AI's deck and Forge profile chosen by a flag or `config.json`.
  What stays here is its browser half: **a deck and profile picker in the
  page**. Today the choice is made before the session starts, and changing it
  in the browser would mean an act that ends the session and seats a new one,
  because `createAiPlayer` and both decks are fixed before `startMatch` (report
  11 §9). There is still no "difficulty" to pick (**D107**).
- ~~The SQLite (`node:sqlite`) + FTS5 card library, the `oracle_cards` bulk
  stream, a local image cache and an `/api/images` proxy.~~ **Brought forward
  2026-09-27** on the user's request (**D90**): `tools/card-library/` (the index,
  the bulk stream, the image cache, the query CLI) and the card browser at
  `#cards` (`web/src/cards/`), whose image route is **dev-server only** and never
  fetches — so there is still no `/api/images` *proxy* (**D92**).
  `docs/evidence/card-library.md` is what was measured, and *The card library
  and the card browser*, above, has the status and twelve follow-ups. What stayed
  out: report 03 §4.5's re-fetch on a newer `image_updated_at` and its dated retry
  for a `missing` / `placeholder` image, `resolve --write`, the
  `/cards/named?fuzzy=` rung, a production (non-Vite) route, and every-print
  images without `--yes` (`tools/card-library/README.md`, *Not done*).
- A deck builder.
- `state_patch` / RFC 7386 merge-patch deltas.
- Multiplayer. Accounts. Packaging.
- Engine-level seeded replay (byte-identical re-runs).
- Bug-report zips.

Everything on the README's **NON-GOALS** list is a harder no than this: those are
decisions, not deferrals.

---

<a id="owner-questions"></a>

## Only the user can decide

From synthesis §13. The plan below assumes a default for each; a different answer
changes the plan, so raise it rather than quietly re-deciding.

| # | Question | **Default this plan assumes** |
|---|---|---|
| 1 | Licence: GPL-3.0-or-later, or AGPL-3.0-or-later so manabrew's `forge-harness` could be forked? | **GPL-3.0-or-later, and no manabrew code.** |
| 2 | Is the +2-evening M1 recorder worth it, or go straight for the browser seat (first game at evening 5, but no replay, no fixtures, JVM-coupled UI work)? | **Keep the M1 recorder.** |
| 3 | React or vanilla TS for `web/`? | **React, with plain hooks.** |
| 4 | Should anything ever rewrite `~/.forge/decks/constructed/Pacho SHIELD.dck` in place to add the missing `\|MSC` suffixes? | **Never rewrite it. Write a copy.** |
| 5 | Card images hot-linked from `cards.scryfall.io`, or proxied through our own origin with a 302 (the way Endstep does)? | **Hot-link in v1.** Unchanged for the board. The card browser (2026-09-27) serves the user's own image cache from the dev server's origin and hot-links on a miss — never a proxy (**D92**). |
| 6 | Install a JDK? Not needed for this plan, but it would bring `jar`, `jshell`, a debugger and Maven. Unpack Temurin 21 into `tools/jdk/` (no sudo) or `apt install openjdk-21-jdk` (sudo)? | **No JDK. The JRE's `jdk.compiler` / `jdk.jdeps` modules suffice.** |
| 7 | GitHub: public repo or private? Affects whether NOTICE and the Fan Content disclaimer must be publication-quality on day one. | Undecided — **NOTICE is written to publication quality anyway**, so either answer works. |
| 8 | Is losing to the Forge AI acceptable in v1, or does the AI profile / difficulty picker come forward from the deferred list? | **The picker CAME FORWARD on 2026-09-27**, when the user asked for deferred work to be expedited: match setup (amendment **M44**) picks the AI's deck and its Forge profile (`--ai-deck`, `--ai-profile`, `config.json`'s `match` block). **It is not a difficulty setting** (**D107**) — Forge has none, and in same-seed pairs against the automated seat Cautious and Reckless were not measurably different (`docs/evidence/match-setup.md` §P). Whether losing to the AI is acceptable is unchanged: nothing here makes it weaker. |
| 9 | **New, M5.** Should Forge's floating-mana warning (`FPref.UI_MANA_LOST_PROMPT`, a `confirm` before you pass priority with mana that would be lost) be on in real games? It is off in stock Forge; `--mana-lost-prompt` turns it on in memory for probe runs, and it is the only way the `confirm` ask kind is reachable at all. | **ANSWERED BY M6: ON.** `config.json` `"manaLostPrompt": true`, set in memory only (never `save()`), overridable with `--mana-lost-prompt` / `--no-mana-lost-prompt` (amendment M40). `confirm` therefore occurs in ordinary games; nothing else moved. Raise it again if the prompt turns out to be a nuisance. |
| 10 | **New, Tier 2.** Report 13 §13's first six questions — art direction, models from card art, the GPU, idle breathing, duelists, lights. | **ANSWERED by the user before T0**, as nine decisions, recorded as **D53–D62**: stylised low-poly CC0 figures under a holographic, unlit treatment; figures at their card with the card plane kept; **no** AI-generated models from card art; **no** Mixamo; procedural slab lands; bloom on if the bench allows (it did, on the GTX 1080); breathing only while something else animates; silhouette busts, avatars deferred; mana motes to the controller's casting anchor. **One of the nine has since been superseded**: "silhouette busts, avatars deferred" (**D62**) by slice 4's full duelists (**D99**), on the workflow's reading of the user's verdict on slice 3 — the busts are kept as the fallback, and whether the duelists were wanted is slice 4's follow-up 1. |
| 11 | **New, Tier 2.** Commit `web/public/models/figures.glb` (**373,236 bytes since slice 4** — 143,920 in slices 2–3, 126,404 in slice 1 — CC0, built by `tools/build-figures.mjs` from five sources), or gitignore it and regenerate it like `web/public/art.json`? | **Undecided — nothing in the code depends on the answer.** A checkout without it draws every creature as its disc, and the duelists as their busts, and says so once in the console, and `figures.test.ts` skips its hash check. If it is committed, `figures.test.ts` holds it to the bytes and sha256 `models.json` records, and `@gltf-transform/cli` should be pinned exactly first (Tier 2 follow-up 17 — since slice 4 it also decides the simplifier's version, **D96**). |
| 12 | **New, Tier 2.** Should the live combat budget let the clip lane play (Tier 2 follow-up 1)? Today a combat batch in the human's own turn is snapped, so the lunge and the hit are replay-only. | **Unchanged: Tier 1's budgets stand.** The user's play-test of slice 1 (2026-09-27) reported nothing major, so the default holds; slice 2 fixed a second cause (the idle-gap clock, **D72**) and measured the first live (17 of 44 batches still snapped). Raise it again if the next play-test — *"What slice 2 hands to T9–T14"* — says the combat reads wrong live. **Slice 4 added a third casualty**: a duelist's flinch when the human takes damage is snapped the same way, and the verifier never saw one live (slice 4 follow-up 7). |
| 13 | **New, Tier 2 slice 3.** Should your figures face the OTHER seat? Measured in slice 3 (**D81**): both sides faced outward, away from the combat lanes. | **ANSWERED 2026-09-28: yes** (**D143**, Lane LOOK). `seatFacingY` is π for your seat and 0 for the opponent's: you see your figures' backs and the opponent's fronts. Every identity prop still reads from both seats (`traits.test.ts`), the Doombot's jetpack joining the one-sided details with its visor as the front partner; the workshop's *faces its player* previews the old facing. |
| 14 | **New, Tier 2 slice 3.** Is **likeness** — figures that look like the characters, a model per card — part of the end goal, or is identity-through-props and costumes (slices 3 and 4) where the arena should stop? **Since slice 4 this is the one question Tier 2 leaves open.** | **Undecided; Tier 3 is not started and nothing assumes it.** Slices 3 and 4 are as far as identity goes inside Tier 2 — a proportioned CC0 body in a painted costume carrying shared props. If likeness is wanted, it is **personal-only** (local, gitignored, never committed or published, `committable: false` in the manifest), never generated from card art and never from Mixamo (**D54**), and its source is yours to choose — *Tier 3 — a note, not a plan*, in *M7 Tier 2* above. A play-test of slice 4 is the input: if the cards read as themselves at the table, the answer may be "no"; *What Tier 3 would be, concretely, after slice 4* says how small the seam is if it is "yes". |
| 15 | **New, card library.** Commit `fixtures/cards/` — a 0.69 MB slice of Scryfall's data (172 `oracle_cards` lines, 84 MSH/MSC print lines, 6 sets, no images), reduced to the fields the library reads — or gitignore it? | **Committed as reduced** (**D90**): it keeps `cards-lib`, `cards-api` and six `cards-ui` tests offline and hermetic, and it is regenerated by `make-fixture.ts`, never hand-edited. The alternative is to gitignore it and let those tests skip when it is absent — a suite whose result depends on what is lying around, which the repo has been bitten by once (`MTGTABLE_WS_LOGS`). |
| 16 | **New, card library.** What contact goes in `config.json`'s `scryfallUserAgent`? Scryfall asks for an accurate, identifying User-Agent; the committed one reads `github.com/<user>/mtg-table`. | **Only you can supply it.** Until then `build.ts` and `images.ts` warn on every run that talks to Scryfall, and NOTICE §2 says it must be replaced before anyone talks to Scryfall. |
| 17 | **New, card library.** Fetch every MSH + MSC print's image (`images.ts --all-prints --yes`: 1,338 images, ~104 MiB into `var/cards/images/`), so browsing the two sets stops hot-linking? | **Not fetched**: only the ten decks' 41 images are cached, and the browser hot-links the rest from `cards.scryfall.io`. Nothing depends on the answer. |
| 18 | **New, engine and sets.** Play Reality Fracture now — on Forge's daily build, or by overlaying card scripts onto 2.0.14 — or wait for an official Forge release that ships the set? | **ANSWERED by you, 2026-09-27: wait.** *"Let's not break anything to force in the latest cards."* Recorded as **D109–D111**: official releases only, no daily build, no hand-written or overlaid scripts, no fixture re-recorded, and the deck stays as you built it (no edits to dodge the three Empower cards). *Engine and sets* has the checklist for the day. |
| 19 | **New, engine and sets.** Fix the bridge's M6 next-game race (*Engine and sets* follow-up 1) on `main` now, as its own change, or leave it until the day? It is latent on 2.0.14 (0 of 5 sessions) and killed a game in 2 of 6 on the daily build. | **Not scheduled — but it must land before any engine switch**, with its fix chosen in a DECISIONS entry. The two gate defects (follow-ups 2 and 3) and `MtgTable`'s OK on a 0-turn game (follow-up 4, the match-setup branch's file) are the same question. |
| 20 | **New, engine and sets.** The FRA opponent: accept `docs/drafts/decks/fra-gb-leftovers.dck` (your notes' green-black leftovers deck, plus 18 basics), change its mana, or supply another list? | **A draft until you say** (**D112**). Accepting it is `cp` into `decks/`. On the daily build it beat the red-white deck 25–15 with the Forge AI piloting both, which says little about you at the red-white seat. |
| 21 | **New, engine and sets — for the day.** (a) Move the engine pin into the repo — `tools/forge-engine.json`, `tools/get-forge.sh`, `var/forge-engine/<version>/`, a relative `forgeJar` with its sha256 in `config.json` — instead of an absolute path to a hand install? (b) Re-record `g1` (probably `g2` / `g3`) if the release, like the daily, differs from 2.0.14 only in the order of `stats.cardIds`? | **Neither happens without you, and they are two decisions, not one.** (a) is specified in report 14 §5.2 and not built (**D110**); (b) follows report 14 §5.4 — re-record only after a content diff, stop on any real change, and in a commit of its own. |
| 22 | **New, engine and sets.** Keep the prepared files to commit (the two FRA deck files, `tools/audit-deck.mjs` and its helper, `tools/javap-seam-diff.sh`, `docs/research/patches/`, `docs/drafts/`, report 14 and its evidence), and should `audit-deck.mjs` join `check-all.sh`? | **Keep them; `audit-deck.mjs` stays a hand tool** — it needs a built `bridge/out`, takes a few seconds, and today it would only re-prove the MSH decks the gate already plays. Showing Prepare on the board (follow-up 8) is a later decision of its own, not the day's. |
| 23 | **New, more villains.** Which deck should a bare `./scripts/play.sh` seat against you — Doom Legion, one of the three added on 2026-09-28, or a rotation? | **Doom Legion, unchanged** (`config.json`'s `match.aiDeck`; the lane was told not to move it). The others are one `--ai-deck` away. |
| 24 | **New, more villains.** Should `tools/deck-smoke.sh` demand the flat 8 spells a game (the lane's brief), or the rate it asserts, `min(8, AI turns − 3)` (**D117**)? | **The rate**, because against the automated seat 5 of 40 games reach 8 however the deck is built; `DECK_SMOKE_STRICT=1` is the flat 8 on demand. |
| 25 | **New, the comic motion lane.** Keep **comic FX** on by default (impact stars, the five words, splats, dots, speed lines, the ink summon, the jolts), or ship it behind `?fx=comic` until played? | **On by default** (D152) — it reads over the hologram and the comic look alike, and `?fx=classic` / the cue strip's checkbox is the film before it, op for op. |
| 26 | **New, the comic motion lane.** Keep **on twos** (every cue stepped to twelve drawings a second) on by default? It is the comic's stepped motion, and some eyes read it as judder, especially on a high-refresh display. | **On by default** (the brief), off under reduced motion; `?twos=0` and a checkbox. |
| 27 | **New, the comic motion lane.** The five words — POW, BLAM, KRAK, ZZAK, WHOOSH — and which card says which. The list is closed on purpose (D150); a word is a decision. | **The five of report 15 §5.1**, assigned in `cues.json`'s `_motion` notes. |
| 28 | **New, the comic motion lane at merge.** Every creature arrives summoning-sick, which the comic look draws half hologram, so its summon resolves from hologram to HALF ink. Should the summon swing all the way to ink and then settle to half (the ramp overshooting identity, clamped by the shader), or stay as it is? | **As it is**: the product of the two lanes' decisions (D142, D148), as LOOK's follow-up 5 expected. The overshoot is one line in `playMaterialize` (the motion lane's follow-up 13). |
| 29 | **New, Lane BODIES.** Download the *Universal Base Characters* pack again (`Universal Base Characters[Standard].zip`, 128,968,391 B, from <https://quaternius.itch.io/universal-base-characters>) so the hair is the pack's own hairstyles instead of four procedural shells? A download is your approval in chat, with the badge read on the day (**D54**, **D95**). | **Not downloaded** (**D157**): two carved styles and four shells; the route is the lane's follow-up 2. |
| 30 | **New, Lane BODIES at merge.** Keep the **art rung** on — every face-up card with no hand-written colour takes its painting's (the Giant-Sized Flying Ant brown, Wasp's aura salmon) — or put it behind a switch until played? The lane left it to you (**D164**); the merge applied it, as the lane's follow-up 13 said "whoever merges LOOK and BODIES" would. | **On** (**D164**, amended). `palette: off` in a `traits.json` row turns it off for a card; there is no page-wide switch. |
