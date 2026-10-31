## D492 — The engine-unplayable list takes a card whose effect the fork cannot copy, and a mechanic's every pool card on one measurement: the four Prepare cards (amends D482)

*Branch `pc/d492-prepare`, on origin/main `cc7467f6` (D490/D491's merge). `node tools/decisions.mjs next` gave D492. Amends
**D482** point 2 (what the list is: "a card goes on the list only with a measured stall") and D490's "what this is not".*

**2026-10-31**

**Context.** J176 (atlas rung 4b, night three, the first on D490's list), spine s03 (legacy, spine seed 2129, deck folder
`s03-legacy-2029`), ended in 71 s with 8 atlas problems: of its 1,300 branch games **1,200 errored**, every branch of every
decision from turn 10 on (d2–d5, 300 of 300 each), each with `turns: 0`, `steps: 0` and the error *IndexOutOfBoundsException:
Index 0 out of bounds for length 0*; d0 and d1 (both at turn 6) were clean. The stack in `logs/worker-*.log` is the fork
itself: `GameCopier.makeCopy` → `GameAction.checkStateEffects` → `checkStaticAbilities` →
`StaticAbilityContinuous.applyContinuousAbility` (line 900) → `FCollection.get(0)` on an empty list. The jar's own bytecode
(`javap -c -l`) says what line 900 is: `params.get("MayPlayPlayer")`, then `AbilityUtils.getDefinedPlayers(…)` and `.get(0)`
with no emptiness check (the 2.0.15 source reads the same parameter at its line 942 into a collection it iterates).

What put such a static on the board: the opponent's **Emeritus of Abundance**, cast at turn 7. Its script is
`AlternateMode:Prepare` with `CopyFaceFrom:Regrowth` and *enters prepared*; the baseline's seat-1 log shows a card named
Regrowth (id 104, the opponent's) in exile from turn 7, the turn Emeritus resolved, and no such card in either deck. That is Forge's **Prepare**
mechanic: `AlterAttributeEffect`'s `Prepared` branch (the jar's class carries the same strings as the 2.0.15 source) makes
a copy of the prepared spell, puts it in exile, and creates a command-zone effect with the static
`Mode$ Continuous | MayPlay$ True | MayPlayPlayer$ EffectSourceController | EffectZone$ Command | AffectedDefined$
Remembered | AffectedZone$ Exile`. In the live game the effect's source is the creature and its controller a player. The copier
(`GameCopier.makeCopy`) sets an effect's source only for cards on the battlefield, so the copied command-zone effect has
none: `EffectSourceController` finds no root, `getDefinedPlayers` is empty, and line 900 throws — in every fork, for as
long as the effect lives, because in a two-player game nothing else empties that list. J171's s05
(`/home/justin-a/code/lab/data/lab-j170/b-s05-pauper-2105/`) held Elite Interceptor, which also enters prepared: it entered
at turn 5 and died the same turn, before the spine's first fork at turn 6, and 0 of 6,325 branches erred. The crash needs the
prepared copy's effect alive when a branch forks; Emeritus of Abundance survived to one. Evidence:
`/home/justin-a/code/lab/data/lab-j176/b-s03-legacy-2129/phaseB/` (`branches.jsonl`, `logs/worker-*.log`,
`baseline/frames/baseline-seat1.jsonl.gz`), `/home/justin-a/code/pc-results/results/J176/run3.log`, the jar's
`forge/game/staticability/StaticAbilityContinuous.class` and `forge/game/ability/effects/AlterAttributeEffect.class`.

**Decision.**

1. **D482's criterion widens by one case.** A card goes on `tools/cubelab/engine-unplayable.json` with a measured stall
   (D482) **or a measured fork crash**: every branch dying at its `GameCopier` fork, with the card's effect on the board,
   in a spine's `branches.jsonl` and its worker logs. Both are the same limitation seen from two sides: Forge's AI cannot
   play the atlas's branches with the card in the game.
2. **A mechanic's code path reaches every pool card with the mechanic.** When the crash is in the engine's handling of a
   mechanic and not of a card — here `AlterAttributeEffect`'s `Prepared` branch, the same for every `AlternateMode:Prepare`
   script — the list takes every card in `cubes/library/library-pool.tsv` whose script carries the mechanic, each entry
   naming the measurement it rides on. The test for "a mechanic's code path": the same faulting static, built by the same
   effect class from the same script form, for every script of that form — here `AlterAttributeEffect`'s `Prepared` branch
   and its one static string, for every `AlternateMode:Prepare` script (the only form that prepares; the two cards that
   prepare another creature, Skycoach Waypoint and Biblioplex Tomekeeper, prepare only a Prepare creature and are not in the
   pool). That is why this reaches further than D490's "what this is not": the Chain cycle's loop is the AI's choice on
   each card's own text, measured per card, while this is the engine's one code path for the form, in which the card's
   name plays no part. Today those are the pool's four: **Emeritus of Abundance** (the measured one), **Elite Interceptor**,
   **Emeritus of Ideation** and **Studious First-Year**, all `since: "J176"`. The 50 Prepare scripts outside the pool (54
   in all) are not listed: the list is read by the band draw alone (D482 point 3) and names only what it can deal.
3. **What it is not**, as D482 and D490 say: an engine limitation of the pinned 2.0.14 jar, not a judgement of the cards,
   and no bias toward or against anyone's decks or cubes. A newer engine that guards the line (D109's official release) can
   take these four off the list with a measured clean spine.

**Rejected: a repair in our copier.** Every fork runs through `mtgtable.ai.LenientGameCopier.makeCopy`, whose carry
pass (D479) sets the very effect sources the base copy leaves unset — but only after `super.makeCopy` has returned, and the
throw is inside that call, in the base copy's own `checkStateEffects`, before any carry can run. Catching it would leave a
half-built copy; repairing it would mean reimplementing `GameCopier.makeCopy` so sources are set before the first state
check, a second copy of Forge's copier to keep against the pinned jar for four cards. The list is the lighter, measured
fix; the official release that iterates the list (2.0.15's line 942) takes the four off it with one clean spine (point 3).

**The draw, measured** (as D490): J176's 13 spine pairs and 13 validation pairs redrawn on this list from their seeds
(`tools/cubelab.sh decks --band <b> --count 2 --seed <s> --cross-band 0.10`): 48 of the 52 decks byte-identical, and
exactly the four that held a Prepare card redrawn from that pick on (`s03-legacy-2029` deck 2, `v04-powered-2230`,
`v09-pauper-2235` and `v12-powered-2238` deck 1).

**Follow-up.** Nothing checks the pool against the card scripts, so a fifth Prepare card entering the pool would be dealt
until a spine measures it; a check needs Forge's resources, which CI does not fetch, so it stays a written follow-up.

**The night.** J176's s03 is a spine with no labels (its d0 and d1 stayed under the screen); its other twelve spines hold no
Prepare card (the three validation decks that do are drawn and never played), so J176 runs on. The list change reaches the
next job's draw; J176's decks are drawn and stay.

**Tests.** `web/test/cubelab-deck-census.test.ts`: the committed list is exactly the six, in the file's order, every one a
library card, `since` as recorded; `decks` reports each with its skips. `docs/guides/cube-lab.md` names the six.
