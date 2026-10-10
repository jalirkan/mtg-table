# Rules-integrity plan (PC session, 2026-10-10 — written after a blocked non-trampler dealt its damage to the player through ForgeCoach's dialog)

## The root cause, stated once
Forge's engine trusts its own GUI. For some asks the RULE lives in Forge's desktop dialog (e.g.
`VAssignCombatDamage`: lethal to blockers in order, excess to the player only with trample), not in the game
engine. mtg-table replaced those dialogs with the wire + a browser client and carried the ask but not the rule;
the engine applied what the client sent. "No rules logic in the client" (README, hard rule) is right; its
missing half is: **the bridge is the rules gate, built from Forge's own rule code, and proven by trying to
cheat it.** Evidence: turn 23, 2026-10-10 — "Servo Token and Spirited Companion blocked Skyclave Apparition …
Skyclave Apparition dealt 2 combat damage to Forge AI" (no trample), Forge AI 6 → 1.

## Part 1 — the audit (reading; the PC does it when the allowance is back)
For every ask kind in `docs/protocol.md` §5 and every input mode in §4, record WHERE Forge enforces the rule
and whether mtg-table's bridge re-checks the client's answer before applying it:

| ask / input | Forge's own check | bridge re-check today | verdict |
|---|---|---|---|
| `assign_damage` (combat damage split) | desktop dialog only (`VAssignCombatDamage`) | none | **GAP — proven** |
| `divide` / distribute (damage, counters, "divided as you choose") | dialog | ? | check |
| `number` ranges (X, "choose a number") | `getInteger` min/max in the input | ? | check |
| London mulligan bottom count | dialog | ? | check |
| `sideboard` (deck legality between games) | dialog | ? | check |
| declare attackers / blockers (inputs) | `InputAttack` / `InputBlock` + `CombatUtil` validate | engine | safe (engine) |
| targets (`InputSelectTargets`) | engine validates each target | engine | safe (engine) |
| `choose_list` / modes / `ability_menu` | option ids from the engine's own list | bridge maps ids | check id→choice mapping |
| `order` (triggers, blockers' damage order) | any order legal | n/a | safe |
| `confirm` / `text` | engine | n/a | safe |
Method: for each row, read the Forge call site (javap on the pinned jar where needed) and the bridge's
`WireGuiGame` emitter/answer path; cite lines. Output: this table filled, with a decision number.

## Part 2 — close the gaps in the bridge (the cloud owns mtg-table)
- A validation layer in `WireGuiGame` for every "dialog-enforced" ask: build the check from Forge's own rule
  code (e.g. the same predicates `VAssignCombatDamage` uses: attacker keywords Trample / "assign as though it
  weren't blocked", lethal damage per blocker counting deathtouch, `overrideOrder`); an illegal answer is
  **refused and the ask re-sent** with a `reason` the client can show.
- The wire says what is allowed (`assign_damage.defenderAllowed`, per-target `lethal`, `total`), so a client can
  only offer legal choices; ForgeCoach's dialogs follow the wire, never arithmetic of their own.
- Each closed gap ships with a recorded fixture and a `check-redaction`-style checker that fails the gate if an
  illegal answer is ever applied in a fixture.

## Part 3 — the adversarial seat (stays in the gate and in CI)
- `tools/adversary/`: a scripted seat that answers EVERY ask with the worst illegal answer it can construct
  (damage to the player without trample, totals off by one, out-of-range numbers, ids not offered, a blocker on
  an attacker it cannot block, a card from the wrong zone) and then a legal one; it asserts, per ask, that the
  illegal answer was refused (re-asked with a reason) and the legal one applied. Runs over the fake engine's
  scenes and over a set of recorded games; added to `check-all.sh` and CI.
- Until it passes for every ask kind, no further board UI work ships.

## Order and ownership
1. Cloud (mtg-table): the `assign_damage` gate + `defenderAllowed` now (the proven gap). 2. PC: the audit table
(reading). 3. Cloud: Part 2 for every GAP row. 4. Either: Part 3. 5. ForgeCoach dialogs follow the new wire.
Justin: nothing to decide here except the order; this supersedes the UI items in `common-sense-pass.md`.

## Part 2b — a click is never a commitment (added 2026-10-10 after Carrion Feeder sacrificed itself on a look)
Observed: clicking Carrion Feeder on the battlefield, to see its options, activated its only ability at once
("Sacrifice a creature: put a +1/+1 counter on it") and the sacrifice was taken with no real choice or
confirm. Game lost on an exploratory click. Requirements, bridge + client:
1. Clicking a permanent with abilities ALWAYS shows them first (an `ability_menu` even for a single ability),
   with Cancel; nothing is activated until the player chooses. (Forge's desktop auto-activates a lone
   ability; the bridge asks instead — that is a client-affordance rule, not a game rule.)
2. A cost that gives something up — sacrifice, discard, exile from hand/battlefield, pay life — is NEVER
   auto-chosen, even with one legal option: the engine's cost prompt is sent with a Cancel that undoes the
   activation (Forge's `InputPayMana`/cost inputs support cancel before payment completes; verify per cost
   type and record which cannot be cancelled once begun, and make the board ask BEFORE those).
3. Looking is a separate gesture from acting: hover/right-click inspects (card detail), a click acts only
   through the menu/confirm above. The playtest monkey and the adversarial seat get a scene for each.
