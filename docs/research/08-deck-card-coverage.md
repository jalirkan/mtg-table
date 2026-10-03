# 08 — Deck card coverage: does Forge 2.0.14 implement Pacho's 28 cards faithfully?

Status: verification report, 2026-09-11. Scope: the 28 distinct cards in
`decks/pacho-shield.dck` / `.txt` (40 cards total).

Method. For each card: extract Forge's script from
`/home/justin-a/forge/res/cardsfolder/cardsfolder.zip`, fetch the official Oracle
text from `https://api.scryfall.com/cards/named?exact=<name>` (2 req/s,
`User-Agent: mtg-table/0.1 (local hobby client)`, `Accept: application/json`), and
diff mana cost, type line, P/T, keyword lines and ability definitions
(`A:` / `T:` / `S:` / `R:` / `K:` / `SVar`) against it. Forge mechanics were then
confirmed against the **2.0.15-SNAPSHOT source checkout** (cited as `file:line`)
and, where it matters for what we actually run, against the **2.0.14 jar** with
`javap` (cited as "javap"). Where the two disagree, the jar wins.

**Headline: 27 of 28 cards are faithful. One is not — `A.I.M. Scientists` has a
`K:Trample` line that the real card does not have.** The boot-time
`SVar 'Any' not found in ability` warning is benign and the card script it names
is correct. A separate, previously unknown issue was found while tracing it:
`S.H.I.E.L.D. Spy Kit`'s scry 1 routes, under Forge's default preferences,
through `manipulateCardList` with **the player's entire library** as its argument.

---

## 1. The table

Legend: **ok** = script matches Oracle in every checked field. **warning** =
matches, but something about it needs handling on our side. **mismatch** = the
script does not implement the printed card.

| # | Card | Set | Forge script (inside `cardsfolder.zip`) | Status | Notes |
|---|---|---|---|---|---|
| 1 | Agent Phil Coulson | MSH #4 | `a/agent_phil_coulson.txt` | ok | `K:Vigilance` + `A:AB$ PutCounterAll \| Cost$ T \| ValidCards$ Hero.Other+YouCtrl`. `Hero` is a registered creature type (§4). |
| 2 | Peggy Carter, Secret Agent | MSC #523 | `p/peggy_carter_secret_agent.txt` | ok | `Alone$ True` attacks trigger → `Pump \| KW$ Indestructible` on `TriggeredAttackerLKICopy`. |
| 3 | Agent 13, Sharon Carter | MSH #1 | `a/agent_13_sharon_carter.txt` | ok | `DB$ Investigate`. Creates the standard Clue token. |
| 4 | Agents of S.H.I.E.L.D. | MSH #5 | `a/agents_of_s_h_i_e_l_d.txt` | ok | Non-legendary 2/4; `+1/+1` pump on attacks-alone. |
| 5 | Quake, Agent of S.H.I.E.L.D. | MSH #32 | `q/quake_agent_of_s_h_i_e_l_d.txt` | ok | "Seismic Takedown" is an **ability word** (no rules meaning, CR 207.2c); Forge puts it in `TriggerDescription$` of a plain `Mode$ SpellCast \| ValidCard$ Card.nonCreature` trigger. Correct. |
| 6 | Nick Fury, Spymaster | MSC #603 | `n/nick_fury_spymaster.txt` | ok | `K:First Strike`; draw → optional `ChangeZone Hand→Battlefield \| ChangeType$ Creature.cmcLE3+YouOwn \| Tapped$ True \| Attacking$ True` → `Pump KW$ Indestructible`. All four clauses present and ordered. |
| 7 | S.H.I.E.L.D. Helicarrier | MSH #249 | `s/s_h_i_e_l_d_helicarrier.txt` | ok | `{4}` Artifact Vehicle 4/5, `K:Flying`, `K:Crew:6`, ETB two `w_1_1_soldier`. Token script verified: white 1/1 Soldier. |
| 8 | S.H.I.E.L.D. Spy Kit | MSH #36 | `s/s_h_i_e_l_d_spy_kit.txt` | **warning** | Script is correct (+1/+1, attacks-alone → `Untap` + `Scry 1`, `K:Equip:1`). The **scry** is the problem — see §5, it reaches `manipulateCardList` with the whole library. |
| 9 | Strategic Intervention | MSC #609 | `s/strategic_intervention.txt` | ok | `TargetMin$ 0 \| TargetMax$ 1` on `Creature.ControlledBy TriggeredDefendingPlayer` — the "up to one" and the "defending player" are both right. |
| 10 | Web Up | MSH #41 | `w/web_up.txt` | ok | Modern O-Ring: one trigger, `Duration$ UntilHostLeavesPlay` (implemented, `SpellAbilityEffect.java:999`). The `Variant:UniversesWithin:FlavorName:Mothwing Shroud` line is a Forge flavour-name alias, **not** a rules variant (`CardRules.isVariant()` is only Vanguard/Scheme/Plane/…, `CardRules.java:152-157`). |
| 11 | Helicarrier Strike | MSH #15 | `h/helicarrier_strike.txt` | **warning** | Script correct. `SVar:X:Count$Teamwork.4.2` is Forge's ternary — 4 if the Teamwork cost was paid, else 2 (`AbilityUtils.java:1697-1698`). Emits the `SVar 'Any'` stderr warning (§3). |
| 12 | Borough Backup | MSH #7 | `b/borough_backup.txt` | ok | Two `w_3_2_hero_vigilance` tokens (verified: white 3/2 Hero with Vigilance) + `K:TypeCycling:Basic:2` = Basic landcycling {2}. |
| 13 | Wasp, Shrinking Savior | MSC #646 | `w/wasp_shrinking_savior.txt` | ok | `Duration$ UntilYourNextTurn` (implemented, `SpellAbilityEffect.java:980`); `SVar:X:Count$Valid Creature.powerLT0` counts **all** creatures in play with net power < 0 (`CardProperty.java:1423-1432`). `NICKNAME` renders as "Wasp", matching Oracle. |
| 14 | Ant-Man, Reformed Rogue | MSC #739 | `a/ant_man_reformed_rogue.txt` | ok | `ManaCost:2 GU` = `{2}{G/U}`. All three triggers present; "can't be blocked this turn" is an `Effect` with a `CantBlockBy` static keyed on `Card.IsRemembered`. |
| 15 | Ant-Man's Air Force | MSC #759 | `a/ant_mans_air_force.txt` | ok | |
| 16 | Giant-Sized Flying Ant | MSH #56 | `g/giant_sized_flying_ant.txt` | ok | `DB$ Charm \| Choices$ DBTap,DBUntap`. The literal `ABILITY` token in `TriggerDescription$` is a Forge placeholder that gets substituted with the rendered modes — do not ship it verbatim if `Snap` ever serialises raw trigger text. |
| 17 | Bold Biochemist | MSH #48 | `b/bold_biochemist.txt` | ok | Power-up as `PowerUp$ True` — see §4 for the full verification. |
| 18 | **A.I.M. Scientists** | MSH #44 | `a/a_i_m_scientists.txt` | **MISMATCH** | Forge gives it **`K:Trample`**. The printed card has no trample. See §2. |
| 19 | Aerial Doombot | MSH #43 | `a/aerial_doombot.txt` | ok | Power-up {5}{U} → three +1/+1 counters. |
| 20 | Super Suit | MSH #78 | `s/super_suit.txt` | ok | `K:Flash`, ETB `Attach` + `Untap Defined$ Targeted`, `+1/+2`, `K:Equip:2`. |
| 21 | Robotics Mastery | MSC #786 | `r/robotics_mastery.txt` | ok | Two `c_1_1_a_robot_flying` tokens (verified: no `Colors:` line ⇒ colourless, Artifact Creature Robot 1/1 Flying). |
| 22 | Quantum Reduction | MSC #635 | `q/quantum_reduction.txt` | **warning** | Script correct: `K:Teamwork:2`, `S:Mode$ CastWithFlash \| ValidSA$ Spell.Teamwork`, `K:Enchant:Creature`, `AddPower$ -5 \| RemoveAllAbilities$ True`. Emits the `SVar 'Any'` stderr warning (§3) — benign. |
| 23 | Depower | MSH #50 | `d/depower.txt` | ok | `S:Mode$ ReduceCost \| Amount$ 2 \| ValidTarget$ Creature.attacking \| EffectZone$ All` — the conditional cost reduction is real, not baked in. |
| 24 | Pym Particles | MSH #70 | `p/pym_particles.txt` | ok | |
| 25 | Thriving Heath | MSC #580 | `t/thriving_heath.txt` | ok | Rules identical. Forge's `Oracle:` line uses the pre-2024 wording ("Thriving Heath enters tapped.") where Scryfall now says "This land enters tapped. As it enters, …". Display-only drift. |
| 26 | Thriving Isle | MSC #581 | `t/thriving_isle.txt` | ok | Same cosmetic Oracle drift as #25. |
| 27 | Plains | MSH | `p/plains.txt` | ok | `Types:Basic Land Plains`; mana comes from the basic land type, no `A:` line needed. |
| 28 | Island | MSH | `i/island.txt` | ok | Same. |

Mana cost, type line and P/T were diffed mechanically for all 26 non-basics and
**every one matched**, including the hybrid `{2}{G/U}` on Ant-Man and the
`{4}` colourless Vehicle. The only oracle-text diffs the mechanical pass reported
were Thriving Heath / Thriving Isle (#25, #26), both cosmetic.

### Deck/edition resolution also checks out

All ten `.dck` lines written **without** a `|MSH` suffix are exactly the ten cards
that do not exist in MSH: Peggy Carter (MSC 523), Nick Fury Spymaster (603),
Strategic Intervention (609), Quantum Reduction (635), Wasp (646),
Ant-Man Reformed Rogue (739), Ant-Man's Air Force (759), Robotics Mastery (786),
Thriving Heath (580), Thriving Isle (581). Verified against
`/home/justin-a/forge/res/editions/Marvel Super Heroes.txt` and
`… Commander.txt`: each of those ten appears in the MSC edition file and **zero
times** in the MSH one, and every collector number in Forge's edition files
matches Scryfall exactly. This confirms report 03's MSH/MSC split independently
and confirms the `.dck` is correctly annotated. `docs/evidence/m0-smoke.md`
already records 0 of 28 names unsupported by `CardRules.isUnsupported()`.

---

## 2. The one real mismatch: A.I.M. Scientists has trample and shouldn't

```
Name:A.I.M. Scientists
ManaCost:3 U
Types:Creature Human Scientist Villain
PT:3/3
K:Trample                       <-- NOT ON THE PRINTED CARD
K:TypeCycling:Basic:2
T:Mode$ ChangesZone | ... | Execute$ TrigConnive | ...
SVar:TrigConnive:DB$ Connive
Oracle:When this creature enters, it connives. (...)\nBasic landcycling {2} (...)
```

Evidence that this is a Forge bug and not a Scryfall gap:

1. `GET /cards/named?exact=A.I.M. Scientists` and `GET /cards/msh/44` both return
   `keywords: ["Landcycling","Basic landcycling","Typecycling","Cycling","Connive"]`
   and an `oracle_text` with no trample line.
2. **Forge's own `Oracle:` line in the same file contradicts its own `K:` line.**
   Forge generates `Oracle:` from Scryfall and hand-writes the ability lines; a
   `K:` with no counterpart in `Oracle:` is the signature of a scripting slip.
3. The bug is still present in Forge **master** today
   (`https://raw.githubusercontent.com/Card-Forge/forge/master/forge-gui/res/cardsfolder/a/a_i_m_scientists.txt`,
   HTTP 200, byte-identical `K:Trample`), so updating Forge will not fix it.

Impact: real. A 3/3 trampler in a 40-card deck changes blocks and races. This is
the kind of divergence that makes the user's on-screen game disagree with the
cards in their hand.

**Corrected script**: delete the single line `K:Trample`. Everything else in the
file is right.

### Where a local override actually goes (correction to a standing assumption)

The override directory is **not** `forge-home/res/cardsfolder`. There is exactly
one main card reader and it points at `res/`
(`ForgeConstants.CARD_DATA_DIR = RES_DIR + "cardsfolder"`,
`ForgeConstants.java:93`), and `forge-home/res` is a symlink into the user's real
install, which hard rule "never write outside this repo" forbids touching.

Forge's user overlay is a **second** reader:

```
ForgeConstants.java:253-255
  USER_CUSTOM_DIR       = USER_DIR + "custom/"
  USER_CUSTOM_CARDS_DIR = USER_CUSTOM_DIR + "cards/"

FModel.java:214-222
  reader       = new CardStorageReader(ForgeConstants.CARD_DATA_DIR, …, loadCardsLazily)
  customReader = new CardStorageReader(ForgeConstants.USER_CUSTOM_CARDS_DIR, …, false)
```

and `StaticData` loads the main tree first, then the custom tree into the **same
map**, so a custom file with the same `Name:` silently wins:

```
StaticData.java:113-131   for (CardRules card : cardReader.loadCards()) regularRules.put(name, card);
                          loadCustomCards();                       // line 128
StaticData.java:287-302   loadCustomCards(): card.setCustom(); regularRules.put(cardName, card);
```

Because `USER_DIR` is redirected by `forge-home/forge.profile.properties`, the
override path for this repo is:

```
/home/justin-a/code/mtg-table/var/forge/custom/cards/a_i_m_scientists.txt
```

Four facts that make this usable, all read from source (**not executed** — `var/`
belongs to the concurrent build workflow this session must not touch):

- `FPref.LOAD_CARD_SCRIPTS_LAZILY` defaults to **`"false"`**
  (`ForgePreferences.java:226`), so the main reader loads eagerly and
  `loadCustomCards()` genuinely runs after it. (Under lazy loading the ordering
  guarantee is weaker — `StaticData.resetLazyLoadedCards()` exists precisely
  because of that. Do not turn lazy loading on if we ship an override.)
- `CardStorageReader` **throws** if its directory does not exist
  (`CardStorageReader.java:88-95`) and `FModel` swallows that into
  `customReader = null`. `USER_CUSTOM_CARDS_DIR` is **not** in
  `ForgeConstants.PROFILE_DIRS` (`ForgeConstants.java:315-339`) — today
  `var/forge/custom/` contains only `editions/`. `tools/make-forge-home.sh` would
  have to `mkdir -p var/forge/custom/cards`.
- `collectCardFiles` recurses (`CardStorageReader.java:386-395`), so either a flat
  file or the `a/…` letter layout works.
- `loadCustomCards()` calls `card.setCustom()`. `StaticData` carries an
  `allowCustomCardsInDecksConformance` flag; check it before relying on the
  overridden card passing format/deck-legality checks.

**Recommendation.** Ship the override, but ship it from a committed source of
truth (`forge-home/custom-cards/a_i_m_scientists.txt`) that
`tools/make-forge-home.sh` copies into `var/forge/custom/cards/`, since `var/` is
gitignored. Add a one-line provenance comment and a `docs/` note, because a card
DB that silently differs from stock Forge is exactly the sort of thing that
wastes an hour in six months. Also file it upstream — it reproduces on master.

---

## 3. `SVar 'Any' not found in ability, fallback to Card (Quantum Reduction)` — benign

**Verdict: cosmetic stderr noise from a Forge *AI heuristic*. The card script is
correct, the rules path never touches it, and no card behaves wrongly in play.
No override can fix it, because the string `"Any"` is not in any card file.**

### Where it is printed

```java
// forge-game/src/main/java/forge/game/ability/AbilityUtils.java:405-419
if (StringUtils.isBlank(svarval)) {
    if ((ability != null) && (ability instanceof SpellAbility) && !(ability instanceof SpellPermanent)) {
        System.err.printf("SVar '%s' not found in ability, fallback to Card (%s). Ability is (%s)%n", …);
    }
    svarval = card.getSVar(amount);
}
if (StringUtils.isBlank(svarval)) {
    if (amount.startsWith("Cost")) { return 0; }
    System.err.printf("SVar '%s' not defined in Card (%s)%n", amount, card.getName());
    return 0;        // <-- line 419
}
```

Hence the warnings always come in pairs and the computed amount is **0**.

### Where `"Any"` comes from — not the card file

```java
// forge-game/src/main/java/forge/game/cost/CostTeamwork.java:23-25
public CostTeamwork(final String amount) {
    super("Any", "Creature.YouCtrl+withTotalPowerGE" + amount, null, false);
}
```

`K:Teamwork:2` → `GameActionUtil.java:485-489` builds
`new Cost("Teamwork<2>")` as an `OptionalCostValue(OptionalCost.Teamwork, …)` →
`CostTeamwork` → a `CostTapType` whose **amount is the literal sentinel `"Any"`**
and whose type carries the real requirement (`+withTotalPowerGE2`). `"Any"` is
Forge's "any number" marker, not an SVar name. This is why the warning names the
card but no edit to the card can silence it.

### Why the rules are unaffected — all three rules paths skip it

| Path | Code | Behaviour with `amount == "Any"` |
|---|---|---|
| Legality check | `CostTapType.canPay`, `CostTapType.java:158-189` | `totalPower` branch **returns at line 184** (`getTotalPower(typeList) >= 2`) before reaching `getAbilityAmount` at line 187. |
| Human payment | `HumanCostDecision.visit(CostTapType)`, `HumanCostDecision.java:1400-1402` | Explicitly guarded: `Integer c = null; if (!amount.equals("Any")) c = cost.getAbilityAmount(ability);`. Then the `totalPower` branch at 1438-1450 does the real multi-select + `getTotalPower(...) < i` validation. |
| AI payment | `AiCostDecision.visit(CostTapType)`, `AiCostDecision.java:461-488` | `isVehicle = type.contains("+withTotalPowerGE")` is true → `chooseTapTypeAccumulatePower(..., Integer.parseInt(totalP), …)`. `getAbilityAmount` is only called in the `else`. |

### The one path that *does* call it, and what it costs

```java
// forge-ai/src/main/java/forge/ai/ComputerUtilCost.java:453-513  (checkTapTypeCost)
if (sa.isCrew()) { … chooseTapTypeAccumulatePower … }      // Teamwork is NOT crew, so it falls through
Integer c = part.convertAmount();                           // null — "Any" is not numeric
if (c == null) c = AbilityUtils.calculateAmount(source, part.getAmount(), sa);   // line 487: PRINTS, returns 0
CardCollection tapChoices = ComputerUtil.chooseTapType(ai, type, source, …, c /* 0 */, …);
if (tapChoices != null) { …; return true; }
```

Reached only from `AiController.java:865-869`, and only when the AI has already
tapped creatures for mana this decision (`MemorySet.PAYS_TAP_COST` non-empty) and
is evaluating the **Teamwork variant** of the spell. That explains the
non-determinism `docs/evidence/m0-smoke.md` observed (0–3 lines per game).

The downstream effect is nil-to-harmless: `type` still carries the unstripped
`+withTotalPowerGE2`, which is not a `CardProperty`, so `getValidCards` returns an
empty list; with `amount == 0`, `ComputerUtil.chooseTapType` (`ComputerUtil.java:685-713`)
skips its `typeList.size() < amount` guard and its zero-iteration loop, and returns
an **empty but non-null** collection. `checkTapTypeCost` therefore returns `true`
— an over-optimistic "I can afford this", never a false rejection — and the real
`AiCostDecision` corrects it at payment time. The AI cannot cheat a Teamwork cost
through this path.

### Confirmed by the M0 evidence, and it is two cards not one

`docs/evidence/m0-smoke.md` §2 and `var/smoke-run4.log` show the warning firing for
**Helicarrier Strike** as well as Quantum Reduction. That is exactly the predicted
set: those are the two `K:Teamwork:2` cards in the deck, and nothing else in the
deck has a `CostTapType`.

### What to do

1. **Do not add `SVar:Any:0` to the card files.** It would work — `CardTraitBase.getSVar`
   already falls back to the host card (`CardTraitBase.java:538-563`), so both
   lines would vanish — but the computed amount is 0 either way, so it buys
   nothing except a card script that lies. Not worth an override.
2. **Filter it in the bridge's stderr watcher.** `Smoke.java` already classifies it
   as `svar-fallback`; keep that classification and stop treating a non-zero count
   as a finding. Downgrade the PLAN.md M0/M1 "watch for" item from open question to
   resolved-benign, citing this report.
3. Optional upstream courtesy: `ComputerUtilCost.checkTapTypeCost` should take the
   `withTotalPowerGE` branch for any such cost, not only `sa.isCrew()`. One-line
   fix upstream; not ours to carry.

---

## 4. Set mechanics: keyword, ability word, or inline?

| Mechanic | In this deck | Forge implementation | Verified |
|---|---|---|---|
| **Teamwork N** | Helicarrier Strike, Quantum Reduction | A **real keyword**: `Keyword.TEAMWORK` (`Keyword.java:191`) → `OptionalCost.Teamwork` (`GameActionUtil.java:485-489`) → `CostTeamwork extends CostTapType`. `SpellAbility.isTeamwork()` = `isOptionalCostPaid(OptionalCost.Teamwork)` (`SpellAbility.java:658-659`). Conditional effects read it via `Count$Teamwork.<ifPaid>.<ifNot>` (`AbilityUtils.java:1697-1698`, `2046-2047`) or `ValidSA$ Spell.Teamwork` (`SpellAbilityProperty.java:89`). | javap: `forge.game.cost.CostTeamwork`, `Keyword.TEAMWORK`, `SpellAbility.isTeamwork()`, `OptionalCost.Teamwork` all present in the 2.0.14 jar. |
| **Power-up — {cost}:** | Bold Biochemist, Aerial Doombot | **Not** a `Keyword` enum entry. An **SA parameter** `PowerUp$ True` on an ordinary `A:AB$ …`. Both rider clauses are implemented: "activate only once" via `sa.getActivationsThisGame() >= limit` (`SpellAbilityRestriction.java:465-468`) and "reduce the cost by its mana cost if it entered this turn" via `cost.subtractManaCost(host.getManaCost())` guarded on `host.enteredThisTurn()` (`CostAdjustment.java:225-228`). Rendered with `PrecostDesc "Power-Up — "` (`SpellAbilityEffect.java:93-95`). | javap: `SpellAbility.isPowerUp()` present in the 2.0.14 jar. Arithmetic checks out: Biochemist {5}{U} − {1}{U} = {4}; Doombot {5}{U} − {U} = {5}. |
| **Seismic Takedown** | Quake | An **ability word** — flavour only, no rules meaning (CR 207.2c). Forge inlines the words into `TriggerDescription$` of a normal trigger. Correct, and it is the only card in the whole `cardsfolder` that uses the phrase. | grep over the full extracted `cardsfolder` (33,617 files): 1 hit, `q/quake_agent_of_s_h_i_e_l_d.txt`. |
| **"Behind every S.H.I.E.L.D. agent…"** | Agents of S.H.I.E.L.D. | **Not a mechanic.** It is the card's **flavour text**: *"Behind every S.H.I.E.L.D. solo mission are dozens of intelligence operatives, logistics coordinators, and backup agents."* Nothing to implement; Forge card scripts carry no flavour text at all. | Scryfall `flavor_text` on `msh/5`; zero hits for "Behind every" across the cardsfolder. |
| **"attacks alone"** (the deck's actual theme — 6 cards) | Peggy Carter, Agent 13, Agents of S.H.I.E.L.D., Nick Fury, Strategic Intervention, Spy Kit | Not a keyword; a trigger parameter `Alone$ True` on `Mode$ Attacks`, requiring `runParams[OtherAttackers].size() == 0` (`TriggerAttacks.java:68-82`). | Source read. |

### Hero / Villain

Both are **plain creature types**, registered in
`/home/justin-a/forge/res/lists/TypeLists.txt` under `[CreatureTypes]`
(`Hero:Heroes` line 143, `Villain:Villains` line 329; also `Inhuman` 156,
`Scientist` 264, `Spy` 301, `Robot` 254, `Insect` 159, `Rogue` 255). No keyword,
no special handling, nothing to add. Three places in the deck touch them:

1. **Agent Phil Coulson** keys off it mechanically — `ValidCards$ Hero.Other+YouCtrl`.
   This is the only card in the deck whose effect depends on a Hero type line.
2. **Borough Backup** produces Hero bodies — `w_3_2_hero_vigilance`, whose token
   script is `Types:Creature Hero`, so Coulson's counters find them. Verified.
3. **Villain** appears as a subtype on A.I.M. Scientists and Aerial Doombot, and
   **nothing in this deck keys off it.** It is decoration here.

Practical consequence for the UI: ten of the deck's thirteen creature cards carry a
Hero or Villain subtype (eight Hero, two Villain), plus the Hero tokens, so
`CardTile` must not assume the type line fits in one short string —
"Legendary Creature — Human Spy Hero" is the common case here, not the exception.

---

## 5. New finding: Spy Kit's scry 1 reaches `manipulateCardList` with the whole library

This is not a card-script problem — the Spy Kit script is right — but it is the
most actionable thing this review turned up, and it is a **hidden-information
issue**, which hard rule 8 makes non-negotiable.

```java
// forge-gui/src/main/java/forge/player/PlayerControllerHuman.java:998-1019
public ImmutablePair<CardCollection, CardCollection> arrangeForScry(final CardCollection topN) {
    …
    if (FModel.getPreferences().getPrefBoolean(FPref.UI_SELECT_FROM_CARD_DISPLAYS) && !getGui().isLibgdxPort()) {
        CardCollectionView cardList = player.getCardsIn(ZoneType.Library);      // <-- THE ENTIRE LIBRARY
        ImmutablePair<…> result = arrangeForMove("…Top or Bottom of Library", cardList, topN, true, true);
        …
    } else if (topN.size() == 1) {
        if (willPutCardOnTop(topN.get(0))) { … }                                // a 2-option confirm
    } else {
        … getGui().many("…cards to put on the bottom", …, -1, <just topN>, null);
    }
}

// :982-995
public ImmutablePair<…> arrangeForMove(title, cards, manipulable, topOK, bottomOK) {
    List<Card> result = manipulateCardList(title, cards, manipulable, topOK, bottomOK, false);
    …
}
```

`FPref.UI_SELECT_FROM_CARD_DISPLAYS` defaults to **`"true"`**
(`ForgePreferences.java:157`), and `isLibgdxPort()` is false for us (`IGuiGame.java:49-51`
delegates to `IGuiBase`, and our `HeadlessGuiBase` is not the libGDX port). So on
the default path, the first time the user attacks alone with an equipped creature:

- `manipulateCardList` fires — one of the 36 abstract members the synthesis
  (§11) predicted "will not appear until a card causes them". **A card in this
  deck causes it, on a routine combat trigger.** It is not an exotic corner case.
- Its `cards` argument is the player's **entire ordered library**. Serialising
  that into a `manipulate_list` ask ships ~21 card names to the browser and
  spoils the rest of the game. §3.3's "library carries `count` only" invariant
  does not protect an `ask` body; only `Snap.card` is gated on `canBeShownTo`.
Separately — and on **both** paths, so turning the pref off does not remove it —
`willPutCardOnTop` calls `tempShowCard(c)` + `getGui().setCard(…)`
(`PlayerControllerHuman.java:1089-1098`). That is a legitimate reveal of one
library card to its own controller, and a concrete instance of the
`DelayedReveal` / `tempShowZones` enumeration gap the synthesis left open in §2.5:
`Snap` must let this card through while still reporting the library as a count.

**Fix, one line, at boot:**

```java
FModel.getPreferences().setPref(FPref.UI_SELECT_FROM_CARD_DISPLAYS, "false");
```

(javap: `AbstractPreferences.setPref(T, java.lang.String)` exists in the 2.0.14 jar;
there is **no** boolean overload, so pass the string. Do not call `save()` unless
we want it persisted into `var/forge/preferences/`.)

With the pref off, all three affected behaviours become *simpler* for a browser
client, not worse:

| Call site | pref **true** (default) | pref **false** (recommended) |
|---|---|---|
| `arrangeForScry`, scry 1 | `manipulateCardList` over the whole library | `willPutCardOnTop` → `InputConfirm` with Top/Bottom → our `options` ask |
| `arrangeForScry`, scry N>1 | same | `getGui().many` over **only the top N** → our `choose_list` ask |
| `useSelectCardsInput` (`:428-462`) | board-click selection allowed in library/graveyard/exile/command/sideboard | board-click only for own hand + battlefield; everything else falls back to dialogs → `choose_list` / `choose_entities`, which we already model |
| `reveal` of an opponent's hand (`:940-960`) | floating-zone reveal via `tempShowZones` | plain names-list dialog |

This trades Forge-desktop fidelity for a client we can actually finish, and it
closes a leak. It is a deliberate deviation from stock Forge and belongs in
`DECISIONS.md`.

---

## 6. Other engine surfaces this deck will exercise

Useful for M5's "nothing dead-ends" exit criterion — these are the blocking calls
the 28 cards guarantee will fire, so they are not speculative.

- **`choose_list` with `min: 0`** — casting Helicarrier Strike or Quantum Reduction
  offers the optional Teamwork cost via
  `PlayerControllerHuman.chooseOptionalCosts` → `getGui().many(…, 0, n, optionalCost, …)`
  (`PlayerControllerHuman.java:3731-3734`; javap-confirmed present in 2.0.14). The
  list elements are `OptionalCostValue`s, so the wire needs a rendered label for
  each, not a card id.
- **A free-form multi-select whose OK button is enabled while the answer is still
  illegal** — paying Teamwork uses
  `new InputSelectCardsFromList(controller, 0, typeList.size(), …)` and only then
  checks `getTotalPower(inp.getSelected()) < 2 → return null`
  (`HumanCostDecision.java:1438-1450`). Pressing OK with 1 power **silently aborts
  the cast**. Show the running total power and the threshold in the prompt, or the
  user will think the client is broken.
- **`order`** — Agent Phil Coulson plus any other attacks-alone trigger in the same
  combat means multiple simultaneous triggers and an ordering prompt.
- **Connive** (A.I.M. Scientists) → `chooseCardsToDiscardFrom`
  (`PlayerControllerHuman.java:1174-1186`), min 1 max 1, cancel disallowed.
- **`chooseColor`** — Thriving Heath / Thriving Isle each ask on ETB, and the
  script's `Exclude$ white` / `Exclude$ blue` means the option list is the other
  four colours, not five (`PlayerControllerHuman.java:1967-1977`).
- **`Charm`** (Giant-Sized Flying Ant) → a two-mode choice on ETB.
- **Crew 6** (S.H.I.E.L.D. Helicarrier) → the same `withTotalPowerGE` multi-select
  as Teamwork, via the `sa.isCrew()` branch. Whatever UI solves Teamwork solves Crew.
- **Basic landcycling** (Borough Backup, A.I.M. Scientists) → a library search,
  i.e. `openZones` / a `choose_list` over library contents. This is a *legitimate*
  library reveal and must be distinguished in `Snap` from the illegitimate one in §5.

---

## 7. Reproducing this

```bash
Z=/home/justin-a/forge/res/cardsfolder/cardsfolder.zip
unzip -p $Z a/a_i_m_scientists.txt          # the mismatch
unzip -p $Z q/quantum_reduction.txt         # the warned-about card (it is fine)
unzip -p $Z h/helicarrier_strike.txt        # the other Teamwork card

curl -sS -H 'User-Agent: mtg-table/0.1 (local hobby client)' -H 'Accept: application/json' \
  'https://api.scryfall.com/cards/msh/44' | grep -o '"keywords":\[[^]]*\]'

grep -rn 'not found in ability' <forge-src>/forge-game/src/main/java/forge/game/ability/AbilityUtils.java
```

Scryfall JSON for all 26 non-basics, and the 28 extracted scripts, are in this
session's scratchpad under `deckcards/sf/` and `deckcards/scripts/`; they are
cheap to regenerate with the two commands above.

---

## 8. The second deck: `decks/doom-legion.dck` (2026-09-27)

Scope: the 27 distinct cards of **Doom Legion (Marvel Super Heroes villains)**,
the 40-card blue-black deck match setup seats the AI behind. What the deck is
and how it plays is `decks/README.md`; what was run is
`docs/evidence/match-setup.md` §D. Same method as §1 — the script out of
`cardsfolder.zip`, Scryfall's printing in the set the line names, the two
diffed — except that the mechanical half is now a tool, `tools/check-deck.mjs
--scryfall`, which diffs mana cost, type line, P/T, `K:` keywords (a keyword the
printed card lacks is a mismatch — it catches §2's Trample, negative-controlled
with `--stock`) and Oracle text. The ability lines (`A:` / `T:` / `S:` / `R:` /
`SVar`) were then read against Oracle by hand, as in §1, and the two trigger
limits the deck leans on were confirmed against the **2.0.14 jar** with javap.

**Headline: 27 of 27 cards are faithful. No mismatch, no overlay needed.**
(The 27 as they stand after the review's swap, §8.3b: Crossbones, Malicious
Mercenary in, Trickster's Stratagem out — both faithful.) Three
`Oracle:` lines drift from Scryfall and all three are display text only: the two
Thriving lands carry §1's older templating, and Hidden Lair's reads *"if your
control a basic land"* — a typo in Forge's text line; the rules line
(`IsPresent$ Card.Self+ThisTurnEntered,Land.Basic+YouCtrl`, a comma is "or") is
right. One card that was in the first draft, **Kang Prime, is faithful but was
cut** — not for its script but because its library reveal fails
`tools/check-redaction.mjs` (§8.3); a second, **Trickster's Stratagem**, was
cut because the Forge AI never casts it (§8.3b).

### 8.1 The table

Every line of the `.dck` carries its set code, and every code was checked
against the edition file (`Marvel Super Heroes.txt`, `Marvel Super Heroes
Commander.txt`) and against Scryfall — the collector numbers agree. Paths are
inside `cardsfolder.zip`.

| # | Card | Set | Forge script | Status | Notes |
|---|---|---|---|---|---|
| 1 | Aerial Doombot | MSH #43 | `a/aerial_doombot.txt` | ok | §1 #19 — also in Pacho's deck. Power-up `{5}{U}`: three +1/+1 counters. |
| 2 | Agents of HYDRA | MSH #85 | `a/agents_of_hydra.txt` | ok | Dies → `b_2_1_villain_menace`. Token script verified: black 2/1 `Creature Villain`, `K:Menace`. |
| 3 | Loki, God of Mischief | MSH #65 | `l/loki_god_of_mischief.txt` | ok | `Mode$ BecomesTarget \| ValidTarget$ Player,Permanent \| ValidSource$ Ability.YouCtrl \| ActivationLimit$ 1`. "Triggers only once each turn" is `ActivationLimit` — javap: `Trigger.checkActivationLimit` compares `getActivationsThisTurn()`, i.e. per **turn**. |
| 4 | Doom's Servo-Guards | MSC #535 | `d/dooms_servo_guards.txt` | ok | Artifact Creature Robot Villain 2/2; ETB gain 2, mill 2. |
| 5 | Doom Reigns Supreme | MSH #96 | `d/doom_reigns_supreme.txt` | ok | Enchantment — **Plan**. Villain ETB → drain 1 + a `PLAN` counter; `Mode$ CounterAdded \| CounterAmount$ EQ5` → sacrifice → reflexive `ImmediateTrigger` → `Dig \| DigNum$ 5 \| ChangeNum$ All \| DestinationZone$ Exile` on the target opponent → `Play \| Amount$ 2 \| WithoutManaCost$ True \| Optional$ True`. Fired once in the evidence (§8.2). The counter reaches the wire as `"Plan"` (amendment M43: an opaque display name). |
| 6 | Dark Deed | MSH #93 | `d/dark_deed.txt` | ok | Instant, `Pump NumAtt$ -4 NumDef$ -4`. |
| 7 | Doom Blade | MSC #576 | `d/doom_blade.txt` | ok | A reprint; `ValidTgts$ Creature.nonBlack`. Every creature and token in Pacho's deck is nonblack. |
| 8 | Baron Strucker, HYDRA Overlord | MSH #88 | `b/baron_strucker_hydra_overlord.txt` | ok | `S:Mode$ ReduceCost \| ValidCard$ Villain \| Type$ Spell \| Activator$ You \| Amount$ 1`; another Villain ETB → optional connive with `ResolvedLimit$ 1` — "do this only once each turn" — javap: `Trigger.checkResolvedLimit` counts `Card.getAbilityResolvedThisTurnActivators`, per **turn**. |
| 9 | HYDRA Troopers | MSH #101 | `h/hydra_troopers.txt` | ok | `DB$ Branch \| BranchConditionSVar$ X \| …GE2` → tapped menace token, else mill 2. `X` = creature cards in your graveyard. |
| 10 | A.I.M. Bot | MSC #529 | `a/a_i_m_bot.txt` | ok | Vanilla Artifact Creature Robot Villain 2/3 `K:Flying`. |
| 11 | Visions of Villainy | MSH #120 | `v/visions_of_villainy.txt` | ok | Self cost reduction `IsPresent$ Villain.YouCtrl \| EffectZone$ All`; draw 2, lose 2. |
| 12 | Frozen in Ice | MSH #54 | `f/frozen_in_ice.txt` | ok | Aura; ETB tap; `RemoveAllAbilities$ True`; "can't become untapped" is `R:Event$ Untap \| Layer$ CantHappen`. `SVar:AttachAILogic:Curse`, so the AI puts it on the opponent's creature. |
| 13 | Kang the Conqueror | MSH #62 | `k/kang_the_conqueror.txt` | ok | 4/5 flying. Power-up `{5}{U}{U}{U}` → +1/+1 counter, `AddTurn \| NumTurns$ 1` with an `ExtraTurnDelayedTrigger` that installs `CantBeActivated \| ValidSA$ Activated.PowerUp` for that turn. The cost after entering this turn is `{3}{U}` (`CostAdjustment`, §4). **Not activated in any recorded game** — an extra turn has no recording anywhere in the repo. |
| 14 | Kang, Temporal Tyrant | MSH #217 | `k/kang_temporal_tyrant.txt` | ok | `{2}{U}{B}`, the deck's gold card. Attacks → connive; `Mode$ Drawn \| Number$ 2` = "your second card each turn" → drain 1. |
| 15 | Unliving Legionnaire | MSH #119 | `u/unliving_legionnaire.txt` | ok | 3/2 flying. Power-up `{5}{B}{B}` (`{2}{B}` the turn it enters): `ChangeZone Graveyard→Hand \| TargetMin$ 0 \| TargetMax$ 1` ("up to one") + two +1/+1 counters. |
| 16 | Madame Hydra, Reanimated | MSC #538 | `m/madame_hydra_reanimated.txt` | ok | 2/2 `K:Menace`, `+X/+X` for creature cards in your graveyard; ETB and attack triggers → mill 2 (the attack trigger is `Secondary$ True`, one description for both). |
| 17 | Hour of Defeat | MSH #99 | `h/hour_of_defeat.txt` | ok | Destroy + `Surveil \| Amount$ 1`. |
| 18 | Crossbones, Malicious Mercenary | MSH #91 | `c/crossbones_malicious_mercenary.txt` | ok | Legendary Creature — Human Mercenary Villain 3/3 `K:Deathtouch`. `Mode$ ChangesZone \| Destination$ Battlefield \| ValidCard$ Villain.Other+YouCtrl \| ActivationLimit$ 1` — "triggers only once each turn", per **turn** as for Loki (#3) — → `PutCounter P1P1` on himself, then `DealDamage \| Defined$ Player.Opponent \| NumDmg$ 2`: no target, no reveal. Replaced Trickster's Stratagem (§8.3b). |
| 19 | Pharaoh Rama-Tut | MSC #634 | `p/pharaoh_rama_tut.txt` | ok | 4/4 `K:Ward:2`; `Mode$ SpellCast \| ValidCard$ Card.nonCreature` → connive. Replaced Kang Prime (§8.3). |
| 20 | Doctor Doom | MSH #95 | `d/doctor_doom.txt` | ok | ETB two `doombot` tokens — token script verified: `Name:Doombot`, colourless `Artifact Creature Robot Villain` 3/3, as printed. Indestructible `IsPresent$ Creature.Artifact+YouCtrl,Plan.YouCtrl` — artifact creature **or** Plan, and Doom Reigns Supreme is a Plan. End step: draw, lose 1. |
| 21 | Thriving Isle | MSC #581 | `t/thriving_isle.txt` | ok | §1 #26 — the same cosmetic Oracle drift. |
| 22 | Thriving Moor | MSC #582 | `t/thriving_moor.txt` | ok | Thriving Isle's black twin (`Exclude$ black`); same drift. |
| 23 | Hidden Lair | MSH #269 | `h/hidden_lair.txt` | ok (text) | `{T}: {C}`; `{T}: {U} or {B}` while it entered this turn or you control a basic. Oracle line typo "if your control" — display only. |
| 24 | Castle Doom | MSH #263 | `c/castle_doom.txt` | ok | `{T}: {C}`; `{T}: any colour \| RestrictValid$ Spell.Artifact`; `{3}, {T}, Sac<1/Artifact>: doombot token \| SorcerySpeed$ True`. The token ability was never activated in the evidence. |
| 25 | Villainous Hideout | MSH #276 | `v/villainous_hideout.txt` | ok | `{T}: any colour \| RestrictValid$ Spell.Villain,Activated.Villain`; `{3}, {T}: target Villain you control connives`, sorcery speed. |
| 26 | Swamp | MSH | `s/swamp.txt` | ok | Basic. |
| 27 | Island | MSH | `i/island.txt` | ok | Basic. |

No card in the deck carries an `AI:RemoveDeck` hint.

### 8.2 What changes because this is the AI's deck

§4 said of Pacho's deck that **"Villain … is decoration here."** In Doom Legion
it is the engine: all 17 creatures and both token kinds are Villains, and six
cards key off the type — Baron Strucker (cost reduction and connive), Doom
Reigns Supreme (drain and plan counters), Crossbones (a counter and 2 damage to
you), Visions of Villainy (cost), Villainous Hideout (mana and connive), and the
Doombot tokens are Villains for all of them.
`CardTile` and the arena's type line see "Legendary Creature — Human Villain"
and "Artifact Creature — Robot Villain" throughout. The arena's per-card data
(`figures/traits.json`, `figures.json`, `cues/cues.json`) has rows for Aerial
Doombot (it is in Pacho's deck too) and none yet for the other 23 nonbasic
names; those fall back to the subtype and archetype rungs, which is the
documented behaviour, until rows are added. *(2026-09-29, villain identity: they
are added — a `creature/subtype:villain` rung and a row for every creature and
both tokens, **D221** — and the deck has a committed recording,
`fixtures/games/villain-doom-248.jsonl`, **D220**; `docs/evidence/villain-identity.md`.)*

The prompts this deck raises **for the human seat** when the AI plays it — the
surfaces M5's "nothing dead-ends" criterion cares about — are few, because the
villains mostly decide for themselves:

- **Ward 2** on Pharaoh Rama-Tut: targeting it raises the ward trigger, which
  counters the spell unless the seat pays `{2}` (Forge's `UnlessCost` path). Not
  checked in the evidence — nothing records whether the seat ever targeted it.
- **Doom Reigns Supreme's payoff** exiles the seat's top five face up and the AI
  may cast two of them — reached once (`doom2-mirror-15`): the seat's Island,
  HYDRA Troopers, Swamp, Swamp, Island went to exile and the AI cast the
  Troopers. The other direction — the **seat's** copy exiling the AI's top five —
  builds a `DelayedReveal` for the seat (no `Reveal$` on the script) and asks
  `choose_entities` *"Select a card to play"*, `min 0`, `max 1`, over the cards
  already in exile; forced with a scratch deck, twice, and the redaction gate
  passed both times (`docs/evidence/match-setup.md` §D.4).
- Connive, mill and surveil by the AI are hidden draws and public discards/mills
  — no prompt, and the gate passed on all 21 games.

### 8.3 Kang Prime: faithful, and cut

Kang Prime (MSC #85, `{3}{U}{B}` 3/5 flying) is scripted correctly —
`DB$ DigUntil | Valid$ Card.nonLand | FoundDestination$ Exile |
RevealedDestination$ Exile`, two `TIME` counters, `KW$ Suspend | PumpZone$
Exile | Duration$ Permanent` for a card without it — and it played. But
`DigUntilEffect.resolve` calls `GameAction.reveal` on the cards it digs (javap:
offset 697), and the recordings catch those cards **in the AI's
`library.cards`, fully drawn**, for one frame before they move to exile. That is
a genuine reveal — the same cards are face up in exile in the next `state` — but
`tools/check-redaction.mjs` fails it as A3 (an opponent's full library card), in
2 of 10 recorded games (five frames; `docs/evidence/match-setup.md` §D.3). The
gate stays as it is and the deck changed: Pharaoh Rama-Tut took the slot.

Any future card whose script is `DigUntil` (or another reveal of the top of a
library the viewer does not own) will hit the same assertion. Whether A3 should
admit a `GameAction.reveal` window is a question for report 06 and
`check-redaction.mjs`, with those five frames as its test data; it is not
answered here.

### 8.3b Trickster's Stratagem: faithful, and never cast by the AI

Trickster's Stratagem (MSH #81, `{3}{U}` sorcery) is scripted correctly —
`ChangeZone … Destination$ Library | LibraryPosition$ 1` (second from the top)
`| DestinationAlternative$ Library | LibraryPositionAlternative$ -1` (bottom)
`| AlternativeDecider$ TargetedOwner`, the **owner** choosing as printed, then
`Connive | TargetMin$ 0 | TargetMax$ 1` — but **the Forge AI does not cast it**.
Over the first 21 games its only stack entry was the seat's own cast; the match
setup review then gave the AI **14 copies** and 24 Islands against the seat's
HYDRA creatures and it never cast one in 61 turns and 37 draws. The script has
no `AILogic$`; why 2.0.14's `ChangeZone` AI declines a battlefield→library tuck
was not traced, because the answer would not change the deck. A card the AI never
plays leaves the AI 39 live cards out of 40, and the one path the card was
there for — the **seat** as the owner making the top-2/bottom choice — cannot be
reached from the AI's side at all. **Crossbones, Malicious Mercenary** (MSH #91,
row 18 above) took the slot: the same 4-drop, a creature the AI casts, and a
Villain-keyed trigger with no target and no reveal. The census of what the AI
cast after the swap is `docs/evidence/match-setup.md` §D.6.

### 8.4 Named and left out

| card | why not |
|---|---|
| Super Villain Lockup (MSH #37) | **White** (`{1}{W}`) — a hero's card that locks a tapped villain away. Not in a blue-black villain deck. |
| Baron Helmut Zemo (MSH #87) | `AI:RemoveDeck:All` — Forge's own flag that its AI cannot play the card. |
| Kang Prime (MSC #85) | §8.3. |
| Trickster's Stratagem (MSH #81) | §8.3b — the Forge AI never casts it. |
| Loki, the Deceiver (MSC #86) · Doctor Doom, King of Latveria (MSC #6) | Three colours (`{1}{U}{B}{R}`). |
| Lady Loki · Loki's Scepter · Loki Laufeyson | Red. |

### 8.5 Reproducing this

```bash
node tools/check-deck.mjs decks/doom-legion.dck --scryfall      # static + Scryfall + engine
node tools/check-deck.mjs decks/pacho-shield.dck --no-engine --scryfall --stock   # must FAIL on Trample
Z=/home/justin-a/forge/res/cardsfolder/cardsfolder.zip
unzip -p $Z k/kang_prime.txt                                    # the cut card's DigUntil
unzip -p $Z d/doom_reigns_supreme.txt                           # the Plan
J=/home/justin-a/forge/forge-gui-desktop-2.0.14-jar-with-dependencies.jar
java -m jdk.jdeps/com.sun.tools.javap.Main -cp $J -c -p forge.game.ability.effects.DigUntilEffect \
  | grep 'GameAction.reveal'
```

---

## 9. Reality Fracture (FRA): the user's own second deck, and why it waits

Added 2026-09-27 (branch `engine-upgrade`). The user played a Reality Fracture
pre-release (Scryfall `fra`, released 2026-10-02) and brought home a red-white
legends aggro pool: **`decks/fra-rw-aggro.dck`**, 40 main and 10 sideboard,
transcribed from the user's own list at `/mnt/e/jalir/Projects/Magic/fra-pool-red-white-aggro.md`.
The decision and the plan are in
[`14-engine-upgrade.md`](14-engine-upgrade.md); the raw numbers are in
[`../evidence/engine-upgrade.md`](../evidence/engine-upgrade.md). This section is
the card-by-card view, in the same spirit as §1: what each engine does with each
card, and what to look at on the day.

**The engine stays 2.0.14 until an official Forge release ships the set** (the
user's constraint). Nothing below is loaded today: no FRA script is overlaid, and
`forge-home/custom-cards/` still holds exactly one file (D14).

### 9.1 The table

"2.0.14" is `node tools/audit-deck.mjs decks/fra-rw-aggro.dck` against the engine
`config.json` names today. "snapshot" is the same tool with
`FORGE_JAR=<2.0.15-SNAPSHOT-09.27 jar>`: every card there builds (`ok`), resolves
to `FRA` (Austere Command to `SPG`) and is Forge's own script, at the path shown
inside `cardsfolder.zip`. "Oracle" compares that script's `Oracle:` lines with
Scryfall's text (spike A, `GET /cards/named?exact=…&set=fra`).

| card (copies) | 2.0.14 today | snapshot script | mechanic worth watching | Oracle |
|---|---|---|---|---|
| Samut, Hazoret's Champion | missing | `upcoming/samut_hazorets_champion.txt` | a haste-granting static: 2.0.14's AI throws on the new haste statics (below) | match |
| Gallia, the Merrymaker | missing | `upcoming/gallia_the_merrymaker.txt` | haste to creatures with a +1/+1 counter; tap ability | match |
| Eardrum Rattler | missing | `upcoming/eardrum_rattler.txt` | "can't be blocked" makes an Effect card in the command zone | match |
| Graft Surgeon | missing | `upcoming/graft_surgeon.txt` | enters with a counter; dies trigger moves counters | match |
| Koth, the Geomancer | missing | `upcoming/koth_the_geomancer.txt` | landfall ping, extra {R} for a Mountain | match |
| Chandra's Emberling | missing | `upcoming/chandras_emberling.txt` | noncreature-cast counter trigger | match |
| Pyre Rhymer // Molten Tide | missing | `upcoming/pyre_rhymer_molten_tide.txt` | **Prepare**: a second castable spell face | Molten Tide's text says "additonal" (display only; the ability is `DB$ Mana \| Produced$ R`) |
| Yoshimaru, Beloved Companion | missing | `upcoming/yoshimaru_beloved_companion.txt` | counter replacement (+1 extra) | match |
| Mabel, Valley Hero (2) | missing | `upcoming/mabel_valley_hero.txt` | enters trigger per creature | match |
| Shatterwing Pegasus (2) | missing | `upcoming/shatterwing_pegasus.txt` | flying, team pump | match |
| Woodwork Prodigy // Soul Tether | **ok** (scripted in 2.0.14 since August) | `w/woodwork_prodigy_soul_tether.txt` | **Prepare**, re-prepares every upkeep | match |
| Thalia, the Survivor | missing | `upcoming/thalia_the_survivor.txt` | lifelink; taxes the opponent's noncreature spells | match |
| Whiplash Wordsmith // Vicious Verse | missing | `upcoming/whiplash_wordsmith_vicious_verse.txt` | **Prepare**; conditional flying + haste (the static 2.0.14's AI threw on) | match |
| Jiang Yanggu, Alone | missing | `upcoming/jiang_yanggu_alone.txt` | attacks-alone loot + counters | match |
| Wrath of the Bloodmane (4) | missing | `upcoming/wrath_of_the_bloodmane.txt` | cost reduction with a legend | match |
| No Admittance | missing | `upcoming/no_admittance.txt` | **Empower Jace 1**: new `ApiType.Empower`, **no AI logic** in Forge | match |
| Fulminous Forte | missing | `upcoming/fulminous_forte.txt` | modal (sweep 1 / 5 to one target) | match |
| Ajani's Anguish | missing | `upcoming/ajanis_anguish.txt` | X spell; team trample | match |
| Mountain (9), Plains (8) | ok, but `FRA`→`TRK` (2.0.14's FRA lists no basics) | `m/mountain.txt`, `p/plains.txt` | | — |
| *sideboard* Surgical Precision (2) | missing | `upcoming/surgical_precision.txt` | modal | match |
| Your Fate Ends Here | missing | `upcoming/your_fate_ends_here.txt` | removal + surveil | match |
| Hexhaven Battalion | missing | `upcoming/hexhaven_battalion.txt` | **Empower Jace 2** | match |
| Way of the Pyromancer | missing | `upcoming/way_of_the_pyromancer.txt` | **Empower Jace 2**, legendary enchantment | match |
| Medic's Kitesail (2) | missing | `upcoming/medics_kitesail.txt` | equipment | match |
| Austere Command | ok, but `SPG`→`MSC` (2.0.14's SPG does not list it) | `a/austere_command.txt` (a stock reprint; the snapshot's SPG lists it) | four-mode wrath | not compared |
| Ghalta the Immovable | missing | `upcoming/ghalta_the_immovable.txt` | cost reduction by toughness | differs by a curly apostrophe only |
| Room of Refuge | missing | `upcoming/room_of_refuge.txt` | choose a colour on entry | match |

**Totals.** 2.0.14 today: 19 ok, **31 missing**, 0 broken (copies). Forge drops a
missing card from the library **silently** (`Match.prepareAllZones`), so the deck is
not playable on today's engine and nothing pretends otherwise. Snapshot: **50 of 50
ok**. None of the 26 names needs a hand-written script; "three cards are missing
upstream" was a lookup-by-file-name artefact (249 of the set's scripts live under
`upcoming/`, and prepared cards carry both names in the file name).

### 9.2 Why the snapshot's scripts cannot simply be overlaid onto 2.0.14

D14's overlay mechanism (§2) would load them, and 249 of 249 parse. But three of the
50 cards use `DB$ Empower`, an `ApiType` 2.0.14 does not have; `CardFactory.getCard`
throws on them at zone preparation, **before turn 1**, and a card in the sideboard is
built too. The exact deck produced 0 turns at seeds 7, 8 and 9. Without those three,
2.0.14's AI threw 17 swallowed `NullPointerException`s in 10 games in
`ComputerUtil.hasACardGivingHaste` on the new haste statics (Whiplash Wordsmith's
`AffectedDefined$ Self` has no `Affected$`). And a parameter 2.0.14 never reads is
ignored without a word, which no build check can see. The judged verdict is
**wait** (`14-engine-upgrade.md` §3).

### 9.3 What to look at on the day (engine surfaces this deck will exercise)

- **Empower.** Forge has no AI logic for the API ("No AI assigned for API:
  Empower"). On the snapshot the AI cast No Admittance once in spike B's 11
  recorded games and **0 times** in the 12 of spike A and the 140 AI-vs-AI games of
  the preparation pass; it does cast Empower cards whose main job is something else
  (Way of the Pyromancer and Hexhaven Battalion in spike A's probe, Arcane
  Amphisbaena in the green-black draft below), and the Jace token appears and is
  activated. A **human** casting No Admittance through the bridge has never been
  tried: that is the first thing to do on the day.
- **Prepare.** Three cards have a castable second face. The snapshot's `CardView`
  has a prepared flag (`hasPreparedSpell()`, new in 2.0.15) and the wire carries
  neither the flag nor a face-up card's spell face: hard rule 8 keeps
  `getAlternateState()` inside the face-down `alt` block. The game plays (the
  engine offers the copy as an ordinary castable ability), but the board cannot say
  "prepared". Surfacing it is a protocol amendment plus a hard-rule-8 review.
- **X, modes, colour choice.** Ajani's Anguish (X), Fulminous Forte and Surgical
  Precision (modal) and Room of Refuge (choose a colour) go through the engine's X,
  mode and colour prompts. The AI has played all four on the snapshot; a human
  has not answered any of them for these cards.
- **Pyre Rhymer's typo** and **whether the AI casts No Admittance**: re-check on the
  release; both are Forge's to fix, not ours.

### 9.4 An FRA opponent (draft)

The user's own list proposes "a second deck from the leftovers (for the coworker to
play)": green-black midrange, 22 named cards. `docs/drafts/decks/fra-gb-leftovers.dck`
is that list finalised to 40 with 18 basics (8 Forest, 8 Swamp, 2 Plains for
Bloombrute, which the list says "needs a Plains or two"). It is a **draft for the
user to review** and lives outside `decks/` on purpose (`docs/drafts/README.md`).
2.0.14 today: 20 ok (Vigorbloom Vanguard and the basics), 20 missing. Snapshot: 40 of
40 ok, every card Forge's own script. Two of its cards (Arcane Amphisbaena) Empower
on entry; the AI casts them and the Jace token appears.
