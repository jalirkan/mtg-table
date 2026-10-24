## D476 — The fork matches a may-play play by its permission's host id, not its rendering, and by the face of the card it casts (amends D472)

*Branch `pc/atlas-fork-adventure`. `node tools/decisions.mjs next` gave D476. Amends **D472** (`mapSa`'s match:
the description, and `sameKind`).*

**2026-10-24**

**Context.** Lab job J162's spine `b-ff5-462` (fair-fight-900000005, seed 462) had ten atlas problems, one
fault. At decisions d11, d16, d19, d22 and d24 (turns 13 to 19), Murderous Rider was on an adventure in exile, and
Forge listed two plays of it, both `cast:25`. **All 240 branches of each errored**, 2,400 in all:

```
IllegalStateException: no Murderous Rider - Creature 2 / 3 by Swift End (25) [may play] on the copy's Murderous Rider (25)
IllegalStateException: no Murderous Rider - Creature 2 / 3 by Swift End (25) by Swift End (25) [may play] on the copy's Murderous Rider (25)
```

Every other option of those decisions played. A grep of every `branches.jsonl` under `/home/justin-a/code/lab/data`
finds this error in J162 only.

**What it was.** Replayed alone: one unit, d11, Forge's continuation, branch 0, from J162's `plan.json` and
`phaseB/baseline.json`, on origin/main `10fe4e7e`, with a scratch dump of the copy's candidates. The stack is
`SearchPolicy.mapSa` (`bridge/src/mtgtable/ai/SearchPolicy.java:745` at `10fe4e7e`) ← `PriorityCand.install`
(`:609`) ← `Atlas.play` (`Atlas.java:672`). The dump:

```
orig  [Murderous Rider - Creature 2 / 3 by Swift End (25)]  [may play]  state Original
      permission host: Swift End (25)'s Adventure (136), an effect card; its effect source: Swift End (25)
copy  permission host: Swift End (25)'s Adventure (136); its effect source: null
  cand [Murderous Rider - Creature 2 / 3 by Swift End (25)'s Adventure (136)]  [may play]
  cand [Murderous Rider - Creature 2 / 3]
  cand [Destroy target creature or planeswalker. You lose 2 life. (...)]  (Swift End, Secondary)
  cand [Murderous Rider - Creature 2 / 3 by Swift End (25)'s Adventure (136) by Swift End (25)'s Adventure (136)]  [may play]
  cand [Murderous Rider - Creature 2 / 3 by Swift End (25)'s Adventure (136)]  [may play]
  cand [Destroy target ... by Swift End (25)'s Adventure (136)]  [may play]  (Swift End, Secondary)
```

The copy offered the right plays. Their descriptions named the permission's host differently. At the `forge-2.0.14`
tag:

- **Forge names a may-play play by its permission's host.** `GameActionUtil.getMayPlaySpellOptions`
  (`GameActionUtil.java:321`) copies the spell and appends `" by "` and the host to its description when the host is
  another card (`:375-381`). When the host is an effect card with a source, it appends the source instead (`:380`).
  An adventure's permission lives on an effect card that `EffectEffect` names `<host>'s Adventure`
  (`EffectEffect.java:125`). `SpellAbilityEffect.createEffect` makes the resolving ability its source
  (`SpellAbilityEffect.java:658`). That ability's host is Swift End on the stack, so the original reads
  `by Swift End (25)`.
- **The copy's effect card has no source.** `GameCopier` builds an effect card from its paper card, name, type and
  abilities (`GameCopier.java:325-340`). It sets a source only for battlefield cards (`:258`, `:282`). So the copy
  renders the effect card itself, `by Swift End (25)'s Adventure (136)`. `mapSa` compared descriptions exactly
  (`SearchPolicy.java:731`) and by prefix (`:738`), and neither could match.
- **The doubled suffix is Forge's, not ours.** `Card.getAllPossibleAbilities` already lists the may-play play
  (`Card.java:7428`). `ComputerUtilAbility.getOriginalAndAltCostAbilities` then asks `getAlternativeCosts` about
  that play too (`ComputerUtilAbility.java:109`). That builds a second may-play play from the first, with the
  suffix appended to a description that already has it. Both are in Forge's list, so both are atlas options.
  `copyCandidates` makes the same calls (D472 point 2), so the copy has the doubled play too.

**Decision.**

1. **A play is matched by `SearchPolicy.matchKey`**: its description, with each `" by <host>"` that its may-play
   permission put there replaced by `" by #<host id>"`. The rendering is computed the way
   `getMayPlaySpellOptions` computes it: the effect's source when the host is an effect card that has one, otherwise
   the host. The card id survives the copy (the copier keeps every id), and the rendering does not. A doubled
   suffix is replaced twice, so each of Forge's two plays maps to its own twin on the copy. The exact match and the
   prefix fallback both compare keys. A play with no may-play permission keys as its description, unchanged.
2. **`sameKind` also requires the same face** (`getCardStateName`): an Adventure card's creature (`Original`) or
   its adventure (`Secondary`), a split card's half, a modal card's back. Each face's spell has its own description,
   so this was already true in practice. It is now checked, and a failure names a face other than `Original` in its
   kind (`[Secondary]`).
3. **The copier is not changed.** Giving a copied effect card a source would need a copied `SpellAbility` (the
   source is the resolving ability, whose host is Swift End on the stack, not the copy's Rider in exile). Even
   mapped to the copy's card, it would render `Murderous Rider (25)`, not `Swift End (25)`. The key would still
   differ. See *Open*.

**Which plays it covers.**
- **Fixed:** every play made through a may-play permission whose host is an effect card:
  - an Adventure card's creature cast from exile;
  - impulse draw, where an effect lets you play an exiled card (Reckless Impulse, Light Up the Stage, ...). In the
    2.0.14 cardsfolder, 315 may-play statics have `Affected$ Card.IsRemembered`, most of them on effect cards;
  - any other may-play from an effect card.

  Before this, each of these failed the same way on every fork. A may-play from a permanent (Bolas's Citadel, Kess)
  was not affected: the copy renders a permanent the same way.
- **Not affected, already matched by their own descriptions and kinds (D472):**
  - casting an Adventure card, split card or modal card's face from the hand;
  - an Omen card's omen half, which shuffles the card away rather than exiling it;
  - disturb and the other alternatives `CardFactoryUtil` builds as spell abilities on a face;
  - foretell and plot from exile, which are keyword alternatives in `getAlternativeCosts`, not effect permissions;
  - flashback and the other graveyard keywords.

  Any of these faces cast through an effect's may-play, a split card exiled by an impulse for example, now maps by
  point 1.

**Comparability (D458 point 3).** This changes the fork for every search seat, as D472 did:
- the atlas's branches;
- search-v2's rollouts on the ladder, in the SPRT, the tuner and census games;
- the coach helper's live hint.

A play by an effect's permission now maps. Before, it threw: kept with no verdict when it was Forge's answer
(`search.fallback.unmappable`), and dropped otherwise (`search.candidateUnmappable`). **Search-v2 results from
before and after D476 are not pooled.** Split them by the experiment log's git sha (`docs/guides/ai-ladder.md`'s
*A code change is not a config change*). The atlas's maps are unchanged, except that the ten J162 options now play.

**Rejected.**
- **Strip everything after the first `" by "`.** A spell's own text can contain " by " ("... dealt damage by ...").
  It also cannot tell apart two permissions from different hosts for the same card.
- **Match a may-play play by its permission's static ability object.** Statics are rebuilt on the copy, so
  identity does not survive (D472's own rejection).
- **Fix only the copier (point 3).** The rendered name would still differ. An adventure's source is the adventure
  face on the stack.
- **Match the doubled play to the single one.** They are the same play, but each is an atlas option of its own,
  and the key maps each to its twin exactly.

**Open.** Copied effect cards have no source, whatever the description. `GameCopier.java:282` maps
`setEffectSource` for battlefield cards only. In the 2.0.14 cardsfolder, 147 scripts read `EffectSource`:
`ValidCard$`, `ValidTarget$`, `Defined$`, `DamageSource$` and so on, mostly on effects. On a fork they resolve
against null. That is a quiet fidelity gap in D313's copier, not this fault. It needs a decision of its own and a
planted case before anyone relies on such an effect in a rollout. *(2026-10-24: done by **D479**. The copy now carries a copied effect card's source, its triggers and its replacement effects, with a planted Gideon, Ally of Zendikar case.)*

**Measured.**
- **Replay** (one worker, one branch at a time), on this branch. J162's own rows are the control.
  - d11 Forge's continuation, branch 0: options 4 and 5, both may-play Rider casts, **played**, 18 turns and 184
    steps each. The fork's first state frame has the Rider on the battlefield, where option 0 (pass) has it in
    exile.
  - d16 Forge, d19 random, d22 Forge and d24 random, branch 0: every Rider option played.
  - Every other option of the five units has the same result, turns and steps as J162's rows.
- **`tools/ai-bench.sh --selftest`: 130 checks, 0 failures.** A new engine case, `adventure-map`
  (`AiBench.adventureScenarios`), plants a seat with Murderous Rider and Reckless Impulse in hand, eight Swamps and
  three Mountains, and a library of Lightning Bolts, against Grizzly Bears and Hill Giant. It checks:
  - from the hand, the creature cast maps to the copy's creature cast (`Original`), and Swift End maps to the copy's
    adventure (`Secondary`), its target the copy's Bears;
  - the real game casts and resolves Reckless Impulse, then Swift End on the Bears. The Bears die and the Rider goes
    on an adventure in exile;
  - Forge lists two creature plays from exile, one with the suffix twice, as J162 had. Each maps to the copy's
    may-play cast with the same key. The copy's description reads `by Swift End (8)'s Adventure (26)`;
  - the exiled Bolt, `by Reckless Impulse (9)`, maps to the copy's play `by Reckless Impulse (9)'s Effect (25)`;
  - one atlas branch forcing the Rider from exile plays with no error;
  - a search playout of it puts the Rider on the copy's battlefield, and the real game's Rider stays in exile.

  With `matchKey` returning the plain description, the case throws J162's exact text:
  `no Murderous Rider - Creature 2 / 3 by Swift End (8) [may play] on the copy's Murderous Rider (8)`.
  D472's `altcost-map` and D474's `copy-stale-monarch` still pass.
- **`bridge/build.sh`: OK** (the lint and its self-test, javac, the self-tests; `DecisionSelfTest` 175 checks).
- **`tools/cubelab.sh atlas-selftest --jobs 1`: OK** (16 forks, 8 no-leak checks, 38 frame logs, 538 rows), in
  2 min 27 s.
- **The gate:** `./tools/check-all.sh` at `GATE_JOBS=4` from a deleted `bridge/out`, on `7561d5f8` (this branch's
  code; only this line differs): **OK, 59 of 59 jobs**, 517.6 s wall (load average up to 15.0).
