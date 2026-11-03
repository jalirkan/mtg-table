## D511 — An atlas unit's replay plays the baseline's record path, so it is the baseline's game (amends D451's replay; the seat, its listings and the wire are unchanged)

*Branch `pc/d511-replay-divergence`, off main `43043fe5` (D509's merge). D511 was reserved for this lane (D510 is a
parallel lane's). Amends **D451**'s phase B: "a branch unit plays the same game again from the same seed". The code
change is one class in `tools/cubelab/CubeLab.java`, a frozen path under **D509**; the argument that it changes no
label J186 produced is below, with its measurement.*

**2026-11-03**

**Context.** Lab night J186 (2026-11-03, mtg-table at `e557dedf`, population `random-<band>-d508`, its first night)
aborted on spine `b-s13-pauper-2552` (the census draw `pauper-2452`, seed 2552). Its baseline listed 62 decisions of
seat A (35 turns, A won); the units at d2, d13 and d17 played; every unit at d23, d28, d33, d40, d49 and d55 failed
both attempts with the same message, e.g.

    the replay diverged at decision 23: the baseline listed [pass, cast:24, cast:5, cast:21],
    the replay [block:3>60,40>60, block:none, block:40>60, block:3>60, block:3>60,34>60,40>60, block:3>60,35>60,40>60]

29 unit errors tripped the night's abort. The check is `Atlas.Hook.decision` (`bridge/src/mtgtable/ai/Atlas.java:436`):
a unit's `expect` is the baseline's token list at the branched decision. Evidence, read only:
`/home/justin-a/code/lab/data/lab-j186/b-s13-pauper-2552/` (`plan.json`, `phaseB/baseline.json`, `units.jsonl`,
`branches.jsonl`, `rows/`); the two decks are committed as `fixtures/cubelab/atlas-replay/pauper-2452-{A,B}.dck`, byte for
byte the night's (sha256 `e13a7223…` and `67d193a8…`, as `schedule.jsonl` records them).

**How a unit reaches decision d.** It re-decides. `atlas.ts`'s `unitJob` sends the baseline's match again (same decks,
seed, Default profiles, `cands`) with `atlas.decision = d`; `CubeLab.play` plays it with Forge's AI on both seats and the
observe hook listing seat A's decisions, and at index d compares the listing with `expect`. Nothing feeds the baseline's
answers in. So the replay is right only if Forge plays the same game twice — and it does, for the same code path: the lab's
baseline and this lane's rerun of it are the same 62 decisions, tokens and identities alike, and both J186 attempts of
each unit listed the same replay.

**The cause: the baseline and the replay are not the same code path, and the difference moves Forge's AI memory.**

1. **The baseline is recorded; the replay is not.** `baselineJob` (`tools/cubelab/atlas.ts:246-255`) carries `rows`,
   `ledger: true` and a `record` block; `unitJob` carries none of them, and `CubeLab.play` attaches no recorder to it
   (`CubeLab.java:505-506`, `rec` is null). Bisected on the s13 pair (seed 2552, one worker, listing only): `record`
   alone gives the baseline's game (A, 35 turns, 62 decisions); `rows` alone, `ledger` alone and none of them give
   another (a draw at the turn cap, 41 turns, 70 decisions). With `MTGTABLE_DECISIONS=off` the recorded game is the
   unrecorded one. So the frames move nothing; the **decision records** (D347) do.
2. **A recorded seat builds a decision record after every answer.** `SeatRecorder.attach` hands each seat's
   `PolicyControllerAi` its recorder as a `DecisionSink` (`bridge/src/mtgtable/SeatRecorder.java:210-216`), and with a
   sink set `chooseSpellAbilityToPlay` calls `Decisions.priority(player)` (`PolicyControllerAi.java:261`), which asks
   Forge of every play whether it can be paid for: `Decisions.playable` → `ComputerUtilCost.canPayCost`
   (`Decisions.java:381`).
3. **Forge's payment check writes the seat's `AiCardMemory`.** `ComputerUtilMana.isManaSourceReserved` (2.0.14, javap
   `-c`: bytecode 79, 89, 96 and 168) clears `HELD_MANA_SOURCES_FOR_DECLBLK` and `…_FOR_ENEMY_DECLBLK` (and
   `CHOSEN_FOG_EFFECT`) at declare blockers and cleanup, and `HELD_MANA_SOURCES_FOR_MAIN2` in the second main phase once
   its `MyRandom.percentTrue` passes; the payment keeps `PAYS_TAP_COST`. `Decisions.quiet` (`Decisions.java:264-272`)
   puts `MyRandom` back after a record; it does not put the memory back. Measured, with `quiet` instrumented to
   fingerprint every player's memory sets before and after (a throwaway patch, not committed): `Decisions.priority`
   changed seat A's `PAYS_TAP_COST` from turn 5 on, and at turn 8 `COMBAT_DECLARE_BLOCKERS` cleared seat B's
   `HELD_MANA_SOURCES_FOR_DECLBLK` (card 69), which the unrecorded game keeps.
4. **Then the random stream parts.** With `MyRandom` traced (every draw, its thread and its caller; another throwaway
   patch), the recorded game makes 4,151 draws and the unrecorded one 5,588. The first 297 are the same; draw 298, at
   turn 8 MAIN2 on Forge's `Game AI Eval` thread, is `ComputerUtilMana.isManaSourceReserved` → `MyRandom.percentTrue`
   in the recorded game only — its seat's held source was cleared by the record at declare blockers, so the check runs
   on to the draw, where the unrecorded game's returns early. From there the two streams are offset.
5. **The visible game parts at turn 14**, the first turn whose end differs: seat B's Deceptive Landscape fetches Swamp
   46 in the recorded game and Swamp 45 in the other (`ChangeZoneAi.chooseCardToHiddenOriginChangeZone` shuffles the
   candidates with `MyRandom`, then B's library is shuffled). At turn 16 seat B attacks with Gurmag Angler in the
   unrecorded game only, so seat A gets a block decision at index 23 the baseline never had: J186's message. The
   listings agree through d22 (Dog Walker's two `cast:35` at d20 and `activate:35` at d21 included).

**Not the cause.** Forge's nondeterminism: the baseline reruns exactly, the replay reran exactly twice, and with
`-XX:hashCode=2` (every identity hash 1, D121's mechanism ruled out) both games are what they were. The duplicate
token at d20 (`cast:35` twice: Dog Walker cast face up and face down for its disguise cost): a unit never feeds tokens,
only compares them, the two listings carry the same pair at d20, and D483's identities already tell them apart; a
branch forces its option by the candidate object, not by its token.

**Why only now.** Every atlas baseline is recorded and every replay is not, so every spine replays a slightly different
game. It surfaces only where the records' memory writes change one of Forge's draws or reservations before a picked
decision, which needs held mana for combat tricks (`HELD_MANA_SOURCES_FOR_DECLBLK`: Giant Growth in s13's B, Fog in
its A) and a draw that lands differently. J176–J185 never showed it; on J186 only s13 did. A unit can also pass the
check from a game that has parted invisibly; on J186 none did (below).

**Decision.**

1. **A unit's replay carries the baseline's record path.** `CubeLab.play` passes `replay` (an atlas block with
   `decision >= 0` and no `record`) to `playGame`, which hands every seat of ours a `CubeLab.ReplaySink`, where a
   recorded game's seats get their `SeatRecorder`. The sink is a `DecisionSink` that writes nothing: `mark` answers
   `{-1, -1}` (read only by the record's own fields), `write` counts, the rest are no-ops. The controller builds every
   record the baseline built, by the same calls in the same order, so the memory writes are the baseline's. The
   recorder's frames are left out, because they move nothing (the bisection above). `MTGTABLE_DECISIONS=off` turns the
   sink off too, as it turns the recorders' sinks off.
2. **Measured equal.** With the sink, the s13 unit replay at d23 (no branches, played to the end) lists the baseline's 62
   decisions, tokens, identities and turns, and its `MyRandom` trace is the recorded game's draw for draw (4,151
   draws, the same thread and caller each; only `CubeLab`'s own line numbers moved). With one branch of each option,
   d23 replays and plays all four options; `tools/cubelab.sh atlas` on the pair (`--decisions 1 --min-options 3`, which
   picks d30, turn 19) failed both attempts before and plays after.
3. **The self-test.** `atlas-selftest` gains a replay leg (`atlasSelftestReplay`, `tools/cubelab/atlas.ts`): phase B of
   the committed s13 pair at seed 2552, one decision with three or more options (d30), one random branch of each option.
   It requires the decision to lie past turn 14 (`SELFTEST_REPLAY_SPLIT_TURN`, so the leg proves something), the unit's
   replay to be the baseline's (no "the replay diverged"), every option's branch played, and the atlas's checks clean.
   Before D511 the unit fails twice (the same command on `main`'s classes: d30 "the replay diverged" both attempts); with
   it the leg passes, and `atlas-selftest` is OK.
4. **What it does not change.** The seat: its search, its gate, its records, the copier, the determinizer — not a line
   under `bridge/src` changes. The baseline: it is the recorded game, as before. The branches: each is a copy with its
   own controllers (fresh AI memory: `Atlas.play` hands every seat of the copy a new controller), its own recorders, and
   `MyRandom` reseeded per branch; its redeal is canonical (`Determinizer.redealHidden` sorts the hidden cards before it
   shuffles). So a branch is a function of the replay's position at d, and D511 changes a branch only where the old
   replay reached d in a position other than the baseline's. The wire, the tokens and the checker: unchanged, no
   protocol amendment. `fixtures/cubelab/seat-identity.json`: unchanged — its four games are no atlas unit, and
   `ReplaySink` is attached only to one; `tools/cubelab.sh seat-identity` reports all four games the golden's.

**D509: the argument that no J186 label changes.** D509 freezes `tools/cubelab/CubeLab.java` because it builds the
seats and the units. D511 changes what a unit's replay is and nothing the seat does; a label changes only where a
succeeded unit's old replay was not the baseline at its decision. Measured on J186 itself: every decision of every
spine that has random branch rows (156 decisions over the 13 spines, s13's d2, d13 and d17 among them) was replayed with D511's classes and its branch 0 of every option played under the random continuation with
the night's own unit settings (`cands` 8, `turnCap` 40, `branchTimeoutSec` 120, rows and frames recorded, one leak
check); each branch's result, turns, steps, error and cap were compared with the night's `branches.jsonl` row, and
its decision rows (both seats, every field but the wall time `ms`) with the night's `rows/`. **All 618 branches of
the 156 decisions have the night's result, turns, steps, error and cap; 577 of the 594 whose rows were compared have
the night's rows field for field.** The other 17 are s04's (powered) d37, d41 and d42, and differ only in the ids of
objects created during the branch (`attack:189` for the night's `attack:191`; one candidate vector besides), which is
not D511's doing: the classes of `main`, rerun on those three decisions in a fresh worker, differ from the night on 15
of their 19 branches' rows the same way, and D511's, in another fresh worker, on 8 — a branch copy starts from its
game's card-id counter (`Game.cardIdCounter`, copied), and in that spine it is not the same from one run to the next
(follow-up 32). The units
that change are J186's s13 units from d23 on, which were unit errors and produced no rows and no labels. So D511 adds
labels where there were errors and changes none, and J186's population `random-<band>-d508` is unchanged by it.

**Rejected.**

- *Put the memory back after every record* (`Decisions.quiet` snapshotting each player's `AiCardMemory`). It would make
  a recorded game the unrecorded one, the cleaner end state; but the records also run in every branch (each branch is
  recorded), and `quiet` is also the observe search's and the random seat's (`PolicyControllerAi.java:444`,
  `Explorer.java`), so it would change what branches play: a seat change, and a new population (D489, D509). It is
  follow-up 32, for the queue.
- *Record the replay* (a `record` block in `unitJob` into a scratch folder). The same game, but it writes two gzipped
  frame logs per unit for nothing; the sink is the part that matters, measured.
- *Feed the baseline's answers to the replay.* The baseline lists tokens, not Forge's answers, and a token is not an
  answer (d20's two `cast:35`); it would also make the replay a different game from the one the baseline seats played.
- *Retry a diverged unit with the sink, keep the old replay first.* Never changes a succeeded unit by construction, but
  keeps two replays and a known-unfaithful one first; J186's measurement makes the guarantee without it.
- *List the card on `engine-unplayable.json`.* No card is at fault, and Forge is deterministic here.
