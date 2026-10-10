# Amendments M64–M66 on the real engine (D421–D423)

2026-10-10. Branch `claude/protocol-yield-chosen-players`. Forge 2.0.14 (the
pinned jar, sha256 `3c0a7c38…8e5dd9`), one machine, the bridge built from the
branch. What was run, and what came back.

## The run

```bash
./bridge/run.sh mtgtable.MtgTable --transport ws --port 8690 --seed 11 \
    --deck decks/select-probe.dck --ai-deck decks/doom-legion.dck --games 3
node tools/ws-select-probe.mjs --port 8690 --games 3 --report var/select-probe.json
```

`tools/ws-select-probe.mjs` is a scripted seat on `/ws`. It sets a stop on every
step of the opponent's turn (so its first priority there is the upkeep, and so a
yield passes non-skipped steps, where Forge pauses, long enough for the bridge's
500 ms flush to write a `state` mid-yield), then:

- at its first priority of each opponent turn sends `yieldTo {kind:
  "endStepOrOpponent"}`, and at its next priority records why it stopped;
- once a game sends the same act in the opponent's end step;
- on its own turn plays a land, then Into the Void (when the opponent has a
  creature), Careful Study, Lightning Bolt (the opponent's face once a game,
  then a creature), Gray Ogre;
- targets, discards, attacks and blocks one click per `input` frame.

It checks the shape of both new keys on **every** `input`, and the semantics
below; exit 0 means every feature was reached and no check failed.

```
select-probe: {"yieldSent":29,"yieldRunningStates":35,"yieldStopsOpponentStack":22,
  "yieldStopsAttacked":4,"yieldStopsEndStep":3,"yieldRefused":3,"boltPlayers":28,
  "creatureOnlyNoPlayers":31,"chosenTarget":37,"chosenDiscard":24,"chosenAttacks":31,
  "chosenBlocks":15,"attackDefenders":52}
select-probe OK
```

The three frame logs (`var/games/human-ws-11{,-g2,-g3}/frames.jsonl`) each pass
`node tools/check-redaction.mjs` with `M66 (playerIds) present on every input`
and `M65 (chosen) present on every input` (578 / 721 / 460 inputs carrying a
`playerIds` list, 88 / 93 / 36 a `chosen` object, the rest `null`).

## M64 — the yield

- **Every stop was one the amendment names.** Of 29 yields (all sent at the
  opponent's upkeep), 22 stopped with an item of the opponent's on the stack, 4
  in the declare-attackers step of an attack on the seat, 3 in the end step of
  the same turn; none anywhere else (the probe fails a stop it cannot explain).
- **`state.yield` while it runs.** 35 `state` frames carried `{kind:
  "endStepOrOpponent", playerId: 1, phase: "END_OF_TURN"}`; e.g. game 1: act
  c2s 35 at turn 2's upkeep, states 150 (COMBAT_BEGIN) and 155 (COMBAT_END) with
  the kind, state 156 at END_OF_TURN with `yield: null`, then the seat's
  priority prompt in the end step (input 159).
- **Refused in the end step.** Game 1 c2s 36, sent at turn 2's end step:
  `notice {level:"warn", title:"yieldTo", text:"the end step has already begun:
  pass priority instead"}` (s2c 161) and the seat's priority there unchanged.
- **The bridge's own rule, Forge's preferences aside.** With Forge's defaults,
  every early stop above was ended first by Forge's own interrupt (stderr:
  `YIELD endStepOrOpponent OVER: Forge's marker is gone (…
  GameEventSpellAbilityCast)` ×16, `… GameEventAttackersDeclared` ×10). So the
  same seed was run again with `YIELD_INTERRUPT_ON_OPPONENT_SPELL=false` and
  `YIELD_INTERRUPT_ON_ATTACKERS=false` in the run's own
  `var/forge/preferences/forge.preferences` (removed afterwards), two games:
  `select-probe OK`, and the bridge's watcher ended them itself — `ENDED: player
  1 put an item on the stack` ×12, `ENDED: player 1 attacked this seat` ×6,
  `ENDED: the end step began` ×2. Game 1 (`prefsoff-11`): state 317
  (COMBAT_END, the kind), state 318 (MAIN2, the opponent's spell on the stack,
  `yield: null`), the seat's priority at input 320.

## M65 — `chosen`

- **A block the state does not show yet.** Game 1, turn 12: state 615
  (COMBAT_DECLARE_BLOCKERS) has two attackers and `blockerIds: []`; the seat
  clicks Kang, Temporal Tyrant (69), then a Gray Ogre (28); input 625 carries
  `chosen: {cardIds: [28], blocks: [{blockerId: 28, attackerId: 69}], …}` while
  no state has the block; after OK, state 630 has `blockerIds: [28]` on Kang.
- **Targets, one of up to two.** Into the Void (game 1, turn 7): input 351
  offers `cardIds [52]` with `chosen.cardIds []`; after the click, input 353
  `chosen.cardIds [52]` (and the same in `highlighted`); after OK the frames
  its `onStop` pushes (358 on) carry `chosen: null`, `playerIds: null`.
- **A list.** Careful Study's "discard two": `chosen.cardIds [5]` after the
  first click (game 1, input 55).
- **A player target.** Lightning Bolt at the opponent: inputs 74–75 carry
  `chosen.playerIds [1]` (the input finishing: one target is all it takes),
  then `null`.
- **An attack.** Game 2, input 834: `attacks: [{attackerId: 20, defender:
  {kind: "player", id: 1}}]` after one click, the state still showing the
  creature not attacking.

## M66 — `playerIds`

- Lightning Bolt's target prompt: `playerIds [0, 1]` (game 1, input 72;
  `mode: "none"`, `cardIds []` — nothing else on the wire said a player could
  be clicked).
- Into the Void's: `[]` with a creature offered (input 351).
- The attack declaration's: `[1]`, the defending player (game 2, input 827).
- Priority, the block declaration, the mulligan: `[]`; a mana payment: `null`.
- **A quirk seen live**: `input.highlighted` is `[1]` at input 74 — the player
  Bolt targeted, in the card-id list (Forge highlights it through the same
  call) — and card 1 exists in the same game (Careful Study's discard offers
  it at input 55), so a reader of `highlighted` would outline that card.
  Unchanged (D423); read players from `playerIds` / `chosen.playerIds`.

## The frames kept

`fixtures/select-probe/m64-m66-frames.json` holds the frames cited above, cut
from these logs (`block`, `bolt`, `void`, `attack`, `yieldEndStep`,
`yieldOpponent`); `web/test/selection.test.ts` and
`tools/llm-seat/test/selection.test.mjs` read it.
