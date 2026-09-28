# Engine upgrade — Reality Fracture readiness

What was measured on 2026-09-27 while preparing for the day Forge's official
release supports **Reality Fracture** (Scryfall `fra`, released 2026-10-02; Forge
edition `Reality Fracture.txt`, code `FRA`), so the user can play their
pre-release deck, `decks/fra-rw-aggro.dck`, against the AI.

**The user's constraint governs everything below:** *"Let's not break anything to
force in the latest cards. Things will be available through official channels soon
enough."* So the engine **stays Forge 2.0.14**; nothing here changes how the game
runs today. No card script was added to `forge-home/custom-cards/` (DECISIONS.md
**D14**: "a second overlay script is a decision to re-open here, not a file to drop
in"), `tools/make-forge-home.sh` and `config.json` are untouched, and no committed
fixture was re-recorded. Every measurement ran in a **throwaway Forge home under
`var/`**, never in `forge-home/` or `var/forge/`.

What this work leaves in the tree:

| File | What it is |
|---|---|
| `decks/fra-rw-aggro.dck` | The deck in Forge's format: 40 main (`Card\|FRA`, `9 Mountain\|FRA`, `8 Plains\|FRA`), 10 sideboard (`Austere Command\|SPG`, the set's Special Guests reprint). |
| `decks/fra-rw-aggro.txt` | The same list as plain text, `Sideboard` header, for people and the card library. |
| `tools/audit-deck.mjs` + `tools/audit-deck/AuditDeck.java` | Per-card "will this deck actually play on this engine?" — see §5. Read-only: it builds its own Forge home under `var/audit-deck/`. |
| `docs/research/patches/bridge-forge-2.0.15-snapshot-09.27.patch` | Spike B's bridge port, **not applied** — see spike B §(2) and the preparation pass below. |
| `docs/research/patches/javap-2.0.14-vs-2.0.15-snapshot-09.27.txt` + `tools/javap-seam-diff.sh` | The 95-class seam diff the port was written against (regenerated on the rebase onto `a092d3a`: 99 classes, the four match setup added, the changed lines otherwise identical), and the read-only script that regenerates it for any two jars. |
| `docs/drafts/decks/fra-gb-leftovers.dck` + `docs/drafts/README.md` | A **draft** FRA AI opponent: the green-black "second deck from the leftovers" the user's own list proposes, plus 18 basics. Every card is scripted in the snapshot. Not under `decks/`: see the preparation pass. |

Both deck files parse with nothing skipped in `tools/card-library/deck.ts` (40 main,
10 sideboard), and `node --test test/*.test.ts` in `web/` is 797 pass / 0 fail with
them present (`cards-lib.test.ts` walks every file in `decks/`). One visible side
effect: the dev card browser lists every `decks/*.dck`, so the deck appears there;
its cards resolve only once the local card library syncs `fra` (it indexes
`msh`/`msc` today) and are simply absent until then.

---

## Spike A — overlaying the snapshot's card scripts onto 2.0.14

The question: can the 2.0.14 engine play this deck today if we copy the daily
snapshot's (`2.0.15-SNAPSHOT-09.27`) card scripts into Forge's user overlay?
**Short answer: not the deck as the user built it** — one main-deck card and two
sideboard cards use an ability type 2.0.14 does not have, and a card that cannot be
built takes the whole game down before turn 1. The snapshot engine itself plays the
exact deck cleanly.

### 1. What each engine knows about the set

| | 2.0.14 (`2.0.14-SNAPSHOT-08.08`, the one we run) | snapshot `2.0.15-SNAPSHOT-09.27` |
|---|---|---|
| `Reality Fracture.txt` | 43 entries, **20 distinct names**, all 20 scripted | 461 entries across 15 sheets, 285 real names (+3 typos in sheet sections: `Lyla, Tolarian Archangel`, `Overwrite the Multivers`, `Winter, Tormented Lover`) |
| FRA names with a script in `cardsfolder.zip` | 36 of 285 (the 20 above plus reprints and basics: Tarmogoyf, Unsummon, Last Gasp, …) | **285 of 285** — 249 under `upcoming/`, 36 elsewhere |
| The user's 50 cards (40 + 10) | 19 build (Woodwork Prodigy, the 17 basics, Austere Command); **31 missing** | **50 of 50 build** |

**Correction to the premise this spike was handed.** "247 scripted, 38 missing,
three of them in the deck (Ajani's Anguish, Chandra's Emberling, Woodwork Prodigy)"
is a lookup artefact, not a gap. Indexing the zip by each script's own `Name:` line
finds all 285: 249 live under `upcoming/` (e.g. `upcoming/ajanis_anguish.txt`,
`upcoming/chandras_emberling.txt`), and 22 have a file name that carries the
prepared spell's name as well (`w/woodwork_prodigy_soul_tether.txt`,
`upcoming/pyre_rhymer_molten_tide.txt`, …). **No card needed hand-writing**, so
none was drafted: the official release will ship Forge's own scripts, and writing a
second copy would be exactly the unnecessary work the user asked us to avoid.

The snapshot's scripts were checked against the printed cards instead: for all 25
FRA names in the deck and sideboard, `GET /cards/named?exact=…&set=fra` (the
project's two mandatory headers, ≤ 2 req/s) against each script's `Oracle:` lines.
**23 match exactly.** Pyre Rhymer's back face reads "an additonal {R}" in Forge's
text (a typo in the display string only — the ability is `DB$ Mana | Produced$ R`),
and Ghalta the Immovable differs only by a curly apostrophe. Austere Command is a
stock reprint and was not compared.

### 2. What the old engine lacks — by `javap`, not by guessing

The enum diff between the two jars (`javap -cp <jar> <enum>`) is small:

| enum | added in the snapshot | removed |
|---|---|---|
| `forge.game.ability.ApiType` | **`Empower`** | `Ascend` |
| `forge.game.staticability.StaticAbilityMode` | `CanBlockIfShadow`, `CantBeBeamedUp`, `CantGainControl`, **`CombatDamageNegatePower`**, **`IgnorePlaneswalkerZeroLoyaltyRule`**, `ManaRestriction` | |
| `forge.game.trigger.TriggerType` | `FlippedCoinOnce` | |
| `forge.game.keyword.Keyword` | `BEAM_ME_UP` | |
| `forge.game.card.CounterEnumType` | `GLASS`, `SHY` | |
| `ReplacementType`, `CardSplitType` | — | — |

Scanning the 249 new FRA scripts for those names: **35 scripts use `DB$ Empower`**
(the set's "Empower Jace N" mechanic — create a Jace planeswalker token, then add
loyalty), one uses `CombatDamageNegatePower` (Loot, the Anomaly) and one
`IgnorePlaneswalkerZeroLoyaltyRule` (Sanctum Lurker, which also empowers). A second, wider scan — every
identifier in a script that the snapshot's `forge/**` class constants contain and
2.0.14's do not — adds only `YouScryThisTurn` (3 scripts), `PlaneswalkerType` (Tam)
and `dealtCombatDamagetoAny` (Ruric Thar, Magecrusher): parameters and properties
2.0.14 would read as nothing, silently. The set's other mechanic, **Prepare**
(`AlternateMode:Prepare`, `DB$ AlterAttribute | Attributes$ Prepared`, `IsPrepared`),
is already in 2.0.14 — Woodwork Prodigy has been scripted there since August.

### 3. The overlay, loaded into 2.0.14

The 249 FRA scripts 2.0.14 does not have, plus the five token scripts they reference
that 2.0.14's `res/tokenscripts/` lacks (`c_1_1_a_sculpture_treasure`,
`g_3_3_forest_tentacle`, `lotus`, `u_3_3_angel_flying`, `u_8_8_leviathan_hexproof`),
were extracted to `var/fra-scripts/` and loaded as a user overlay. The 36 FRA names
2.0.14 already scripts were **not** overlaid (kept in `var/fra-scripts/stock-overlap/`
for reference): overriding a working stock script with one written for a newer engine
is how a reprint that plays today stops playing.

- **Parse:** all 249 load into `CardRules` — 0 "Error loading cardscript", 0
  unsupported.
- **Build** (`node tools/audit-deck.mjs --overlay var/fra-scripts --all-custom`):
  **213 of 249 build; 36 do not** — 34 throw
  `Element Empower not found in ApiType enum` inside `CardFactory.getCard`, Loot
  and Sanctum Lurker throw `No element named … in enum StaticAbilityMode` first
  (Sanctum Lurker would hit Empower next: 35 of the 36 use it).
- **The same 249 on the snapshot:** 249 of 249 build.

The deck on 2.0.14 + overlay: **47 of 50 build.** The three that do not are No
Admittance (main), Hexhaven Battalion and Way of the Pyromancer (sideboard) — all
Empower.

**What a card that cannot be built does to a game** — `MtgTable --transport auto
--deck decks/fra-rw-aggro.dck --deck2 decks/fra-rw-aggro.dck`, seeds 7, 8 and 9,
2.0.14 + overlay:

| seed | result |
|---|---|
| 7, 8, 9 | `Game-0 > java.lang.RuntimeException: crash in raw Ability, check card script of No Admittance` … `Element Empower not found in ApiType enum`; **0 player turns**, 0 `state` frames; `AUTO STUCK: no frame for ~60500ms -- conceding`; `OVER WITHOUT A gameOver STATE`. |

The crash is at zone preparation, so it is deterministic and seed-independent.
**The sideboard is built too:** the same deck with No Admittance swapped for Your Fate
Ends Here but the sideboard untouched crashed identically on Way of the Pyromancer
(seed 7). Note for whoever owns the bridge: all three runs still ended
`MTGTABLE OK` with exit 0 — a card crash at game start looks like a clean run unless
you read `player turns = 0`.

**With the three Empower cards removed** (No Admittance → Your Fate Ends Here, the two
sideboard cards dropped — a scratch deck, `var/spike-a/fra-v2-no-empower.dck`, not
committed):

| run | outcome |
|---|---|
| `MtgTable --transport auto`, seeds 7 / 8 / 9 | all finished: 17 / 11 / 14 player turns, 145 / 169 / 181 `state` frames, `UNIMPL members = none`, `emit errors = 0`. Seed 9 logged one swallowed AI exception (below). |
| 10 seeded AI-vs-AI games (seeds 7–16, a scratch runner over Forge's `Match`) | all finished, 13–36 player turns. Every main-deck nonland card reached the stack; prepared copies were cast (Soul Tether 3, Vicious Verse 3). **17 swallowed AI exceptions** (34 log lines), all `NullPointerException` in `forge.ai.ComputerUtil.hasACardGivingHaste`, 2.0.14's AI reading haste-granting statics whose parameters it does not expect: 3 at line 1442 (`affected` is null — Whiplash Wordsmith's static says `AffectedDefined$ Self` and has no `Affected$`), 14 at line 1494 (a `getParam(...)` that returns null). The AI's evaluation thread catches it and skips that option for that decision; the game goes on. |

"Every card reached the stack" is not "every card is right": a parameter the old
engine does not read is ignored without a word (§2), and the only full check would
be a card-by-card rules review under 2.0.14, which is the work the official
release makes unnecessary.

**The snapshot, same games, the exact deck:** 10 seeded AI-vs-AI games (seeds 7–16)
and 3 `mtgtable.Smoke` games, **0 exceptions**, no dropped card, deck conformance
legal. Every main-deck nonland card reached the stack **except No Admittance, which
the AI never cast** — 0 casts in those 10 games and 0 in two 60-turn probe games
with four copies. Empower itself works there: in the probe, Way of the Pyromancer and
Hexhaven Battalion each create the Jace token (`Jace Token enters with zero loyalty
counters`, then "empower Jace 2" resolves) and the AI activates its −1. So on the
snapshot this is an **AI choice** about a burn spell with an Empower rider, not a
broken card; a human seat's cast of it is untested until the bridge runs on the new
engine. Re-check it on the release.

### 4. Set names: why an overlay alone is not enough

- **User editions are supported.** `ForgeConstants.USER_CUSTOM_EDITIONS_DIR`
  (`<userDir>/custom/editions/`, javap-confirmed on 2.0.14) is appended to the stock
  editions by `StaticData`, and `CardEdition.Collection.add` is a `map.put` by code —
  so a custom `Reality Fracture.txt` **replaces** the stock 43-entry FRA, with its type
  forced to `CUSTOM_SET`.
- **Without it**, overlay cards are custom cards "not assigned to any set" and land in
  Forge's `USER` bucket: `Wrath of the Bloodmane|FRA` resolves to `USER`, which breaks
  any art or edition lookup keyed on the set. Cards still load **by name**. On 2.0.14,
  `Mountain|FRA` / `Plains|FRA` fall back to `TRK` (its FRA lists no basics) and
  `Austere Command|SPG` falls back to `MSC` (2.0.14's SPG, 165 entries, does not list
  it; the snapshot's, 175 entries, does, as #160).
- **With the snapshot's edition file overlaid**, FRA has 461 entries and every deck
  card resolves to FRA; the boot log's notable lines are unchanged (21).
- **A trap for anyone who overlays Forge's own layout:**
  `CardStorageReader.collectCardFiles` skips any directory named `upcoming` unless
  `BuildInfo.isDevelopmentVersion()`. The 2.0.14 jar calls itself a development build,
  so today it would load; a release build would silently skip 249 of the set's
  scripts. `tools/audit-deck.mjs` flattens an overlay's cards for this reason.

### 5. `tools/audit-deck.mjs` — the tool for the day

```bash
node tools/audit-deck.mjs decks/fra-rw-aggro.dck                  # the engine config.json names
FORGE_JAR=/path/to/new/forge-gui-desktop-…jar \
  node tools/audit-deck.mjs decks/fra-rw-aggro.dck                  # any other engine; res/ beside it
node tools/audit-deck.mjs decks/x.dck --overlay <dir>              # <dir>/cards, tokens, editions
node tools/audit-deck.mjs --names <file> | --all-custom            # without a deck
```

It boots Forge through `mtgtable.Bootstrap` (hard rules 1 and 11, the same three
preferences as the game), loads the deck with `DeckSerializer.fromFile` (hard rule
4), and reports per card: **ok** (in the database, builds with `CardFactory.getCard`
in a `Game` nobody starts, every ability / trigger / static / replacement SVar parses
against its own face, no keyword nothing in the engine reads, every `TokenScript$`
resolves), **missing** (Forge would drop it from the library silently) or **broken**.
Apart from an optional `--json` copy it writes nothing outside
`var/audit-deck/<key>/` (the compiled helper, the engine log, and a fresh home: `res` symlinked
beside the jar exactly as `make-forge-home.sh` derives it, a fresh `userDir`, the
committed `forge-home/custom-cards/*.txt` copied in). It needs a compiled bridge
(`bridge/out`, or `--classes`) for `Bootstrap`; the 2.0.14-compiled classes linked
unchanged against the snapshot jar, because `IGuiBase` is byte-identical across the
two. About 6–12 s per run. Exit 0 all ok, 1 anything missing or broken, 2 the audit
failed.

Its controls, run here:

| run | result |
|---|---|
| **negative:** `pacho-shield`, `morph-probe`, `yield-probe`, `sideboard-probe` on 2.0.14 | 175 of 175 ok |
| **positive:** the 249 FRA scripts on 2.0.14 | 36 broken, each with the engine's own exception text |
| the deck, plain 2.0.14 | 19 ok, 31 missing |
| the deck, 2.0.14 + overlay (+ edition) | 47 ok, 3 broken |
| the deck, snapshot | 50 ok |

Two refinements came out of the controls and are in the tool: an SVar is parsed
against **its own face's** SVars (the first version reported Pyre Rhymer's
`TrigMana` missing — it lives on the Molten Tide face), and `Keyword.UNDEFINED` is
not by itself a failure (`etbCounter`, `ETBReplacement`, `AlternateAdditionalCost`
and deck-construction text are matched by string in Forge's code) — a keyword is
reported only when nothing in the running jar's `forge/**` constant pool names it.

### 6. Verdict and what to do on the day

An overlay onto 2.0.14 is **technically possible for 213 of the set's 249 new cards
and not worth doing:** the user's deck as built cannot start a game; the overlay
would make ~250 scripts "custom", which D14 accepted for exactly one file; the edition
would have to be overlaid too, replacing stock FRA with a `CUSTOM_SET`; 2.0.14's AI
throws on some of the new statics; and "builds" is not a rules review. The snapshot
plays the exact deck cleanly. So nothing is merged, and the day's checklist is short:

1. Install the official release beside the old one (never over `/home/justin-a/forge`),
   port and build the bridge against it (spike B's patch), and point `config.json`'s
   `forgeJar` at it.
2. `./tools/make-forge-home.sh` (res is derived from the jar), then
   `node tools/audit-deck.mjs decks/fra-rw-aggro.dck` — expect **50 ok**; also run it
   over `decks/pacho-shield.dck` and the probe decks.
3. `./tools/check-all.sh`, then play: `./bridge/run.sh mtgtable.MtgTable --transport auto
   --seed 7 --deck decks/fra-rw-aggro.dck --deck2 decks/fra-rw-aggro.dck`, reading
   `player turns`, not just `MTGTABLE OK`.
4. Things to look at by hand: whether the AI ever casts No Admittance, and whether
   Pyre Rhymer's Molten Tide text was fixed.

### Reproduce

Scratch lives under `var/` (gitignored). The snapshot jar and its `res/` were in the
session scratchpad (`forge-snap/`), not in the repo.

```bash
node tools/audit-deck.mjs decks/fra-rw-aggro.dck                                   # plain 2.0.14
node tools/audit-deck.mjs decks/fra-rw-aggro.dck --overlay var/fra-scripts         # + overlay
node tools/audit-deck.mjs decks/fra-rw-aggro.dck --overlay var/fra-scripts \
    --overlay var/spike-a/overlay-edition                                          # + FRA edition
FORGE_JAR=<snapshot jar> node tools/audit-deck.mjs decks/fra-rw-aggro.dck          # snapshot
var/spike-a/make-run-home.sh 214 <2.0.14 jar> yes                                  # isolated game home
var/spike-a/play.sh 214 7 $PWD/decks/fra-rw-aggro.dck $PWD/decks/fra-rw-aggro.dck
```

---

## Spike B: the bridge ported to Forge 2.0.15-SNAPSHOT-09.27 (a patch on the shelf, not merged)

Measured 2026-09-27, branch `engine-upgrade` at `754f504`.

**What this section is, and what it is not.** The user asked, after this work
began, that nothing be broken to force in the new set early. So **the engine
stays Forge 2.0.14**, and this port changes nothing about how the game runs
today: `bridge/src`, `config.json`, `tools/check-forge.sh`,
`tools/lint-bridge.sh` and `docs/protocol.md` are untouched in the tree, no
fixture was re-recorded, and nothing went into `forge-home/custom-cards/`. The
port exists only as a reviewable patch,
**`docs/research/patches/bridge-forge-2.0.15-snapshot-09.27.patch`** (first saved
as `docs/drafts/bridge-port-2.0.15-snapshot-09.27.patch`; moved, body unchanged,
by the preparation pass at the end of this file), kept for the day an
official Forge release carries Reality Fracture. It is **one-way**: it does not
compile against 2.0.14 (five errors, listed below), which is the reason it is a
patch and not a branch of the tree.

All of the work ran in three private copies of this worktree under the session
scratchpad. That kept `bridge/out`, `forge-home/res` and `var/` in this worktree
exactly as they were while spike A worked here:

| copy | engine | used for |
|---|---|---|
| `orig` | 2.0.14 (`config.json`) | the baseline gate, the diff base for the patch |
| `repo` | 2.0.15-SNAPSHOT via `FORGE_JAR` | the port and its gate |
| `deck` | 2.0.15-SNAPSHOT via `FORGE_JAR` | the FRA deck's audit and games |

### The two jars

| | 2.0.14 (installed) | 2.0.15-SNAPSHOT (daily) |
|---|---|---|
| path | `/home/justin-a/forge/forge-gui-desktop-2.0.14-jar-with-dependencies.jar` | `<scratchpad>/forge-snap/forge-gui-desktop-2.0.15-SNAPSHOT-jar-with-dependencies.jar` |
| manifest `Implementation-Version` | `2.0.14-SNAPSHOT-08.08` | `2.0.15-SNAPSHOT-09.27` (`build.txt`: 2026-09-27 18:24:12) |
| bytes | 39,383,858 | 31,498,557 |
| sha256 | `3c0a7c38…8e5dd9` | `70f756bcfd0d26d0dbe7aea0b0c519fec96a8d886f7aecdbe608de0db62f4229` |
| `forge/**.class` | 3,054 | 3,089 |
| gson | absent | **present** (212 classes). Still banned by the lint and unused |
| `Game.setNoGUIUser()` | absent | **present**. Still banned by the lint and unused |

`res/` came from the same daily tarball (`snap.tar.bz2`, 297,077,914 B, sha256
`504afa46…4810a`), extracted beside the jar with `tar --skip-old-files` so the two
files already there were left alone. `tools/make-forge-home.sh` derives `res/`
from the jar's directory and needed no change. With
`FORGE_JAR=<snapshot jar>`, `forge-home/res` in the `repo` copy resolved to
`<scratchpad>/forge-snap/res` (checked with `readlink -f`), and in `orig` to
`/home/justin-a/forge/res`. The snapshot's card database holds **97,109
printings, 33,507 unique** (2.0.14: 95,126 and 33,137).

`tools/check-forge.sh` pins no size and no sha. It prints the sha256 and asserts
8 classes, 7 members and 4 event classes, and **it passed unchanged on both
jars**, so it needed no edit.

### (1) The javap diff

Every `forge.*` class `bridge/src` imports (88 of them), plus `YieldController`,
`CardView$CardStateView`, `IGameEventVisitor` (and `$Base`), `PlayerController`,
`FControlGamePlayback` and `InputPassPriority`: 95 classes.
Each was run through `javap` (non-private members) against both jars, the
output sorted, then diffed. **79 are byte-identical**, including `IGuiBase`,
`HostedMatch`, `GameEventForwarder`, `GamePlayerUtil` (all eight
`createAiPlayer` overloads), `GameView`, `PlayerView`, `StackItemView`,
`CombatView`, `SpellAbilityView`, `ZoneView`, `AutoYieldStore`, `InputQueue` and
**all 26 `GameEvent*` classes protocol §3.6 maps**, as well as `GameEvent` and
the visitor interface. The set of `forge/game/event/*.class` names is identical
too. The 16 that differ (`<` 2.0.14, `>` 2.0.15-SNAPSHOT):

```
== forge.gui.interfaces.IGuiGame          (47 lines; the seam)
< public abstract PlayerZoneUpdates openZones(PlayerView, Collection<ZoneType>, Map<PlayerView,Object>, boolean);
> public default void openZones(PlayerView, Collection<ZoneType>, Map<PlayerView,Object>);
< public abstract Iterable<PlayerZoneUpdate> tempShowZones(PlayerView, Iterable<PlayerZoneUpdate>);   -- removed
< public abstract void hideZones(PlayerView, Iterable<PlayerZoneUpdate>);                             -- removed
< public abstract void restoreOldZones(PlayerView, PlayerZoneUpdates);                                -- removed
< public abstract void updateSingleCard(CardView);                                                    -- removed
> public default void updateCard(CardView);                                                          -- new
> public default void showRevealedCards(Iterable<CardView>);                                         -- new
> public default void hideRevealedCards();                                                           -- new
  abstract -> default: enableOverlay, disableOverlay, showManaPool, hideManaPool, updateShards,
    handleLandPlayed, notifyStackAddition, notifyStackRemoval, refreshCardDetails, refreshField,
    updateCards, updateDependencies, updateLives, updateManaPool, updatePhase, updatePlayerControl,
    updateStack, updateTurn, updateZones
== forge.gamemodes.match.AbstractGuiGame  (16)
> protected static PlayerZoneUpdates getZonesHolding(Iterable<CardView>);
< its no-op bodies of the 15 update*/refresh*/notify* members above (now IGuiGame defaults)
  abstract: still exactly one, protected abstract void updateCurrentPlayer(PlayerView)
== forge.interfaces.IGameController       (1)
< public abstract void passPriority();
== forge.player.PlayerControllerHuman     (2; -public surface)
< public void passPriority();
> public boolean isMacroActive();
== forge.gamemodes.match.input.InputPassPriority (1)
> public void passPriority();
== forge.game.card.CardView               (14)
< getMayPlayPlayers(PlayerView), hasBackSide(), getBackSideName(), getCrackOverlayInt(),
  setMayPlayPlayers(...), updateBackSide(...), CardView(int,Tracker,String,PlayerView,String)
> hasPreparedSpell(), useCardArt(), getObject(), clearObject(), public final boolean equals(Object),
  CardView(int,Tracker,String,String), CardView(int,Tracker,String,String,Object)
== forge.game.card.CardView$CardStateView (1)
> public final boolean equals(Object);
== forge.gamemodes.match.YieldController  (6)
  isSkippingPhase, setSkipPhase, applyClientSeed became synchronized (same signatures)
== forge.game.Game                        (6)
< AI_CAN_USE_TIMEOUT, canUseTimeout()   > setNoGUIUser(), isNoGUIUser()   getCardsIn lost synchronized
== FPref (5): - UI_USE_LASER_ARROWS; + UI_ARROW_OPTION, UI_CARD_DOWNLOAD_LANG,
              UI_PAUSE_MUSIC_ON_FOCUS_LOSS, UI_PREFER_LANG_FOR_UNIQUE_CARDS
== ForgeConstants (3), GuiDownloadService (3), PlayerZoneUpdate(s) (no longer Serializable),
   ImageFetcher (1), ManaCost (+hasHybrid)
```

None of the `CardView` getters that went away is read by `Snap.java`. The three
hard-rule-8 gates (`canBeShownTo`, `canFaceDownBeShownTo`, and
`getAlternateState` inside the one `alt` block) are all present, and
`Snap.java` compiles unchanged.

**The abstract set `WireGuiGame` must fill shrank from 37 to 28**: 27 from
`IGuiGame` plus `updateCurrentPlayer`, by the recipe in CLAUDE.md run against
signatures rather than names. **No new abstract member appeared.**
`showRevealedCards` / `hideRevealedCards` are defaults. The nine that left the
set:

- `tempShowZones`, `hideZones` and `restoreOldZones` were **deleted**.
- `openZones` is now a `default void` with a different signature.
- `showManaPool`, `hideManaPool`, `updateShards`, `enableOverlay` and
  `disableOverlay` became **defaults**. The bridge's overrides of these still
  compile and are kept.

The task brief said the overlay pair and `updateShards` were *removed*. On this
jar they are defaults, not removed.

### (2) The port: `docs/research/patches/bridge-forge-2.0.15-snapshot-09.27.patch`

Two files. **+64 / −84 lines with comments, and +18 / −59 lines of code**
(non-blank, non-comment). Against the 2.0.15 snapshot it compiles with
`-Xlint:all` and **zero warnings**, and `tools/lint-bridge.sh` stays green with
no ALLOW change. `git apply --check` against this worktree passes. Against
2.0.14 it fails with 5 errors: `restoreOldZones` is still abstract there
(WireGuiGame, SpectatorGui), the 3-argument `openZones` overrides nothing (×2),
and 2.0.14's `InputPassPriority` has only a `passPriority(Runnable)`, not the
no-argument one.

1. **The zone members** (`WireGuiGame` §5, `RecordMatch.SpectatorGui`). The
   `tempShowZones`, `hideZones` and `restoreOldZones` overrides are deleted,
   together with the now-uncalled `removeZoneHints`. `openZones` becomes the
   3-argument `void` override and still pushes the same hint as before (the
   same list `CMatchUI` builds, minus Battlefield, Hand and Stack).
   - **What survives:** `FControlGameEventHandler` still calls
     `openZones(player, {Exile}, …)` after an exile it flags. `HostedMatch`
     subscribes that handler for our seat, which is also where `finishGame`
     comes from. On 2.0.14 that call site discarded the return value, so that
     hint was never closed before the next game there either. Behaviour for this
     path is unchanged.
   - **What is gone:** the `InputSelectEntitiesFromList` → `tempShowZones` /
     `hideZones` path. It is the *only* one the committed corpus ever recorded:
     `{"playerId":0,"zones":["hand"]}`, in 23 frames of 4 fixtures
     (`human-ability-42`, `human-auto-42`, `human-comfort-13`, `human-yield-13`).
     The 2.0.15 desktop now derives those panels itself, in `setSelectables`
     through `AbstractGuiGame.getZonesHolding`. That helper reads
     `CardView.getOwner()` / `getZone()`, a view walk that report 07 R1 forbids
     in a push. The other replacement, `showRevealedCards`, fires only with
     `UI_SELECT_FROM_CARD_DISPLAYS` on, and D13 turns that off. **So on 2.0.15
     `input.openZones` carries the exile hint only.** The board degrades
     gracefully, since the hint is `[]` most of the time anyway. **The wire
     shape does not change, so `docs/protocol.md` needs no amendment.** If the
     `{hand}`-style hint is wanted back, the bridge could derive it in
     `setSelectables` from the zone Snap recorded for each id in the last
     snapshot, rather than from the view. That would be a new decision, not a
     port.
2. **`passPriority`**. `IGameController.passPriority()` is gone. The 2.0.14 body
   was: "if the current input is an `InputPassPriority`, press its OK". The
   `act: passPriority` now reaches
   `((PlayerControllerHuman) c).getInputProxy().getInput()` and, if that is an
   `InputPassPriority`, calls its new public `passPriority()`. It is still a
   silent no-op on any other input, and it still runs on the EDT like every act.
   The input's own method is used rather than OK because 2.0.15's
   `InputPassPriority.onOk()` first *accepts a pending yield suggestion* and
   only then passes (bytecode: `pendingSuggestion` → `setAutoPassUntilStackEmpty`
   / `setMarker`, else `passPriority()`), so the act stays "genuinely distinct
   from buttonOk". `web/src/keys.ts:211` cites `IGameController.passPriority()
   [jar]` in a comment; that comment is the web's, not changed here.
3. **Comments only**: WireGuiGame's class header now also states the 28-member
   count.

**Untouched:** `Snap.java` (all three gates, one card path), `Bootstrap`
(the three prefs and their order around `FModel.initialize`),
`HeadlessGuiBase` (the eight thread names), `MtgTable`'s CLI,
`tools/lint-bridge.sh`, `tools/check-forge.sh`, `config.json` and
`docs/protocol.md`. `MtgTable`'s run summary still prints `members fired = N of
37`. That is cosmetic; MtgTable is left alone for the match-setup worktree.

### (3) The gate against the snapshot

Commands, each in its own copy (`orig` uses `config.json`'s 2.0.14 jar):

```bash
rm -rf bridge/out && FORGE_JAR=<snapshot jar> WSPORT=8677 ./tools/check-all.sh             # as specified
rm -rf bridge/out && FORGE_JAR=<snapshot jar> WSPORT=8677 ./tools/check-all-step6-advisory.sh
rm -rf bridge/out &&                          WSPORT=8676 ./tools/check-all-step6-advisory.sh   # 2.0.14 baseline
```

`check-all-step6-advisory.sh` exists only in the scratch copies and is not in
the patch. It is `check-all.sh` with two lines changed. Step 6's value-level
diff prints a warning and continues instead of `die`-ing. Its `diff … | head
-20` preview is wrapped in `{ …; } || true`, because under `set -o pipefail`
that pipeline exits **141** (SIGPIPE) when the diff is longer than 20 lines.
`set -e` then kills the gate *before* `die` can print "check-all FAILED at step
6". That is a small defect in the real gate: a step-6 failure shows up as a bare
exit 141 with no message. A running 2.0.14 baseline was essential, because this
desktop was loaded by other sessions' JVMs throughout.

**The strict gate stops at step 6 on both engines.** Snapshot: exit 141 after
54 s. 2.0.14: exit 141 after 64 s. The causes differ:

- **2.0.14 fails step 6 on timing alone.** Its fresh seed-42 `RecordMatch` has
  the **same 1,651 events in the same order** and the same final state as
  `g1.jsonl`, split into different frames (for example 16 events in the first
  state frame against 2). `GameEventForwarder` flushes on a 500 ms timer, and
  under load the frame boundaries move. The exact-bytes step is only reliable on
  an idle machine.
- **The snapshot differs in content, and only in this.** The same 1,651 events
  and the same winner, but **290 `stats` events list their `cardIds` in a
  different order** (`[65,44,28]` against `[65,28,44]`). Sorted, the two event
  streams are identical. On an idle machine step 6 would still fail on the
  snapshot for this reason. The day it ships, `g1` (and very likely `g2` and
  `g3`) would need a deliberate re-record, which is exactly what this spike was
  told not to do.

With step 6 advisory, three runs. Snapshot run 1 used an intermediate patch
whose `openZones` pushed nothing. Snapshot run 2 is **the patch file exactly as
saved**. `openZones` fired in none of these runs, nor in any FRA game, so the two
snapshot runs test the same code.

| step | 2.0.14 baseline | snapshot run 1 | snapshot run 2 (final patch) |
|---|---|---|---|
| 1 check-forge | OK | OK | OK |
| 2 lint | OK (20 files) | OK | OK |
| 3 build + 3 self-tests | OK: Json 38, Ask 106, GameLog 35 checks | OK: same | OK: same |
| 4 Smoke | OK; overlay loaded, no Trample, deck legal | OK | OK |
| 5 RecordMatch seed 42 | 377 frames, 0 errors, UNIMPL none | 376, 0, none | 376, 0, none |
| 6 value diff vs `g1` | differs (batching only) | differs (batching + `stats` order) | same as run 1 |
| 7 `--transport null` | OK; [choose_list, ability_menu, order]; 2 notices swept | identical | identical |
| 8 console smoke | OK | OK | OK |
| 9 auto seed 11 | OK; 14 turns; [choose_list, ability_menu] | identical | identical |
| 9b multiset vs `human-auto-42` (advisory) | A 1587 / B 1657 frames; 55 A-only (41 distinct), 125 B-only (40) | B 1645; 65 A-only (55), 123 B-only (50) | B 1583; 29 A-only (23), 25 B-only (19) |
| 9c ten games | **10/10 PASS**, 391 s | **10/10 PASS**, 382 s | **10/10 PASS**, 317 s |
| 9d sideboard ask | OK | OK | OK |
| 10a–10f | OK; all logs PASS redaction | OK | OK |
| 10g three games | OK | "OK", **but game 3 died at birth** (below) | OK: all three games played (124 / 133 / 261 acts) |
| 11 redaction, 19 fixtures + fresh logs | PASS | PASS | PASS |
| 12 redaction self-test | 16 controls | 16 | 16 |
| 13 web build + test | node 807: 799 pass / 0 fail / 8 skip; vitest 91/91 | node 807: **798 / 1 fail** / 8 | node 807: 799 / 0 / 8; vitest 91/91 |
| **exit** | **0**, 1,099 s | **1 at step 13**, 962 s | **0**, 910 s |

On all ten seeds of 9c, both snapshot runs match 2.0.14's turn counts and ask
kinds exactly (16, 16, 13, 14, 13, 21, 13, 21, 24 and 18 turns).

On 9b, the snapshot's multiset differences are timing. That was checked
directly: the fresh snapshot recording of `human-auto-42` has **the same 1,443
events in the same order** as the committed fixture, the same 16 asks (16
answered) and the same winner. 2.0.14's own fresh recording differs from the
fixture by as many frame instances under the same load. Run 2 was measured on a
quieter desktop, and its difference shrank to 29/25.

Across every run's step logs there are **0 raw `UNIMPL` lines** (only the per-run
`UNIMPL members = none` summaries) and **0 `unsupported` lines**. There is **1
svar-fallback line** (the known `Quantum Reduction` `SVar 'Any'`) on each
engine. The `SAXParseException` on `var/forge/achievements/constructed.xml`
("Premature end of file") appears on both engines (11 and 8 times). It is
Forge's achievements file in a fresh profile and is benign.

**The one real failure: 10g's third game.** `web/test/ws-log.test.ts` failed on
`var/games/check-all-ws-3g-g3/frames.jsonl`: *"no c2s `act` lines — nobody
played this seat"*. That log is six lines: header, `hello_ok`, an `input`, an
`input` whose button labels are `""`, a turn-0 `state`, then
`over {winner:null, reason:null, matchOver:true}` 134 ms after the `hello_ok`.
The server logged `OVER WITHOUT A gameOver STATE`. The mechanism, read from
bytecode and the log timestamps:

1. Game 2 ends. The bridge emits `state{gameOver}` and `over` from
   `captureOutcome` on the game thread.
2. `ws-auto-play` answers with `act: newGame {mode:"restart"}` **in the same
   millisecond**.
3. On the EDT, that act runs `HostedMatch` → `endCurrentGame()` →
   `afterGameEnd()` (a no-op here) → `startGame()` → **game 3's `openView`, which
   resets `overEmitted`**. This took 218 ms.
4. Only then does game 2's `FControlGameEventHandler` gameOver runnable run on
   the EDT: `updateButtons(pv,"","",false,false,false)` (the blank `input`),
   then `updateAchievements()`, then **`finishGame()` → `emitOver()` for game
   3**.

The code involved (`HostedMatch` and `FControlGameEventHandler`'s gameOver
branch) differs between the jars only in `openZones`' signature and Android's
`AI_CAN_USE_TIMEOUT`. So this is **a latent race in the bridge's M6 lifecycle**:
`overEmitted` is reset by the next game's `openView`, while the previous game's
late `finishGame` is still queued. The snapshot's timing exposed it. The gate
also has a gap here: **10g printed "OK: three games…"**, and only the web
suite's ws-log test caught a game that never started. 

**How often, on which engine.** The 10g scenario was repeated by hand, four
times per engine, running concurrently. Each run is the same server command and
`ws-auto-play --games 3 --comfort --require-yield-repeat` client as 10g, on
ports 8678/8679.

- **2.0.15-SNAPSHOT: 2 dead games in 6 three-game runs** (two gate runs plus
  four repeats). Both deaths were at birth. One was gate run 1's game 3, after a
  *restart*. The other was repeat 3's game 2, after a *continue*, so both
  transitions are exposed. Gate run 2 happened to miss the race.
- **2.0.14: 0 in 5.** That is the baseline gate plus four repeats.

Same code path, different odds. This is a blocker for the day the patch is
applied, and a latent bug on main today.

A fix is a bridge decision and belongs on main, not in this port. Two
candidates:

- In `newGame`, defer `nextGameDecision` until this game's `finishGame` has
  fired, with a bounded fallback for the concede paths that never call it.
- Make a `finishGame` that arrives after a newer `openView` a no-op, keyed by a
  per-game generation that `newGame` bumps.

Neither is in the patch.

### (4) The user's deck on the snapshot

Scratch deck: `var/spike-b/fra-red-white.dck`, 40 cards, every line `|FRA`,
with the 10-card sideboard. It is written only under `var/`; spike A owns
`decks/`. Mirror matches, the same deck on both seats.

- **Smoke audit** (`./bridge/run.sh mtgtable.Smoke var/spike-b/fra-red-white.dck`):
  `deck sets = {FRA=40}`, and **`deck cards Forge would drop = none (all 20
  distinct names have a working card script)`**, deck legal. An AI-vs-AI game
  ran to `over` in 26 turns with zero exceptions.
- **Three `--transport auto` games at seeds 7, 8 and 9**: all three reached
  `over` and all exited 0 (35, 39 and 40 s). Every one reported `UNIMPL members
  = none`, 0 snapshot errors and 0 emit errors, and **every frame log PASSes
  `check-redaction.mjs`**. Ask kinds were `[choose_list]`, `[choose_list]` and
  none. The auto seat lost all three, which is a property of its policy, not of
  the cards.
- **Eight `RecordMatch` recordings at seeds 1–6, 10 and 11** (AI vs AI, to
  widen coverage): all reached `over`, with 0 snapshot errors, UNIMPL none, 0
  exceptions and 0 `unsupported`. Seat 0 won 4 and seat 1 won 4.
- **The missing-card claim did not reproduce.** The task brief listed Ajani's
  Anguish, Chandra's Emberling and Woodwork Prodigy as unscripted in this
  snapshot. In *this* `cardsfolder.zip` they are
  `upcoming/ajanis_anguish.txt`, `upcoming/chandras_emberling.txt` and
  `w/woodwork_prodigy_soul_tether.txt` (a Prepare card named `Woodwork Prodigy`
  with the alternate `Soul Tether`). All three load, and all three were cast in
  these games. Of the 26 distinct names in the deck and sideboard, 24 live in
  `upcoming/`. `Austere Command` is an old script (`a/`), and Woodwork Prodigy is
  in `w/`. Spike A's §1 above reached the same correction independently.

Per card, across the 11 recorded games. "Cast" counts `cast` events whose text
names the card. A face-down or hidden-hand card is never named, so these are
lower bounds. A trigger is matched to its card by its text, which is unique to
that card's script.

| card (main, 18 names) | snapshot script | cast events | games | notes |
|---|---|---|---|---|
| Samut, Hazoret's Champion | `upcoming/` | 7 | 7 | |
| Gallia, the Merrymaker | `upcoming/` | 6 | 3 | |
| Eardrum Rattler | `upcoming/` | 16 | 8 | `AILogic$ MakeUnblockable`; its Effect object shows in the command zone as `Eardrum Rattler (84)'s Effect` |
| Graft Surgeon | `upcoming/` | 3 | 2 | its dies trigger (move counters) went on the stack ×2 |
| Koth, the Geomancer | `upcoming/` | 11 | 9 | landfall trigger went on the stack ×4 |
| Chandra's Emberling | `upcoming/` | 6 | 5 | noncreature-cast counter trigger went on the stack ×6 |
| Pyre Rhymer // Molten Tide | `upcoming/` (Prepare) | 8 | 6 | Molten Tide seen in a public zone in 6 games |
| Yoshimaru, Beloved Companion | `upcoming/` | 12 | 9 | |
| Mabel, Valley Hero | `upcoming/` | 9 | 7 | its enters trigger went on the stack 11 times |
| Shatterwing Pegasus | `upcoming/` | 21 | 9 | |
| Woodwork Prodigy // Soul Tether | `w/` (Prepare) | 7 | 6 | upkeep "becomes prepared" trigger went on the stack; Soul Tether seen once |
| Thalia, the Survivor | `upcoming/` | 8 | 7 | |
| Whiplash Wordsmith // Vicious Verse | `upcoming/` (Prepare) | 5 | 4 | Vicious Verse cast ×3 |
| Jiang Yanggu, Alone | `upcoming/` | 5 | 5 | attack-alone trigger went on the stack |
| Wrath of the Bloodmane | `upcoming/` | 34 | 11 | |
| No Admittance | `upcoming/` | 1 | 1 | uses the `Empower` API: **no AI logic** for it |
| Fulminous Forte | `upcoming/` | 10 | 8 | |
| Ajani's Anguish | `upcoming/` | 7 | 5 | cast with X from 2 to 7; enters-damage trigger went on the stack ×7 |

| card (sideboard, 8 names) | snapshot script | cast events | games | notes |
|---|---|---|---|---|
| Surgical Precision | `upcoming/` | 19 | 3 | |
| Your Fate Ends Here | `upcoming/` | 9 | 3 | |
| Hexhaven Battalion | `upcoming/` | 2 | 2 | `Empower`: no AI logic |
| Way of the Pyromancer | `upcoming/` | 6 | 3 | `Empower`: no AI logic; "empower Jace 2" made a Jace token that was activated 28 times |
| Medic's Kitesail | `upcoming/` | 32 | 3 | |
| Austere Command | `a/` (an old script) | 0 | 0 | loads; never cast. **`Austere Command\|FRA` does not resolve to FRA**: its FRA printing is `\|SPG` (Special Guests), and Forge silently fell back to the MSC printing (`deck sets = {FRA=38, MSC=2}`). Spike A's deck already says `\|SPG` |
| Ghalta the Immovable | `upcoming/` | 12 | 3 | |
| Room of Refuge | `upcoming/` | 0 | 0 | loads; reached a public zone in 3 games, never as a `cast` |

The sideboard was audited separately, with a scratch 40-card deck: the 10-card
sideboard twice over, plus 10 Mountain and 10 Plains:
`var/spike-b/fra-sideboard-check.dck`. Smoke reported `deck cards Forge would
drop = none (all 10 distinct names…)`, deck legal, and a 28-turn game. Three
`RecordMatch` games (seeds 1–3) all reached `over`, with UNIMPL none, 0 snapshot
errors and 0 exceptions.

In total, **26 of 26 distinct names are scripted and load**; **24 of 26 were
cast** and 2 were only loaded; **0 exceptions** occurred in 1 + 3 + 8 + 1 + 3 =
**16 games**. The only card-level caveat is `Empower`, the AI gap on three
cards.

Engine warnings with this deck:

- `No AI assigned for API: Empower`, once per engine boot that loads one of the
  three `Empower` cards (No Admittance, Hexhaven Battalion, Way of the
  Pyromancer). The AI has no logic for that effect, so its decisions around it
  are default-grade. The effect itself resolves.
- `<card> Did not have activator set in SpellAbilityRestriction.canPlay()` for
  Mountain, Plains, Wrath of the Bloodmane and Mabel, Valley Hero. It is
  informational stderr from Forge, and it does not appear with the MSH deck.

**Protocol gaps these cards expose.** None of them blocks the port, but they are
worth knowing on the day:

- The Prepare mechanic (Pyre Rhymer // Molten Tide, Whiplash Wordsmith //
  Vicious Verse, Woodwork Prodigy // Soul Tether) has a *prepared* flag
  (`CardView.hasPreparedSpell()`, new in 2.0.15) that the wire does not carry.
- The alternate spell's text is not on the wire for a face-up card. Hard rule 8
  keeps `getAlternateState()` in the face-down `alt` block, and that should stay
  a decision rather than a patch.

### (5) Verdict inputs

- **Effort:** the seam change is small and mechanical: two files, 18 code lines
  in, 59 out, and no new abstract member.
- **What works:** on the MSH deck the engine plays the **same games** as 2.0.14
  at every seed measured (seed-42 AI-vs-AI, seed-42 human-auto, ten-games 1–10).
  Redaction stays clean everywhere. All 26 distinct FRA names in the deck and
  sideboard load; 24 were cast across 16 games, with 0 exceptions and 0 UNIMPL.
  With step 6 made advisory, the gate passes on the final patch (run 2, exit 0).
- **What does not:** the 10g game-3 race (a latent bridge bug that this timing
  exposed); the `{hand}` zone hint; the `stats` id order, which fails the strict step 6
  on the snapshot on any machine and forces a deliberate re-record of `g1`
  (`g2` and `g3` were not measured, but are the same kind of recording).
- **Risk:** a *daily* snapshot. This one dates from 2026-09-27, and the official
  release will differ. On the day, re-run this section's javap recipe against
  the release jar before applying the patch. Also on the day:
  - The upstream `a/a_i_m_scientists.txt` in the snapshot **no longer carries
    `K:Trample`**. D14's overlay is redundant on 2.0.15 (still loaded, still
    wins, harmless). Retiring it, and with it
    `ALLOW_CUSTOM_CARDS_IN_DECKS_CONFORMANCE`, is a D14 follow-up for that day.
  - `Game.setNoGUIUser()` and gson exist on 2.0.15. Hard rule 5's reasons for
    banning them become historical, but the lint still bans both. Leave it.

### Where the raw material is

Everything in this list is gitignored, under `var/spike-b/` in this worktree:

- The two scratch decks: `fra-red-white.dck` and `fra-sideboard-check.dck`.
- `javap-diff.txt`: the full 95-class diff.
- `race10g.sh`: the 10g repeat harness.
- `logs/`: the gates, the races, Smoke, the auto games and the recordings.
  - `gate-214-adv.log`, `gate-snap-adv.log` (run 1), `gate-snap-final.log`
    (run 2), `gate-snap-strict.log`, `gate-214.log`.
  - `race-snap.txt`, `race-base.txt`.
  - `smoke-fra.log`, `smoke-sideboard.log`, `fra-auto-{7,8,9}.log`,
    `rec-fra-*.log`, `rec-side-*.log`.
  - `snap-check-all-ws-3g.log` and `race-snap-3.log`: the two server logs with
    `OVER WITHOUT A gameOver STATE`.
- `games/`: the 14 FRA frame logs, plus `dead/race-snap-3-g2.jsonl`, a
  six-line game that died at birth.

The jar and `res/` live only in the session scratchpad, at
`forge-snap/`, and `config.json` does not name them.

---

## Preparation pass (2026-09-27, after the judged decision: WAIT)

The judge re-ran the three deck audits, found the overlay short of its bar and the
port excluded by the user, and decided **wait**. This pass turned the two spikes'
leftovers into preparation that **changes nothing about how the game runs today**,
and checked that claim. Nothing in it touches `bridge/`, `config.json`,
`tools/check-forge.sh`, `tools/make-forge-home.sh`, `forge-home/custom-cards/`,
`docs/protocol.md` or a committed fixture.

### What there was to revert: nothing

At the start of this pass `git status` showed only untracked additions and
`git diff --stat` was empty: spike A worked in throwaway homes under `var/`, and
spike B in private copies under the session scratchpad. `var/forge/custom/cards/`
(the real game's overlay) held exactly one file, `a_i_m_scientists.txt`, and
`forge-home/res` still resolved to `/home/justin-a/forge/res`. No card script had
been hand-written, so there was nothing to move to a drafts folder, and none was
created.

### The patch, moved and re-verified

Spike B's `docs/drafts/bridge-port-2.0.15-snapshot-09.27.patch` is now
`docs/research/patches/bridge-forge-2.0.15-snapshot-09.27.patch`. Its header now
names the build it targets (`Implementation-Version 2.0.15-SNAPSHOT-09.27`,
`build.txt` 2026-09-27 18:24:12, jar 31,498,557 B sha256 `70f756bc…4f229`, daily
tarball 297,077,914 B sha256 `504afa46…4810a`; the download URL was not recorded)
and carries the javap diff of the five seam classes it answers to. The diff body is
**byte-identical** to spike B's. Re-checked on a scratch copy of `bridge/src`:

| check | result |
|---|---|
| `git apply --check` in this worktree | passes (`RecordMatch.java` +5/−20, `WireGuiGame.java` +59/−64) |
| `javac -Xlint:all` against the snapshot jar | 0 errors, 0 warnings |
| `tools/lint-bridge.sh` over the patched tree | `bridge lint OK (20 file(s))` |
| `javac` against 2.0.14 | exactly 5 errors: 2 × not abstract / does not override `restoreOldZones`, 2 × `openZones` overrides nothing, 1 × `passPriority` cannot be applied |

### `tools/javap-seam-diff.sh`, checked against spike B

Spike B's 95-class javap recipe as a read-only script (one `javap` per jar, output
split per class on its own declaration line; nested imports such as
`ForgePreferences.FPref` become binary names). Against the two jars it reproduces
`var/spike-b/javap-diff.txt` exactly: the same 16 differing classes with the same
`<` / `>` lines, and the same 79 unchanged class names. Control: a jar against
itself gives 95 unchanged and no section. 0.6 s. Its output for 2.0.14 against the
snapshot is saved as `docs/research/patches/javap-2.0.14-vs-2.0.15-snapshot-09.27.txt`,
the baseline §0 step 5 of report 14 diffs a release against.

### The user's deck: transcription and today's audit

`decks/fra-rw-aggro.dck` was compared line by line with the user's list
(`/mnt/e/jalir/Projects/Magic/fra-pool-red-white-aggro.md`, read-only): the 40-card
main deck and the 10-card sideboard are identical by name and count. The `.dck` is
unchanged; `decks/fra-rw-aggro.txt` now names that source and says the deck does
not play on 2.0.14. Both still parse with nothing skipped.

| audit (`tools/audit-deck.mjs`) | result |
|---|---|
| `fra-rw-aggro`, 2.0.14 (`config.json`, default `bridge/out`) | **19 ok, 31 missing, 0 broken**, 4.7 s — the truth about today |
| `pacho-shield` + `morph-probe` + `yield-probe` + `sideboard-probe`, 2.0.14 | 175 ok, 0 missing, 0 broken |
| `fra-rw-aggro` + the opponent draft, snapshot (`FORGE_JAR=`) | **90 ok** (50 + 40), 0 missing, 0 broken |

**Why nothing new went under `decks/`.** `web/test/cards-lib.test.ts` ("every deck in
decks/ parses with nothing skipped") opens every entry in `decks/`. Measured with the
repo's own parser: a markdown `README.md` there parses as a text deck with 3 lines
skipped, and a `drafts/` directory throws `EISDIR`. Either would fail
`check-all.sh` step 13, so the deck index is `docs/drafts/README.md` and the draft
opponent is `docs/drafts/decks/`.

### An FRA opponent

**First attempt, dropped:** a blue-black list invented from the set's snapshot
scripts (commons and uncommons, no Empower card, no `AI:RemoveDeck`). Measured with
a scratch two-deck runner over Forge's `Match` (the session scratchpad's
`prep/aivs/`, adapted from spike A's `AiGames`, never committed) on the snapshot,
each deck on each seat: it beat the red-white deck 16–4, then 29–11 and 24–16 in two
toned-down versions, with 0 exceptions. It was dropped when the user's own list
turned out to propose an opponent.

**The draft:** the user's list ends with "a second deck from the leftovers (for the
coworker to play)", green-black midrange, 22 named cards ("Ask and I'll finalize it to
40"). `docs/drafts/decks/fra-gb-leftovers.dck` copies those 22 exactly (names
normalised to Forge's commas) and adds only 18 basics: 8 Forest, 8 Swamp and 2
Plains, because the list says Bloombrute "needs a Plains or two".

| run (snapshot jar, throwaway homes under the scratchpad) | result |
|---|---|
| audit, 2.0.14 | 20 ok (Vigorbloom Vanguard ×2, the 18 basics), 20 missing |
| audit, snapshot | 40 ok |
| 40 AI-vs-AI games, seeds 7–26, each deck on each seat | green-black 25, red-white 15; 11–44 player turns (mean 21.1); **0 exceptions**; all 16 green-black nonland names went on the stack, Seed Suture (Vigorbloom Vanguard's prepared spell) was cast 28 times, and Arcane Amphisbaena's Empower made Jace tokens; No Admittance was cast 0 times |
| 6 `RecordMatch` games (seeds 1–6, seats alternating) through spike B's ported bridge | all `RECORD OK`, 16–24 player turns, 0 snapshot errors, `UNIMPL members = none`; green-black won all 6 |
| 3 `MtgTable --transport auto` games (seeds 7–9, the automated seat plays red-white) | all `MTGTABLE OK`, 13–19 player turns, 0 emit errors, ask kinds `[choose_list]`, `[choose_list]`, `[confirm]`; the AI won all 3 (the automated seat's policy is weak, as in spike B) |
| `check-redaction.mjs` over those 9 frame logs | **9 PASS**, 0 advisory lines |

Across all 140 AI-vs-AI games of this pass the engine printed "No AI assigned for
API: Empower" once per boot (8 boots) and the usual informational "Did not have
activator set" lines. The green-black games add one more, 33 times in 40 games:
`Warning: default (ie. inherited from base class) implementation of
chooseSingleCard is used by Arcane Amphisbaena for forge.ai.ability.CannotPlayAi`.
That is the same gap seen from the other side: with no Empower AI, the AI falls back
to `CannotPlayAi` and a default choice when Amphisbaena's enters trigger resolves.
The game goes on, and it is Forge's to close, not ours.

**One checker finding, from the blue-black games** (report 14 §4.5): in an
automated-seat game against the blue-black list, `check-redaction.mjs` PASSed with 8
advisory A10 lines about Forge's "counter unless you pay" prompt (`"Icy Reception
(58) … Pay Mana Cost: {3}"`, and the same for Theorix Charm). Card 58 is on the
stack, named, in both `state` frames before the prompt; the checker's `lastZoneOf`
map is filled from `players[].zones` only and still had it in the opponent's hand. A
false alarm, engine-independent, and the first counter-unless-pay against the seat
anywhere in the corpus.

### The gate, on the unchanged engine

`WSPORT=8678 ./tools/check-all.sh` on the engine `config.json` names (2.0.14,
unchanged), in this worktree with every preparation file present and `bridge/out`
kept (`build.sh` recompiles every source anyway): **exit 0, `check-all OK`, 727 s**
(`var/check-all-prep.log`, gitignored). Step 6's exact-bytes diff passed this time
(`OK: 377 normalised lines identical to fixtures/games/g1.jsonl`), 9c was 10/10,
10g played three games over one socket, and step 13's `node --test` was 807 tests,
799 pass, 0 fail, 8 skipped, with vitest 91/91. `cards-lib.test.ts`'s "every deck
in decks/ parses with nothing skipped" passed with `fra-rw-aggro.dck` and `.txt`
present.

Afterwards `git status` showed one modified tracked file,
`docs/research/08-deck-card-coverage.md` (a new §8 appended — §9 since the rebase
onto `main`'s `a092d3a`, where match setup's villains deck had taken §8), and eleven untracked
files, all preparation: the two deck files, `docs/drafts/README.md`,
`docs/drafts/decks/fra-gb-leftovers.dck`, this file, report 14, the two files
under `docs/research/patches/`, `tools/audit-deck.mjs`,
`tools/audit-deck/AuditDeck.java` and `tools/javap-seam-diff.sh`. `git status` over
`bridge/`, `config.json`, `tools/check-forge.sh`, `tools/make-forge-home.sh`,
`forge-home/`, `fixtures/` and `docs/protocol.md` printed nothing.
`var/forge/custom/cards/` still holds only `a_i_m_scientists.txt`. The
`~/forge` jar's sha256 is still `3c0a7c38…8e5dd9`, and the fingerprint of
`~/.forge/decks/constructed/` (`find … -print0 | sort -z | xargs -0 sha1sum |
sha1sum`, `5cd33719…`) is the one recorded before this work began; that tree
holds no files.

## The rebase onto `main`'s `a092d3a` (2026-09-28)

The branch, cut from `754f504`, was rebased onto `a092d3a` — Tier 2 slice 4, the
workshop and match setup underneath it. `bridge/`, `config.json`,
`forge-home/custom-cards/`, `fixtures/` and `docs/protocol.md` are still `main`'s,
byte for byte.

- **Conflicts, all prose**: `DECISIONS.md` (both sides appended; D109–D112 kept
  their numbers, `main` ending at D108), `README.md` (four hunks: the tree's
  DECISIONS line, the tools list, and two rows of the documents table) and report 08, where match
  setup's villains deck had taken §8 — the FRA deck is §9 and every citation of it
  moved. `CLAUDE.md`, `PLAN.md` and `NOTICE` merged on their own; the counts now
  read one hundred and twelve.
- **The workshop's catalog** reads every `decks/*.dck`, so `fra-rw-aggro.dck` made
  `web/src/workshop/catalog.json` stale; regenerated, all 28 names land in
  `missing` with `threeD: null` and `workshop.test.ts` passes (the villain deck's
  state, 24 of 27).
- **`cards-lib.test.ts`** now reads only `.dck` and `.txt`; `fra-rw-aggro.txt`
  parses with nothing skipped.
- **`node tools/fetch-art.ts`** (every `decks/*.dck` since match setup): 12 decks,
  91 names, 0 misses; `fra-rw-aggro.dck` 28/28 (27 in `fra`, Austere Command in
  `spg`). Scryfall answered 429 five times and the tool waited out each
  `Retry-After`. `var/fetch-art-engine-upgrade.log`.
- **`node tools/check-deck.mjs decks/fra-rw-aggro.dck`** exits 1, as it must on
  2.0.14: 17 of the main deck's 20 names have no script, `Smoke` names the same 17
  as dropped silently, and Limited conformance rejects the deck.
  `var/check-deck-fra.log`. Not in the gate; its usage comment and
  `decks/README.md` now say so.
- **`tools/audit-deck.mjs`** on the rebased bridge: `fra-rw-aggro.dck` 19 ok / 31
  missing / 0 broken, exit 1 (unchanged); the control, now with Doom Legion,
  `pacho-shield` + `doom-legion` + `morph`, `yield` and `sideboard` probes, 215 ok,
  exit 0.
- **The saved port no longer applied**: `git apply --check` failed on
  `RecordMatch.java:73`, where match setup removed the `GamePlayerUtil` import
  beside the two imports the patch removes. Re-merged with `git merge-file` (base
  `754f504`, ours `a092d3a`, theirs `754f504` + the patch) in the session
  scratchpad; the one conflict was that import block. The changed lines are
  identical to the old patch (+64 / −84); only context and index lines moved. On
  a scratch copy of `a092d3a`'s `bridge/src` with it applied: `javac -Xlint:all`
  against the snapshot jar (sha256 `70f756bc…`), no output; the build's four
  self-tests on that build, Json 38, Ask 106, GameLog 35 and OverRace 11 checks,
  0 failures (OverRace in a throwaway Forge home over the snapshot's `res/`);
  `tools/lint-bridge.sh` OK (21 files); against 2.0.14 the same five errors.
- **The seam baseline** regenerated with `tools/javap-seam-diff.sh`: 99 classes,
  up from 95 — match setup's `Bootstrap` and `MtgTable` link `AiProfileUtil`,
  `AiProps` and `LobbyPlayerAi` (identical on both jars) and
  `forge.game.player.Player` (changed only in members the bridge does not call).
  Every other line is as before.
- **The gate**, from a deleted `bridge/out`, `WSPORT=8695`: **exit 0 in 906 s**
  (`var/check-all-engine-upgrade.log`), load average 3–8. Step 6 identical to
  `g1` (377 lines); 9b's advisory the usual three timing frames; 9c 14/14 in
  373 s; 10g three games, 816, 1,120 and 1,840 frame-log lines, no `OVER WITHOUT
  A gameOver STATE`; step 13 `node --test` 880 / 872 pass / 0 fail / 8 skipped,
  vitest 94 / 94. Standalone, `npm --prefix web test` is 870 + 94 and
  `npm --prefix web run build` succeeds.
- `~/forge` (21,367 files, listing fingerprint unchanged, jar `3c0a7c38…8e5dd9`)
  and `~/.forge` (seven files, sha1 of each unchanged) were compared before and
  after all of it: unchanged.
