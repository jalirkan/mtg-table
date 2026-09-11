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
