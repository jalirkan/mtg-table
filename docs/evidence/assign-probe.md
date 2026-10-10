# Amendment M67 on the real engine: cheating `assign_damage` (D424)

2026-10-10. Branch `claude/assign-damage-gate`. Forge 2.0.14 (the pinned jar,
sha256 `3c0a7c38…8e5dd9`, as the recording's session header names it), the
bridge built from the branch (`bridge/build.sh` green: lint 32 rules, its
self-test 63 cases, `AskSelfTest` 150 checks, `DamageRule`'s cases among them).

## The run

```bash
./bridge/run.sh mtgtable.MtgTable --transport ws --port 8760 --seed 5 \
    --deck decks/assign-probe.dck --ai-deck decks/blockers-probe.dck --games 4
node tools/ws-assign-probe.mjs --port 8760 --games 4 --report var/assign-probe.json
```

`tools/ws-assign-probe.mjs` is a scripted seat on `/ws`. Its deck is Prized
Unicorn (a 2/2 with no trample that every creature able to block must block)
and Rancor (+2/+0 and trample), cast on one Unicorn only; the AI's is Razorgrass
Screen (a 2/1 wall that cannot attack and must block). The seat attacks with one
creature a combat into two or more untapped walls, so every combat damage step
is an `assign_damage` ask with several blockers, and it answers:

- a **non-trampler** (`defenderAllowed: false`): first `{"0": total}` (the bug of
  2026-10-10), then `{"1": total - 1}` (short of the total), then lethal to each
  blocker in order with the rest on the last;
- a **trampler** (`defenderAllowed: true`): first `{"0": total}` (the player
  before any blocker has lethal), then lethal to each blocker with the excess on
  the player.

It checks every `assign_damage` ask's shape (`defenderAllowed` boolean and in
agreement with the attacker's wire `keywords`, `reason` null or a string,
an integer `lethal` on every card target), that each answer expected to be
refused comes back as the same attacker's question under a new `askId` with a
`reason` naming the rule, that no damage is dealt by an attacker whose last
answer was illegal, and that the `damage` events after a legal answer are
exactly that answer.

```
assign-probe: {"defenderRefused":4,"totalRefused":4,"legalApplied":5,"trampleShortRefused":2,"trampleExcessApplied":1,"asks":16}
assign-probe OK
```

The frame log `var/games/human-ws-5/frames.jsonl` passes
`node tools/check-redaction.mjs` ("assign_damage answers refused and re-asked=8
(M67)"); the bridge's stderr has ten `ASSIGN_DAMAGE REFUSED (D424)` lines (the
eight above and the two trample refusals).

## What came back (frame seqs in `human-ws-5`)

**A blocked non-trampler, turn 16** — Prized Unicorn (card 3), total 2, blocked
by two Razorgrass Screens (lethal 1 each):

| frame | what |
|---|---|
| s2c 1018 | `ask a3` `assign_damage`, `defenderAllowed: false`, `reason: null` |
| c2s 158 | answer `{"0": 2}` — all of it to Forge AI |
| s2c 1020 | `ask a4`, the same question, `reason`: "Without trample, a blocked creature can't assign combat damage to Forge AI. Assign all 2 to the blockers." |
| c2s 159 | answer `{"1": 1}` |
| s2c 1024 | `ask a5`, `reason`: "Assign exactly 2 damage (this answer assigns 1)." |
| c2s 160 | answer `{"1": 1, "2": 1}` |
| s2c 1026 | `damage` 1 to card 80 and 1 to card 70 from card 3 — and none to the player |

The same three steps were refused and applied on turns 32, 38 and 42 (asks
1689/1691/1695, 1925/1927/1931, 2104/2106/2110).

**A trampler, turn 22** — the Rancor host (card 2), total 6, blocked by two
Screens:

| frame | what |
|---|---|
| s2c 1247 | `ask a6`, `defenderAllowed: true`, `reason: null` |
| c2s 191 | answer `{"0": 6}` |
| s2c 1249 | `ask a7`, `reason`: "Each blocker needs lethal damage before Forge AI gets any: Razorgrass Screen needs 1." |
| c2s 192 | answer `{"0": 4, "1": 1, "2": 1}` |
| s2c 1255 | `damage` 4 to player 1 (combat), 1 to card 71, 1 to card 73 |

Turn 10's trampler (card 5, total 4, four blockers) was refused at 691 → 693 and
applied as 1 to each blocker (1-1-1-1, no excess) at 697.

`fixtures/assign-probe/m67-frames.json` holds the two sequences above, cut from
this log; `web/test/assign-damage.test.ts` and
`tools/llm-seat/test/assign-damage.test.mjs` read them.

## Seen along the way

- A creature's combat damage event says `combat: false`: Forge 2.0.14's
  `GameEventCardDamaged` carries a `DamageType` and no combat flag, and `Snap`
  writes `combat` from the type's name (`Normal` here). A player's damage event
  has the flag. Not changed here; the probe counts every `damage` event from the
  attacker.
- Before M67, a `null` answer to a non-skippable ask went back to Forge as null,
  and `Combat.assignAttackersDamage` re-queues the attacker on a null map — the
  same question again, forever (the LLM seat measured 9,400 in a row,
  s20-plain-p10). M67 answers that null with Forge's Auto.
