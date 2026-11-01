## D497 — The fork's copy gives a re-made token its original's paper card, so a copy of a token can be made on a fork (amends D479; a second reflective seam for the lint)

*Branch `pc/d497-fork-token-papercard`, on origin/main `7a984963` (#224, D496's merge). `node tools/decisions.mjs next`
gave D497. Amends **D479**'s carry pass in `LenientGameCopier` (as **D493** did), and adds a reflective WRITE of a Forge
field beside **D423**'s reflective reads, with a lint rule of its own. Touches every fork that copier makes: the atlas's
branches (**D451**), the search's rollouts (**D312**) and the coach helper's grade copies.*

**2026-11-01**

**Context.** J180 (the lab's atlas night), spine s11 (legacy, spine seed 2176, deck folder `s11-legacy-2076`): **77 of its
4,875 branch games errored**, all random-continuation branches of one game: decision d18 (turn 15, the atlas seat's
attack; 67 of 1,000) and d19 (turn 16, its blocks; 10 of 550). Option `attack:12,26` at d18 had 16 of 150 errored, over
the 10% bar, which failed the night's `atlas.problems == 0` check (`report/b-s11-legacy-2176.atlas.json`, `checks` →
`branchErrors`). 13 rows carry a message, and their worker logs a stack:

```
java.lang.NullPointerException: Cannot invoke "forge.item.IPaperCard.getRules()" because "paperCard" is null
  at forge.game.card.CardFactory.readCard(CardFactory.java:295)
  at forge.game.card.CardFactory.getCard(CardFactory.java:173)
  at forge.game.ability.effects.CopyPermanentEffect.getProtoType(CopyPermanentEffect.java:289)
  at forge.game.ability.effects.CopyPermanentEffect.resolve(CopyPermanentEffect.java:259)
  ... MagicStack.resolveStack -> PhaseHandler.mainLoopStep -> mtgtable.ai.Atlas.play(Atlas.java:820)
```

The other 64 are a bare `NullPointerException`: no message, and the worker log's "branch error, stack:" line followed by
nothing. In each of the five worker logs that met it, the messaged throws come first and the bare ones after (worker 0:
1 and 0; workers 1–4: 3 messaged each, then 10, 4, 3 and 47 bare), which is HotSpot's preallocated exception for an
implicit null check thrown hot at one compiled site (`-XX:+OmitStackTraceInFastThrow`, the default), as **D494** met with
its ArrayIndexOutOfBounds. They are taken as the same site: they are the same decisions of the same game, and nothing
else in those logs throws. Both decks of the spine hold Fable of the Mirror-Breaker; the branches' last state frames
(`phaseB/frames/d18-random-o0-b22-seat0.jsonl.gz`) show both seats with Reflection of Kiki-Jiki, its back face, beside
Goblin Shaman tokens, Satyr tokens and a Treasure. Evidence: `/home/justin-a/code/lab/data/lab-j180/b-s11-legacy-2176/`
(`phaseB/branches.jsonl`, every errored row with its seed; `phaseB/logs/worker-*.log`; `phaseB/frames/`), read only.

**The exact cause** (the pinned jar, `javap -p -c -l`; the 2.0.15 source checkout at `579d0a84c` reads the same):

1. `GameCopier.createCardCopy` re-makes a token that is not immutable (offset 14–44, source line 300) as
   `new TokenInfo(c).makeOneToken(newOwner, c.getId())`, whose `toCard(Game, int)` calls `new Card(id, game)` — the
   constructor that passes a null `IPaperCard`. A card with a paper card is rebuilt from it by `CardFactory.getCard`
   (offset 58–74). `Card.paperCard` is `private final`, written only by the constructor, and has no setter (`javap -p`).
2. A token the live game makes comes from `TokenInfo.getProtoType(script, …)` → `CardFactory.getCard(PaperToken, …)`, so
   it carries a `PaperToken` (in the reproduction: `PaperToken(Goblin Shaman Token)`). `Card.getPaperCard()` returns the
   field, else looks the card up by name and set in the variant and common card databases, which hold no token: on a copy
   it returns null for every token re-made from a token script. (A token copy of a printed card, Kiki-Jiki on Grizzly
   Bears, is found again by its name: its copy's field is null too, but `getPaperCard()` answers.)
3. Reflection of Kiki-Jiki: `AB$ CopyPermanent | Cost$ 1 T | ValidTgts$ Creature.YouCtrl+nonLegendary+Other |
   AddKeywords$ Haste | AtEOT$ Sacrifice` (`f/fable_of_the_mirror_breaker_reflection_of_kiki_jiki.txt`).
   `CopyPermanentEffect.getProtoType` (offset 108–120) calls `CardFactory.getCard(original.getPaperCard(), newOwner, id,
   game)` and only then replaces the new card's states with the original's clone states; `getCard` → `readCard` →
   `paperCard.getRules()` is the throw. So on a fork **every `CopyPermanent` whose original is a token from a token script
   throws** — not a Fable matter. Of the pool's 1,592 cards (`cubes/library/library-pool.tsv`), nine have a
   `CopyPermanent` line in their script, and seven of them can copy a token made from a token script: Esika's Chariot
   (`ValidTgts$ Permanent.token+YouCtrl`), Ocelot Pride (`Defined$ Valid Card.token+YouCtrl+ThisTurnEntered`) and
   Vitu-Ghazi Guildmage (`Populate$ True`) copy only tokens; Fable's Kiki, Fractured Identity, Springheart Nantuko and
   Vaultborn Tyrant copy a permanent that may be one. Scute Swarm copies itself, and a token copy of it is a token copy of
   a printed card, which the fork finds again by name (point 2); Dance of Many's target is `Creature.!token`.
   Only `GameCopier` and `GameState`'s `t:` board syntax build a token through `makeOneToken` (the source checkout,
   `grep`), so the live game never meets it.

**The reproduction**, a scratch program against the pinned jar in D494's way (`Bootstrap`, a `GameState`, the game pool;
under `var/d497-repro/`, not committed, because it is evidence and not a check). The board: Fable of the Mirror-Breaker
transformed, a Goblin Shaman token from its script (`GameState`'s `T:`, a `PaperToken`, as chapter I makes it), a second
one from `GameState`'s `t:` (no paper card even live), Grizzly Bears, Vitu-Ghazi Guildmage. Kiki-Jiki's ability is
resolved with `AbilityUtils.resolve` (no cost paid) on each target:

| the target | Forge's own copy (`GameCopier`) | `LenientGameCopier` on `main` | this branch | the live game |
|---|---|---|---|---|
| the Goblin Shaman token from its script | the field's NPE, `readCard(295)` | **the field's NPE**, `readCard(295)` | ok: a Goblin Shaman token, haste, 2/2, its attack trigger, `getRules()` its script's, the original's `PaperToken` | ok, the same |
| the same token, populated (Vitu-Ghazi Guildmage, the AI choosing) | the field's NPE | not run | ok: one more token | not run |
| Grizzly Bears (the control) | ok | ok | ok | ok |
| a token copy of Grizzly Bears, made live, then forked | — | ok (`getPaperCard()` finds the Bears by name; the field is null) | ok (the field now the original's Bears) | ok |
| the `t:` token (no paper card in the live game either) | — | — | — | **the same NPE live**: a bench board artefact, never a game's |

**The bare exception is the same throw.** `CopyPermanentEffect.getProtoType` called in a loop on the forked token
(100,000 calls, one JVM): the first 44,863 throws carry the message and the stack, and every one after is a bare
`NullPointerException` with neither. With `-XX:-OmitStackTraceInFastThrow`, 100,000 of 100,000 carry both. The onset is
the JIT's: in the field `readCard` is compiled hot by every fork's card building, and each worker went bare after three;
the loop, with a cold start, took 44,863 (and after 50,000 warming `readCard` calls with a paper card, 2,000 throws were
still all messaged), so the field's count of three is not reproduced, only the switch.

**Decision.**

1. **`LenientGameCopier`'s carry pass gives a re-made token its original's paper card**, first, before anything else it
   carries (so a D479 mirror copied from that token has it too): for every copied card whose original is a token that is
   not immutable (the `TokenInfo` branch of `createCardCopy`), when the copy's `Card.paperCard` is null and the
   original's is not, the copy's is set to the original's object (a `PaperToken` is immutable data; the live game's own
   Kiki copy shares its original's the same way). Field to field, not through `getPaperCard()`: its fallback would cost
   up to four card-database lookups for every token of every fork, and would let a script token named like a printed card
   (Llanowar Mentor's Llanowar Elves) answer on the copy with the printed card where the live token answers with its
   script. A token copy of a printed card (Kiki-Jiki on Grizzly Bears), which Forge already found again by name, now
   carries its original's own paper card too; a token the live game holds with no paper card stays without one.
   `paperCardsCarried()` counts the writes; `paperCardsLost()` names a token the copy could not be given one (the field
   missing on another engine, or the write refused) — read by the bench, not carried in an atlas row, so the worker
   log is where it shows: one stderr line at class load when the field is missing, and one, with no card name, at the
   first refused write (a later JDK that refuses final-field writes); `paperCardWritable()` says whether the
   field was found. The pass runs where D479's runs, on the thread that made the copy; no thread changes.
2. **It is a reflective write of a Forge field, the second reflective seam the lint allows** (D423's reads were the
   first). `Card.paperCard` is `private final`: `Card.class.getDeclaredField("paperCard")`, its type checked to be
   `IPaperCard`, `setAccessible(true)`, then `Field.get` on both cards and `Field.set` on the copy — looked up once, in a static initializer, and null (with one
   line on stderr) when the engine has no such field. On OpenJDK 21 a non-static final field of a class in the unnamed
   module may be set this way once `setAccessible` succeeds, and HotSpot does not constant-fold a non-static final field
   of an ordinary class, so the write is seen. Every reader of the field is in `Card` itself: the constructor (the marked
   colours and the foil flag, which a `PaperToken` leaves at their defaults) and `getPaperCard()`; everything else reads
   through `getPaperCard()` — `getRules()`, `toString()` without a view, `CardCopyService.copyCard`, `CardFactory` — and
   now reads on the copy what it reads on the original. `Card.cp2card` is the UI's static cache, keyed by a `PaperCard`
   and read only by `getCardForUi` and `updateCard`, which a fork never calls; image keys and set codes are the card state's, set by
   `TokenInfo`, and the write does not touch them.
3. **The lint (section 8 of `tools/lint-bridge.sh`).** Both rules match the identifier, not the call text: a space
   before the bracket, a call split across lines and a method reference (`Class::getDeclaredField`) all name it (the
   first cut matched `getDeclaredField(` and the PR's review beat it all three ways). `forge-field-read` becomes a check
   of its own: `getDeclaredField` is allowed in `InputPeek.java` (D423) and in `LenientGameCopier.java`, which it leaves
   to the new **`forge-field-write`**: exactly one `getDeclaredField` in that file (counted by occurrence, not by line),
   naming `"paperCard"`, on a line tagged `// ALLOW paperCard write: D497` — a budget of one, as rules 4 and 4b are.
   `forge-field-read` also rejects the identifiers `getDeclaredFields`, `privateLookupIn` and `Unsafe` in every file
   (none is used; a class name split as `"sun.misc." + "Unsafe"` still names it), and a `getMethod("getDeclaredField")`
   names the identifier in its literal and fails too. **What stays open**: a name assembled at run time
   (`"getDeclared" + "Field"` through `getMethod`, or a class name built the same way) names nothing a grep can see —
   D423's hole, unchanged by this, written down as the cube lab's follow-up 13 with two more of the same kind: a line
   that opens with a comment marker is unseen by every rule (`strip_comments`), and `getDeclaredMethod` /
   `getDeclaredConstructor` on a Forge class have no budget (`tools/cubelab/CubeLab.java:854-855` uses them). What the
   lint budgets is the lookup: that InputPeek's fields are only read is review, not grep, as it was under D423.
   `tools/lint-bridge-selftest.sh` has sixteen new cases: `forge-field-read` fires on the tagged line in another file
   and in `tools/probe/LenientGameCopier.java` (the exemption is a path), `getDeclaredFields()`, `privateLookupIn`, a
   spaced call, a call split across lines, `Class::getDeclaredField`, `Class::getDeclaredFields`,
   `getMethod("getDeclaredField")` and `Class.forName("sun.misc." + "Unsafe")`; `forge-field-write` fires on a second
   tagged line, a second lookup on the tagged line itself, a second spaced lookup, the line naming another field, the
   tag taken off and the line taken out — each its own rule and no other. CLAUDE.md's hard rule 10 names the rule
   beside D423's.
4. **The lab's worker JVM keeps a hot exception's stack.** `tools/cubelab/engine.ts`'s `javaArgs`, the one argv every
   lab worker starts with (the atlas's, `play`'s and the facts call), adds `-XX:-OmitStackTraceInFastThrow` after hard
   rule 6's flags. Hard rule 6's line is the bridge's own JVM and is unchanged; the worker's carries this one diagnostic
   flag more, so that the next crash a worker meets thousands of times names its site in every row, as 64 of J180's 77
   did not. It changes no result: it only stops HotSpot from swapping an implicit exception for its preallocated one,
   and the atlas self-test's summary is the same with it (below). Its one cost is a stack trace built per throw, which
   only a fault pays. "No result changes" is true of this flag alone, not of point 1 (*Comparability*). `web/test/cubelab-worker-heap.test.ts` holds the argv,
   the flag once and before the class path.

**Rejected.**

- **Listing the cards on `tools/cubelab/engine-unplayable.json` (D492's rule).** The mechanic's code path is
  `CopyPermanentEffect` on a token, so the rule would list the seven pool cards above — Fable of the Mirror-Breaker,
  Esika's Chariot, Fractured Identity, Ocelot Pride, Springheart Nantuko, Vaultborn Tyrant and Vitu-Ghazi Guildmage —
  and redraw every deck that holds one, for a fault in our fork and not in the game. D492 and D494 listed because no
  repair was reachable; here one is.
- **Re-making the token through `CardFactory.getCard(paperToken, …)` and swapping it into the copy.**
  `GameCopier.createCardCopy` and `addCard` are private and `copyGameState` wires every reference (attachments, combat,
  remembered objects, counters, the zone's list) to the card `makeOneToken` returned before the carry pass can run;
  swapping the object afterwards means re-wiring all of them, which is a second copier to keep against the pinned jar
  (D494's reason, the same methods).
- **`Card.getPaperCard()` finding the token by name.** Its fallback reads the common and variant card databases only;
  the token database (`StaticData.getAllTokens()`) is keyed by script name and edition, which the copy's card does not
  carry, and nothing of ours runs inside that method.
- **A `MethodHandle` or `VarHandle` instead of `Field.set`.** `findVarHandle` on a final field gives a read-only handle,
  and `unreflectSetter` needs the same `Field` with `setAccessible(true)`: the same seam, spelled longer.
- **Catching the throw in the branch.** It leaves the branch errored, which is what the night counted.

**Tests.**

- **The real engine**: `tools/ai-bench.sh --selftest`'s new `fork-token-copy` scenario (`forkTokenCopyScenarios`, 9
  checks; the self-test 288 checks, 0 failures, ~15 s), with `tools/ai-bench/decks/fork-token-copy.dck` (4 Fable of the
  Mirror-Breaker, 36 Mountain) as both seats' deck in the branch's recording. On the board above (Kiki-Jiki and the
  token from its script only, turn 15, the atlas seat active): the live token's paper card is a `PaperToken`; Forge's own
  copy re-makes it with none and Kiki-Jiki's copy of it throws (the control); `LenientGameCopier`'s copy has the live
  token's paper card, one carried, none lost; then the field's production path, an atlas branch (`Atlas.play`, the forge
  continuation, the lab header's fields) forcing Kiki-Jiki's ability on the token, recorded: it plays (28 steps, no
  error), its log shows a new Goblin Shaman token with `HASTE` and a `sacrificed` event for it at the end step, and
  `tools/check-redaction.mjs --empty-hand-ok` passes both seats' logs; last, the live game's Kiki copy, and the copy's
  equals it (token, haste, 2/2, its trigger, its rules, its paper card). **On `main`'s copier** (its
  `LenientGameCopier`, lint and lint self-test checked out, the scenario's three calls to the new accessors stubbed):
  6 of the 9 fail — the copy's paper card is null, the branch errors with the field's NPE at 0 steps, its logs have no
  state frame (the copy and the two redaction checks fail), and the copy's Kiki throws.
- **The lint**: `tools/lint-bridge-selftest.sh`, 33 rules, 79 firing cases (63 before), each firing its own rule and no
  other.
- **The worker**: `tools/cubelab.sh atlas-selftest --jobs 1` passes, before and after the review's field-to-field change, with the flag in its workers' argv (read from the
  running worker's command line: `… -Dsentry.uncaught.handler.enabled=false -XX:-OmitStackTraceInFastThrow …
  mtgtable.cubelab.CubeLab`), and its summary is D493's, number for number (16 forks, 8 no-leak checks, 38 frame logs,
  558 rows).

**What it does not do.** It does not re-make a token any better in any other way: D494's planeswalker token with a
keyword and its Saga sibling (follow-up 8) die inside `makeOneToken`, before the carry pass, and are unchanged. A fork's
token now answers `getRules()` with its script's rules where it answered null, as the live token does; Forge's AI reads
those (26 `getRules()` call sites in the 2.0.15 source's `forge-ai`, the AI hints among them), so a branch's play after
a token appears may differ from the same seed's play before this change — toward the live game's. The atlas self-test's
numbers did not move.

**Comparability.** Atlas labels and reads, and search results, from before and after D497 are **not pooled**; split
them by git sha (`docs/guides/ai-ladder.md`'s *A code change is not a config change*), as D479's and D493's are. It is
a new population in two ways. Branches that used to error now finish: J180's s11 lost 77 branches, and every board
with a token-copying permanent beside a script token was exposed. And every forked token from a token script now
answers `getRules()` with its script's rules where it answered null, which Forge's AI reads —
`ComputerUtilCard`'s `getRules().getTokens()` and its `isRemAIDeck` guard (which `CopyPermanentAi`'s target filter
uses), `AiDeckStatistics`, `SetStateAi` — so a branch's play after any such token appears may change, toward the live
game's. The atlas self-test's numbers did not move, which says the self-test's boards met none of it, not that the
change is neutral. Only point 4's flag changes no result. The next lab night (J181) opens the new population.

**Not replayed.** The atlas has no command that re-branches one decision of a spine (D493's note), and s11's decks are
the lab's; the bench scenario is the production path on the same board shape. The first atlas night on this bridge
should branch s11-like positions cleanly, and its worker logs should carry no bare exception (PLAN.md, the cube lab's
follow-up 12).
