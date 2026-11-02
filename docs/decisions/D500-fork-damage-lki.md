## D500 — The fork's copy gives every damage instance of the turn its source and target, so "dealt damage this turn by" can be asked on a fork (D497's sibling)

*Branch `pc/d500`, off `main`'s `60177314` (#225, D497's merge). D500 was reserved for this lane by the session that
runs the lab nights. A second pass in `LenientGameCopier`'s carry, beside **D479**'s, **D493**'s and **D497**'s, through
Forge's public API only: no reflection, so the lint's `forge-field-write` budget of one (D497's) and `forge-field-read`
(D423's) are untouched. Touches every fork that copier makes: the atlas's branches (**D451**), the search's rollouts
(**D312**) and the coach helper's grade copies.*

**2026-11-01**

**Context.** J181 (the first night on D497's bridge), spine s06 (peasant, spine seed 2184, deck folder
`s06-peasant-2084`): three of decision d19's 450 branches errored (turn 15, the atlas seat's second main phase; options
o2 *Paradox Surveyor* 2 of 150, o0 *Grizzly Fate* 1 of 150; keys `atlas:d19:random:o2:b91`, `atlas:d19:random:o0:b122`,
`atlas:d19:random:o2:b122`), the only three of the spine's 4,400 rows and the only spine of the night that met it. Under
the night's 10% bar, so no check failed; D497's `-XX:-OmitStackTraceInFastThrow` gave all three their full stack in
`phaseB/logs/worker-2.log`:

```
java.lang.NullPointerException: Cannot invoke "org.apache.commons.lang3.tuple.Pair.getLeft()" because the return
    value of "forge.game.Game.getDamageLKI(org.apache.commons.lang3.tuple.Pair)" is null
  at forge.game.card.CardProperty.cardHasProperty(CardProperty.java:1101)
  ... CardTraitBase.matchesValidParam -> ReplaceMoved.canReplace(ReplaceMoved.java:45)
  ... GameAction.changeZone(334) <- moveToGraveyard <- sacrificeDestroy <- destroy(2167) <- checkStateEffects(1585)
  at mtgtable.ai.Atlas.play(Atlas.java:820)
```

Evidence: `/home/justin-a/code/lab/data/lab-j181/b-s06-peasant-2184/` (`phaseB/branches.jsonl`, `phaseB/logs/worker-2.log`,
`phaseB/frames/d19-random-*`, `phaseB/baseline/frames/`, `plan.json` and its two decks), read only.

**The exact cause** (the pinned jar, `javap -p -c`; the 2.0.15 source checkout at `579d0a84c` reads the same):

1. A damage instance is a `Pair<Integer amount, Boolean combat>` made by `CardDamageHistory.registerDamage`. The same
   object goes to three places: the source's history (`damageDoneThisTurn`), the target's
   `GameEntity.damageReceivedThisTurn` (`receiveDamage`), and the game's
   `IdentityHashMap<Pair, Pair<Card, GameEntity>> damageThisTurnLKI` — keyed **by identity** — mapping it to last-known
   copies of the source and the target (`Game.addGlobalDamageHistory`, which also files the source's history in
   `globalDamageHistory`, an `FCollection` that ignores a duplicate). Both are cleared at the turn's change.
2. `GameCopier.makeCopy` copies each player's list (`setDamageReceivedThisTurn(origPlayer.getDamageReceivedThisTurn())`)
   and each **battlefield** card's (`addCard`, the same call) — the same pair objects, added into the copy's own lists —
   and copies neither the map nor any card's `CardDamageHistory` (the copy's cards have fresh, empty ones).
3. Every reader of a received pair dereferences its entry: `CardProperty` `DamagedBy…` and `Damaged…`
   (`getDamageLKI(p).getLeft()`, line 1101 on the jar), `AbilityUtils` (the `DamagedBy` count), and
   `GameEntity.getAssignedDamage(isCombat, source)` with a source. `CardDamageHistory.getDamageDoneThisTurn` checks for
   null; nothing else does. So on any fork made after damage was dealt this turn, the first such question throws.
4. The card that asked: **Etching of Kumano**, the back face of Kumano Faces Kakkazan (seat B's deck), `R:Event$ Moved |
   ValidLKI$ Creature.DamagedByCard.YouCtrl;Emblem.YouCtrl | Destination$ Graveyard | ReplaceWith$ DBExile` ("if a
   creature dealt damage this turn by a source you controlled would die, exile it instead") — the only `DamagedBy` among
   the spine's 80 cards. The baseline's frames (seq 309): seat A's Colossal Skyturtle (6/5) attacked, Selfless Spirit
   blocked and died, the Skyturtle took 2. The branches fork in main phase 2 with that pair on the Skyturtle; in b91 the
   random seat then cast Paradox Surveyor and a Hurricane for X = 3 (its log's last stack: *Hurricane (33) - Deals 3
   damage to Creature.withFlying*), the Skyturtle reached 5 damage, the state-based destroy asked every replacement
   effect, and Etching's `ValidLKI` read the Skyturtle's pre-fork pair. Not a Kumano matter: any `DamagedBy`/`Damaged`
   question on a fork after damage; J181 met it on one spine only because few cards ask it.

**Decision.**

1. **`LenientGameCopier`'s carry pass rebuilds the copy's damage entries, last** (after D479's re-application of the
   statics, so a last-known copy sees them): for every pair in every copied player's and card's
   `damageReceivedThisTurn` that has no entry on the copy, it reads the original game's entry for the same pair object
   and files one on the copy through the public `Game.addGlobalDamageHistory(history, pair, source, target)`:
   - the **source** (and a card **target**): `CardCopyService.getLKICopy` of the copy's card with the original's id —
     its characteristics as they stand on the copy — given the original entry's **controller** (mapped onto the copy;
     the review's fix: a creature stolen, used to deal damage and sacrificed, or damaged-by and then stolen, answers
     `DamagedByCard.YouCtrl` by its controller at the damage, as in the live game) and its game and layer
     timestamps, so `equalsWithGameTimestamp` answers what it answers in the original (the source still on the
     battlefield is its card; one that has since changed zones is not). One copy per original last-known object. During
     combat `getLKICopy` also files a permanent in combat in the copy's combat LKI cache (`Combat.saveLKI`, by id, a
     duplicate ignored), as each last-known copy the live game makes does — the original entry's own among them.
   - a source the copy holds **no card** of (a token that has ceased to exist, a card in a zone the copier skips) is
     rebuilt in the copy from the original's last-known object the way `GameCopier.createCardCopy` builds a card — a
     token by `new TokenInfo(lki).makeOneToken(owner, id)` and `copyCopiableCharacteristics`, a card with a paper card
     by `CardFactory.getCard(paper, owner, id, copy)` turned to the last-known face — its owner and controller mapped,
     the original's timestamps. Never `new CardCopyService(lki, copy).copyCard(…)`, the cross-game copy Forge's own
     `GameSnapshot` uses: its token branch constructs the card, and its view, in the original game with the original
     game's `Tracker` before moving it (`copyStats`, then `dangerouslySetGame`), and the copy must not write into the
     live game. A card with neither (an effect) is not rebuilt, and its pair is lost (below).
   - a **player** target maps to the copy's player (the copier's own map).
   - the **history** it is filed under is the copied source's own, which `GameCopier` leaves empty, so
     `globalDamageHistory` gains only empty histories (each once): `getDamageDoneThisTurn` and
     `getSingleMaxDamageDoneThisTurn` read on the copy exactly what they read on Forge's own copy (checked below).
   - a pair whose entry cannot be built (the original has none, or a copy throws) is **taken off** the copy entity's
     list (by identity) and named in `damageLkiLost()`: the copy then never asks about it, and loses that instance's
     amount and source — information-losing, and so far never taken (0 in the bench, and no stderr line).
   Each lost string names the amount, the entity, the source and why: the exception's class, or *not rebuilt* for a
   card with neither a token's script nor a paper card. Counters: `damageLkiCarried()` and `damageLkiRebuilt()` are
   read by the bench; `damageLkiLost()`'s size is carried, once per copy and only when above 0, as D479's
   `exileLinksLost` is: in the atlas branch row (`damageLkiLost`, summed in `atlas.json`'s `phaseB.damageLkiLost` as
   `{branches, instances}` and named in `atlas.md`) and in the search sink (`search.damageLkiLost`, the first copy of a
   decision), so a removal in production is seen. The pass runs where D479's runs, on the thread that made the copy, reading the original's map as
   that pass reads the original's cards; no thread changes and no hop.
2. **No reflection.** `Game.addGlobalDamageHistory`, `Game.getDamageLKI`, `GameEntity.getDamageReceivedThisTurn` (which
   returns the entity's own list), `CardCopyService.getLKICopy(Card)`, `CardCopyService.copyCopiableCharacteristics`,
   `TokenInfo(Card)`, `TokenInfo.makeOneToken(Player, int)`, `CardFactory.getCard(IPaperCard, Player, int, Game)`,
   `Card.setGameTimestamp`, `setLayerTimestamp`, `setState` and `setController(Player, long)` are all public on the
   pinned 2.0.14 jar (`javap`; `GameCopier.createCardCopy` makes the same two token calls there), and the lint and its
   self-test are unchanged (33 rules, 79 firing cases).

**Rejected.**

- **Mapping the source to the copy's live card.** A source that has changed zones since (J181's Selfless Spirit, dead
  in the same combat) has a new timestamp in the original, so `equalsWithGameTimestamp` against its entry is false
  there; against the copy's card it would be true. The entry is a separate object, as in the original.
- **D479's mirror (`link`)** for the source: a mirror is `copyCard(false)`, rebuilt from the paper card, so a source's
  controller and any characteristic it had from an effect are lost, and `isValid("Card.YouCtrl")` is the question asked.
- **Rebuilding through `CardDamageHistory.registerDamage` on the copy** (which would also restore the copy's damage
  *done*): it makes a new pair, appends it to the target again and moves combat and "dealt combat damage since last
  turn" state; the original's histories cannot be enumerated (`globalDamageHistory` has no getter). Not attempted.
- **Clearing every copied entity's list** (the fallback the brief named): no NPE, and every `DamagedBy` answers false
  and `getAssignedDamage` reads 0 — wrong for the J181 board (the Skyturtle would go to the graveyard, not exile). It
  survives only per pair, as the last resort in point 1.
- **A second reflective write of `damageThisTurnLKI`.** Not needed; the public adder does it.

**Tests.**

- **The real engine**: `tools/ai-bench.sh --selftest`'s new `fork-damage-lki` scenario (`forkDamageLkiScenarios`, 12
  checks; the self-test 304 checks with the review's four, 0 failures, 19.3 s), with `tools/ai-bench/decks/fork-damage-lki.dck` as both seats'
  deck in the branch's recording. The board: the human's Etching of Kumano, Grizzly Bears, Hill Giant and a Goblin
  Shaman token from its script; the AI's Craw Wurm (6/4) and Lightning Bolt; turn 15, the AI's main phase 2. The real
  engine deals the damage (`GameAction.dealDamage`): 1 from each human creature to the Wurm and 2 from the Bears to the
  AI; then the token is exiled (it ceases to exist) and the Hill Giant destroyed (a new object in the graveyard).
  Forge's own copy keeps the four pairs and **none** of their entries, and Etching's property throws the field's NPE
  (the control). `LenientGameCopier`'s copy: an entry for all four (4 carried, 1 rebuilt — the token — none lost); each
  names the real entry's source and target on the copy by id, controller and timestamps, and `equalsWithGameTimestamp`
  answers as in the real game (the Bears true, the Hill Giant false, the token no card); Etching's property answers
  `true` as in the real game; `getAssignedDamage` 3 on the Wurm, 0 from the Hill Giant's new object, 2 on the AI, as
  in the real game; the single largest damage done 0 and the sources with damage 0, as on Forge's own copy (the real
  game's are 2 and 3: *What it does not do*). Then the field's production path, an atlas branch (`Atlas.play`, the
  forge continuation, the lab header's fields) forcing the AI's Bolt on its own Wurm, recorded: it plays (8 steps, no
  error) and its log moves the Wurm from the battlefield to **exile**, not the graveyard; `tools/check-redaction.mjs
  --empty-hand-ok` passes both seats' logs; last, the real game's Bolt does the same (the Wurm in exile).
  **On `main`'s copier** (its `LenientGameCopier` compiled into `bridge/out`, the three new accessors stubbed to 0 and
  empty): 7 of the 12 fail — no entry on the copy, the property and `getAssignedDamage` with a source throw, the branch
  errors at 0 steps with the field's stack (`CardProperty.cardHasProperty(CardProperty.java:1101)` ←
  `ReplaceMoved.canReplace(ReplaceMoved.java:45)` ← `checkStateEffects` ← `Atlas.play`), and its logs have no state
  frame, so both redaction checks fail. The whole self-test then: 300 checks, 7 failures, every one this scenario's.
- **The controller as of the damage** (the review): `forkDamageLkiControllerScenarios`, 4 checks — the AI's Hill Giant
  stolen by the human, dealing 1 to the AI's Wurm and dying (the real entry's controller the human, Etching's property
  true), and dealing the 1 and then stolen (the AI, false). On the copy the entry's controller and the property are the
  real game's in both. Without the controller mapping (the first commit's copier) both fail: the copy says the AI and
  false, then the human and true (304 checks, 2 failures).
- **The row and the report**: `web/test/cubelab-atlas.test.ts`'s D479 counter test carries `damageLkiLost` through the
  worker row, `atlas.json`'s `phaseB.damageLkiLost` and `atlas.md`'s sentence.
- **The build**: `./bridge/build.sh` green (the lint and its self-test unchanged, the eight self-tests).
- **The atlas**: `tools/cubelab.sh atlas-selftest --jobs 1` passes on this branch, and its summary is D493's and D497's,
  number for number (16 forks, 8 no-leak checks, 38 frame logs, 558 rows) — which says its boards asked none of these
  questions after damage, not that the change is neutral (*Comparability*).

**What it does not do.**

- **A copy's damage *done* is still empty**, as it was on every fork before this: `GameCopier` copies no
  `CardDamageHistory`, so on a copy `Game.getDamageDoneThisTurn`, `getSingleMaxDamageDoneThisTurn`,
  `Card.getTotalDamageDoneBy`, `hasDealtDamageToOpponentThisTurn` and the history's "damaged this game/combat" read as if
  no source had dealt damage this turn (the bench: 2 and 3 in the real game, 0 and 0 on both copies). That is a
  fidelity gap, not a crash; the public `getAllDmgInstances()` returns the history's own list, so a later pass could
  refill it without reflection, but it changes what the AI reads and is the owner's call (PLAN.md, the cube lab's
  follow-up 17).
- **An entry's characteristics are the copy's card as it stands, not as at the damage**: only the controller and the
  timestamps are the entry's. A source that has died since is read through its graveyard face (no effect's types, its
  printed power), a source bounced face down through its real face, and a rebuilt card has no last-known zone. A
  `DamagedBy` valid that asks a characteristic an effect gave the source at the time (a land animated, a type granted)
  can answer otherwise than the live game. Rare; written, not fixed (the review's note).
- **Seen in passing**: on a fork a transformed double-faced card is named by its **front** face on the wire. The copy's
  Etching of Kumano is `Backside` with Etching's replacement (it fired), but its view's current state is *Kumano Faces
  Kakkazan* and `isBackSide()` is false, so every branch frame of J181's s06 and of the bench names it so. Both faces are
  public, so it is not a leak; it is the recorded branches' fidelity, not investigated here (follow-up 17).

**Comparability.** Atlas labels and reads, and search results, from before and after D500 are **not pooled**; split them
by git sha, as D479's, D493's and D497's are. Branches that used to error now finish (J181's s06 lost 3), and on every
fork made after damage was dealt this turn the `DamagedBy`/`Damaged` questions, `AbilityUtils`' damaged-by counts and
`getAssignedDamage` with a source now answer as the live game does where they threw. Forge's AI reads them where a
card script asks (a `DamagedBy` count or valid in an ability's SVars) and `SpecialCardAi` reads `getAssignedDamage`, so
a branch's play after such a question may change, toward the live game's.

**The branch ledger counts differently.** `GameLedger` (attached to every atlas copy that records frames,
`Atlas.play`) sums each turn's damage from the players', battlefield cards' and graveyard cards' received pairs and
skips a pair whose entry is null (`GameLedger.damage`). Before D500 every pre-fork damage instance on a fork had no
entry, so the fork's turn counted only the damage dealt after the fork; now the pre-fork instances on players and
battlefield cards count, attributed to their source's controller at the damage, so `phaseB/ledger.jsonl`'s `damage` and
`damageToPlayers` for the fork's turn rise, toward the live game's. Damage to a creature that died before the fork is
still not seen: Forge's copier copies the received list of battlefield cards only, so the graveyard card holds none.

**Not replayed.** The atlas has no command that re-branches one decision of a spine (D493's note); the bench scenario is
the production path on the field's board shape. The first night on this bridge should show no `getDamageLKI` stack in
any worker log (PLAN.md, the cube lab's follow-up 17).
