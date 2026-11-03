## D510 — A target the seat cannot see is written `option:hidden`, listed and answered, as the entity record writes one (amends D487's unseen-target rule; protocol M81)

*Branch `pc/d510-all-hidden-targets`, off main `43043fe5` (D509's merge). D510 was reserved for this lane
(`node tools/decisions.mjs next` printed it). A record-only fix under D509: the argument that it changes no play and
no listing is below, with its evidence. The checker is unchanged; its self-test gains a pass control. Revised after
the skeptic's review ("merge after fixes"): the exact `hidden` count, the repeat-cap argument, the control, two new
follow-ups.*

**2026-11-03**

**Context.** Lab night J186 (D508's population's first night, `random-<band>-d508`) failed `atlas.problems == 0` in
one unit, `b-s11-legacy-2550` (legacy band, spine seed 2550): 12 of its 12,652 frame logs failed
`tools/check-redaction.mjs`, each on exactly one record, all of the same shape (evidence, read only:
`/home/justin-a/code/lab/data/lab-j186/b-s11-legacy-2550/`, `atlas.json`'s `checks` and `phaseB/frames/`,
`phaseB/logs/`). The first, `phaseB/frames/d13-random-o1-b149-seat0.jsonl.gz` line 305:

    {"v":1,"seq":66,"t":…,"dir":"ai","type":"decision","body":{"seat":0,"n":65,"kind":"target","frame":301,
     "stateSeq":238,"turn":22,"phase":"MAIN1","options":[],"complete":false,"hidden":1,"chosen":null,
     "by":"forge","parent":64,"source":"targets"}}

    decision 65 has no options (M55, D347)
    decision 65 chosen null is not a token (M55, D347)
    decision 65 chose null, which is not among its options (M55, D347)

The other eleven are `d14-random-o3-b124`, `d14-random-o3-b68`, `d15-random-o4-b104`, `d16-random-o1-b15`,
`d17-random-o0-b99`, `d17-random-o1-b122`, `d17-random-o1-b97`, `d17-random-o1-b99`, `d17-random-o2-b108`,
`d2-random-o0-b110` and `d9-random-o0-b21`, all `-seat0`. In every one the parent is seat 0's `cast:13`, Reprieve
("return target spell to its owner's hand"), and the part's one candidate was card 63, seat 1's Batroc the Leaper, a
**ghost**: stranded in the Stack zone by seat 1's refused Multikicker payment (the cube lab's follow-up 27, queued
under D509, not this lane's). D507's gate counts it in `hidden`, and the worker logs carry exactly twelve
`[ghost] card 63 in the stack zone with no stack instance left out of a target record (D507)` lines, one per
record. Forge chose it. The record then had nothing to list and nothing to answer. Nothing leaked: the record named
no card. It was malformed.

**Cause** (`bridge/src/mtgtable/ai/Decisions.java` at `43043fe5`). `targets0` counts a candidate whose `entityToken`
is null in `d.hidden` and adds no token (line 493), and counts each target of the answer the seat cannot see in
`unseen` (line 514). `targetAnswer` (line 538) wrote the options as the visible ones only, marked the record
`complete: false` when `unseen > 0` (line 543), and left `chosen` null when the visible answer was empty (lines
559–564). D487 wrote that on purpose: "with no visible target it keeps its null answer, which the checker fails"
(protocol M76). The idea was that the checker would flag it, and J186 shows that it does. But the record is the
seat's information, and the seat knew exactly this much: a target it cannot see was chosen. M55 already gives that
a token. `Decisions.entities` (lines 773–799) lists `option:hidden` after the visible options when `d.hidden > 0`,
and writes a hidden pick as `option:hidden`. The target path never got the same rule.

**Decision.** The target record writes a target it cannot see the way the entity record does:

- **Options.** When the record's `hidden` is above 0, `options` lists `option:hidden` once, after the visible
  options (which are sorted by id, as before). `target:none` keeps D487's place and rules: first when the part's
  minimum is 0 or the part was left empty, with `min`, and `NO_TARGET` beside a mandatory empty part.
- **Answer.** Each unseen target of the answer is `option:hidden`, after the visible ones. One target in all goes
  in `chosen` as a token; several go in a list. An answer of only unseen targets is never null. A part left empty is
  still `target:none` (D487), whatever its hidden candidates.
- **`hidden` counts exactly.** M75 defined a target record's `hidden` as the number of candidates the part may
  target that the seat cannot see (`getAllCandidates`, each judged by `entityToken`). D510 extends it by the unseen
  targets of the answer that are **not** among those candidates: a spell on the stack, which `getAllCandidates`
  leaves out and `targets0` meets only in the answer. `targets0` keeps the hidden candidates, and for each unseen
  target asks whether it is one of them (the same object, or the same card or player by id, `Decisions.among`); one
  that is not adds one to `hidden` (`targetAnswer`'s `unseenOutside`). An unseen target that is a hidden candidate
  is counted once. So every hidden object the part offered or took is counted once, and a record lists
  `option:hidden` exactly when `hidden` is above 0. (The review: the first version's `max(hidden, unseen)` was a
  lower bound, 1 for a hidden candidate not chosen beside an unseen stack spell chosen, which are 2.)
- **`complete: false`** beside an unseen answer, as D487 said, and now for a narrower reason: `option:hidden` cannot
  say whether the unseen answer was one of the counted candidates or a target outside the engine's list. A hidden
  candidate that was not chosen does not mark the record incomplete, as before.

So J186's record becomes `options: ["option:hidden"], hidden: 1, complete: false, chosen: "option:hidden"`. It
passes the checker as it is: `option:hidden` is in `DECISION_TOKEN` for every kind, and no rule ties a token's verb
to the record's kind. `Decision.TOKEN`, `check-redaction.mjs` and the token grammar are unchanged. Only
`Decision`'s javadoc names `option:hidden` beside the target tokens. **No new field.**

**Held by `mtgtable.ai.DecisionSelfTest`** (`bridge/build.sh`; 227 → 235 checks). `targetAnswer` is package-private in
`mtgtable.ai`, so its engine-free cases live beside D487's in that self-test, not in `SelectionSelfTest`, which is
in `mtgtable` and boots the engine. Two of D487's checks asserted the null answer and now assert `option:hidden`
(min 1 and min 0). Eight are new:

- J186's record: no visible candidate, one hidden, the one target unseen.
- All hidden, none chosen, minimum 0: `target:none` with the hidden candidate listed, and the record complete.
- Visible candidates and a hidden one chosen.
- A visible target and an unseen one: `chosen` is `[target:p1, option:hidden]`.
- An unseen answer outside the candidates: counted, so listed.
- Two hidden candidates and a visible pick: listed once, `hidden` 2, complete.
- A hidden candidate not chosen and an unseen stack spell chosen: `hidden` 2, `option:hidden` listed once.
- An unseen answer that is the hidden candidate: `hidden` 1, not counted twice.

`Decisions.among` itself needs game objects and is not in the engine-free self-test. The negative control, run on
the lane's first version (the eight checks then, before the review's two count checks and the six-argument
`targetAnswer`): with `Decisions.java` reverted to `43043fe5`, the self-test failed 8 of its 233 checks, those
eight.

**The checker's control.** `fixtures/negative/redaction/m81-target-option-hidden.jsonl` (generated by
`tools/make-negative-fixtures.mjs`, listed as passing in `tools/check-redaction-selftest.mjs`) carries two target
records, J186's shape (`options: ["option:hidden"]`, `hidden: 1`, `chosen: "option:hidden"`) and a visible target
beside an unseen one (`chosen: ["target:p1", "option:hidden"]`). No checker rule is new, so the control holds the
path open: a later rule that ties a token's verb to the record's kind fails it.

**On the real data.** The checker passes all twelve J186 logs once each record is rewritten into this shape (a scratch
script that rewrites the one record per log and touches no other line; not committed).

**Record-only, under D509.** `targetAnswer` is called from `targets0` alone. `targets0` is reached through
`Decisions.targets` and `Decisions.castTargets`, whose callers are:

- `PolicyControllerAi`'s priority record (after `decisions.write`), `chooseModeForAbility`, `playTrigger` and
  `chooseTargetsFor`. Each sits behind `decisions != null`, after Forge or the explorer has already answered, and
  hands the records to `writeOrCount`, the sink.
- `tools/ai-bench/AiBench.java`'s two self-test scenarios, which read a record's `options` and `chosen` and have no
  hidden candidate.
- `SelectionSelfTest` and `DecisionSelfTest`.

`grep` finds no call in `Explorer.java`, `SearchPolicy.java`, `Atlas.java` or `AtlasController.java`. Explorer names
`Decisions.castTargets` only in two comments; it calls `Decisions.entityToken`, which is unchanged. The atlas's
listing (`Atlas.Hook.decision`) reads `SearchPolicy.Cand`s, never a record. Two things do read the record, and
neither changes anything that is played:

- **`Decision.forced()`** (`options.size() + hidden <= 1 && complete`) decides whether a record is written or only
  counted. For a target record it gives the same answer as before. `hidden` grows only beside an unseen answer,
  which makes the record incomplete, so never forced. Adding `option:hidden` needs `hidden > 0`. When
  the record also lists another option, the sum was already at least 2. When `option:hidden` is its only option, it
  had no option before, so an unseen answer had made it incomplete (a record with no option cannot be complete:
  `target:none` is listed for every empty part). Either way it was not forced before and is not forced now.
- **D484's repeat cap** (`DecisionClock.repeated`, through `AtlasController.setDecisionSink` in a branch that
  records frames) keys each written record on its options, `hidden`, `chosen` and `chosenAll`. That key is the one
  path from a record back into a branch's play: the 1,000th identical record in a row at one `stateSeq` ends the
  branch as a timeout. The change moves the key both ways, in narrow cases. **Splits:** two records the old bridge
  wrote alike now differ when their parts differed only in how many targets of the answer were unseen (the old
  record dropped them); there the cap fires less. **Merges:** two records the old bridge wrote differently now come
  out alike only when they differ in whether an unseen answer was a counted candidate. With the same visible
  candidates `[target:67]` and one unseen target chosen, A (no hidden candidate; the target a stack spell outside
  Forge's list) was `hidden` 0 and B (one hidden candidate, chosen) was `hidden: 1`; both are now `options
  [target:67, option:hidden]`, `hidden: 1`, `chosen: option:hidden` (the review's counterexample). For the cap to fire
  there, the same part would have to alternate between A and B a thousand times at one `stateSeq` with no state
  frame between, and nothing else in those records could differ. No firing of the cap appears in J180–J186's data:
  there is no `the same <kind> decision` line under any of those nights.

Unchanged: `fixtures/cubelab/seat-identity.json` (`tools/cubelab.sh seat-identity`: all 4 games the golden's, the
same digests), the bench (`tools/ai-bench.sh --selftest`: 320 checks, 0 failures), `tools/cubelab.sh atlas-selftest`,
and every other self-test of `./bridge/build.sh`. **D508's population continues**: no new `randomSeat` (D509, point 2:
the recorder lands between landings).

**What it does not change.**

- What the seat plays or offers: no gate, no candidate list, no listing. `entityToken`, `visible`, D507's Stack rule
  and D508's current-card rule are as they were.
- The ghost itself. Follow-up 27 (the refused Multikicker payment that strands it) and 28 (it stays out of its
  owner's game) stay queued under D509.
- The checker. Logs written before this decision keep failing on the old shape, as they should. The legacy J171
  shape (M76's `LEGACY_NULL_TARGET_BEFORE`) is untouched.
- The board: a human seat's ask goes through `WireGuiGame` and `Snap`, never `Decisions`.
- The entity path, apart from its two `option:hidden` literals, which are now the `HIDDEN` constant (the gap it has
  is follow-up 33).
- What a record means. One record shape that already passed does change: one visible target beside an unseen one
  used to write `chosen: "target:p1"` (the unseen one dropped) and now writes `["target:p1", "option:hidden"]`, so
  `tools/ml/policy_data.py`'s `chosenIndex` becomes a list for those records (`search_errors.norm_token` joins lists;
  nothing breaks).

**Follow-ups** (PLAN.md's cube-lab list): **32**, the checker has no rule tying `option:hidden` to `hidden`; **33**,
the entity path's hidden pick outside its list.

**Rejected.**

- *A checker admission for `options: []` with `hidden` above 0 and `chosen: null`.* The record would then say that
  nothing was chosen, while the seat knows a target was chosen. M55 already has the token for "a card I cannot
  see". D487's null was meant as a signal to the checker, not as a shape to keep.
- *A `target:hidden` token.* It is a new token in two grammars (`Decision.TOKEN` and `DECISION_TOKEN`), in the coach
  bench and in every reader of the records. `option:hidden` already means "a card the seat cannot see", for any
  kind, and the checker admits it today.
- *Dropping the record when every candidate is hidden.* Forge did make a choice there, so the decision happened.
  Leaving it out would also break the records' `parent` chain from the priority record that cast the spell.
- *`hidden = max(hidden, unseen)`* (this lane's first version): a lower bound, not a count.
- *Fixing the ghost instead.* The ghost is one way to reach this shape. Any part whose only candidates the seat
  cannot see reaches it too, and the ghost's fix changes plays: it is follow-up 27, queued under D509.
