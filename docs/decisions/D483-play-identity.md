## D483 — A priority play is listed once, by its play identity: Forge's doubled may-play twin is not a second option, and the atlas counts a decision's plays by identity (amends D476's listing call)

*Branch `pc/d483-play-identity`. The lane was handed D483; D481 and D482 are held by two other lanes. Amends **D476**'s
rejected alternative "match the doubled play to the single one ... each is an atlas option of its own": that was right
for the mapping and wrong for the listing.*

**2026-10-25**

**Context.** J166's morning read found eight branched atlas options that repeated another option's `cast:<id>` token and
played identically to it in 200 of 200 paired branches: Murderous Rider at legacy-2103 d7, d9, d11, d15, d18 and d19,
and Mindstab Thrull at pauper-2101 d6 and d7. They cost 12.5% of the night's branch time, and they put three decisions
with two real plays (d7, d9 and d11 of legacy-2103: pass, or the Rider from exile) into D480's `--min-options 3` pool.

**What it was** (Forge 2.0.14's source, read in the diagnosis). In both spines the card was in exile under a may-play
permission: the Rider on its adventure, the Thrull under Wrenn's Resolve's impulse draw.

- `Card.getAllPossibleAbilities` (`Card.java:7423`) skips the adventure face once the card is on its adventure, so
  Swift End is not a candidate there. The may-play play enters through `getAlternativeCosts` (`:7428`).
- `ComputerUtilAbility.getOriginalAndAltCostAbilities` (`ComputerUtilAbility.java:109`) calls `getAlternativeCosts`
  again, on that may-play play. `GameActionUtil.getMayPlaySpellOptions` (`GameActionUtil.java:125`, `:378`) never
  checks for a permission already used, and appends `" by <host>"` a second time. Forge's list holds the play and a
  twin whose description has the suffix twice. D476 saw this and kept both.
- `SearchPolicy.alternatives` deduplicated by the host's name and the description, so both survived. `Atlas.Hook.decision`
  lists every candidate as an option. `mapSa` maps each twin to its own twin on the copy (D476's `matchKey`), so the
  two options were the same play, faithfully, twice.
- `describe()` named only the host card. In J162's ff5-462 d5 both labels read "Murderous Rider", though option 0 was
  Swift End from the hand, a real second play.
- `--min-options` counted `tokens.length` (`atlascuts.ts`). The Rider from the hand has two real plays that share
  `cast:19`, so the token cannot be the count either.

**Decision.**

1. **`SearchPolicy.alternatives` keeps one play per play identity** (`SearchPolicy.playIdentity`). The identity is
   these fields, joined by `|`:
   - the host card's **name**;
   - spell or ability;
   - the face (`getCardStateName`: `Original`, `Secondary`, ...);
   - the alternative cost (`getAlternativeCost`, or `-`);
   - a card's own AlternativeCost static paid or not (`OptionalCost.AltCost`);
   - the may-play permission's host by card id (`mayPlay#<id>`), or `-`;
   - without its mana cost or not (`WithoutManaCost`);
   - the optional costs, sorted;
   - `matchKey(sa)` (D476: each may-play suffix's host as `#<id>`), with a repeated run of the same `" by #<id>"`
     collapsed to one (`collapseBy`; the id is matched whole, so `" by #13 by #136"` stays two).

   Forge's own pick goes into the seen set under its identity first. The first play of an identity is kept, in Forge's
   order, and that is the single-suffix play: `getAllPossibleAbilities` lists it before
   `getOriginalAndAltCostAbilities` appends the twin. If Forge's pick is the twin, the single play is the one left out.
   The description stays in the identity for what it does tell apart: an AltCost play's appended text, an alternate
   additional cost (Bone Shards), an activated ability's text.

   **The host is named by its name, not its card id.** The lane's brief said id; this keeps the name, as the old key
   had it. With an id, two copies of one card in hand would become two candidates where they are one play, and so would
   two Lightning Bolts exiled by one Reckless Impulse (one effect card, one permission). The self-test plants exactly
   that case, two Bolts exiled, and requires one Bolt play. Two same-named cards whose plays differ usually differ in
   another field: the zone's alternative (flashback, foretell, plot), the may-play permission's host, or the face.
   Where they do not (two same-named permanents' abilities, one planeswalker at higher loyalty), they stay merged, as
   they were before D483.

2. **The candidate's label names the face and marks a may-play cast** (`describe`): `Murderous Rider — Swift End`,
   `Murderous Rider (may play)`, still at most 60 characters. The `cast:<id>` token is unchanged: it is the ledger's key
   and the decision records' spelling.

3. **The atlas listing carries each option's identity, and `--min-options` counts plays.**
   - `Atlas.Hook.decision` writes `identities` beside `tokens` and `labels` (`SearchPolicy.identity`: the play identity
     of a priority candidate, the token of anything else).
   - `atlascuts.ts`'s `playCount` is the number of distinct identities, or `tokens.length` for a listing written before
     D483. `pickDecisions` and `nextDecision` test `--min-options` against it.
   - A pick's `k` is still the listed option count, because the options branched are every listed one, by index.
   - `repeatedPlays` names any decision that lists one identity twice. `atlas-selftest` fails on one in any leg's
     baseline listing, and on a listing without an identity beside every token.

4. **What is not changed.** `mapSa`, `matchKey` and `sameKind` are D476's and D472's: each listed play still maps to
   its own twin on the copy. `Explorer.priorityOptions` still deduplicates by token (below). No new game-thread hop
   (hard rule 3), no new lint exemption.

**Consequences.**

- **Search-v2's candidate lists change.** A twin used one of `genLimit`'s slots and a share of the rollout budget. With
  a may-play card in exile, the search now ranks one more distinct play, or spends that budget on the plays it has.
  The identity is also finer than the old key in one place: a flashback, foretell, plot, mayhem or harmonize copy that
  keeps the base's description is no longer merged with a same-named card in hand. Under D458 point 3, results before
  and after are not pooled. There is no contract key to bump:
  - the ladder splits by the experiment log's git sha, and `docs/guides/ai-ladder.md`'s *A code change is not a config
    change* now names D483;
  - the cube lab's version id (D341) hashes `bridge/src` and `tools/cubelab`, so it changes with this commit by
    construction.
- **The atlas's maps.** The Forge map and the random map of every option that was not a twin are unchanged; a twin is
  gone. The random seat's options are D358's `priorityOptions`, deduplicated by token, so a twin never reached it. Its
  support changes only where the finer identity adds a play: a flashback-style copy in another zone from a same-named
  card in hand. There, under D458 point 3, an atlas before and after is two policies.
- **A resumed atlas made before D483 fails.** `Unit.expect` carries the baseline's old tokens, twins included, and the
  replay now lists fewer, so the unit stops with "the replay diverged". Run fresh. D480's schedule header guards the
  plan and the decks, not the code.
- **Open, not fixed here.** `Explorer.priorityOptions` deduplicates by token. It merges genuinely different plays that
  share one: the Rider's creature and Swift End from the hand, or Snuff Out by its alternative cost and by its mana
  cost. The random seat then never draws the second play. Fixing that changes the random policy's support (D458
  point 3), so it needs a decision of its own.

**Rejected.**

- **Deduplicate in the atlas only** (skip a listed option whose identity is already listed). The search's rollouts would
  still waste the twin's slot and budget, and the atlas's listing is the search's candidate list by construction (D450).
- **Drop the may-play plays whose description has the suffix twice.** That is a string test on Forge's rendering, the
  shape D476 replaced with the permission's host id.
- **Count `--min-options` by distinct tokens.** The Rider from the hand would count as one play.
- **Key the host by card id** (point 1).

**Measured.**

- **`tools/ai-bench.sh --selftest`: 185 checks, 0 failures**, three runs. D476's `adventure-map` case gains these checks
  through `SearchPolicy.alternativesForTest`:
  - from the hand, Forge's two plays of the Rider are two identities (`Original`, `Secondary`). The search lists the
    creature, and each Rider play once. Swift End is listed only when Forge's own per-card judgment (`canPlaySa`) says
    WillPlay, which varies from run to run of the case: 1, 1 and 2 Rider plays listed in the three runs, so the check
    requires the creature and no repeat, and the two identities are checked on Forge's list;
  - after Swift End resolves, Forge's two creature plays from exile (the twin's suffix doubled) are one identity,
    `Murderous Rider|spell|Original|-|-|mayPlay#26|-||Murderous Rider - Creature 2 / 3 by #26`. The search lists the
    Rider from exile once, labelled `Murderous Rider (may play)`, and it is the single-suffix play;
  - with either of Forge's two plays as Forge's pick, the other is not listed;
  - two Bolts exiled by Reckless Impulse are one Bolt play.

  **Negative control:** with the old key (name and description) in `alternatives`, 5 of those checks fail, with the
  twin listed beside the play in each.
- **`DecisionSelfTest`** (in `bridge/build.sh`): five engine-free `collapseBy` checks (doubled, tripled, `#13` and
  `#136`, two hosts, no suffix); 181 checks.
- **`web/test/cubelab-atlas-cuts.test.ts`:**
  - `playCount` over J166's shapes, `pickDecisions` and `nextDecision` under `--min-options 3`;
  - a pick's `k` is still the listed count;
  - `repeatedPlays` names each repeated play, and none in a listing from before D483.
- **The pinned decks, no lab.** `tools/cubelab.sh atlas --phase b --decisions 1 --branch-random 1 --branch-forge 0` on
  J166's two spines, from J166's own deck files, under the worktree's `var/d483/` (about 30 s each). Each baseline is
  J166's game:
  - **legacy-2103:** 22 decisions, 28 turns, A wins. 14 listings are J166's token for token. At the other eight (d7,
    d9, d11, d13, d15, d18, d19, d20) the only change is the second `cast:19`, now gone: d7 reads `pass`,
    `Murderous Rider (may play)`. Decisions with three or more plays: 8, where J166's token count gave 13.
    `--decisions 8 --min-options 3` now picks d0, d1, d10, d15, d17, d18, d19 and d21; J166 picked d7, d9 and d11
    among its eight.
  - **pauper-2101:** 23 decisions, 32 turns, A wins. d6 and d7 lose their second `cast:1` (Mindstab Thrull), and no
    other listing changes.
- **The gate:** `./tools/check-all.sh` at `GATE_JOBS=2` from a deleted `bridge/out`, this tree, `WSPORT=9800`:
  **OK, 59 of 59 jobs**, 947.0 s wall (load average up to 17.9, other lanes' gates running). A first run on
  `WSPORT=9650` failed at 10f-probe alone. Its ws server never printed `WS LISTENING`, because another process held
  port 9655, inside that run's range. That was a port collision with a concurrent gate, not this change.
