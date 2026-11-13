## D544 — the wide windows: the stack carried onto the search's copies, three keys off by default (`stackwin=1` the stack windows, `passwin=1` three steps Forge passes in, `dactiv=1` the sorcery-speed activations Forge declines), the opponent's pass given in the rollouts of a window it has passed in, and one union player, `search-v3-wide`, in one fixed 4,800-game match (J217)

*Branch `pc/d544-wide-windows`, off main `1eaa00d30` (D541's merge), rebased onto `97122947c` (D543's merge, text only).
Extends D540 (its keys, its retry guard and its exposure pattern; its point 13 and its Rejected name this lane's
subject) and D541 (the union's base and its form); uses D398's fixed match and D519's four readings unchanged; reads
J215 (`results/J215/`) and J212's recording. Code: the stack carry in `LenientGameCopier`, three `SearchConfig` keys,
the search's windows (`SearchPolicy`), the opponent's conditional pass (`RolloutController`, `RolloutForcing`),
engine scenarios in the ai-bench self-test, a `DecisionSelfTest` case, the ladder's three params and one player, the
ladder test, the guide's line and PLAN's row 61. **Parts of this lane were written while J216 held the lab and are
unbuilt or unrun; the *Verification* paragraph says which, and is completed after J216.***

**Status: built and self-tested on the lane (*Verification*); B resolved to `search-v3-declined-instant` (point 10); the
full gate, the review and the merge pending; unplayed. J217 plays it.**

**2026-11-12**

**Context.**

- **What the search never considers, counted from J212's 720 recorded games** (the search seat's own decisions; the
  coordinator's counts, `~/code/lab/mtg-table/var/ai-bench/j212-rec/games/`):
  - **Stack windows** (priority with a non-empty stack): 3.33 a game on the opponent's turn, 1.19 of them with a
    castable spell in the seat's options (0.65 with a castable spell that is not counter-magic); 1.66 a game on its
    own turn, 0.73 with a castable spell (0.42 non-counter). Forge acted in 114 + 17 of them over 720 games.
    Counter-magic is about half of what is castable there (Mana Leak, Counterspell, Exclude, Miscalculation, Remand,
    Spellstutter Sprite).
  - **Empty-stack windows outside the seat's own main phases where Forge passes** with a castable non-counter spell in
    hand: the opponent's declare-attackers step 0.33 a game, its end step 0.26, the seat's own declare-blockers step
    0.38 (about 2.7 a game over all opponent-turn steps and 5.5 over all own-turn steps outside the main phases, mostly
    the same hand asked again at every step).
  - **Activations Forge declines** in the windows already searched (own main, empty stack): 4.44 windows a game hold
    at least one; 1.50 hold an equip (Shadowspear, Bonesplitter, Skullclamp, Jitte), 0.37 a planeswalker loyalty
    ability, 3.46 an instant-speed sink or draw (Clue 1,014, Mind Stone 471, Retrofitter Foundry 425 options).
- **J215's calibration.** `search-v3-declined-instant` against the live seat, 4,800 games: SMALL GAIN, +6.9 Elo
  [+1.4, +12.5], cost ×1.14. Its exposure: declined 3.46 windows a game and 0.382 decisions changed a game; instant
  1.80 windows and 0.234 changed. About 0.62 changed decisions a game bought +6.9 Elo: about 0.11–0.13 changed per
  window and about +11 Elo per changed decision a game. At J211's score standard error at 4,800 games (0.0039) the
  lab resolves about ±5.3 Elo in one night, so an arm needs about 0.5 changed decisions a game in all to be readable;
  1,200-game screens of single keys are uninformative (D541's *Context*). The next match is one union player.
- **D540 point 13**: "the stack windows (counter-magic, responses) and the windows Forge passes in are the next arm,
  after a self-test of the install on a non-empty stack." D540's Rejected put activations aside as a class because a
  leaf scored at this turn's end makes a deferrable instant-speed sink look free; that argument does not hold for a
  sorcery-speed activation, which cannot be deferred to the opponent's end step.
- **Why the stack was never searched: the copy has no stack** (this lane's phase 1, its spike; confirmed with javap on
  the pinned jar). `LenientGameCopier` extends Forge's `GameCopier`, which rebuilds the stack only behind
  `GameSimulator.COPY_STACK`, false on the jar (`<clinit>`: `iconst_0; putstatic COPY_STACK`). Its `copyStack` would
  not do either: spells only, found by description, pushed through `MagicStack.add` (which fires the cast triggers
  again), targets mapped by a map that cannot map a spell. On a copy of a game with a non-empty stack the
  `MagicStack` is empty, a spell's card sits in the copy's Stack zone with nothing pointing at it, abilities and
  triggers are gone, and a counter's target (a spell) cannot be mapped: every counter candidate was
  `CandidateUnmappable`. D417 §2 and D479's list had recorded the flag. So `instant`'s empty-stack condition was a
  real limit, not only scope. Phase 1's self-test, on the real engine, five stack windows:

  | case | copy carries the stack | pass rollout | response rollout | live untouched | with a prototype carry |
  |---|---|---|---|---|---|
  | (a) the opponent's Grizzly Bears; the seat holds Counterspell | no | Bears stranded in the Stack zone | unmappable | yes | both right |
  | (b) the opponent's Lightning Bolt on the seat's Bears; Ephemerate | no | Bears alive (wrong) | Bolt stranded | yes | both right |
  | (c1) the opponent's Fanatical Firebrand ping on Llanowar Elves | no | Elves alive (wrong) | right by accident | yes | both right |
  | (c2) the opponent's Flametongue Kavu trigger on the Bears | no | Bears alive (wrong) | right by accident | yes | both right |
  | (d) the seat's Bears under the opponent's Counterspell; a second Counterspell | no | both stranded | unmappable | yes | both right |

  35 checks, 13 failures, every one the copier's; no rollout threw an engine error (a stranded card silently scores as
  a missing one). A test-side prototype carry of about 110 lines made every case right.

**Decision.**

1. **The stack carry, in `LenientGameCopier`, only when asked.** `carryStack(true)` makes `makeCopy` rebuild the live
   stack on the copy after D479's carry pass, bottom first; off (the default, and every caller but the search in a
   D544 stack window: the atlas's seat, the grader, play exploration, every registered player) `makeCopy` and `find`
   are what they were, a non-empty stack included. Each item:
   - **a spell or an activated ability** through `SearchPolicy.mapSaOn` (`mapSa` with the host found by the caller:
     its id when the live source is a last-known object, a sacrificed Firebrand): D472's alternative costs, D466's
     optional costs (a kicker), X, D486's modes with the clone Forge's cast appends for each chosen mode
     (`CharmEffect.chainAbilities`) and the live chain's targets part by part, divided allocations;
   - **a triggered ability** as Forge's `TriggerHandler` builds one: a `WrappedAbility` around the copy's own trigger
     on the copy's source (the same mode and description; by place among its triggers when that is ambiguous), its
     ability copied for the controller, its triggering objects mapped (a card, a player, a stack item, and since the
     pilot an `FCollection` or `ArrayList` of them element by element: an attack trigger's `Defenders`, a cast
     trigger's `CurrentCastSpells`), X and the optional flag carried, the decider mapped;
   - **the paid cards** (`getPaidHash`: sacrificed, exiled, discarded, tapped), each the copy's card of the same id
     that reads the same (name, power, toughness, mana value); **the cast-from zone** and `castSA`;
   - **a card that has ceased to exist** — a token sacrificed for its own ability (a Map, a Clue) or paid for an item
     (a Goblin token flung) — rebuilt on the copy in no zone by D500's `lkiOnCopy` (its script and copiable
     characteristics, its controller and timestamps), as a source or a paid card, and then held to the same
     reads-the-same test (added after the first pilot dry-run, *Verification*);
   - **pushed** by `MagicStack.add`, the only public way onto the stack (`push` is private and the deque has no
     accessor), with the cast and target triggers suppressed (`SpellCast`, `SpellAbilityCast`, `AbilityCast`,
     `SpellCastOrCopy`, `SpellCopy`, `SpellAbilityCopy`, `BecomesTarget`, `BecomesTargetOnce`, the crew, saddle,
     station, cycle and waterbend triggers): they fired in the live game already;
   - **mapped**: each live item's spell ability to the copy's, so `find` maps a stack item (a counter's target) and
     D312's install of a counter candidate needs nothing new.
   After the carry, **a self-check**: the copy's stack against the live one item by item, top first — the kind, the
   source's id, the controller's id, every target's id (a stack item's by its source's), X and the number of paid
   cards. A mismatch refuses the window (`verify`).
2. **Refuse rather than guess.** A stack the carry cannot rebuild faithfully refuses the whole window: the seat plays
   Forge's answer, unsearched, and `search.p.stackwin.refused` and `search.p.stackwin.refused.<reason>` count it. The
   carry is asked only of a stack window with something to choose between (after the listing; a window Forge would
   answer alone is never a window and never a refusal), so the refusals and the windows searched count the same
   windows. The reasons, read on the live game first (`stackRefusal`) and then by one trial carried copy (a few milliseconds):
   `waiting` (simultaneous stack entries), `frozen`, `resolving`, `splitSecond`, **`faceDown`** (any face-down item:
   a face-down spell, or an ability of a face-down card), `copied` (a copied spell has no zone to rebuild it from),
   `splice`, `manaSpent` (the source's SVars or a part's parameters name a value read from the mana spent — converge,
   adamant, sunburst, expend and the like — which the carry does not rebuild: a rebuilt item has paid no mana, and the
   live item's mana records name the live game's players), `manaEffects` (mana that adds "can't be countered",
   counters or keywords, or triggers when spent), `trigger` (a delayed trigger, one a spell spawned, one with
   remembered objects, one the copy's source does not carry), `triggering` (a triggering object the copy cannot hold
   as it was), `modes` (a modal trigger), `paid` (a paid card the copy cannot stand for), `castFrom`, `mayPlay` (a
   may-play whose `ReplaceGraveyard` effect `MagicStack.add` would make a second time), `push` (Forge refused the
   push: no legal target), `unmappable`, `verify`, and `copy` (any other copier failure). **A face-down item is
   refused always, never rebuilt**: `GameCopier` rebuilds a Stack-zone card face up from its paper card, and a
   rollout must never see a face the seat cannot see — hard rule 8's spirit applied inside the search, where nothing
   reaches the wire but a pick could still be made on a hidden name. No refusal reason is worked around by reflection
   onto a Forge field (lint rule 8): a detail with no public route is a refusal.
3. **`stackwin=1`: the stack windows.** A priority decision with a non-empty stack whose top item the opponent
   controls and nothing waiting to be put on it, on either turn and in any step, is searched when the carry accepts
   it. Candidates: Forge's answer (Forge answers a stack with `chooseCounterSpell` first), pass, and `alternatives`
   with D540's declined aim whatever `declined=` says — counter-magic aimed at the stack among them (the aim's
   staleness test, `partValid`, now takes a spell or ability target when it is an item on the stack now that
   `canTarget` accepts; on D540's empty stacks no such target is legal, as before) — listed inside
   `Decisions.quiet`, as `instant`'s are (B searches nothing there); an aimed play whose target is the seat's own
   stack item is dropped and counted (`search.p.stackwin.ownAim`). Each rollout's copy carries the stack.
4. **`passwin=1`: three steps Forge passes in.** An empty stack, Forge's answer pass, and exactly one of: the
   opponent's declare-attackers step with attackers declared, the opponent's end step, the seat's own
   declare-blockers step (blocks are declared before anyone has priority there) with attackers in it. The listing is
   `stackwin`'s, quietly; the window is searched only when it yields at least one aimed play, and otherwise is not a
   window and is not counted.
5. **`dactiv=1`: the sorcery-speed activations Forge declines.** In the windows already searched in the seat's own
   main phases, the listing also takes an activated, non-mana ability Forge declines that passes Forge's own timing
   test for sorcery speed (`SpellAbility.canCastTiming`: `isPwAbility() || getRestrictions().isSorcerySpeed()`, and
   not `getRestrictions().isInstantSpeed()`; equip is built `SorcerySpeed$ True`, a loyalty ability is caught by
   `isPwAbility`), the first of its source in the listing, of no source the widening played this turn (one widened
   activation per source a turn), aimed by D540's forced aim after the declined spells and listed last. **An equip
   aimed at the creature it is already on is dropped** (`search.p.dactiv.sameHost`): Forge's forced path skips the
   non-mandatory refusal of the current host (`AttachAi`, the `!mandatory` checks) and `GameEntity.cantBeAttachedMsg`
   has no such refusal, so the forced aim often lands there. **The aims' writes to Forge's AI memory do not outlive a
   listing whose pick was something else**: the seat's `AiCardMemory` sets (all thirteen) are copied before the dactiv
   aims and put back through their public routes (`clearMemorySet`, `rememberCard`) unless the pick is one of those
   activations (`search.p.dactiv.memoryRestored` counts the sets put back). That covers `ATTACHED_THIS_TURN` (written
   unconditionally on the forced attach path) and `HELD_MANA_SOURCES_FOR_MAIN2` (`reserveManaSources`). Not covered,
   with no public route or not memory: the targets an aim leaves on the declined ability (checked for staleness before
   they are trusted again, as D540's), the random draws (held by `Decisions.quiet`), and whatever an AI path caches
   that Forge itself clears at its next priority (`AiCache`, the predicted combat).
6. **The opponent's priority after a pass.** D312's install (`setPriority(seat)` + `onStackResolved`) makes the seat
   the first player to have priority, so on a copy the opponent is asked once more after the seat's pass where in
   the live game it had already passed and the pass ends the step or resolves the top item (D540 point 5). In D544's
   windows only (a `stackwin` or `passwin` window; never in `instant=1`'s windows, never with the new keys off), when
   the opponent has already passed — on an empty stack, the seat is not the active player; on a stack, the opponent's
   item is on top and is not a trigger put there in the seat's own turn (after a trigger the active player has
   priority first, 117.3b; after a spell or ability its controller does, 117.3c, and passed it on) — each rollout
   seats the opponent with a forcing-capable controller (Forge's plain AI, D390's outlets or D523's random seat, as
   the config says, each answering as before with nothing armed), gives it priority first and arms a **conditional
   pass**: its first priority answer is a pass provided the stack is then the one installed
   (`LenientGameCopier.stackKey`), otherwise its own answer. Then the seat answers with its candidate: a pass ends the
   step or resolves the top item as in the live game; a play gives the opponent its real priority back (117.3c). The
   same holds for every candidate of such a window, Forge's answer included, so their comparison is fair. **J215's
   instant arm carried the lean toward passing that D540 point 5 described; D544's windows do not.**
7. **The retry guard on a stack.** D540's guard compared the turn, the step, an empty stack and the seat's progress;
   it now compares the stack key, which for D540's picks (all made on an empty stack, whose key is empty) is exactly
   the old test. A widened pick asked for again in the same turn, step and stack with nothing played since turns its
   key off for the rest of that step and counts `.retry`; the search's next answer there is Forge's, so no widened
   pick can be asked for 999 times (`PhaseHandler.mainLoopStep`). The self-test holds it on a stack.
8. **The counters** (D540's pattern, added only under a key): `search.p.<key>.windows`, `.cands`, `.changed`,
   `.retry` for `stackwin`, `passwin` and `dactiv`; `search.p.<stackwin|passwin>.oppPassed` (windows the opponent had
   passed in) and `search.wide.oppPassed` (decisions whose rollouts gave the conditional pass);
   `search.p.stackwin.refused` with its reasons and `.ownAim`; `search.p.dactiv.listed`, `.noTarget`, `.sameHost`,
   `.memoryRestored`. And, asked by D541's review, a counter only: `search.p.declined.instantWindows`, an
   instant-speed window (`instant=1`'s) where a declined spell made the candidate cut. It is the one counter added
   under a registered config's keys (`search-v3-declined-instant` prints it); no behaviour of a registered config
   changes.
9. **The player: `search-v3-wide`, config hash `b95340935592`** (read from `./tools/ai-ladder.sh list` on the lane;
   `web/test/ai-ladder.test.ts` holds it). Its params are `search-v3-declined-instant`'s with `stackwin`, `passwin`
   and `dactiv` on and nothing else different; its seat config is
   `Default+outlets+search:ms=1500,cands=6,turns=0,rounds=2,margin=20,maxrounds=12,what=pa,seed=0,anytime=1,declined=1,instant=1,stackwin=1,passwin=1,dactiv=1`.
10. **Opponent B, by a rule written now and resolved before any game.** D543 point 6 fixes the PC session's
    recommendation on `search-v3-declined-instant` from J216, in its words: "**STANDS** — the recommendation to adopt
    `search-v3-declined-instant` goes to the owner as written after J215 — when J216 alone reads SHOWN or SMALL GAIN,
    or when the pooled `lo_p` is above 0.5 and J216 is not a measured loss. **WITHDRAWN** — the PC session recommends
    not adopting it on this evidence and says why — when J216 is a measured loss (`eloHi` < 0, so `hi` < 0.5), or the
    pooled `lo_p` is at most 0.5. … A J216 that gives no reading (NOT PLAYED, NOT READ or INCOMPLETE) neither confirms
    nor withdraws it: the recommendation is reported **OPEN** … The next candidate-side lane … is built on
    `search-v3-declined-instant` when the recommendation STANDS … and on the live seat `search-v2-no-b` when it is
    WITHDRAWN; while it is OPEN, on the live seat." So:
    - **STANDS: B = `search-v3-declined-instant` (`af6771947a25`).** The match measures the three keys' increment
      directly, the union's base against itself plus the keys.
    - **WITHDRAWN or OPEN: B = the live seat `search-v2-no-b` (`59505e241363`).** The match measures the union against
      the live seat, the two D541 keys included.
    **Resolved 2026-11-13, before any J217 game: B = `search-v3-declined-instant` (`af6771947a25`).** J216 read SMALL
    GAIN on the dev set alone, +8.3 Elo [+2.4, +14.1], score 0.5119 [0.5034, 0.5203], 4,800 games, complete, both keys
    exposed (declined 3.505 windows a game, instant 1.891), cost ×1.173; pooled with J215, +7.6 Elo [+3.5, +11.7]. The
    recommendation STANDS, carried by J216 alone (`results/J216/verdict.json`, `recByAlone` 1). The live seat itself has
    not moved: `search-v3-declined-instant` is the owner's to adopt and the owner has not answered; J217 measures the
    three keys' increment over it whether or not it is adopted (D543 point 6's last bullet).
    The job carries both forms of B, in its pilot's B block and in its match step, each commented out under a sentinel
    that stops the pilot until one is uncommented (`drafts/J217-wide-windows.md`); the coordinator resolves both from
    J216's read before the job is posted, the match step refuses to play when they disagree, and the verdict reads B
    from the pilot's resolved `b.json`. Nothing below changes with B but
    the completeness part on B's counters (point 12).
11. **The match: one fixed 4,800-game match** (D398: 2,400 mirrored pairs, 600 batches of 8, no stopping rule) on the
    confirm set (`tools/ai-bench/pairs-confirm.txt`), A = `search-v3-wide` against point 10's B, under `--host j217`
    in a ladder folder of its own emptied by its step, at `--game-timeout 900`. `hostBase('j217')` is 725,000,000
    (FNV-1a as `tools/ai-ladder/schedule.ts` computes it; recomputed on the lane and checked on `j214` → 416,000,000,
    `j215` → 519,000,000 and `j216` → 622,000,000), so the match is dealt **blocks 725,900,000–725,900,599**, on a
    first run and on a retry. No job file in `pc-jobs/jobs/` or `drafts/` names `j217` or a block on base 725, and of
    the 360,238 ladder result rows under the lab's four checkouts' `var/` (read 2026-11-13, after J216) none is on base
    725; the rows lie on 30 bases. **The pilot's host is `j217-pilot2`, base 63,000,000**, on which no row lies either:
    the first name drafted, `j217-pilot`, hashes to 679,000,000, the base `j214-pilot` also hashes to, where J214's
    three pilots played 12 games on block 679,900,000 (a collision of the 997 bases, found by the scan; a pilot is not
    read, but its deals should be new too). 600 consecutive blocks give each of the confirm
    set's 30 deck pairs exactly 40 batches, 160 games, in both seat orders (`batchPairs`).
12. **The match is complete** when its line names A and B in that order at their hashes, says `complete: true`,
    played all 4,800 games with engine errors plus timeouts at most 240 (one in 20, D519 point 2), and carries
    `score`, `lo`, `elo`, `eloLo` and `eloHi`; it was played on exactly the 600 blocks 725,900,000–725,900,599 with no
    other match's game in its folder; every batch line carried the two seat configs exactly; both sides searched
    priority and attack decisions and neither searched a block; **B's batch counters show no `search.p.stackwin.`,
    `search.p.passwin.`, `search.p.dactiv.` or `search.wide.` counter above 0** (the new keys' off path), and, when B
    is `search-v2-no-b`, no `search.p.declined.`, `search.p.instant.` or `search.p.lands.` counter above 0 either;
    and **A's show no `search.p.lands.` counter above 0**. An incomplete match gets no reading and is reposted alone
    under a new job id after its cause is found.
13. **Exposure and NOT READ.** Summed over the match's batch lines on A's side, per game played:
    - each key's windows against its floor, proposed from J212's counts at about a quarter of what they suggest:
      `search.p.stackwin.windows` at least 0.25 a game (J212: 1.92 stack windows a game with a castable spell),
      `search.p.passwin.windows` at least 0.10 (J212: 0.97 such steps with a castable non-counter spell, fewer with
      an aimed play), `search.p.dactiv.windows` at least 0.25 (J212: 1.87 windows a game with a declined equip or
      loyalty ability, fewer after the same-host drop). **A key under its floor is reported as unexposed**: the
      reading says nothing about that key, and the report names it;
    - **the union is NOT READ** when the three keys together changed fewer than 0.25 decisions a game
      (`search.p.stackwin.changed + search.p.passwin.changed + search.p.dactiv.changed`, in integers
      `changed × 4 < played`): the report gives every rate, the match gets no reading, and the player is not played
      again without a new decision;
    - reported beside, deciding nothing: the refusal share of stack windows
      (`refused / (refused + stackwin.windows)`) with each reason's count, `.ownAim`, `.sameHost`,
      `.memoryRestored`, `.oppPassed`, every key's `.retry` a game (a retry is a widened pick that did not happen, and
      counts against A in its own match), and `search.p.declined.instantWindows`.
14. **The readings, written before any game: D519's four at 4,800 games, exactly one for a complete match that is not
    NOT READ, in this precedence, compared as the line carries them** (`lo` in integer ten-thousandths, Elo in integer
    tenths): **SHOWN**: `lo` above 0.5 and `elo` at least +15; **SMALL GAIN**: `lo` above 0.5 and `elo` below +15;
    **INCONCLUSIVE AT 4,800**: `lo` at most 0.5 and `eloHi` at least +15; **NOT SHOWN**: `lo` at most 0.5 and `eloHi`
    below +15. Beside the reading, deciding nothing: indistinguishable (the interval holds 0), a measured loss (wholly
    below 0), a measured gain (wholly above).
15. **What a reading earns.**
    - **SHOWN or SMALL GAIN** names `search-v3-wide` a **live-seat candidate for the owner**, under a separate decision
      and a seat-queue row (D509), with the match's point, interval and cost (A's and B's search seconds a game and
      their ratio) beside it; the cost is reported and never part of the reading. Against B = `search-v2-no-b` it is a
      candidate as the union with D541's keys; against B = `search-v3-declined-instant` as the increment on it.
    - **INCONCLUSIVE AT 4,800** is information and is not confirmed again (D519 point 3).
    - **NOT SHOWN closes these three keys as a union** on the confirm set: no union of them is played again without a
      new decision. A follow-up that wanted to split them would need, per key, a changed-decision rate of about 0.5 a
      game for one night's resolution (the match's per-key `.changed` a game says how far each is from it); one with
      less than 0.25 cannot be read alone in one night.
    - **A measured loss** (the interval wholly below 0) removes the union: no key of it is played again in this form
      without a new decision that says what changed.
    - No reading changes the live seat: `SearchConfig.LIVE_DEFAULTS` stays `what=pa,anytime=1`.
16. **What a reading does not say.** Not which key carried it: no ablation is promised, and none is subtracted from
    another's. Not that the carry is faithful in a window it accepted (*What is unverified*). Not anything about other
    deck sets or other opponents.
17. **Never pooled** with J215 or J216: other players or other deals.
18. **Beside the reading, as description only** (D540 point 10's list): each side's searched decisions by kind and ms
    a searched decision; search seconds a game; each key's windows a game, candidates a window, changes a game and
    retries a game; the refusals; priority overrides by direction a priority decision.
19. **The pilot, before the match**: the build with the decision self-test at 0 failures and at least 502 checks; the
    ai-bench self-test at 0 failures with D544's scenarios in it (at least 460 checks); the ladder test; the player at
    its hash and seat config; `hostBase('j217')` 725,000,000; the job's readers tested on synthetic files; a 4-game
    ladder match against B under `--host j217-pilot2` and a 4-game recorded run against Forge Default (the confirm set's
    first pair). **The match is played only if** over those 8 games `search.p.stackwin.windows` and
    `search.p.dactiv.windows` are each above 0 and `search.p.passwin.windows` is reported (it may be 0 in 8 games),
    none of the 8 ended in an engine error or a timeout, the three keys' retries together are at most 2 a game, and the
    refusal share of stack windows is below one half; otherwise the job writes the match as NOT PLAYED with the
    condition it failed. A new-key counter above 0 in B, a lands counter above 0 in A, or a searched priority decision
    on a stack whose top item is the seat's own stops the night as a pilot failure.
20. **Time.** B searched about 21.7 s a game as `search-v3-declined-instant` in J215 (19 s as `search-v2-no-b`). A
    should search about B-as-declined-instant's plus the three keys': about 1.9 stack windows a game at about 0.8 s
    (a carried copy costs a few milliseconds more than a plain one), about 0.6 pass windows at about 0.7 s, and the
    dactiv candidates at about 0.3 s each where they make the cut: about 24–26 s. Both sides about 46–48 s a game
    (B = declined-instant) or 43–45 s (B = the live seat): by D537 point 11's fit at four times the games, about
    9.5–10.3 h for the match, plus the pilot (about 0.3 h). About 11.5 h at 6 workers. The match stops itself at
    `--hours 13.5` under a 14 h step; a match that reaches its own stop is `complete: false` and gets no reading.

**Under D509: the atlas's seat and the live seat are unchanged.** This lane changes under `bridge/src`
`ai/LenientGameCopier.java` (the carry, off unless asked; `find` maps a carried stack item only when the carry ran),
`ai/SearchPolicy.java` (the windows, the listing's `Widen`, `mapSaOn`, the playout's `WIDE` flags, `partValid`'s
stack targets, the retry guard's stack key, test hooks), `ai/SearchConfig.java` (three fields, a copy constructor,
`withWindows`, three parse cases, three `toString` lines), `ai/RolloutController.java` and `ai/RolloutForcing.java`
(the conditional pass, never armed outside D544's windows) and `ai/DecisionSelfTest.java`. The argument that every
seat that names none of the new keys plays as before:
- **Every atlas seat and every registered config parses with the keys off**, as D540's argument.
- **With the keys off no engine call is added or removed**: `wantsPriority(seat, forge)` reads `cfg.stackwin` and
  `cfg.passwin` before anything else they guard; `choosePriority`'s `wideWindow` is not called; the listing's
  `Widen` with no dactiv sources and no own-aim drop runs today's loop and today's aim pass in today's order
  (`alternatives`' five-argument form delegates to it); `WIDE` is 0 so `playout` neither carries the stack nor seats a
  forcing opponent; `partValid`'s new branch is reached only by a spell target, which on an empty stack is refused as
  before; the retry guard's stack key equals the old empty-stack test for every pick a registered config makes.
- **The evidence** (*Verification*): gate step 12m (`cubelab.sh seat-identity`, the four golden games identical) on
  the built lane; the ai-bench self-test's D540 scenarios unchanged and the d544 off-scenarios (no D544 counter with
  the keys off; a copy of a game with a non-empty stack with the carry off is today's); every registered hash
  unchanged in `ai-ladder list`. The next atlas night's derivation diffs `bridge/src` in its `seat_code` check and
  must admit exactly these six files beside D540's and D539's; this paragraph is the admission.

**Hidden information (hard rule 8) and threads (hard rule 3).** The carry reads the stack, which is public, and the
cards paid for it, which are public once paid; it refuses every face-down item (point 2), so no rollout sees a face
the seat cannot. The listings are D540's (the seat's own castable spells and its own activations, aimed by Forge's
targeting). Every rollout redeals what the seat cannot see exactly as today (`Determinizer`); the Stack zone is not
redealt. Nothing touches the wire, `Snap` or a `CardView`. Every new call runs inside `chooseSpellAbilityToPlay` on the
game thread; `WIDE` is a thread-local of that thread; no thread and no `invokeInGameThread` is added, so `HOP_ALLOW`
stays three.

**The hypothesis, registered as information before any game (no check reads it).** If the per-window rate J215 showed
(about 0.11–0.13 changed decisions a window) holds in the new windows, the union changes about 0.2–0.25 decisions a
game in stack windows, about 0.07 in pass windows and about 0.1 through dactiv: about 0.4–0.5 a game, and at J215's
+11 Elo per changed decision a game about +5 to +6 Elo against B = `search-v3-declined-instant` (against the live seat,
that plus whatever D541's two keys hold, J215's +6.9 if it stands). With J211's score standard error at 4,800 games
(0.0039, 2.71 Elo; SMALL GAIN needs a point above about +5.3), from the normal approximation of the score:

| true effect | SHOWN | SMALL GAIN | NOT SHOWN |
|---|---|---|---|
| 0 | 0.0% | 2.5% | 97.5% |
| +3 Elo | 0.0% | 19.7% | 80.3% |
| +4 Elo | 0.0% | 31.4% | 68.6% |
| +5 Elo | 0.0% | 45.4% | 54.6% |
| +6 Elo | 0.0% | 60.0% | 40.0% |
| +8 Elo | 0.5% | 83.5% | 16.1% |
| +10 Elo | 3.3% | 92.6% | 4.2% |
| +12 Elo | 13.4% | 85.9% | 0.7% |

**So a true +6 reads SHOWN or SMALL GAIN 60% of the time and a true +5 45%: the expected effect sits at the lab's
resolution, and a NOT SHOWN here is weak evidence against an effect of that size** (it says the union is worth less
than about +10.6 Elo at this width, not that it is worth nothing). That is the plain size of the bet; the night is
worth it because the stack windows are where counter-magic lives and the carry is the piece every later stack-side
lane needs. INCONCLUSIVE AT 4,800 cannot happen at this width (D541 point 5's argument).

**Rejected.**

- **Copying the stack through Forge's own `copyStack`** (setting `GameSimulator.COPY_STACK`): a global static every
  copy in the process reads, spells only, cast triggers fired again, no spell target. And no reflection onto
  `MagicStack`'s private deque (lint rule 8).
- **Rebuilding a face-down spell face down.** It can be done for a morph's face-down characteristics, but a refusal
  keeps every face the seat cannot see out of the rollout by construction, and face-down casts are rare on the
  confirm set.
- **The instant-speed sinks Forge declines** (Clue, Mind Stone, Retrofitter Foundry): D540's argument stands for them
  (a leaf at this turn's end makes a deferrable instant-speed activation look free); only sorcery-speed activations
  are taken.
- **Every opponent-turn step and every own-turn step outside the main phases** for `passwin`: 2.7 and 5.5 windows a
  game, mostly the same hand asked again at every step; the three steps are where a play changes combat or the
  opponent's next turn.
- **Single-key screens at 1,200 games**: uninformative at the effects every recent change has shown (D541's
  *Context*); one union at 4,800.
- **Applying the conditional pass to `instant=1`'s windows**: it would change a registered player's behaviour
  (`search-v3-declined-instant`, J215's and J216's) and the base B may be.
- **Restoring every AI memory set around every aim** (D540's declined aims too): it would change the registered
  players' behaviour; only the dactiv aims are put back.

**What is unverified.**

- **The silent-fidelity risk of the carry.** An accepted item the carry rebuilt subtly wrong resolves differently on
  the copy without an error, as the stranded cards of phase 1 did. The self-check (point 1) compares kinds, ids,
  targets, X and paid counts, not what an item will do; the self-tests cover a spell, an activated ability with a paid
  sacrifice, a trigger, a two-deep counter war, X (with a control at X = 1), a kicker (with an unkicked control), a
  paid creature's power (Fling), a mode and the refusals, and nothing else. Not tested: a spell cast by an
  alternative cost from another zone (flashback, foretell) on the stack, divided damage, a spell with more than one
  targeting part, a triggering object that is a last-known card whose values changed, an activated ability of a card
  that changed zones twice. The refusal counters and the pilot's refusal share are the forward instrument.
- **`manaSpent` is a text scan** of the source's SVars and the parts' parameters: a value read from the mana spent
  under a name it does not list would be rebuilt as if no mana had been spent.
- **The paid cards' comparison** reads name, power, toughness and mana value; a paid card whose counters or other
  characteristics mattered but read the same on those four would be carried as the copy's card.
- **The conditional pass** is given on the stack key (kinds, sources, controllers); a stack whose targets changed but
  whose key did not would still get it. The priority-order self-test holds one window.
- **The opponent-passed rule** reads the stack's top item; a window where the opponent cast a spell and a trigger
  of the seat's went on top in the opponent's turn is read as not passed (the top is not the opponent's), which is
  right, and one where both players' triggers stacked in an order the rule does not see is not tested.
- **The dactiv memory restore** puts back the thirteen memory sets; what an AI path changes outside them (the
  targets left on the ability, cached predictions) stays, as D540's.
- **The listing's cost in a stack window** has no time limit, as D540's in the windows it widened.
- **That the blocks of base 725 and 63 are unplayed everywhere** (point 11): read from the lab's four checkouts'
  ladder rows and the job files on 2026-11-13; the job's block reader checks the match's own folder only.
- **The exposure floors** (point 13) are proposals from J212's counts of windows with castable plays, not of windows
  the keys search. **Measured since, and well under the hypothesis** (*Verification*): over 24 diagnostic games
  against Forge Default the union changed 1 decision (0.04 a game; an earlier build's 24 games, 4), and over each pilot
  dry-run's 4 ladder games against B 1 (0.25 a game). The hypothesis's 0.4–0.5 a game assumed J215's per-window change
  rate and J212's counts of windows with a castable play; the keys search fewer windows than those counts (a stack
  window with nothing to list is no window; most equips are aimed at their host and dropped) and change fewer of them.
  **J217 as registered is likely to read NOT READ** (point 13: under 0.25 changed decisions a game); that is the
  rule's answer, written before the match, and this lane does not move the bar.
- One opponent and one deck set: point 10's B and the confirm set's 30 deck pairs.

**Verification (the lane; 2026-11-12 on `1eaa00d30`, the lab idle, then 2026-11-13 after J216 on the rebased tree
`97122947c` + the lane, the lab idle at every compute step: state `idle`, `running` and `queue` empty, read as text):**

- `./tools/check-forge.sh`: the pinned jar, `3c0a7c38…8e5dd9`. `./bridge/build.sh` on the rebased tree: build OK; the
  lint 97 files under `bridge/src` and 4 under `tools/`, 33 rules, its self-test 79 firing cases; **decision self-test
  502 checks, 0 failures** (472 before this lane plus `wideWindows`' 30).
- `./tools/ai-bench.sh --selftest`: **460 checks, 0 failures** (352 before D544's scenarios; `--stack-windows` alone 108
  checks, 0 failures): the stack carry's (a)–(d), (e) and (e′), (f) and (f′), (g), (h), (m) a Clue token's ability
  (the source rebuilt), (n) a Goblin token in Fling's paid cards, (o) prowess's `CurrentCastSpells` over its Bolt, (p)
  an attack trigger's `Defenders` (driven through Forge's own loop), and the four refusals; the three keys, the
  opponent's pass and the retry guard (`wideWindowScenarios`). 440 on the rebased tree before (m)–(p).
- `./tools/cubelab.sh seat-identity`: **all 4 games are the golden's** (forge, search, explore, plain): after the carry,
  after the keys, on the rebased tree, and after the pilot's fixes.
- `./tools/ai-ladder.sh list`: identical to main's listing line for line but for `search-v3-wide` at `b95340935592`
  (point 9's seat config) and the kinds line's three new params; `search-v3-declined-instant` `af6771947a25`,
  `search-v2-no-b` `59505e241363`, `search-v1-anytime` `cdd55e02a89c`, `forge-default` `3ed453ffef1c`. (On
  2026-11-12 this command once ran just after the lab turned to J216, by a fault in the lane's state check, which
  tested an exit code; a read of the registry, about a second.)
- `node --test web/test/ai-ladder.test.ts` 57 of 57 (D544's case among them); `web/test/claude-md.test.ts` 5 of 5;
  `node tools/decisions.mjs check` OK (458 decisions, next D545); `./tools/public-check.sh` OK.
- **The deals** (point 11): of 360,238 ladder result rows under the lab's four checkouts none is on base 725; the
  pilot's first host name, `j217-pilot`, shares base 679 with `j214-pilot` (12 rows on block 679,900,000), so the
  pilot's host is `j217-pilot2` (base 63, no row).
- **The J217 draft** (`drafts/J217-wide-windows.md`): `./tools/runner.sh check` machine-checked, `lint: clean` (8 pilot
  blocks, 52 checks; 2 command blocks, 25 checks); its readers' self-tests: exposure 8 of 8, verdict 48 of 48,
  recording 14 of 14, block, rollout and gate readers ok.
- **The pilot dry-run, first** (`runner.sh dry-run --pilot-only --max-seconds 7200 --workers 6`, pinned to `e9e549b`):
  51 of 52 checks (only `merged == 1`), every block exit 0 — but **the gate kept the match out**: stack windows
  refused 27 against 6 searched (a share of 0.818; `unmappable` 9 and `triggering` 5 in the ladder games). A 24-game
  diagnostic (the wide player against Forge Default on the confirm set's first 6 pairs, the refusal messages printed
  by a local, uncommitted flag) gave the causes: a Map or Clue token's ability whose sacrificed source the copy did not
  hold (16), a sacrificed Goblin token as a paid card (5), `Defenders` (17) and `CurrentCastSpells` (14) as
  collections, flashback and may-play casts on the stack (about 20), a modal trigger, a copied spell, LKI reading
  differently (a few). The first four are fixed in the carry (point 1); the refusal was asked before the listing, so a
  window Forge would answer alone counted as a refusal (point 2: now asked only of a window with something to list).
  After both, the same 24 games refused 1 stack window against 17 searched. **Flashback and may-play casts on the
  stack stay refusals**: no faithful public route rebuilds them (the play's variant exists only from the card's former
  zone).
- **The pilot dry-run, twice on the fixed pin `4430e36`**: each 51 of 52 checks (only `merged == 1`, the lane is not on
  `origin/main`), every block exit 0 (the build and self-tests 39–40 s, the ladder match 105–113 s, the recorded run
  63 s); decision self-test 502/0, ai-bench self-test 460/0; B `search-v3-declined-instant` resolved; names, hashes and
  seat configs exact; both sides searched priority and attacks and no block; B's new-key counters and A's lands
  counters 0; no searched decision on a stack with the seat's own item on top. **The gate plays both times**: stack
  windows 5 and 7 (ladder 2 and 3, recorded 3 and 4), pass windows 2 and 2, dactiv windows 16 and 16, refused 0 and 0,
  no error or timeout, no retry. In the 4 ladder games each time the union changed 1 decision (a dactiv pick); search
  seconds a game A 12.9 / B 13.2 and A 12.9 / B 11.3 (×0.98, ×1.15).
- **J217's time, from the pilots**: A searched ×0.98–1.15 of B's seconds a game; at J215's 21.7 s for B, A about
  23–25 s and both about 45–47 s a game, so by D537 point 11's fit at four times the games about 9.7 h (9.2–10.3 h)
  for the match, plus the pilot's 4 minutes: point 20's estimate stands.
- **Not run on the lane**: the full gate and the independent review (the coordinator's, at the merge).

**Follow-up.** J217 plays the match after the merge and after J216's read resolves point 10's B; its `report.md`
carries the reading, every exposure rate and the refusals. A candidate's adoption is its own decision. Its row in PLAN
is the cube lab's 61.
