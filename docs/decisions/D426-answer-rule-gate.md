## D426 — the bridge is the rules gate for every answer (M68): each ask kind's answer checked by Forge's own rule, an illegal one refused

*Branch `claude/rules-integrity-2`.* Amendment **M68**. Part 2 of the
rules-integrity plan (`study/rules-integrity-plan.md` on `pc-results`), for every
gap the audit (D425, `docs/rules-audit.md`) found. D424 (M67) did the same for
`assign_damage`; this is the other ten kinds.

**2026-10-12**

**Context.** Forge 2.0.14 keeps six ask kinds' rules only in Swing dialogs the wire
replaced, and the engine applies whatever comes back:
`PlayerControllerHuman.chooseTargetsFor` refuses an under-allocated divided spell
but adds an over-allocated one (`{0:5,1:5}` on a divided 2 deals 10) and unboxes a
`null` result (an NPE on the game thread); `AbstractGuiGame.one` does `get(0)` on
whatever `getChoices` returned (a `[]` throws); the bridge's `Ask.pick` kept
duplicate indices (a sideboard answered `[0,0,0,…]` plays forty copies of one card)
and dropped out-of-range ones silently. A malformed answer was a `null`, so Forge's
default played a choice the player never made.

**Decision.**

- **`mtgtable.AnswerRule`**, Forge-free like `DamageRule`, one method per kind,
  each the dialog's own rule over the wire's terms, returning `null` (legal) or a
  sentence:
  - `picks` — `choose_list` and `choose_entities`: distinct ids in range, a count
    in `[min, max]` (`ListChooser.SelListener`; a many is `DualListBox` over
    `size − max .. size − min`); a reveal (`min < 0`) chooses nothing;
  - `order` — `DualListBox`: each id at most once, the count left in `source` in
    `[remainingMin, remainingMax]`, any count when the max is negative;
  - `sideboard` — distinct ids into `main ++ side`, and `PlayerControllerHuman
    .sideboard`'s own loop condition (`min(|main|, format minimum)` cards in the
    main deck, at most the format's sideboard maximum left over), read from the
    match's game type, under `ENFORCE_DECK_LEGALITY`;
  - `Amounts` — `assign_amount`: `VAssignGenericAmount` (exactly the total, each
    target at most its map value else the total, at least 1 with `atLeastOne`);
  - `text` — `AbstractGuiGame.getInteger`'s loop (digits only, in `[min, max]`);
    `WireGuiGame` overrides `getInteger` only to note the bounds for the game
    thread, so its "Other…" ask can carry and check them;
  - `reorder` (`manipulate_list`: a permutation, an unoffered card in place),
    `index` (`ability_menu`, `options`), `bool` (`confirm`).
- **`WireGuiGame.askChecked`**: `ask`, then the rule; a refused answer is never
  returned — the same question goes out under a new `askId` with `reason`, as
  M67's loop does. `null` keeps every kind's §5.4 default. When the game is over,
  closed or conceded mid-ask, a refused answer becomes the default. The
  asynchronous `ability_menu` (M14) is re-sent from the body its first asking
  wrote (no view walk, D22) while its input is still current.
- **Two null defaults change**, each to the legal answer the dialog would start
  from: `assign_amount` → 1 on each target with `atLeastOne`, then the rest in
  order up to each cap (never `null`: NPE), every target present; a **mandatory**
  single `choose_entities` → its first option (Forge's `one` has no Cancel). A
  dialog's `amount <= 0` returns an empty map without asking, as `CMatchUI` does.
- **Wire (M68)**: `reason` on every kind; `text.min` / `text.max`;
  `sideboard.mainMin` / `sideboard.sideMax`; an `assign_amount` target's `min`,
  and its `max` never null. `askReasonOf()` in `web/src/protocol.ts`; the board's
  `AskModal` shows the reason above any question and an amount target's bounds;
  the console prints both; the LLM seat puts the reason in the model's context.
- **Every automated answerer answers legally**: `AutoTransport`,
  `tools/ws-auto-play.mjs` and the LLM seat's `defaultAnswer` now fill
  `assign_amount` within each target's bounds (they answered "all on target 0",
  legal only while nothing checked it), and `AskSelfTest` holds `AutoTransport`'s
  answers to `AnswerRule`.
- **The log checker**: `tools/check-redaction.mjs` judges every answer to an ask
  carrying `reason` by the same rules (from the ask's own wire fields) and fails a
  log in which an illegal one is followed by anything but a re-ask of the same
  kind with a reason; the new keys are per file, all or none
  (`fixtures/negative/redaction/m68-*`).

**Alternatives rejected.** *Clamp or repair an illegal answer* (drop the duplicate,
trim the extra pick): plays a move the player did not make; D424 rejected it for
damage and the reason holds. *Keep a malformed answer as `null`*: the default is a
real choice the player did not make — the very thing the gate exists to stop.
*Compute the sideboard bounds in the client*: the client never computes rules;
the wire carries Forge's numbers. *Rely on Forge's own re-ask for numeric `text`
and sideboard size*: the same question with no reason and no bounds is how M25 and
M29 happened.

**Evidence.** `AskSelfTest` (every rule, including the automated seat's answers);
`check-redaction-selftest` (the m68 controls); the adversarial seat on the real
engine (D428, `docs/evidence/adversary.md`).
