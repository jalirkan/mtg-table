## D472 — The fork finds a play by its alternative cost: a candidate on the copy matches the original's kind as well as its description, and AltCost is never re-added as an optional cost (amends D466 point 1)

*Branch `pc/atlas-fork-altcost`. `node tools/decisions.mjs next` gave D471, which #192 holds, so this is
D472. Amends **D466** point 1 (`mapSa` and optional costs).*

**2026-10-24**

**Context.** J158's pauper spine `b-pauper5-464` (pauper-900000005, seed 464) could not fork decision d12
(turn 15) at Forge's own choice. Forge cast **Snuff Out by its alternative cost**: pay 4 life instead of
{3}{B}, which its script allows while its controller has a Swamp. That play is option 0 (`cast:17`). **All
240 of its branches failed**, 200 random and 40 Forge, each with
`IllegalStateException: optional cost AltCost is not offered on the copy`. Option 2, the same card cast for
its mana, played all of its branches.

**What it was.** Replayed alone: one unit, d12, Forge's continuation, branch 0, from J158's plan and
baseline listing, on origin/main d82d36e2. It gave the same text. The ai-bench case below, run against the
old `mapSa`, gives the stack:
`SearchPolicy.chosenOptionalCosts` (`bridge/src/mtgtable/ai/SearchPolicy.java:802` at d82d36e2), called
from `mapSa` (`:738-739`), called from `PriorityCand.install` (`:599`). The atlas installs every option
through that `install`.

- **Forge built the play as a copy.** `GameActionUtil.getAlternativeCosts`
  (`forge-game/.../GameActionUtil.java:88` at the `forge-2.0.14` tag) asks
  `StaticAbilityAlternativeCost.alternativeCosts` for every AlternativeCost static that applies (`:118`).
  That method copies the spell with the cost replaced (`copyWithManaCostReplaced`). When the static is on
  the spell's own card, it marks the copy with `addOptionalCost(OptionalCost.AltCost)`
  (`StaticAbilityAlternativeCost.java:80`) and appends the static's text to the description. The AI's
  candidate list reaches it through `ComputerUtilAbility.getOriginalAndAltCostAbilities`, and so does
  `Card.getAllPossibleAbilities`.
- **`mapSa` found the right copy, then failed on the mark.** Matching by description found the copy's
  AltCost play, because the appended text makes its description unique. D466's re-adding then asked
  `getOptionalCostValues` (`GameActionUtil.java:396`) to offer every optional cost on the original, AltCost
  included. That method never offers AltCost: it offers Reduce*, Generic, Bargain, Buyback, Entwine,
  Teamwork, Promise Gift, Kicker, Retrace, Jump-start, Flash and Offering. So the mapping threw. AltCost is
  the only `OptionalCost` that anything outside `addOptionalCosts` adds in the game module. (Forge's own
  simulation copier, `SpellAbilityChoiceCopier.copyCastChoices`, filters the offered costs down to the paid
  ones and never requires one, so it never hit this.)
- **A latent half: alternatives that keep the base's description.** Flashback, harmonize and mayhem
  (`getGraveyardSpellByKeyword`, `:297`), foretold (`:204`, `:222`) and plotted (`:230`) copies keep the base
  spell's description. `mapSa` took the first candidate with that description. It found the alternative
  only because `getAllPossibleAbilities` drops the base spell when the card is outside the hand, so the
  alternative came first in the list. Nothing checked the kind of play.

**Decision.**

1. **A candidate must be the same kind of play** (`SearchPolicy.sameKind`) as well as having the same
   description. "The same kind" means:
   - spell or not;
   - the same `getAlternativeCost()` (flashback, evoke, foretold, ..., or none);
   - AltCost paid or not;
   - played through a may-play permission or not;
   - played without its mana cost or not;
   - and the candidate carries no optional cost but AltCost, so no cost is ever added twice.

   The existing prefix fallback still applies, under the same kind check.
2. **The candidates are enumerated with the calls that built the original** (`SearchPolicy.copyCandidates`):
   - the copy's card's possible abilities and its every spell ability, as before;
   - for each, the alternate-additional-cost variants (`GameActionUtil.getAdditionalCostSpell`);
   - and for each of those, every alternative cost Forge builds (`GameActionUtil.getAlternativeCosts`,
     `altCostOnly` false), playable or not.

   Each list is added without duplicates (`!out.contains`), as the first two are (#194's review).

   This replaces `ComputerUtilAbility.getOriginalAndAltCostAbilities`, which makes the same two calls and
   also asks the AI controller to choose optional costs. Those AI-chosen copies could match by description
   and then get the costs added a second time. `mapSa` adds the optional costs itself.
3. **D466's optional costs are added on top, without AltCost** (`SearchPolicy.addedOptionalCosts`).
   AltCost marks the alternative itself, and the matched copy already carries it. A kicked flashback is
   both an alternative and an optional cost, and maps as both. A cost the copy does not offer still fails
   and names the cost (D466).
4. **A play that is not found names its kind.** The error reads, for example,
   `no <description> [Flashback] on the copy's <card>`. It stays a branch **error**, not D470's
   "unavailable". The copy is a faithful copy of the position the play was listed in. A play the copy
   cannot rebuild is a fault in the tool, and D466 point 2 counts it as a problem. D470's class is for an
   option the copied game cannot give because the game moved on: a combat that never comes, an attacker
   that is gone.

**The cost kinds, at 2.0.14.**
- **Covered**, as a play chosen at priority:
  - **An AlternativeCost static on the card itself, marked AltCost.** In the cardsfolder, 115 cards have
    such a static with `ValidSA$ Spell.Self`. Four of them are in the lab's decks: Snuff Out, Force of
    Will, Fireblast and Pyrokinesis.
  - **An AlternativeCost static on another card** ("by paying ... instead of its mana cost"), with no mark.
  - **The keyword alternatives built in `getAlternativeCosts`:** flashback, harmonize, mayhem, escape,
    foretold (its own cost and the "by an effect" cost) and plotted.
  - **May-play permissions** (`getMayPlaySpellOptions`), with the mana cost paid, replaced or waived.
  - **The card-intrinsic alternatives `CardFactoryUtil` builds as spell abilities of their own:** awaken,
    bestow, blitz, dash, disturb, emerge, evoke, freerunning, impending, more than meets the eye, mutate,
    overload, prowl, sneak, spectacle, surge, warp and web-slinging. These were already found by their
    distinct descriptions, and now also by their kind.
  - **The alternate-additional-cost variants** (`AlternateAdditionalCost`, and an activated ability's
    `AlternateCost`). `getAdditionalCostSpell` (`GameActionUtil.java`) lists one play per cost, all of one
    kind, and appends `(Additional cost: ...)` to each description, so the description tells them apart.
    Bone Shards (sacrifice a creature or discard a card, one of 42 `K:AlternateAdditionalCost` cards in the
    cardsfolder) is planted in `altcost-map` (*Measured*). An activated ability's `AlternateCost` is
    enumerated by the same call and was not planted.
  - **Every optional cost `getOptionalCostValues` offers** (D466), on any of the above.
- **Not reachable by this path:**
  - **Madness.** `PlayEffect` sets it (`PlayEffect.java:412`) while the madness trigger resolves, so it is
    never a priority option and never a candidate.
  - **Alternatives that are not spells** (Piracy's mana ability, an activated ability's AlternativeCost
    static). They are enumerated the same way and matched by description, but no case of them was planted.

**Comparability (D458 point 3, D466's last bullet).** This changes the fork for **every search seat**,
because `mapSa` is how each one installs a candidate on its rollout copy: search-v2 on the ladder, in the
SPRT and the tuner, in census games, and the coach helper's live hint (`PriorityCand.install` and the
target search). Before D472, a candidate cast by a card's own AlternativeCost static threw:
- when it was Forge's answer, it was kept with no verdict (`search.fallback.unmappable`);
- otherwise it was dropped (`search.candidateUnmappable`).

After D472 it is ranked like any other play. **So search-v2 results from before and after D472 are not
pooled**, even though no config hash changes. Split them by the experiment log's git sha, as for D466
(`docs/guides/ai-ladder.md`'s *A code change is not a config change*). The atlas's random and Forge maps
are unchanged, except that an option that errored on every branch now plays.

**Rejected.**
- **Drop AltCost in `chosenOptionalCosts` and keep the description match.** That one-line fix plays
  Snuff Out. It leaves the alternatives that share the base's description found only by list order, which
  is the shape of the bug D466 fixed.
- **Classify a play not found on the copy as D470's "unavailable".** That would hide a tool fault behind
  the class reserved for a game that moved on.
- **Match by the alternative's `StaticAbility` or keyword object identity.** Those objects are rebuilt on
  the copy, so identity does not survive copying. The kind, plus the description that carries the
  static's or keyword's text, does.

**Measured.**
- **Replay** (the J159 lab running; one worker, one branch at a time). On this branch, d12 of
  `b-pauper5-464`, branch 0 of both continuations: option 0, the AltCost Snuff Out, **played**.
  - Forge's continuation: 23 turns, 276 steps, a win for the seat.
  - Random continuation: 25 turns, 430 steps.
  - J158 errored on 240 of 240 of these branches.
  - The fork's frame log shows the life payment: a `life` event, the caster from 15 to 11, and no mana
    tapped at the cast. Option 2, the mana cast, shows taps and 15 life.
  - All other options of both branches played, with no error.
- **`tools/ai-bench.sh --selftest`:** 109 checks, 0 failed; 111 after #194's review, which planted Bone
  Shards (below). A new engine case,
  `altcost-map` (`AiBench.altCostScenarios`), plants a seat with one Swamp, four Islands, Snuff Out,
  Mulldrifter and Bone Shards in hand and Think Twice in the graveyard, against Grizzly Bears. It checks:
  - the AltCost Snuff Out maps to the copy's AltCost play, with cost `{0}, Pay 4 life` and its target the
    copy's Bears;
  - the mana-cost Snuff Out maps to the `{3}{B}` play (control);
  - Think Twice's flashback, whose description is the base's, maps to the copy's flashback;
  - Mulldrifter's evoke maps to evoke, and its plain cast to the plain cast;
  - Bone Shards' alternate additional cost: Forge lists its discard-a-card play (`{B}, Discard a card`;
    the sacrifice play is not listed, the seat having no creature), and it maps to the copy's play with
    the same cost, description and the copy's Bears as its target;
  - one atlas branch forcing the AltCost Snuff Out plays with no error;
  - a search playout of it leaves the copy at 16 life with the Bears destroyed, and the real game
    untouched.

  Against d82d36e2's `mapSa`, the case throws J158's exact text at `chosenOptionalCosts`.
- **`bridge/build.sh`:** OK (the lint and its self-test, the self-tests; `DecisionSelfTest` 159 checks,
  unchanged).
- **`tools/cubelab.sh atlas-selftest --jobs 1`:** OK (16 forks, 8 no-leak checks, 38 frame logs, 538 rows,
  the tax pair's G5 refused 2 and left out 2).
- **No full gate** (the lane's instructions; J159 was running). No rerun of the spine.
