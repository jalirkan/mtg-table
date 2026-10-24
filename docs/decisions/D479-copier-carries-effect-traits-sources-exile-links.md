## D479 — The fork's copy carries what Forge's copier leaves off a card: an effect card's triggers, replacement effects, SVars and source, every "exiled with" link, and the timestamps (amends D313)

*Branch `pc/copier-effect-source-exiled-with`, on origin/main `edd374c6` (#204, D478's addendum, merged). `node
tools/decisions.mjs next` gave D479. Amends **D313** (`LenientGameCopier`) and closes two follow-ups: D476's *Open*
("copied effect cards have no source") and D477's first *Not fixed here* ("a card exiled with Karn before the fork is
not exiled with Karn in the copy"). Touches every fork that copier makes: the atlas's branches (**D451**), the search's
rollouts (**D312**) and the coach helper's grade copies.*

**2026-10-24**

**Context.** At the `forge-2.0.14` tag, `GameCopier` (`forge-ai/.../simulation/GameCopier.java`) builds a copied card
in one of three ways (`createCardCopy`, `:298-344`). A token is remade from its `TokenInfo`. A card with a paper card
is rebuilt from it by `CardFactory.getCard`. Anything else, which means every **effect card** (they are immutable and
have no paper card), is built at `:321-343` from its name, type, **static abilities and spell abilities only**. Then:

- **`setEffectSource` is mapped for battlefield cards only** (`:281-283`, inside the loop over the battlefield). The
  game and layer timestamps are set there too (`:260-261`), so a card in any other zone keeps the copy's own.
- **`addCard` has `// TODO ExiledWith`** (`:351`). No card's `exiledWith` or `exiledBy` is set, and no host's
  `exiledCards` list is filled.

Planted in the bench (point *Measured*), Forge's own copy and `LenientGameCopier` both gave:

| the original | its copy |
|---|---|
| The Monarch: 2 triggers (draw at your end step; a creature's combat damage takes it) | **0 triggers**: the copied monarch never draws and can never lose the crown |
| Gideon, Ally of Zendikar's +1 effect: 1 replacement, "prevent all damage that would be dealt to `Card.EffectSource`" | **0 replacements** and a **null** source: a Bolt takes 3 loyalty |
| Reckless Impulse's effect: 3 triggers (`ForgetOnMoved`), 3 SVars, a source | 0 triggers, 0 SVars, null source |
| Swift End's adventure effect: 3 triggers, source Swift End | 0 triggers, null source |
| Murderous Rider on an adventure: `exiledWith` Swift End, `isOnAdventure()` true | `exiledWith` null, **not on an adventure** |
| the Bears under Oblivion Ring: `exiledWith` the Ring, the Ring's `exiledCards` [Bears] | neither: the Ring leaving returns nothing |
| a Hill Giant exiled with Karn Liberated | no link: on a −14 it goes to its owner's library (D477) |

D476 named the source gap and counted the 147 scripts in the 2.0.14 cardsfolder that read `EffectSource`. The source
alone is not the whole of it. Most of those reads are in triggers (`ValidCard$`, 58; `ValidAttacker$`, 22) and
replacement effects (`ValidTarget$`, `DamageSource$`), and a copied effect card had none. So mapping the source
without the traits would have fixed only the statics' reads (`Affected$`, `MustAttack$`).

**Decision.** `LenientGameCopier.makeCopy` lets Forge make the copy (with D313's and D474's lookups while it copies),
then runs a **carry pass** over every copied card. Every card of the copy exists by then, so a link may name any of
them. For each copied card and its original:

1. **Timestamps.** The game and layer timestamps are the original's, in every zone. `equalsWithGameTimestamp` decides
   `ExiledWithSource`, `ExiledWithEffectSource` and the LKI checks, and the layer timestamp orders an effect card's
   statics.
2. **Traits, for a card built from its traits** (`isImmutable()`, or not a token and no paper card: the cards
   `:321-343` builds):
   - its SVars;
   - its triggers, each `Trigger.copy(card, true)`, as Forge copies its statics with `StaticAbility.copy(card, true)`;
   - its replacement effects, each `ReplacementEffect.copy(card, true)`.

   Each one is copied only while the copy has none of its own. A copied trait's overriding ability gets the copy's
   player as its activating player. **A trigger that holds game objects of its own** (trigger-remembered objects, or a
   spawning ability) **is left off**: its clone would share the original game's objects and its list. Such a trigger
   is listed in `traitsLeft()`. None of the planted effects has one.
3. **The effect source.** If the original has a source and the copy has none, the source is mapped (below). An effect
   card whose source cannot be mapped is listed in `effectSourceNull()` (`name <- source`).
4. **The exile link.** If the original has an `exiledWith`, it is mapped and set, and `exiledBy` is set to the copy's
   player. Each card in a host's `exiledCards` is added to the copy's host: the copy of that very object, or else the
   copied card with its id, because the list compares by id as Forge's `equals` does. A link that cannot be mapped is
   listed in `exileLinksLost()`.
5. **How a linked card is mapped.**
   - If the object is the card a copied zone holds, it maps to that card's copy (through the copier's own map,
     `reverseFind`).
   - If it is **an older object of the same card**, it maps to a **mirror**. Such an object is, for example, a spell's
     object on the stack. After the spell resolves, an adventure's `exiledWith` and an effect's source both still name
     it, at its `Secondary` face. The mirror is `CardCopyService.copyCard(false)` of the copied card with that id, in no
     zone, turned to the old object's face and given its timestamps. This is what the original game holds, an object
     outside every zone. Mapping to the live card instead would face the Rider `Original`, and `isOnAdventure()` would
     be false. Each older object is mirrored once per copy. GameSnapshot's precedent maps by id
     (`toGame.findById(...getId())`, `GameSnapshot.java:387`). The mirror is that, plus the old object's face.
   - If the copy holds no card with that id (the source left every copied zone: a sideboard, a token that ceased to
     exist), the link maps to **nothing**. The copy is not given a guess, and the link is counted.
6. **Then** `checkStaticAbilities()` runs again (a static may read a source), and `resetActiveTriggers()` collects the
   carried triggers. Both run only if anything was carried. `makeCopy` refuses a non-null `advanceToPhase`, because
   the pass must run before anything is played. No caller passes one.

**What it rests on.** No thread and no hop (hard rule 3): the pass runs inside `makeCopy`, on the thread that copies.
No reflection (lint rule 8). Every call is in the pinned jar (javap): `Card.setExiledWith/setExiledBy/addExiledCard/
getExiledCards`, `setEffectSource(Card)`, `set/getGameTimestamp`, `set/getLayerTimestamp`, `setState(CardStateName,
boolean)`, `addTrigger`, `addReplacementEffect`, `setSVars`, `Trigger.copy(Card, boolean)`,
`getTriggerRemembered`, `getSpawningAbility`, `ReplacementEffect.copy(Card, boolean)`, `CardCopyService.copyCard(boolean)`,
`GameAction.checkStaticAbilities()`, `TriggerHandler.resetActiveTriggers()`, `GameCopier.reverseFind`. The real game is
only read. Hidden information: a mirror is built from the copy's card with that id **before** the Determinizer
redeals, so it names the card the link named. That identity was public when the link was made (a spell on the stack,
a permanent that exiled something). Only its face and timestamps are taken from the old object.

**What the copy still does not carry.** Listed so that nobody relies on a fork for these:

- **The source *ability*.** `setEffectSource(SpellAbility)` keeps the resolving ability, and the copy gets its card
  only, so `getEffectSourceAbility()` is null on a copy. That is read by `Defined$ EffectSource` among spell abilities
  (`AbilityUtils.java:1242`), the `EffectSourceAbility` property, and `NumLoyaltyAct`'s `OnlySourceAbs`. The last one
  calls `getEffectSourceAbility().getRootAbility()` with no null check (Kaito, Dancing Shadow; Comet, Stellar Pup; The
  Chain Veil; the Urzas), so a copy with such an effect throws, loudly, as it did before this decision. Copying the
  ability would copy its parent chain from the original game.
- **`exiledSA`**, the ability that exiled a card. Only `isWarped()` reads it, so a warped card on a copy is not warped.
- **Every duration.** An effect's end, whether "until end of turn", "until your next turn" or "until the host leaves
  the battlefield", is a `GameCommand` closure over the original game (`addUntilCommand`, `SpellAbilityEffect.java:927`).
  **A copied effect never expires.** For the same reason, **Banisher Priest's and Brutal Cathar's return**
  (`Duration$ UntilHostLeavesPlay`: a leaves-play command on the host, `changeZoneUntilCommand`) is not carried. The
  link is there and the command that uses it is not. Oblivion Ring (`Defined$ ExiledWith`) and Fiend Hunter (its
  remembered card, which Forge copies) do return.
- **Delayed triggers** (`TriggerHandler`'s list): "at the beginning of the next end step", Gideon Jura's +2.
- **A trigger that holds objects of its own** (point 2).
- **GameCopier's other TODOs**, untouched:
  - `creatureAttackedThisTurn` (`:114`);
  - `thisTurnCast` (`:180`);
  - `countersAddedThisTurn` (`:232`);
  - `CardsAddedThisTurn` (`:254`);
  - the controllers' list with its timestamps (`:356`);
  - damage "copy by map" (`:370`);
  - the unverified two-way relations (`:291`);
  - a host's `untilLeavesBattlefield` list (`:819`'s, never copied);
  - the stack is copied only behind `GameSimulator.COPY_STACK`, which is false.

**The counters (the forward instrument).**
- **The atlas.** A branch row carries `effectSourceNull` and `exileLinksLost` when either is above 0 (`Atlas.Branch`,
  `writeBranch`). `tools/cubelab/atlas.ts` keeps them on the streamed row. Phase B sums them as `effectSourceNull:
  {branches, cards}` and `exileLinksLost: {branches, links}`, and `atlas.md` says so in a sentence. They are never a
  problem or a warning: such a branch played, and its value counts.
- **The search** counts `search.effectSourceNull` and `search.exileLinksLost` on a decision's first copy, beside
  `search.standInCards`.

**Comparability.**
- **The search: not pooled.** Every search seat forks through this copier: search-v2's rollouts on the ladder, in the
  SPRT, the tuner and census games, and the coach helper's grade copies. A rollout now plays a copied effect with its
  triggers, replacements and source. That includes the monarch's end-step draw, which a copy lacked before. A rollout
  also now keeps every exile link. **Search-v2 results from before and after D479 are not pooled.** Split them by the
  experiment log's git sha (`docs/guides/ai-ladder.md`'s *A code change is not a config change*).
- **The atlas: maps change only where the fork's copy held an effect card or a linked exile.** Read-only, over every
  phase-B spine under `/home/justin-a/code/lab/data`: the first state frame of each decision's fork (branch 0 of
  option 0, seat 0's log; the command zone is public). **75 of 313 decisions, 71,777 of 245,566 branch games (29%),
  forked with an effect card in a command zone**:

  | effect | decisions | branch games | spines | what D479 changes there |
  |---|---|---|---|---|
  | Elite Spellbinder's Effect | 23 | 19,920 | J150 ff5-453, ff5-454 | its `ForgetOnMoved` triggers and source; its statics were copied already |
  | Swift End's Adventure | 21 | 21,120 | J158 ff5-461, J162 ff5-462 | the Rider is on an adventure on the copy; triggers; source |
  | The Monarch | 11 | 9,089 | J158 and J162 pauper5-464, J161/J162 pilots | **its two triggers: the monarch draws, and combat damage takes it** |
  | City's Blessing | 10 | 14,880 | J150/J157 vintage7-458 | nothing (no triggers, no source) |
  | Stomp's Adventure | 7 | 5,280 | J162 modern7-466 | as Swift End's |
  | Laelia, the Blade Reforged's Effect | 3 | 1,488 | J150/J157 vintage7-458, J157 pilot | its `ForgetOnMoved` triggers and source |

  Branch games are counted per spine and decision, so a decision with two effects counts once. The exile-link half
  has no signature in the frames: a frame shows a card in exile, not what exiled it. Cards were in exile at 132
  decisions (112,992 branch games), and that is the upper bound. The adventures above are links for certain. The
  monarch spines are where a fork's game most plausibly differs: J162's pauper5 d17–d31 is 8,640 branch games, in
  each of which the copied monarch drew nothing before. **Atlas maps and labels from before and after D479 are not
  pooled** at those decisions. Elsewhere they are the same maps. No unit was replayed to size the value shifts. That
  would be a lab job, and the brief keeps engine runs here to self-tests.

**Rejected.**
- **Map the source and the link by id to the live copied card, no mirror.** It is simpler, and right for every card
  that is its own object. But an adventure's link names the stack object at its `Secondary` face, and the live Rider
  faces `Original`, so `isOnAdventure()` would still be false. The adventure's rendering would read `Murderous Rider`,
  not `Swift End`.
- **Map the source only (D476's *Open* as written).** On a copy the replacement or trigger that reads the source does
  not exist. The Gideon case passes only with both: with the traits carried and the source left null, the Bolt still
  takes 3 loyalty.
- **Re-register the durations on the copy.** "Until your next turn" registered again at the copy's turn ends a turn
  later than the original's when the copy is made during that next turn. A duration is turn-relative, and the effect
  card does not record when it was registered.
- **Copy the source ability.** `SpellAbility.copy` keeps its parent chain and activating player, which belong to the
  original game, and `getRootAbility()` would walk into the real game.
- **Patch the jar or copy `GameCopier`'s source** (D309; hard rule 7 would allow the copy, but the override point is
  `makeCopy`, and the pass needs nothing private).

**Measured.**
- **`tools/ai-bench.sh --selftest`: 166 checks, 0 failures**, 21 of them new (`copierCarryScenarios`, six scenarios).
  Each plants the case in the real game, plays it the same way on the copy and in the real game, and keeps Forge's own
  copier as the control:
  - `copy-effect-source` (Gideon, Ally of Zendikar, in the modern-era cube):
    - the real +1 makes the effect, with Gideon as its source;
    - Forge's own copy gives it no replacement and no source;
    - this copy has the replacement, and the copy's Gideon as its source;
    - a Bolt at Gideon leaves 5 loyalty in the real game and 5 on the copy.
  - `copy-effect-source-null`: Reckless Impulse resolves, then the card goes to the sideboard. The copy lists
    `Reckless Impulse (6)'s Effect <- Reckless Impulse`, and the two Bolts exiled with it as lost links. An atlas
    branch's row carries `effectSourceNull 1`, `exileLinksLost 2`.
  - `copy-exiled-with`: the Bears exiled with Oblivion Ring, planted with `GameState`'s `Id:`/`ExiledWith:`.
    - Forge's copy drops the link; this copy keeps it both ways.
    - The Ring leaves the battlefield the way `DestroyEffect` moves a card: a zone table over the last state, then
      `triggerChangesZoneAll`, then the waiting triggers. The Bears come back to the battlefield in the real game
      and on the copy.
  - `copy-karn-exiled`: a Hill Giant exiled with Karn Liberated before the fork. A −14 resolved on the copy puts it on
    Karn's controller's battlefield, as in the real game. This is D477's follow-up.
  - `copy-adventure-link`: after the real Swift End, the copy's Rider is on an adventure. The adventure's effect names
    `Swift End (7)`, a mirror, not the live Rider.
  - `copy-monarch-triggers`: the copied monarch effect has 2 triggers. Forge's own copy has 0.

  The ablations:
  - With the carry pass taken out, 8 of the 15 checks then planted fail, each with the table's numbers: 0
    replacements, 2 loyalty, the Bears in exile, the Hill Giant in its owner's library, no adventure, 0 triggers.
  - With only the source mapping taken out, 3 fail. The Bolt leaves Gideon at 2 loyalty with the replacement present.
  - D474's `copy-stale-monarch`, D476's `adventure-map` and D477's `karn-restart-fork` still pass.
- **`web/test/cubelab-atlas.test.ts`: 26 of 26**, one of them new:
  - a streamed branch keeps both counters;
  - a branch with a null source still counts in its option's value;
  - phase B sums the counters, `atlas.md` says so, and no problem is raised.

  `tsc --noEmit` is clean.
- **`bridge/build.sh`: OK.** **`tools/cubelab.sh atlas-selftest --jobs 1`: OK** (16 forks, 8 no-leak checks, 38 frame
  logs, 538 rows), in 2 min 26 s.
