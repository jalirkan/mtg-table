## D428 — the adversarial seat: every ask answered illegally first, every input class tried with an illegal act, in the gate

*Branch `claude/rules-integrity-2`.* Part 3 of the rules-integrity plan
(`study/rules-integrity-plan.md` on `pc-results`): "until it passes for every ask
kind, no further board UI work ships."

**2026-10-12**

**Context.** D424 (M67) and D426 (M68) made the bridge the rules gate for every
answer, D427 (M69) made a click a look until the player chooses. Each was proven
by a probe written for it. The plan asked for the standing proof: a seat that
tries to cheat on EVERY question, every game, in the gate, and fails the run the
day anything gets through.

**Decision.**

- **`tools/adversary/`**:
  - `answers.mjs` — from an ask's own wire fields, `answerRefusal` (every kind's
    rule: the JS copy of `AnswerRule` and the wire half of `DamageRule`; the
    log checker `tools/check-redaction.mjs` judges recorded answers with it, so
    the seat and the checker cannot disagree), `illegalAnswers` (the worst
    answers it can build: totals off by one both ways, a target over its cap, a
    target at zero under `atLeastOne`, damage on the player without trample or
    before lethal, out-of-range and negative numbers, ids not offered, duplicate
    picks, too many and too few, a card twice in a sideboard, the wrong JSON
    type) and `legalAnswer`;
  - `core.mjs` — the state machine. Every ask: up to six illegal answers,
    rotating through the kind's list across questions, each of which must come
    back as the same kind with a `reason` (refused, asked again); then the
    policy's legal answer, which must not. Anything else after an illegal
    answer — another kind, no reason, no re-ask within 8 s — is a **leak**.
    Once a turn per input class (priority, declare attackers, declare blockers,
    a selection), before the policy acts, an act the engine must refuse: an
    opponent's permanent as an attacker, a land or tapped creature as a
    blocker, a card a selection does not offer, a card from the opponent's
    hidden hand, an ability or a player that does not exist; it must draw the
    bridge's refusal notice ("Not selectable", "Unknown card", "Unknown
    ability", "Unknown player") within 3 s, or it is a leak;
  - `adversary.mjs` — the CLI: `tools/ws-auto-play.mjs --probe --adversary`
    (its whole-game policy plays lands, spells, attacks, payments and the next
    game of a match; the adversary owns every answer). Exit 3 on a leak or a
    legal answer refused, 11 when a `--require-kinds` kind never had an
    illegal answer refused;
  - `selftest.mjs` — no engine: the rules against hand-written answers of each
    family, `legalAnswer` taken and at least one illegal answer built for every
    one of the recorded asks in `fixtures/` (all eleven kinds), and the state
    machine against two fake bridges — an honest one (no leak) and a leaky one
    that applies whatever comes back (caught on every kind) — and an engine that
    takes an illegal act without a notice (caught).
- **In the gate**: step 12 runs the selftest; **10j** plays three real games
  (amount-probe, search-probe, number-probe; seed 7) under the adversary,
  requiring refusals for `assign_amount`, `confirm`, `choose_entities`,
  `choose_list` and `text`; **10k** runs `tools/ws-cost-probe.mjs` (D427) and the
  adversary on the cost deck (`ability_menu`). Every server log then goes through
  `check-redaction.mjs`, which fails a log whose illegal answer was not refused.
  CI runs the selftest.
- **The scenes**: mtg-table has no fake engine; the adversary's "scenes" are the
  probe decks, each forcing the ask kinds it exists for on the real engine, and
  the recorded asks of every committed fixture, offline.

**Results** (`docs/evidence/adversary.md`): over seven real-engine games, every
illegal answer to every ask kind Forge 2.0.14 dispatches was refused and re-asked
with a reason, every legal answer was taken, and every illegal act was refused —
**no leak**. `options` (no call site in 2.0.14, M22) and `manipulate_list`
(unreachable while D13 holds, M23) are checked by `AskSelfTest` and the
selftest only.

**Alternatives rejected.** *A seat of its own, with its own game policy*: the
policy that pays mana, attacks and survives a match is `ws-auto-play.mjs`'s,
gate-hardened since M3; a second copy would drift. *Illegal answers in a separate
probe per kind* (as D424's `ws-assign-probe.mjs`): one probe per kind is one
place per kind to forget; a seat that cheats on whatever comes is the system,
not the instance. *Fail on any refused legal answer silently retried*: a legal
answer refused is a rule mismatch between the bridge and the wire — reported, and
a failure.
