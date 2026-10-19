## D454 — The search hint's line: the sub-choices Forge's AI made inside the recommended move, recorded on one replay of it and named only through the seat's own view

*Branch `pc/hint-subchoices`. ForgeCoach's half is branch `pc/hint-line` there. D452 stays unused
(the last number of D450's block, D200) and D453 is the table-of-two hint (`pc/hint-table-of-two`,
PR #166); this is the next free number after both.* Extends **D429** (the search hint). Keeps
**D348** (what the hint knows) and hard rule 8 (hidden information) whole.

**2026-10-19**

**Context.** Justin, 2026-10-17, playing: the Search AI hint says "cast Reanimate" or "cast Sword of
Fire and Ice" and never says what to reanimate, what to sacrifice, what to target, what to equip.
The grader (D334/D336) chooses the top-level move only — `cast:<id>`, an attack, a block, a target —
and inside its playouts Forge's Default AI answers everything below it: the targets (`Grader.aim`
asks Forge's own `canPlaySa` before the playout), the cards a cost takes, X, a charm's modes, what a
resolution asks the seat to choose, the triggers it aims, and whatever it plays next. None of that
reached the answer. The target search (`targets=1`, J115/J116) stays off: the sub-choices are not
searched, only reported.

**Decision.**

1. **The line is Forge's own answers, reported as the engine's default — never graded.** The answer
   gains `line`: an ordered list of `{kind, text, ids}` steps — `target` ("Quantum Reduction → Peggy
   Carter, Secret Agent"), `x` ("X = 3"), `sacrifice` / `discard` / `exile` / `return` / `tap` (what a
   cost took), `mode` (a charm's mode, its script description), `choose` (what a resolution asked
   for), `number`, `trigger` (a trigger of the seat's that it aimed), and `then` (what Forge's AI went
   on to play before handing priority back: "then equip S.H.I.E.L.D. Spy Kit → Quake, Agent of
   S.H.I.E.L.D."), at most 8, of which at most 3 `then`. With it, `lineStop` (`passed`, `applied`,
   `turn`, `full`, `cut`). An empty list means the move asks nothing more (a pass, a creature with no
   choices); no `line` means none could be recorded or it was withheld (`lineWithheld`, item 4).
2. **One more playout of the pick, after the race, recorded** — option (1) of the brief. When the
   grading ends, the best option (or the only one, `trivial`) is played once more on **round 0's
   seed and base**, so it is the same determinization and engine stream as that option's first
   playout in the race: `SearchPolicy.playout` with `Limits.line` set seats a `RecordingController`
   (the rollout controller — forced first answer, then Forge's Default AI — that calls `super` for
   every answer and only looks at the result) and stops when the recording does: when the seat,
   after its forced answer has been played out (`RolloutForcing.applied`), answers a priority prompt
   with nothing on an empty stack; for an attack or block when that combat's damage is dealt; at the
   end of the turn; or at 16 raw steps. What it reads: after `playChosenSpellAbility` the spell's
   targets (every part of it), `getXManaCostPaid` when the cost has an X, the paid lists a cost left
   (`Sacrificed`, `Discarded`, `Exiled`, `Returned`, `Tapped`, the card itself left out), a charm's
   chosen modes; after `orderAndPlaySimultaneousSa` the seat's triggers' targets; and, only while the
   stack is resolving (never the AI's look-ahead), `chooseSingleEntityForEffect`,
   `chooseEntitiesForEffect`, `chooseCardsForEffect`, `choosePermanentsToSacrifice`,
   `chooseCardsToDiscardFrom`, `chooseSingleCardForZoneChange` and `chooseNumber`. Two folds keep it
   readable: an Aura's resolution choosing the creature it targeted is not a second step, and Forge's
   Equip (which picks its creature as it resolves) is one step, "then equip X → Y". Cost: one short
   playout (a few tens of ms; the live analysis only — `CoachGrade.liveSettings` sets
   `Grader.Settings.line`; the review and every bench never run it). Nothing changes for the search
   AI: its rollouts never set `Limits.line`, and the only change on their path is one null check per
   engine step.
3. **Named only through the seat's own view (hard rule 8).** `LineRecorder` keeps no name — a card is
   its game id and whether it is a token, a player is "you" or "the opponent", a mode its script
   description — and `HintLine.name` is the one place a line names a card: when the playout's card
   id is a rebuilt card's (`Rebuild.Base.wireOf`; the copy keeps ids and `GameCopier` syncs the id
   counter, so a card the playout makes gets a fresh one), that wire id is in the moment's state,
   and `Rebuild.knownName` gives its name — the name `Snap.card`'s three gates sent this seat.
   Anything else is "an unseen card" ("a token" for one the playout made): a hidden stub, a
   face-down card without its face, a card the playout drew or redealt (the determinizer only
   shuffles hidden cards between hand and library), an opponent card dealt from the pool model, a
   card tutored from the seat's own library. A step's `ids` are the wire ids of exactly the cards its
   text names. The mode description is the card script's own `SpellDescription` (`CARDNAME` as "it"),
   never a stack description (which lint rule `stackDescription` bans for the same reason).
4. **The helper checks every line again before it leaves** (`tools/hint-runner.mjs` `checkLine`):
   every id must be a card the moment's state (the bridge's own log, `momentOf`'s last state) shows
   this seat by name, and the text — those names taken out — must be one of the fixed shapes, whose
   only other words are "you", "the opponent", "an unseen card" and "a token" (`mode` lists no ids).
   A step that fails withholds the whole line (`lineWithheld` says why and names no card); so does a
   line for another option than the pick (`lineFor`). The hint still answers.

**Evidence.** The real engine through `createHintRunner` (`coach-grade.sh serve`), cuts of
`fixtures/games/human-auto-42.jsonl`: turn 7 MAIN2 "cast Quantum Reduction" **clear**, `line`
`[{"kind":"target","text":"Quantum Reduction → Peggy Carter, Secret Agent","ids":[5,44]}]`
(3.35 s with the engine's start); turn 7 MAIN1 "cast nothing now", `line: []`; turn 13's attack, `line:
[]`, `lineStop: "applied"`. `coach-grade.sh analyse --only cast:7` at turn 13: "then equip
S.H.I.E.L.D. Spy Kit → Quake, Agent of S.H.I.E.L.D."; `--only cast:39`: "Robotics Mastery → Quake,
Agent of S.H.I.E.L.D.", "then cast S.H.I.E.L.D. Spy Kit". Tests: `GradeSelfTest.hintLine` (the
gate, a hidden stub planted with a name, face-down without and with its face, a token, the caps) in
`bridge/build.sh`; `tools/hint-runner-selftest.mjs` (gate 12f) — every shape, two planted leaks (a
hidden name in the text; a name behind a hidden stub's id) withheld end to end with the name
nowhere in the answer, a line for another option withheld.

**Alternatives rejected.**

- **Capture during the race's own playouts of the winning option** (option 2). Every playout of
  every option would carry a recorder (the race does not know the winner until it ends), the
  rollouts would differ in their sub-choices (each round redeals the hidden cards), so the answer
  would need a vote over lines of different lengths, and the search AI's hot path would grow. One
  replay on round 0's seed is the same playout the race began with, at the cost of one playout.
- **Search the sub-choices** (`targets=1`, J115/J116): off, and not this change; the line says what
  Forge would do, not what is best.
- **Name cards through the copy's own `Card.getName()`**: the copy holds the pool model's fabricated
  opponent cards and a redealt library, so its names are guesses dressed as facts; and naming any
  card outside the seat's view would be a second path around `Snap`. The wire map is the seat's view
  itself.
- **Name a card tutored from the seat's own library** (the player knows their deck list): which card
  the redealt library offered is a guess about order, and "an unseen card" keeps the rule one line
  long. A follow-up could name it from the deck list if Justin wants it.
- **Free text from the engine** (the stack description, a prompt): it names targets, library cards
  included (lint rules `stackDescription`, `targetDescription`), and could not be checked; the line's
  shapes can.
