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
- **Forks with no effect card may move too (the addendum below).** The timestamps are carried on every copied card,
  and Forge set them on the battlefield only, so a card in a hand, graveyard, library or exile at the fork now has its
  original's timestamps on every fork. On a plain fork that changes nothing the self-test could see (12 of 12 branches
  identical), but an LKI-sensitive effect (`equalsWithGameTimestamp`: `ExiledWithSource`, a remembered card checked
  against its current state) can read a pre-fork card in another zone differently from before. That is the real
  game's reading, not a new error. It is one more reason **search-v2 results and atlas maps are not pooled across
  D479**, at every decision and not only at the ones the table above names.

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
- **`npm --prefix web test`: OK** (the node suites, then vitest 161 of 161).
- **The gate:** `./tools/check-all.sh` at `GATE_JOBS=4` from a deleted `bridge/out`, on `9c530a3a` (this branch's code;
  only this line differs): **OK, 59 of 59 jobs**, 517.4 s wall (load average up to 15.0).

**Addendum, 2026-10-24 (#205's review; branch `pc/d479-followups`).** Two of the review's findings.

- **The timestamps on a plain fork (MEDIUM).** Point 1 sets every copied card's timestamps, where Forge set the
  battlefield's only. Untested until now on a fork with no effect card in play. `copy-plain-timestamps` (the
  ai-bench self-test) takes `search-evalleaf-only`'s board in the lab's game stage. Each player first draws a card and
  discards a land: a planted card has no move behind it, and its copy's timestamps already equal the original's (the
  first run of the check found 0 to carry). The copy's carry pass then moves **4 plain cards' timestamps**, with no
  effect card, no trait and no link carried. Twelve atlas branches are played, seeds 1–6 under Forge's continuation
  and under the random one, each twice: once with the plain cards' timestamps carried, once left as Forge gave them
  (`LenientGameCopier.carryPlainTimestampsForTest(false)`, a static switch only the self-test calls; an effect card's
  are carried either way). **All 12 pairs are identical in result, turns, steps and cap** (the seat won every one; 9 to
  12 turns, 171 to 187 steps). **No plain fork's outcome changed.** `LenientGameCopier.plainTimestampsMoved()` counts
  the moved cards whether or not the switch carries them.
- **The mirror's zone (LOW).** `CardCopyService.copyCard` gives a mirror the live copied card's zone (`:58`,
  `out.setZone(copyFrom.getZone())`). Null, the review's candidate, is not what the original holds either. The old
  object is in no zone's list, but it names one: `GameAction.changeZone` sets the moved object's zone to its
  destination (`c.setZone(zoneTo)`, `:526`), and nothing clears it. So after Reckless Impulse resolves, its stack
  object (the effect's source) names the graveyard, and it keeps naming the graveyard after the card moves on to exile.
  A null zone would make `isInZone` false where the original's is true. That includes `handleExiledWith`'s
  `ExiledWithEffectSource` path, which records the exiled card on the source only if the source `isInPlay()` or is on
  the stack or in the command zone (`SpellAbilityEffect.java:1065-1077`). **The mirror now names the copy's zone of
  the kind the old object names**: the same player's zone, or the stack (`zoneOnCopy`). This is still in no zone's
  list, as the original is. Where the card has not moved since, that is the live card's zone, the same as before.
  In 2.0.14's `forge-game` and `forge-ai`, the `getEffectSource()` reads are descriptions, equality
  (`Card.EffectSource`, `ExiledWithEffectSource`), copies, `handleExiledWith`'s zone test, and two that hand the object
  on: `SpellAbility`'s target check (`host.isValid(ValidTgts)`, `:2091`) and `Defined$ EffectSource`
  (`AbilityUtils:89`, `findEffectRoot`). The last is how D476's 147 scripts reach it. Whatever an effect then asks the
  object, its zone answer is now the original object's. `copy-mirror-zone` resolves
  Reckless Impulse, exiles the card from the graveyard and forks. The original's source names Ai's graveyard, and the
  mirror names the copy's graveyard and is not in it. The copy's card is in exile. Without the one line, the mirror
  names exile, and the check fails.
- **Measured.** `tools/ai-bench.sh --selftest`: **172 checks, 0 failures**, 6 of them new (`copierFollowUpScenarios`).
  The mirror-zone ablation fails exactly 1. `bridge/build.sh`: OK.
