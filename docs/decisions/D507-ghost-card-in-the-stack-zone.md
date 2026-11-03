## D507 — A card the engine left in the Stack zone with nothing on the stack is hidden from the seat's target record (amends D347's `Decisions.visible`; protocol M79)

*Branch `pc/d507-ghost-in-stack-zone`, off main `3275af30` (D502–D504's merge). D507 was reserved for this lane (D505
and D506 are two other lanes'; `node tools/decisions.mjs next` printed D505). Amends **D347**'s visibility gate,
`Decisions.visible`, for the Stack zone only. The checker is unchanged.*

**2026-11-02**

**Context.** Lab night J183's unit `b-s09-pauper-2522` (pauper band, spine seed 2522, mtg-table at `3275af30`) failed
`tools/check-redaction.mjs` on **463 of its 9,502 frame logs**, every one with the same message:

    decision N names card 49 (target:49), which its state frame does not show seat 0 -- a stub's id, a library card
    or another seat's hidden card is never an option (M55, D347)

Evidence, read only: `/home/justin-a/code/lab/data/lab-j183/b-s09-pauper-2522/` (`atlas.json`'s `checks`;
`phaseB/frames/`, `phaseB/baseline/frames/`, `phaseB/logs/`).

- **The records.** 464 branch logs name `target:49`, in 505 records. Every one is seat 0's `target` record of Mana Drain
  (card 23): `kind: target`, `source: targets`, `by: forge`, `parent` a priority record answering `cast:23`, no
  `explore` mark, two options (three in 6 records): `target:49` and a spell really on the stack. **No record answers
  `target:49`**: Forge's counterspell AI targets the spell on top of the stack. One of the 464 logs passes:
  `d11-random-o0-b131-seat0`, forked at decision 11 (turn 9). In that branch Knockout Maneuver was cast for real (a
  `cast` event, resolved, then the graveyard), and its record is right. The other 463 logs, with 504 records, are the
  failures.
- **By option:** d11 o0 1 (the legitimate one); d15 o0 39, o1 67, o2 17, o3 46; d16 o0 17, o1 7, o2 13; d17 o0 33,
  o1 36, o2 45, o3 44, o4 34, o5 43; d18 o0 5, o1 2, o2 2; d19 o0 1, o1 6, o3 1, o4 2, o5 1, o6 2. Decision 11 is the
  spine's first decision after turn 10, decision 15 the first at turn 11.
- **Card 49 is Knockout Maneuver, seat 1's.** Seat 1 is the spine's Forge AI. Seat 1's own spine log
  (`baseline-seat1.jsonl.gz`, seq 203, turn 10 MAIN1; seat 0's log has the same frame at seq 183) shows:
  - decision 63, `cast:49`;
  - target record 64, **two** targets on "target creature you control": `['target:57', 'target:48']`;
  - record 65, `target:22` on "target creature an opponent controls";
  - then the state's events: `zone` 49 `{hand, 1}` → `{stack, null}`, three lands tapped (73, 59, 70), **no `cast`
    event for 49**, and no later zone event for 49 anywhere. The hand count drops from 5 to 4 and stays there.
- **The worker log** (`phaseB/logs/worker-2.log`, line 154):

      Knockout Maneuver (49) - [Couldn't add to stack, failed to target] - Put a +1/+1 counter on target creature you
      control, then it deals damage equal to its power to target creature an opponent controls.[[Elvish Visionary (57),
      Grizzly Bears (48)], [Militia Bugler (22)]]

  The card is a **ghost**. Forge's stack zone holds it, so `game.getCardsIn(ZoneType.Stack)` lists it and
  `card.getZone()` says Stack. But no spell or ability of it is on the `MagicStack`, so no state frame ever shows it.
  `Snap`'s `stack` and `stackCards` are the stack items' cards (`stackBottomFirst`), and no player zone holds it. Seat
  1 has lost the card for the rest of the game. Every fork of the spine after turn 10 carries the ghost:
  `LenientGameCopier` copies the Stack zone's cards.

**The cause, on the pinned jar.** The 2.0.15 source checkout was a guide. The jar is the truth: the code below was
read with `java -m jdk.jdeps/com.sun.tools.javap.Main -c -p -l` on the 2.0.14 fat jar (sha256 `3c0a7c38…8e5dd9`).

1. **`forge.ai.ComputerUtil.handlePlayingSpellAbility(Player, SpellAbility, Consumer)`** (source lines 81–142 at the
   `forge-2.0.14` tag):
   - **Offset 31 (line 83):** it reads the host's zone, `hz`, while the card is still in the hand.
   - **Offset 121 (line 104):** `sa.setHostCard(game.getAction().moveToStack(source, sa))` moves the card into the
     Stack zone **before** anything else.
   - **The early returns.** The charm check returns `false` at offset 166 (`CharmEffect.makeChoices`, line 112).
     `chooseTargets.accept(sa)` runs at offset 173 (line 115). Then `if (!sa.isTargetNumberValid()) return false`
     runs at offsets 179–186 (lines 116–117). Both returns leave the card in the Stack zone.
   - **The payment.** `freezeStack` (offset 199, line 123) and `payComputerCosts` (offset 226, line 126) follow. On
     success, `addAndUnfreeze(sa)` runs (offset 238, line 127), then `return true` (offset 275).
   - **The failed payment** (offsets 276–400, lines 134–142) prints "AI failed to play … [Stack]" and marks the play
     skipped. Its move-back tests `hz.is(ZoneType.Stack)` (offsets 326–334): the **original** zone, the hand. So it
     never moves the card back either. The source carries the FIXME: "the card seems to be stuck on stack zone".
2. **`forge.game.zone.MagicStack.add(SpellAbility, SpellAbilityStackInstance, int)`** (lines 321–325):
   `hasLegalTargeting(sp)` runs at offset 397, and `ifne 459` follows at 400. When it is false, add builds the
   message, prints it to `System.err` with `getAllTargetChoices()`, fires a `STACK_ADD` log event and **returns**
   (offsets 403–458). Nothing is added to the stack, and nothing moves the card. `handlePlayingSpellAbility` has
   already paid, and it then returns `true`.

   This is J183's path: three lands tapped, the worker log's exact line, and two targets on a part with a maximum of
   one. Forge's AI had chosen that targeting (D485's note: "FightAi appends a target at every evaluation").
3. **`TargetRestrictions.getAllCandidates(sa, false)`** walks `game.getCardsIn(tgtZone)` with `sa.canTarget(c)`. For
   Mana Drain (`TargetType$ Spell | ValidTgts$ Card`) the zone is Stack, so the ghost is a candidate. The real spell
   beside it is not always one: Yavimaya Elder, a creature spell, was missing from that list, which is why those
   records added it from the answer with `complete: false`. The reproduction's Lightning Bolt, an instant, was listed.
4. **`Decisions.visible(c, ai)`** (D347) called every Stack-zone card public, so the record wrote `target:49`.

This is Forge's own AI path, not the lab seat's. Seat 1 is `policy: forge`, and the lab's seat only records what Forge
chose. It is not Knockout Maneuver's fault either: any spell whose cast the AI abandons after the move strands its card.

**The reproduction**, a scratch program against the pinned jar. It is not committed: it is evidence, and its two
controls are now in the self-test (*Tests*). The self-tests' own way to build a position: `Bootstrap`, a `GameState`,
the game pool.
- Seat 1 holds two Knockout Maneuvers and a Lightning Bolt, beside Elvish Visionary, Grizzly Bears and four lands.
  Seat 0 holds two Counterspells and has Militia Bugler.
- **The AI's own cast path** with J183's targets (two on the first part): `ComputerUtil.handlePlayingSpellAbility`
  returned `false` at the target count. The card is in the Stack zone, the `MagicStack` is empty, and the hand dropped
  by one.
- **The field's path**, the tail after a payment (`moveToStack`, `freezeStack`, `addAndUnfreeze`), printed J183's
  line exactly:

      Knockout Maneuver (12) - [Couldn't add to stack, failed to target] - Put a +1/+1 counter on target creature you
      control, then it deals damage equal to its power to target creature an opponent controls.[[Elvish Visionary (17),
      Grizzly Bears (18)], [Militia Bugler (6)]]

  and left the second ghost: `getSpellMatchingHost` is null.
- **The Bolt**, cast through the same AI path at seat 0, is on the stack: one item.
- **Seat 0's Counterspell.** Forge's candidates are `[11, 12, 13]`, both ghosts and the Bolt. With the old rule the
  record lists `[target:11, target:12, target:13]`, J183's shape. With D507 it lists `[target:13]` with `hidden: 2`,
  answers `target:13`, and is complete. The bridge printed one `[ghost]` line per ghost.
- **A spell mid-cast is no candidate of its own targeting.** The question was whether the seat's own spell, in the
  Stack zone with no instance yet while its targets are chosen, could be a candidate. Seat 0's second Counterspell was
  moved to the Stack zone with no instance. `canTarget(itself)` is false and `getAllCandidates` does not list it: rule
  115.5, `SpellAbility.canTarget`'s first check (`rootAbility.isSpell() && rootAbility.getHostCard() == entity`, at
  the tag). Under D507 it would be hidden anyway.

**Decision.**

1. **`Decisions.visible` sees a Stack-zone card only while the stack holds a spell or ability of it.**
   - **The new function.** `Decisions.onStack(c)` iterates `game.getStack()`, the `MagicStack`, an
     `Iterable<SpellAbilityStackInstance>` on the jar (javap). It is true when an instance's `getSourceCard()` has
     `c`'s id. The test is by id because the fork's copier keeps ids.
   - **What still counts.** Any instance counts, spell or ability. A copy of a spell is in the Stack zone with its own
     instance (D495), so it stays visible. A resolving spell keeps its instance until `finishResolving` removes it
     (`MagicStack.resolveStack`, which peeks and does not pop), so it is visible until it leaves the zone.
   - **What is now hidden.** A card in the zone with no instance is hidden. That covers the ghost, and another seat's
     spell caught between its move and its `add`, which no frame shows either. Every other zone's rule is unchanged.
2. **One gate, shared.** Every reader goes through `visible`, directly or through `entityToken`:
   - the target record (`Decisions.targets0`);
   - the choice records;
   - the explorer's candidate lists (`Explorer.candidates`, `legalTargets`, `staleTargets`' fill);
   - the explorer's marks;
   - the search's target alternatives (`SearchPolicy.targetVisible`).

   A grep of `bridge/src/mtgtable/ai` for `ZoneType.Stack` finds no other gate. `Explorer.randomTargets` refuses any
   part whose zone holds the Stack, `LenientGameCopier` copies zones, and D466's `putBack` (below) reads the zone to
   repair a refusal.
3. **The record counts a ghost in `hidden`** and never lists it or answers it. No new field: protocol **M79**.
4. **The worker log line.** For each ghost the target record leaves out, the bridge prints one line to stderr. It is
   written in `Decisions.targets0`, beside `d.hidden++`, through `Decisions.ghostLine(id)`:

       [ghost] card <id> in the stack zone with no stack instance left out of a target record (D507)

   It names an id, never a name. The night can count it as `ghost_candidates`: the `[ghost]` lines in
   `phaseB/logs/*.log`. It is one line per record per ghost. Under this bridge, J183's s09 frame logs would have
   printed 504 of them. The spine's own seat 0 records never named 49, so the spine replays add none there.

**What it changes: the record, and nothing J183's branches played.**
- **The record.** Every record that listed a ghost now counts it in `hidden`. The scan below, run over the 22
  committed `fixtures/games/` recordings, finds no ghost cast in any of them.
- **The checker's own reliance on the gate stands.** D481, D485, D495, D496, D503 and D504 rest on `visible` naming a
  stack card at decision time. The spells they were measured on were on the stack when the seat was asked, so the
  stack held their instances and `visible` still names them. One gap is left on the checker's side: D481 admits a
  move from the **viewer's own** hand onto the stack without a `cast` event. So a record from before D507 that
  listed the viewer's own ghost would pass, where the opponent's (J183's) fails. The new bridge lists neither.
- **The play paths share the gate**, so the same filter is in front of the explorer's and the search's lists. In
  J183 it changes **no play**, which is load-bearing:
  - Every list a ghost could enter is a record's list too, because the record lists every engine candidate the gate
    passes, without the explorer's `canTarget` filter. Every J183 record that listed a ghost fails the checker. The
    only failing logs of that shape are s09's 463.
  - In all 504 of those records the part targets the Stack alone, and Forge's answer is a spell, a `SpellAbility`,
    never a `GameEntity`. So `Explorer.targets` skips the part ("a spell on the stack: not in the engine's candidate
    list"). `randomTargets` refuses a part whose zone holds the Stack. `staleTargets` leaves a part with a spell
    target and a valid count alone, and refuses an invalid one before it fills. The search's target kind is off in
    the atlas (`observe=1`, `targets` false), and J183's 305 spine decisions are `p`, `a` and `b` only.
  - So no J183 draw, pick or option list would have come out differently.
- **Where a future night could differ.** Every such place is one where the old list held a card no frame shows, and a
  draw of it would have been a target the engine refuses or misreads. It needs a ghost in the game, and one of:
  - (a) the explorer's single-target redraw on a part whose zones are the Stack **and** another zone, with Forge's
    target a card. `cardsfolder.zip` holds 30 such scripts, for example Aether Gust, Brutal Expulsion and Commit //
    Memory (`TgtZone$ Stack,Battlefield` and the like);
  - (b) `staleTargets` refilling a Stack part left with no target at all;
  - (c) a search seat with `targets=1`.

  **J184 stays in D498's population** (`random-<band>-d498`). For every position J183 produced, this change is to the
  record only. A night that meets (a), (b) or (c) will show it: a ghost in a target record now prints `[ghost]`, so
  the metric counts the positions where a list shrank.

**The board (the human game, `play.sh`).** The human path is unchanged in this lane, and is follow-up 23. A human's
targeting is Forge's `TargetSelection` (forge-gui, at the tag), not the seat's record:
- **A part whose only zone is the Stack** (every counterspell) goes to `chooseCardFromStack`, which walks
  `game.getStack()`'s instances. A ghost is never offered there.
- **A part whose zones are the Stack and another zone** (the 30 scripts above) builds `CardUtil.getValidCardsToTarget`
  over every zone. Because the zones contain the Stack, it does **not** use `InputSelectTargets`, so InputPeek (D423)
  never sees a ghost. It goes to `chooseCardFromList` → `getGui().one(...)`, so a ghost **could** reach the board as an
  `ask` option under "--CARDS IN STACK:--". `WireGuiGame`'s `option` → `Snap.card(o, cv, viewer)` uses `cv.getZone()`
  as the zone hint, Stack, which is public, so the option would be a full card with its name.
- **Choosing it** adds no target: the dialog looks for a spell instance whose host is the chosen view, finds none, and
  the targeting loops.
- **`check-redaction.mjs` would not catch it.** P12 refuses only a card the last snapshot placed in an opponent's hand
  or library, and the ghost is in no snapshot's zones. A6 counts an ask body as a reveal channel. M55 audits
  `decision` lines only.

  Whether naming a card the opponent moved to the stack in public is a leak at all is the follow-up's question. The
  zone event has already given the seat its id, and the card's name was public the moment it was cast. It was never
  in a frame, though.

**Considered and rejected.**
- **Repairing the engine state** by moving the ghost back to its owner's hand (or graveyard) when the cast fails, as
  D466's `putBack` does for the random seat's refused payments. Rejected for this lane: it changes what a branch plays
  (seat 1 keeps the card), so it would open a new population, and it touches Forge's AI path for a Forge seat, not
  ours. It is follow-up 25.
- **Listing Knockout Maneuver as engine-unplayable** (`tools/cubelab/engine-unplayable.json`). Rejected: the fault is
  the AI's abort path for any spell, whatever targeting the AI leaves invalid. It is not the card. The scan below
  found ghosts from Batroc the Leaper too, through a different abort.
- **Gating the record alone** and leaving the explorer and the search on the old rule. That would keep J184's play
  paths byte for byte. It was rejected because the old rule lets those paths draw a card no frame shows (a target
  that would be refused), and CLAUDE.md's hidden-information rule wants one gate.
- **Teaching the checker that a ghost is admitted.** Rejected: nothing about a ghost is visible to the seat. A record
  that names one is wrong, and the checker is right to fail it.

**The measurement: ghost casts in J183.** A scratch scan, not committed. It is a one-off measurement with no test, so
it does not belong in `tools/cubelab/`. A ghost cast is a `zone` event moving card X into the stack with all of
these:
- no `cast` event naming X in that state frame or the next;
- no later zone event naming X;
- no state frame from that one on listing X in a player's zones or `stackCards`.

The last condition was added after the first pass. D466's put-back returns a refused cast's card with no zone event,
so the first pass counted 45 cards that a later frame lists again as ghosts, in s04, s08 and s13.

| where | logs | ghost casts |
|---|---:|---|
| the 13 spines, both seats' `baseline-seat*.jsonl.gz` | 26 | **1**: s09's card 49, Knockout Maneuver, seat 1's, from its hand, turn 10 MAIN1 (seat 0's log seq 183, seat 1's seq 203). The other 12 spines have none. |
| branch logs, every fifth seat-0 log of each unit, ghosts born in the branch | 11,785 | **3**, all s12's Batroc the Leaper (seat 0's random seat). None in the other 12 units' samples. |
| s12, every branch log | 8,450 | **6**: Batroc the Leaper, card 30, in 6 branch games, each seen in both seats' logs |

Batroc's ghosts are a second abort, not J183's s09 shape:
- The random seat's own pick (`explore: random`, `cast:30`) failed its payment: "Didn't find what to pay for {1}",
  "AI failed to play Batroc the Leaper (30) [Stack]". Its two lands were tapped, no `cast` followed, and nothing put
  the card back.
- D466's `putBack` should repair a refused cast. But Batroc has **Multikicker**, and `GameActionUtil.addExtraKeywordCost`
  hands the payment a copy of the play, so the copy carries the skip mark and the original does not. D466 reads
  `refusedNow` off the original. This is follow-up 24.
- s12 had no counterspell targeting the Stack, so these ghosts failed no log.

**Against the worker logs' lines.** The night's metrics count 312 "failed to target" lines and 416 "Didn't find what
to pay for" lines. Neither is a count of ghosts:

| unit | "failed to target" | what it is | "Didn't find what to pay for" | what it is |
|---|---:|---|---:|---|
| s03 | 261 | Headliner Scarlett (13): a trigger with no target chosen (`[[]]`); its host is on the battlefield, no ghost | 0 | |
| s04 | 0 | | 381 | random-seat refusals, put back by D466; the sampled logs show no ghost |
| s09 | 51 | Knockout Maneuver (49), every time: the spine's one ghost, printed again by each worker run that replays the spine past turn 10 | 9 | Sprout Swarm 8, Atlantis Attacks 1, put back |
| s12 | 0 | | 8 | Batroc the Leaper 6, **ghosts** (above); March of the Multitudes 2, put back |
| s13 | 0 | | 18 | Fireball, put back |
| **all** | **312** | **1 ghost** (s09), counted 51 times | **416** | **6 ghosts** (s12) |

So of the night's 728 lines, 57 come from ghosts, and those 57 lines are 7 distinct ghosts (1 in a spine, 6 in s12's
branches). `[ghost]` counts something else: the target records that met a ghost, which are the ones that would fail.

**Tests.**
- **`./bridge/build.sh`** is green: the lint and its self-test, javac, and the build's self-tests. `DecisionSelfTest`
  has 227 checks, one new: `Decisions.ghostLine(49)`'s exact text.
- **`mtgtable.SelectionSelfTest`** (gate step 12l) gains a `ghosts()` section, nine checks, on the reproduction's
  position.
  - **The negative control.** Forge's candidates for Counterspell list both ghosts and the Bolt, so the fault is live
    on this engine.
  - **The checks.** The record lists `[target:<bolt>]` alone, counts `hidden == 2`, and answers the Bolt, complete.
  - **The positive control.** The Bolt, really on the stack, is still listed.
  - **The mid-cast check.** A spell mid-cast is no candidate of its own targeting.
  - **Proven both ways.** 38 checks, 0 failures. With `visible`'s Stack case put back to `return true`, the same run
    fails two: `the record lists the Bolt alone [target:11, target:12, target:13]` and `counts both ghosts hidden (0)`.
- **`node tools/decisions.mjs check`** passes.
- **J183's own log still fails.** `node tools/check-redaction.mjs --empty-hand-ok` on
  `/home/justin-a/code/lab/data/lab-j183/b-s09-pauper-2522/phaseB/frames/d15-random-o0-b101-seat0.jsonl.gz` **still
  FAILS**, with J183's message on decision 57. That is right: the log is what the old bridge wrote, and the checker
  is unchanged. The fix is for the logs the new seat writes, whose records count the ghost in `hidden`. J183's 463 are
  not re-run here. A night on this bridge with the same spine would show no `target:49` and 504 `[ghost]` lines.
