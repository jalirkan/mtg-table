## D487 — A targeting part left empty answers `target:none`, listed beside the part's minimum, never `chosen: null`; the M55 audit accepts J171's legacy null records, counted (amends D347's record shape and audit, D486's target records and M75)

*Branch `pc/d487-target-none`, on origin/main `f2b4e9c2` (#215, D486's seat-identity addendum). `node tools/decisions.mjs
next` gave D487. Amends **D347**'s target records and the M55 audit in `tools/check-redaction.mjs` (as **D481** and
**D485** amended it) and **D486**'s target records (M75). Protocol amendment **M76**.*

**2026-10-26**

**Context.** J171, the first night on D486's seat: five spines' atlases report a redaction PROBLEM -- 4,501 frame logs
(s09 2,361, s02 1,212, s10 829, s04 61, s08 38; `/home/justin-a/code/lab/data/lab-j170/b-s*/`) fail the M55 audit with
"decision N chose null, which is not among its options" and "chosen null is not a token". Every failing record is a
`target` record of Forge's own answer (`by: "forge"`, `source: "targets"`) whose `chosen` is null, beside options that
now list cards, e.g. `b-s09-pauper-2109/phaseB/frames/d0-random-o0-b100-seat1.jsonl.gz` line 145. `Decisions.targets`
wrote a part with no target as null; before D486 such a part listed players alone, so where it may target only
permanents it had no option, was a forced record and was never written.

**Verified first, on all of it** (the reading had to hold before the shape changed: a target outside the options would be
a leak or a record fault, not a shape). A scan of every phase-B branch frame log of the five spines (54,350 logs) for a record
with `chosen: null`, each matched to its parent priority answer, every target record of that parent, and the cast event
that followed (its stack text, which names each part's targets with their ids, and the stack item's targets):

| spine | logs | null records | the card, the part | its `TargetMin$` / `TargetMax$` | targets the cast carried |
|---|---|---|---|---|---|
| s02 | 1,212 | 1,426 | Tear Asunder, the half its kicker shut (283 kicked, 1,143 not) | `X` / `X` and `Y` / `Y`: 0 and 0 on that half | one each, the other half's |
| s04 | 61 | 62 | Garruk, Curse Breaker +2 (49), The Wandering Emperor +1 (13) | `0` / `2`, `0` / `1` ("up to") | none |
| s08 | 38 | 39 | Minsc & Boo, Timeless Heroes +1 | `0` / `1` ("up to one") | none |
| s09 | 2,361 | 2,361 | Tear Asunder (1,720 kicked, 641 not) | as s02 | one each |
| s10 | 829 | 829 | Tear Asunder (511 kicked, 317 not, 1 fizzled) | as s02 | one each (the fizzled cast none) |
| **all** | **4,501** | **4,717** | | | |

- **Every record has one shape**: `kind: "target"`, `by: "forge"`, `source: "targets"`, the keys `{seat, n, kind,
  frame, stateSeq, turn, phase, options, chosen, by, parent, source}` and no other (no `complete`, `hidden`, `why`,
  `explore`). No other kind, source or policy answered null.
- **Tear Asunder** (`TargetMin$ X | TargetMax$ X` on "target artifact or enchantment", `X = Count$Kicked.0.1`; `TargetMin$
  Y | TargetMax$ Y` on the kicked "target nonland permanent", `Y = Count$Kicked.1.0`): the half the kicker shut can
  take no target at all, and its stack text shows it empty ("Exile . Exile Rimrock Knight (68)." kicked; "Exile Servo
  Token (96). Exile ." not). Where both halves were written (3,959), the null record is the half the text shows empty in
  every one (kicked: the first record; not kicked: the second); where only the null record was written (656), the other
  half was a one-candidate record (counted, not written) whose target is the one the cast carried. The one fizzled cast
  (s10 `d10-random-o1-b5-seat1`, its target bounced in response) has no stack text to read.
- **The planeswalkers** (101 activations): "up to" parts Forge's AI left empty; each ability went on the stack with no
  target.
- **No cast carried a target outside its records' options** (0 of the 4,615 targets: one per Tear Asunder cast but the fizzled one). 141 of them were tokens no state frame
  listed (a Servo, Treasure, Blood, Construct or Robot token made between frames): D481's window, which the audit already
  passes. No target chosen after the record, no player where the part listed none, no card the seat could not see.

So J171's records were **all the minimum-0 case** -- 4,616 of them a part whose maximum is 0 as well -- and **none** a part
with a minimum of 1 left empty. Nothing leaked; the record's shape was wrong.

**Decision.**

1. **`target:none`** (`Decisions.TARGET_NONE`; M55's grammar in `Decision.TOKEN` and the checker's `DECISION_TOKEN`), a
   `target` record's answer only. `Decisions.targets0` reads each part's `TargetRestrictions.getMinTargets` and
   `getMaxTargets` (as `Explorer.randomTargets` does) and hands the shape to `Decisions.targetAnswer` (engine-free):
   - a part whose **minimum is 0** lists `target:none` first among its options -- as `attack:none` and `block:none` are
     listed -- and carries **`min: 0`**; left empty, it answers `target:none`;
   - a part whose **maximum is 0** lists no candidate: `[target:none]` alone, answered, a one-option record counted in
     `forced.target` and not written -- so Tear Asunder's shut half writes nothing, as before D486;
   - a part whose **minimum is 1 or more, left empty** (an engine fault the cast will meet as "failed to target") answers
     `target:none` too, listed, with its `min`, **`complete: false`** and **`why: "NO_TARGET"`**; the priority and
     modes callers (`PolicyControllerAi`) keep that `why` rather than writing `STALE_TARGETS` or `MODES_DRAWN` over it;
   - a part whose answer carries only a target the seat cannot see is **not** "none": it keeps its null answer, which the
     audit fails, as before.
   `min` is present exactly when `target:none` is listed. Every other target record is what it was.
2. **The M55 audit** (`tools/check-redaction.mjs`): `target:none` passes only where it is listed (D4 already said the
   answer is an option); listing it needs `min`; `min` 0 passes; `min` 1 or more passes only beside `complete: false`
   and `why: NO_TARGET` with `target:none` chosen, counted (`M76 empty mandatory target parts`); `min` without
   `target:none`, `NO_TARGET` anywhere else, `target:none` on another kind or inside a list of answers all fail; a null
   answer fails -- except **J171's legacy shape**, below.
3. **The legacy shape is accepted, dated and counted** (`legacyNullTarget`; `M55 legacy null target records=<n>`):
   `kind: "target"`, `by: "forge"`, `source: "targets"`, `chosen: null`, two or more `target:<id>` / `target:p<id>`
   options, no `target:none`, and none of `min`, `why`, `complete`, `hidden`, `explore`, `search` -- exactly the 4,717
   records above. **Decided: accept, not re-run.** (1) found no leak, and the alternative is about four hours of the five
   spines for records whose every answer the stack text confirms. A record written after D487 lists `target:none` and
   carries `min` when its part may be empty, so it can never take the legacy path; a null answer of any other shape still
   fails (the controls below).
4. **Not changed: the atlas's replay and plans.** `Atlas.Unit.expect` and the schedule compare the search's candidate
   tokens at the branched decision (`SearchPolicy.token`, `Atlas.Hook.decision`), never a decision record, and the
   schedule header holds the plan and the decks' hashes: a resumed J171 plan is unaffected. Measured: the s09 baseline on
   this branch lists the same 27 decisions with the same tokens as J171's `baseline.json`.

**Comparability.** Records only; no play changes. The target records that list `target:none` and carry `min` are new
(every min-0 part: Fireball, "up to" abilities); records whose shut part has a maximum of 0 are no longer written (Tear
Asunder's, J171's 4,616); an empty mandatory part, which wrote `chosen: null` (failing the audit), now writes
`target:none` with `NO_TARGET`. A row or label built from target records sees the new token. `seat-identity` (gate 12m)
is the golden's in all four games: none of its games meets a min-0 part.

**Evidence.**

- **`DecisionSelfTest`** (in `bridge/build.sh`): `decision selftest: 219 check(s), 0 failure(s)` -- nine new
  (`target:none` a token, `option:none` and `target:nothing` not; `targetNone`: the "up to one" part left empty answers
  `target:none` listed first with `min: 0` and is written; with a target taken, none still listed; Tear Asunder's shut
  half `[target:none]` alone, forced; a min-1 part left empty `min: 1`, `complete: false`, `NO_TARGET`; a min-1 part with
  its target as before; a target the seat cannot see keeps null).
- **`node tools/check-redaction-selftest.mjs`**: OK, with nine `m76-*` controls in `fixtures/negative/redaction/`
  (`tools/make-negative-fixtures.mjs`): PASS `target:none` listed and chosen with `min: 0`; PASS an empty mandatory part
  marked `NO_TARGET` (counted); PASS the legacy null (counted); FAIL `chosen: null` beside `target:none`; FAIL a legacy-like
  null from a trigger; FAIL `target:none` chosen but not listed; FAIL `target:none` listed on a min-1 part unmarked; FAIL
  `target:none` without `min`; FAIL `target:none` on a priority record. `web/test/cubelab-record.test.ts` holds the same
  on the committed decision recording.
- **The s09 reproduction on the new shape**: `CUBELAB_HOME_ROOT=var/d487-homes tools/cubelab.sh atlas --deck-a
  …/s09-pauper-2009/decks/pauper-2009-00001.dck --deck-b …-00002.dck --seed 2109 --phase both --rollouts 0 --decisions 1
  --branch-random 10 --jobs 4 --out var/d487-s09`: the baseline's 27 decisions are J171's; it branched d13 (J171: 408 of
  its 1,700 logs flagged), 300 branch games (60 random, 240 Forge), **checks: clean** (7,975 rows, 602 frame logs, 2 leak
  checks). 244 Tear Asunder casts, each with its shut half empty; **0 null answers**; 1,805 target records, 83 listing
  `target:none` with `min: 0` (Fireball, "any number of targets"; Forge chose targets in every one), none of them
  answered `target:none`; `forced.target` 161 over the logs. The new checker over the 602 logs: 602 PASS, 0 legacy
  records, 0 empty mandatory parts. No J171 null comes from a min-0 part this run could reach with a chosen
  `target:none` (the planeswalkers are s04's and s08's, 101 in about 25,000 logs); the written shape of that case is
  `DecisionSelfTest`'s and the checker's controls.
- **The J171 sweep**: the new checker over every phase-B frame log of the five spines, 100 a call, `--empty-hand-ok`,
  six at once (54,360 logs, the baselines' ten included; 7 min 42 s): **54,360 PASS, 0 FAIL**, and the legacy count is
  exactly the scan's -- s02 4,152 logs PASS, 1,426 legacy records in 1,212 logs; s04 11,552 PASS, 62 in 61; s08 13,502
  PASS, 39 in 38; s09 12,152 PASS, 2,361 in 2,361; s10 13,002 PASS, 829 in 829: **4,717 legacy null target records in
  4,501 logs**, the logs J171 flagged, and no other failure. So J171's atlases re-checked under this checker pass, and
  their data can be used as it is.
- **`./tools/ai-bench.sh --selftest`**: `242 check(s), 0 failure(s)` (not in the gate). **`npm --prefix web test`**: node
  1850 pass, 10 skipped, 0 fail; vitest 161 passed. **`tools/cubelab.sh seat-identity`**: all 4 games are the golden's.
- **The gate**: `rm -rf bridge/out && ./tools/make-forge-home.sh && FORGE_JAR=<config.json's forgeJar> WSPORT=9800
  GATE_JOBS=4 ./tools/check-all.sh`, **`check-all OK`**, 539.0 s wall, 60 jobs (`var/check-all/20261026-122302-2891707`;
  decision selftest 219/0; 12m all 4 games the golden's, so no regeneration; node 1864 pass, 11 skipped, 0 fail; vitest
  161 passed).

**Rejected.**
- **Drop the record when the answer is empty** (treat it as forced): it would hide a choice Forge made -- leaving an "up to"
  part empty is an answer a policy should learn -- and an empty mandatory part, a fault, would vanish with it.
- **Accept `chosen: null` in general**: null is not a token, and the audit's D4 rule (the answer is an option) is what
  catches a record that answers something it never listed.
- **Re-run the five spines** (about four hours) instead of the legacy case: the verification above already reads every
  one of their 4,717 records against its cast.
- **`min` on every target record**: every target record's shape would change and the seat-identity golden with it; the
  checker needs the minimum only where `target:none` is listed.

**Not done.**
- A cast with only a hidden target (a face-down card in exile) still answers null and fails the audit: none was met.
- An engine record that **answers** `target:none` from a min-0 part was not produced in this lane's runs (the s04 and s08
  planeswalkers are rare); the next night on s04 or s08 shows it, counted by nothing new -- a plain written record.
