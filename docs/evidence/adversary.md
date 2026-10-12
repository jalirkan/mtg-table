# The adversarial seat on the real engine (D428)

*2026-10-12, branch `claude/rules-integrity-2`.* Forge 2.0.14 (the pinned jar,
sha256 `3c0a7c38…8e5dd9`). The seat is `tools/adversary/adversary.mjs`
(`ws-auto-play.mjs --probe --adversary`): every `ask` answered first with up to six
of the illegal answers `tools/adversary/answers.mjs` builds from the ask's own wire
fields — each must come back as the same question with a `reason` (M67, M68) —
and then with the policy's legal answer, which must be taken; once a turn per
input class, before the policy acts, an act the engine must refuse, which must
draw the bridge's refusal notice. Anything else is a **leak**.

```bash
./bridge/run.sh mtgtable.MtgTable --transport ws --port 8783 --seed 7 --deck decks/amount-probe.dck &
node tools/adversary/adversary.mjs --port 8783 --report var/adversary.json --require-kinds assign_amount,confirm
```

## The games

| game | decks (seat; AI) | seed | games | where |
|---|---|---|---|---|
| amount-7 | `amount-probe.dck`, a mirror | 7 | 1 | gate step 10j |
| search-7 | `search-probe.dck`, a mirror | 7 | 1 | gate step 10j |
| number-7 | `number-probe.dck`, a mirror | 7 | 1 | gate step 10j |
| cost-3 | `cost-probe.dck` vs `blockers-probe.dck` | 3 | 1 | gate step 10k (after `ws-cost-probe.mjs`, `docs/evidence/cost-probe.md`) |
| sideboard-7 | `sideboard-probe.dck`, a mirror | 7 | 2 (a match: game 2 is sideboarded) | by hand |
| assign-5 | `assign-probe.dck` vs `blockers-probe.dck` | 5 | 2 | by hand |
| auto-42 | `pacho-shield.dck`, a mirror (MtgTable's default) | 42 | 1 | by hand |

The four gate games ran inside `GATE_ONLY="10j-adversary 10k-costs 12-selftest"
./tools/check-all.sh` (green: 10j 336.7 s, 10k 262.0 s at a load average of 11–15,
two jobs at a time beside the web suite); every server log then passed
`check-redaction.mjs`, which judges each recorded answer by the same rules and
fails a log whose illegal answer was not refused.

## Every ask kind Forge dispatched: refused, then taken

| ask kind | games | asked | illegal answers sent | refused, re-asked with a reason | leaks | legal answers taken | legal refused | illegal answers tried (count refused) |
|---|---|---|---|---|---|---|---|---|
| `ability_menu` | cost-3, auto-42 | 42 | 168 | 168 | **0** | 42 of 42 | 0 | an id not offered (42); a negative id (42); the id as a string (42); a list (42) |
| `assign_amount` | amount-7 | 20 | 120 | 120 | **0** | 20 of 20 | 0 | one more than the total (17); one less than the total (17); everything on one target (17); a target not offered (17); a negative amount (17); a fraction (18); a list, not a map (17) |
| `assign_damage` | cost-3, assign-5 | 3 | 15 | 15 | **0** | 3 of 3 | 0 | all of it on the player without trample (3); one short of the total (3); one over the total (3); a target not offered (3); a list, not a map (3) |
| `choose_entities` | search-7, cost-3 | 22 | 128 | 128 | **0** | 22 of 22 | 0 | too many picks (18); a duplicate pick (22); an id not offered (22); a negative id (22); a fraction (22); a string (22) |
| `choose_list` | search-7, number-7, cost-3, auto-42 | 34 | 158 | 158 | **0** | 34 of 34 | 0 | a reveal answered with a non-list (8); too many picks (19); a duplicate pick (26); an id not offered (26); a negative id (26); a fraction (25); a string (25); too few picks (3) |
| `confirm` | amount-7, cost-3 | 11 | 22 | 22 | **0** | 11 of 11 | 0 | a number (11); a string (11) |
| `order` | auto-42 | 1 | 5 | 5 | **0** | 1 of 1 | 0 | too few in the list (1); an item twice (1); an id not offered (1); remember not a boolean (1); a bare list (1) |
| `sideboard` | sideboard-7 | 1 | 6 | 6 | **0** | 1 of 1 | 0 | a card twice (a copy the pool lacks) (1); every slot the same card (1); a card not in the pool (1); a main deck one too small (1); a sideboard one too big (1); a string (1) |
| `text` | number-7 | 16 | 64 | 64 | **0** | 16 of 16 | 0 | one over the maximum (16); a negative number (16); not a number (16); a number, not a string (16) |

| input class | games | illegal acts | refused by the engine | leaks | acts tried (count refused) |
|---|---|---|---|---|---|
| declare attackers | amount-7, search-7, number-7, cost-3, sideboard-7, assign-5 | 109 | 109 | **0** | an opponent's permanent as an attacker (109) |
| declare blockers | sideboard-7, assign-5 | 9 | 9 | **0** | an illegal blocker (tapped) (7); an illegal blocker (a land) (2) |
| priority ability | amount-7, search-7, number-7, cost-3, sideboard-7, assign-5, auto-42 | 191 | 191 | **0** | an ability that was never offered (191) |
| priority player | amount-7, search-7, number-7, cost-3, sideboard-7, assign-5, auto-42 | 191 | 191 | **0** | a player that does not exist (191) |
| priority | amount-7, search-7, number-7, cost-3, sideboard-7, assign-5, auto-42 | 131 | 131 | **0** | a card from the wrong zone (the opponent's hidden hand) (131) |
| selection | assign-5 | 15 | 15 | **0** | a card the selection does not offer (15) |

leaks 0, legal refused 0, unsettled at game end 0


**No ask kind let an illegal answer through, and no legal answer was refused.**
`options` (no call site in Forge 2.0.14, M22) and `manipulate_list` (unreachable
while D13 holds, M23) never reach a seat; their rules are held by `AskSelfTest`
(`AnswerRule.index`, `AnswerRule.reorder`) and the adversary's selftest, which
also builds and checks illegal answers for every one of the 159 asks recorded in
`fixtures/` (all eleven kinds).

## The saved fixture

`fixtures/adversary/m68-frames.json` is one refusal chain per kind, cut from these
games' frame logs (the four gate games' bridge logs, the sideboard and order
games' client logs): the first asking (`reason: null`), each illegal answer and
the re-ask that refused it with its reason, and the legal answer the engine took
— `ability_menu`, `assign_amount`, `assign_damage`, `choose_entities`,
`choose_list`, `confirm`, `order`, `sideboard`, `text`. `tools/adversary/selftest.mjs`
holds the rules to it (every answer the bridge refused, the rules refuse; every
one it took, they take) and `web/test/answer-reason.test.ts` reads its reasons.

## What it found on the way

- **Before M68 (this branch's D426) each of these was applied** — read off
  Forge's source and the bridge at `1f3cb22a`, `docs/rules-audit.md`: an
  over-allocated divided spell, a duplicate or out-of-range pick, a sideboard of
  forty copies of one card, a `[]` to a mandatory `choose_list` (an exception on
  the game thread), any malformed answer (silently Forge's default).
- **The log checker called a refused answer the client's mistake.**
  `check-redaction.mjs`'s A12 shape check flagged an out-of-range `assign_damage`
  key (`{"5":2}` on a five-target ask) even though the bridge had refused it and
  asked again; it now judges such an answer as one that must be refused, and fails
  the log only if it was not.
- **The seat's own policy never clicked a permanent**, so no `ability_menu`
  reached it on the cost deck; the adversary's policy now clicks each permanent
  `state.activatable` lists, once a turn.
