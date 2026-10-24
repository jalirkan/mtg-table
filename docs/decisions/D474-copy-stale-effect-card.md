## D474 — A copy maps a stale player effect card to nothing, not to a stand-in: the copied player makes a fresh effect when it needs one (amends D313)

*Branch `pc/atlas-attack-none-npe`. `node tools/decisions.mjs next` gave D474. Amends **D313** (`LenientGameCopier`'s
stand-ins). Touches every fork that copier makes: the atlas's branches (**D451**) and the search's rollouts (**D312**).*

**2026-10-24**

**Context.** Lab job J161's pilot (a 6-rollout atlas smoke on the pauper5 pair, seed 4640) failed its
`problems == 0` check on one line:

```
ATLAS PROBLEM: d41 option 1 `attack:none` (attack none): 2 of 12 branch game(s) errored (random 0 of 8, forge 2 of 4):
  2 x NullPointerException: Cannot invoke "forge.game.player.Player.getView()" because "player" is null
```

The brief suspected D470's forced-combat path (`RolloutController.Forced`, `OptionUnavailable`, `Atlas.play`'s
`expired` check), the newest code there. **It is not that.** The forced "attack none" was given at the fork's own
combat and played; the null is a card's owner, and it came from the copier.

**What it was.** Replayed alone (one unit, d41, Forge, branches 1–2, with a stack print in `Atlas.play`'s catch on a
scratch build, so `Atlas.java`'s line is that build's), the stack, at the `forge-2.0.14` tag:

```
java.lang.NullPointerException: Cannot invoke "forge.game.player.Player.getView()" because "player" is null
  at forge.game.card.Card.mayPlayerLook(Card.java:3793)
  at forge.game.zone.PlayerZone$OwnCardsActivationFilter.test(PlayerZone.java:49)
  ...
  at forge.game.zone.PlayerZone.getCardsPlayerCanActivate(PlayerZone.java:115)
  at forge.game.player.Player.getCardsActivatableInExternalZones(Player.java:1384)
  at forge.game.player.PlayerView.updateFlashback(PlayerView.java:492)
  at forge.game.player.Player.updateZoneForView(Player.java:1296)
  at forge.game.zone.PlayerZone.onChanged(PlayerZone.java:89)
  at forge.game.zone.Zone.add(Zone.java:149)
  ... (Zone.add at :95, :92, :89)
  at forge.game.player.Player.createMonarchEffect(Player.java:3481)
  at forge.game.GameAction.becomeMonarch(GameAction.java:2550)
  at forge.game.Game.onPlayerLost(Game.java:982)
  at forge.game.GameAction.checkGameOverCondition(GameAction.java:1959)
  at forge.game.phase.PhaseHandler.mainLoopStep(PhaseHandler.java:1050)
  at mtgtable.ai.Atlas.play(Atlas.java:708)
```

and the copy's stand-ins, on every branch of the unit: `[The Monarch@Command?, Writhing Chrysalis@Sideboard]`. The chain:

1. **Seat B had been the monarch and lost it to A** before the fork. `GameAction.becomeMonarch` calls
   `B.removeMonarchEffect()` (`Player.java:3485-3491`), which takes the effect card out of B's command zone with
   `Zone.remove` (`Zone.java:162-167`). That removes it from the zone's list and **never clears the card's own zone**,
   and B's `monarchEffect` field keeps the card, for re-use the next time B is the monarch.
2. **The copy maps that field.** `GameCopier.makeCopy` calls `Player.copyEffectCardsToSnapshot`
   (`GameCopier.java:134`), whose `mapEffectCard` (`Player.java:2805-2809`) maps an effect card unless
   `getZone() == null`: "an effect card in no zone was not part of the copy". B's card is in no zone, but its zone
   pointer says Command, so it is mapped. Forge's strict `find` cannot map it (`GameCopier.java:516`, "Couldn't map"),
   so Forge's own copier fails outright on any game where the monarch changed hands. `LenientGameCopier` (D313) caught
   that "Couldn't map" in a copied zone and returned a **stand-in**: `new Card(id, paperCard, copy)`, with no owner, no
   zone and no triggers. Copied B's `monarchEffect` was that stand-in.
3. **The stand-in sits unread until B is the monarch again.** In the two branches, A (the monarch, not attacking)
   lost on turn 24, B's turn. `Game.onPlayerLost` passes the monarch to the active player (`Game.java:979-983`), and
   `createMonarchEffect` (`Player.java:3448-3483`) found a non-null `monarchEffect`, skipped making one, and added
   the stand-in to B's command zone. The zone's change updates the view, whose flashback scan asks each command-zone
   card whether its controller may look at it. The stand-in's controller and owner are null. That is the NPE.
   Combat damage from B's creature to A would have taken the same route, through the effect's own trigger.

"Attack none" is only the option whose games went that way. The random continuations, and A's other options,
did not hand B the monarch again. The NPE was never silent: an affected branch errored where it would have used
the stand-in, and until then nothing reads the field (`getMonarchSet` only for the monarch, `removeMonarchEffect`
only on a change of hands). It is in J161 alone. A grep for it over every `branches.jsonl` under
`/home/justin-a/code/lab/data` finds these 2 rows of 96 and no others.

**Decision.**

1. **`LenientGameCopier.find`, while copying, maps a stale effect card to null.** A stale effect card is one whose
   type is `GamePieceType.EFFECT`, whose zone is the command zone, and whose zone does not hold it
   (`Zone.contains`). `mapEffectCard` then sets the field to null, as Forge's own rule does for an effect in no zone,
   and the copied player makes a fresh effect, with its owner and both triggers, when it needs one. That is the
   game the real player would play: the real card is re-used with the same two triggers. Each such card is listed
   in `staleEffects()` (`name@zone`) and is **not** a stand-in, so `unmapped()` and the rows' `standIns` no longer
   count it. In J161's d41 that number goes from 2 to 1.
2. **Every other card keeps D313's rule.** A card in an uncopied zone or in none, and a card of a copied zone that
   the strict lookup misses (the Bird token), still get a stand-in. After the copy, every lookup is strict.

**What it rests on.** No thread, no hop (hard rule 3), no reflection: the field is set by Forge's own
`copyEffectCardsToSnapshot` from what `find` returns. `GamePieceType.EFFECT`, `Card.getGamePieceType` and
`Zone.contains(Card)` are in the pinned jar (javap). The other callers of `find` while copying are a card's
remembered objects, its attachment, the static effects, the combat and the stack. None of them reaches a card that
left the command zone in the normal course. If one ever did, null would fail loudly in the copy, where the
stand-in failed later. The real game is not touched: the stale card keeps its zone pointer there.

**Rejected.**
- **Give the stand-in an owner.** The NPE goes, but B would become the monarch with a blank card: no end-step draw,
  and no trigger to take the monarch back on combat damage. That is a wrong game that raises no error.
- **Clear the copied player's field after the copy.** No public setter, and lint rule 8 bans reading or writing a
  Forge field by reflection outside `InputPeek`.
- **Clear the stale card's zone in the real game before copying.** It would mutate the real game from a fork.
- **Read it as D470's "unavailable".** The option was given and played. The tool failed after it.

**Comparability.** No branch that played before changes. Replayed on this branch, d41's whole Forge unit (6 options
x branches 0–3, the J161 seeds) gives the same turns, steps and result in all 22 branches that played in J161. The
two that errored now play: A loses on turn 24, in 44 and 48 steps. Only `standIns` differs, 1 for 2. The search's
rollouts on such a game used to end in the same NPE, counted as `search.rolloutErrors` and dropped or fallen back
from. They now play. A search result is a different engine only where the monarch (or another removable player
effect) changed hands before the decision.

**Measured.**
- **`tools/ai-bench.sh --selftest`: 116 checks, 0 failures**, 5 of them new (`staleEffectScenarios`,
  `copy-stale-monarch`). The human becomes the monarch, then the AI takes it. The checks:
  - Forge's own `GameCopier` fails on the game ("Couldn't map The Monarch"), as the control;
  - `LenientGameCopier` copies it with no stand-in and one stale effect;
  - in the copy, `becomeMonarch(human)` gives the human a fresh "The Monarch" that it owns, with 2 triggers;
  - the real game still has the AI as the monarch.

  With point 1 taken out, 2 of them fail. The copy shows `stand-ins [The Monarch@Command?]`, and `becomeMonarch`
  throws J161's exact NPE.
- **The replay** above (one unit, one worker; the job built from J161's own `plan.json` and `phaseB/baseline.json`).
- **`bridge/build.sh`: OK** (the lint and its self-test, javac, the eight self-tests).
- **`tools/cubelab.sh atlas-selftest --jobs 1`: OK** (16 forks, 8 no-leak checks, 38 frame logs, 538 rows), in 2 min 28 s.
- **The gate:** `./tools/check-all.sh` at `GATE_JOBS=4` from a deleted `bridge/out`, on this branch rebased onto `cb7eb476`: **OK, 59 of 59 jobs**, 521.9 s wall (load average up to 15.7 alongside the lab's model fits).
