## D538 — the judged labels (605 atlas decisions read by two blind judges, 515 with an agreed label), the label probe (which option a ladder player picks at a recorded atlas decision), and the rule that says whether agreement with the labels tracks measured Elo, written before the probe has run

*Branch `pc/label-probe`, on `pc/search-horizon` (`6e554017`, D537's lane), which is off main `d1d6b20f` (D536's
merge); it merges after D537. The probe's code (`LabelProbe.java`,
`tools/cubelab/AtlasProbe.java`, `tools/label-probe.sh`, `tools/atlas/agreement.py`, a probe block on an atlas
unit, `ai-ladder.sh cfg`), the labels file, this file and PLAN's rows. **Written while J211 measured, alone: at the
time of writing no line of the lane had been compiled or run**, so everything it says about the code is a plan
until the build, the self-tests, gate step 12m and the smoke run of point 6 have passed. The live seat is meant to
be unchanged (point 5); that is a claim the gate checks, not one this file can make. **Amended the same morning,
after a read-only review and before any probe row existed**: the rule of point 7 gained a condition and a narrower
claim, point 6's stops got their words, and the read became one command whose output is the verdict. **And a
second time, after a second review, still before any row**: `forge-default` off the atlas is VOID too (it raised P1
exactly as a wrong mapping would), the rule refuses any read but its own (4,000 draws, seed 538, the 515 labels, its
repeats) and looks at every player in the rows, point 9's INCONCLUSIVE branch needs P1's point above 0 on the
unselected labels as the word does, and point 7's command names its output file. **And a third time, after a third
review, still before any row**: the read used to keep the last row of a (player, decision, repeat) and say nothing,
so the rows of two probe runs handed to it together could hide a VOID or move a pair; the rule now reads the rows
of one run of the probe under `--seed 538` and refuses anything else (point 4), it names the labels file by its
sha256 and every one of its five seats by its config hash, a search seat that answered under 95% of its repeats and
P1 with no interval on the unselected labels are NOT READ (point 6), and point 9's second look is a field of the
rule (`look`) so that it can buy nothing. The words of point 7 and their numbers did not change. The rule can still
change until J213 is posted, and only in this file; from the posting on it is fixed.*

**Status: the labels are recorded. The probe is written and unbuilt. The validity night is registered and unplayed.**

**2026-11-11**

**Context.**

- **The question is the second road D534 point 4 left open**: outside knowledge. The random-rollout track closed
  (D534); the search is worth about 87 Elo over Forge's AI and most of it is in its priority plays (D536). What the
  lab has not had is a cheap score for a seat that does not come from Forge's own judgment or from 1,200 games.
- **Two judge rounds came first.** J200 branched 82 *selected* decisions (the atlas label confident) where two
  blind language-model judges agreed on an option that is not Forge's: the judges' option was worth +0.050
  [+0.018, +0.082] win probability on the Forge map (KNOWLEDGE SHOWN). J203 did the same on 160 decisions *nobody
  chose*: +0.012 [−0.011, +0.036] on 58, the same direction at a quarter of the size, INCONCLUSIVE.
- **The owner chose judged labels** (2026-11-11) over the other outside-knowledge roads, with the cost reported
  before going wider. Wave 1 is that first step and point 1 is its report.
- **What a label is worth is not known.** J200 and J203 measure a judged option against Forge's on a map; neither
  says whether *agreeing with the judges* is a property stronger players have more of. If it is, agreement is a
  score a new arm can be given in minutes; if it is not, more labels buy nothing for the ladder. That is what the
  rule of point 7 decides, and it is written here before the probe has produced a row.

**Decision.**

1. **Wave 1, as run.** Universe: the move atlas v1's 1,003 label rows (`labels.jsonl`, sha256 `a246d32a…`), 997
   with a frame that matches the decision's state. Pool: the 712 of them never judged (the 154 confident decisions
   of round 2 and J203's 160 taken out; the two overlap on 29). Draw: 320, seed 538, stratified by kind (206
   priority, 92 attack, 22 block), from 75 spines of all six nights; the other 392 are wave 2's, in draw order.
   Each decision was read by two judges (A and B), each a separate Opus run on a batch of about 13 decisions with
   its own random order of the options: seat A's view at the aligned state frame (its hand, both battlefields, the
   stack, graveyards, exile, the opponent's hand size), both decklists, Oracle text for every card named, and no
   atlas number, no hint of which option Forge played. 48 runs, 640 judgings, none invalid.
   - **Cost: 5,293,643 tokens** (110,284 a run, 86,657 to 143,528; about 8,300 a judging), 475 tool uses, 124 s a
     run on average. Wave 2 at the same rate is about 6.5 million.
   - **The judges agree on 281 of 320 (0.878)**: 180 on Forge's move, 101 on one other move, 39 split. Judge A is
     on Forge's move at 201, judge B at 192. By kind, agreed / on Forge's / on another: priority 181 / 101 / 80,
     attack 79 / 61 / 18, block 21 / 18 / 3.
   - **Two departures from the earlier rounds, both disclosed**: the judge's prompt named its batch file in one
     line and the judge read it itself (the earlier rounds pasted the batch); and where J203 and round 2 judged the
     same 29 decisions, the unified set below keeps J203's judging (drawn without selection, read blind in the same
     format).
2. **The unified label set: `fixtures/atlas/judged/labels-judged-v1.jsonl`**, 605 rows, one a decision: wave 1's
   320, J203's 160 and the 125 of round 2 that J203 did not read. Key `<night>/<spine>/d<d>`; `source`, `kind`,
   `k` (options), the atlas `status`, each judge's option and confidence (`A`, `B`, `confA`, `confB`), **`label`:
   the option both judges chose, or null where they split**, its token and Forge's, and the atlas's map values for
   the label, Forge's option and each judge's (`random*`, `forge*`; null where the map has none). Option 0 is
   Forge's recorded move in every row.

   | | decisions | agreed label | = Forge's move | another move | split |
   |---|---|---|---|---|---|
   | all | 605 | 515 | 289 | 226 | 90 |
   | priority | 390 | 334 | 155 | 179 | 56 |
   | attack | 174 | 142 | 106 | 36 | 32 |
   | block | 41 | 39 | 28 | 11 | 2 |
   | wave 1 | 320 | 281 | 180 | 101 | 39 |
   | J203 | 160 | 128 | 70 | 58 | 32 |
   | round 2 (not in J203) | 125 | 106 | 39 | 67 | 19 |

   77 spines; 6 labelled decisions a spine at the median, 14 at most. **The set is not a random sample of the
   atlas**: round 2's rows are the confident decisions, which is where the judges leave Forge most (67 of 106).
   Any share over the whole set carries that mix. Point 7's statistic is a paired difference on one fixed set, so
   the mix cannot favour one player of a pair by itself, **but it does decide what the difference is about**: round
   2's 106 labels were chosen where a rollout map was confident that Forge's move is beaten and the judges then
   agreed with the map at most of them, so a search that leaves Forge there agrees with the label for the reason
   J200 already measured. P1 over all 515 would largely restate J200. Point 7 therefore also requires P1's point to
   be above 0 on the 409 labels nobody selected (`source` other than `round2`).
3. **What the labels say against the atlas's own maps, with no new game** (computed once, after wave 1, from the
   file of point 2; it decides nothing).
   - Stratified back to the 1,003 rows, "play the agreed label, else Forge's move" gains **+0.0108 [+0.007, +0.015]**
     win probability a decision on the random map, 28% [18.5%, 37.8%] of what always playing the map's best option
     would (0.0386). **All of it is at the confident decisions** (+0.081 a decision against an oracle of 0.174);
     at the rest it is flat (−0.002 against 0.014).
   - On the unselected rows (J203 and wave 1, 480 decisions, 159 labels that are not Forge's move) the label is
     above Forge's option at 0.544 [0.485, 0.607] of them on the random map, +0.004 [−0.006, +0.013] a label; on the
     Forge map, where it exists (22 labels), 0.682 [0.50, 0.84], +0.010 [−0.013, +0.029].
   - At the `partial` rows the judges' other picks are the options the random map stopped branching (above Forge's
     at 0.081, −0.061): the map and the judges disagree there about one class of play, and 47% of all labels that
     leave Forge's move are "cast it now where Forge passes".
   - **The random map is not the truth** (D534: a search that plays by it alone loses 19 to 44 Elo), so none of this
     ranks the judges. It says where they and the atlas part, and that the labels' measurable value so far sits in
     the decisions the atlas already called.
4. **The label probe.** `tools/label-probe.sh --decisions KEYS --player NAME --data <lab data> [--repeats N]
   [--seed S] [--workers K] --out ROWS` replays a spine's baseline game to decision d exactly as an atlas branch
   unit does (same decks, seed, `Default` on both seats, turn cap, the plan's candidate list, the baseline's tokens
   as the listing check) and, where a branch unit would force an option, **asks the named ladder player for its
   move in seat A**, maps the answer to an atlas option and ends the game. One row a (decision, repeat): `status`
   (`ok`, `off-atlas` — a move that is none of the listed options —, `ambiguous`, `mismatch`, `unsupported`,
   `error`), `option`, `token`, who answered (`by`: outlets, search or forge), the search's rounds, playouts and
   milliseconds, `replayMs`. The player is resolved by the ladder's own registry (`ai-ladder.sh cfg NAME` prints its
   config hash and seat config), so a probe row and a ladder night name the same seat by the same hash; a rows file
   made under another seat config or seed is refused.
   `tools/atlas/agreement.py --labels LABELS ROWS…` is the read: per player the share of labelled decisions at
   which it picks the label and the share at which it picks option 0, over all labels, by kind, split by whether
   the label is Forge's move, and on the two halves of `--split FIELD=VALUE`; its **departure precision** (of all the
   answers that leave option 0, the share that land on the label; a departure where the label is Forge's move is a
   miss); its row counts (rows, `ok`, `ok` on option 0, `off-atlas`, `searched`), for every player in the rows
   whatever `--players` names; for each pair named by `--pairs A:B,…` the paired difference
   A − B **in the direction given**, on every subset; every interval a 95% percentile bootstrap over spines from one
   shared draw, printed to four decimals and carried unrounded in `--json`. `--rule d538` prints point 6's stops and
   point 7's word from the unrounded numbers, and exits 2 on any read that is not point 7's own: another split,
   a pair missing, `--off-atlas drop`, a bootstrap that is not 4,000 draws on seed 538, a labels file that is not
   the recorded one (515 labelled decisions, sha256 `bbdcd021…ecd9bb`, both written in the rule's `D538_RUN`).
   **And on rows that are not one run of the probe under `--seed 538`**, counted over the rows as the files hold
   them, before one row of a repeat is kept: a row with no player or key, or a key that is not one of the 605; a
   repeat that is not a whole number from 0, or one at or past the player's repeats in point 7; a `seed` that is
   not the probe's own for that key and repeat under 538 (the tool carries a port of `LabelProbe.repeatSeed`); a
   status the probe does not write; an `ok` row whose `option` is not a whole number from 0 below the decision's
   option count `k`, or whose own `k` is not the labels'; a `searched` that is not true, false or null; two rows of
   one (player, decision, repeat) that are not errors, or more than two rows of one; and a row of one of the rule's
   five seats under another config hash than the ladder's (`cdd55e02a89c`, `3ed453ffef1c`, `fb8ae32c014d`,
   `646d59a008f6`, `e350d94649a4`, in `D538_RUN`). One `--out` of one probe run holds none of these (the probe
   settles a repeat on its first row that is not an error and tries an error once more), so a refusal means the
   files are not the night's rows: a smoke run's rows left in, a second run appended, a file edited. The counts are
   in the read's `audit` whatever the flags. **A refusal is no verdict**: the night is NOT READ until the rows are
   the night's own (point 6). `--json` does not overwrite a non-empty file that is not an earlier read. Its definitions (a decision counts once, by the mean over its answered
   repeats; `off-atlas` is an answer that is never the label and never option 0, or with `--off-atlas drop` no
   answer; `ambiguous`, `mismatch`, `unsupported` and `error` are no answer and are counted) are in its header and
   were fixed before any row existed. A worker that stops inside a replay writes `error`, never `mismatch`; an
   `error` row is tried once more and the second is final.
5. **What the probe's position is and is not** (each a limit on point 7's reading, stated before it).
   - The player is asked on the live engine at the atlas hook, after Forge's AI has answered; the judges read seat
     A's view at the aligned state frame and both decklists. The player sees what a seat sees and reaches hidden
     cards only through the search's own redeal; the judges know the opponent's list but not its hand.
   - The atlas lists at most 8 candidates; the ladder's search players consider 6, a prefix of them. A player that
     generates more (`rank=prior gen=24`) or an outlet play the listing does not hold can answer `off-atlas`.
   - Forge's own random draws during the ask come from the observing seat's throwaway generator, the same in every
     repeat; only the search's seed differs between repeats. The outlet policy starts with no memory of the turn.
   - The five players on a profile other than `Default` are `unsupported` and are not asked. A `+sim` or `+hybrid`
     player is refused before a game starts (the seat parser exits 2), never written as a row.
   - The ask is not side-effect free on the replay it sits in, and none of what it touches reaches a row or the
     picture a later row is made from, because the hook ends that replay after the answer: the priority path runs
     the player's target search on the real ability and puts the atlas seat's steer back; an outlet opportunity is
     counted on the atlas seat's own counters and remembered in its once-a-turn set; Forge's quiet random generator
     advances; `CubeLab.lastHook` keeps the hook reachable until the next game.
   - Search budgets are wall-clock: the probe runs at a ladder night's worker count, alone, or its picks are not
     the ladder seat's.
   - `PolicyControllerAi.choose` and two loops of `SearchPolicy` were refactored so the probe can call them. That
     is the seat path D509 froze: gate step 12m (`cubelab.sh seat-identity`) and `atlas-selftest` must pass with no
     `--write`, or the lane does not merge.
6. **Before any reading: the run must be a measurement.** In this order, each a stop that `--rule d538` prints in
   place of point 7's word.
   - **VOID**: `forge-default` has an `ok` row that is not option 0, or an `off-atlas` row. It is Forge's own
     answer handed back, so anything else is a fault in the mapping: the fault is fixed and the night is replayed.
     Not a finding. (An `off-atlas` row of it where the label is Forge's move lowers Forge's agreement and raises
     P1, which is the direction TRACKS needs; that is why it stops the read and is not counted as a miss.)
   - **NOT READ**: `forge-default` or `policy-outlet` has a row with `searched: true`, labelled or not, whichever
     players the read names; or one of point 7's four players has an answer (`ok` or `off-atlas`) at fewer than 95%
     of the 515 labelled decisions; or one of the four does not have its repeats (3 rows for a search player, 1 for
     `forge-default`) at every labelled decision it was probed at, or answered fewer than 95% of its repeats of
     the labelled decisions (3 × 515 for a search player: one answer of three at every decision is not the run);
     or a pair of the rule, P1 on the unselected labels among them, shares no decision or has no interval; or the
     read refuses the rows (point 4, exit 2). The night is not read until the cause is explained
     in writing, and a replay after a fix is read by the same rule. (A probe that stopped part-way is finished by
     running its line again, point 4; that is no replay.)
7. **The rule: does agreement track Elo?** One night (J213, after J212), alone, `{workers}` JVMs: the 605
   decisions, 3 repeats for a search player and 1 for `forge-default` and `policy-outlet`, `--seed 538`; read over
   the 515 labels with one command, whose `rule.word` is the verdict:

   ```
   tools/atlas/agreement.py --labels fixtures/atlas/judged/labels-judged-v1.jsonl --boot 4000 --seed 538 \
     --pairs search-v1-anytime:forge-default,search-v1-anytime:search-v2-rrandom,search-v1-anytime:search-v2-rrandom4 \
     --split source=round2 --rule d538 --json READ.json ROWS…
   ```

   `READ.json` is the file the read is written to and comes before the rows; the tool refuses to write it over a
   rows file. The word is `rule.word` of that file, and `rule.wave2` is point 9's answer. `ROWS…` are the night's
   own `--out` files and no others, every one made with `--seed 538` (`label-probe.sh`'s default is 1, and rows
   made under it are refused).

   The statistic is the tool's pair line, **Δ(A, B) = the mean over the labelled decisions both answered of (A's
   agreement − B's)**, A first, with its 95% interval; `off-atlas` counts as a miss. Every comparison below is strict
   and on the unrounded number. Three pairs, each the live search against a seat it has beaten by about 40 Elo or
   more in a 1,200-game match:

   | pair | A − B | measured, A over B [95%] | why it is in the rule |
   |---|---|---|---|
   | **P1** | `search-v1-anytime` − `forge-default` | +89.4 [+73.9, +105.1] (J210) | Forge's agreement is the share of labels that are Forge's move, 289 of 515 by construction. P1 above 0 means the search's departures from Forge land on the labels more often than they leave a label that was Forge's. It is the only pair that can show the labels are more than "be like Forge". |
   | **P2** | `search-v1-anytime` − `search-v2-rrandom` | +43.7 [+30.4, +57.1] (J199 a) | The same search, the same decisions searched, rollouts that are known to be worse. |
   | **P3** | `search-v1-anytime` − `search-v2-rrandom4` | +39.5 [+25.3, +53.9] (J202 a) | The same, on the guarded random seat's last version at margin 20. |

   The words, fixed now:
   - **AGREEMENT TRACKS ELO**: P1's interval is above 0, **P1's point is above 0 on the labels whose `source` is
     not `round2`** (409 of the 515), P2's and P3's points are above 0, and at least one of their two intervals is
     above 0.
   - **AGREEMENT DOES NOT TRACK ELO**: any of the three intervals is wholly below 0 (a seat measured about 40 Elo
     or more stronger agrees with the judges *less*).
   - **INCONCLUSIVE** otherwise.

   DOES NOT TRACK is tested first: one interval wholly below 0 is that word whatever the other pairs show. (Both
   words could hold only if P2's or P3's interval lay below 0 with its point above 0, a percentile interval that
   misses its own point; the order settles that case.)

   **What TRACKS would and would not say.** Suppose the labels were only Forge's move plus the judges' noise. Then
   every seat that leaves Forge loses agreement, P1 is below 0, and P2 and P3 are above 0 for a dull reason: the
   noisier search leaves Forge more often. So P2 and P3 above 0 are what that null predicts and show only that the
   labels cost a noisier search something; **P1 is the one pair the null gets wrong, and the whole claim "the labels
   know more than be like Forge" rests on it** — on about a hundred decisions where the search leaves Forge (point
   9), and, by the added condition, not only on the rows a rollout map picked. P1 alone would say nothing about a
   second seat, which is why the word needs all of it. No other pair, subset or player enters the verdict.
8. **Read beside the rule, deciding nothing** (named now so that none of it is found afterwards).
   - P1 by kind. J210 put about two thirds of the search's Elo in priority, a quarter in attacks and none shown in
     blocks; the labels would agree with that if P1 is above 0 at priority, smaller at attacks and near 0 at blocks.
     The corners of D535 are not probed: a corner's agreement is the search's on its searched kinds and Forge's on
     the rest, the same numbers again.
   - Where the search leaves Forge: the option-0 share at `label=forge` against `label!=forge`. If the judges and
     the search find the same decisions wrong, the search leaves Forge more where the label does.
   - P1 on the unselected rows alone (J203 and wave 1) with its interval, and on round 2's (its point on the
     unselected rows is in the rule; its interval there is not).
   - Each search player's departure precision, and P1's by kind: the plainest form of "when it leaves Forge, does
     it land where the judges did".
   - `search-v2-rrandom − forge-default` and `search-v2-rrandom4 − forge-default`. Neither random seat has played
     Forge's AI; they are about +45 and +50 over it only by adding two matches, so these two read as context.
   - The other players probed, each with its measured Elo against `search-v1-anytime`: `policy-outlet` (−84.4,
     J204 b), `search-v2-rrandom4-m40` (−20.9, J202 b), `search-v2-rmix4them-m40` (−6.9 [−17.8, +3.9], J209),
     `search-v2-ms750-r6` (−6.5 [−11.7, −1.3], J198), and, their Elo unknown as this is written,
     `search-v2-no-b` (J211) and D537's three arms (J212). Agreement against Elo over all of them, as a table and
     a rank correlation. If the smoke run's `replayMs` puts the night over 8 hours, players are dropped from the
     end of this list, never from point 7's.
   - How often a search player's three repeats pick one option (its own seed noise, the floor under every Δ).
   - `off-atlas` taken out instead of counted as a miss (`--off-atlas drop`), for every pair.
9. **What each word does.**
   - **TRACKS**: wave 2 is judged (the 392 decisions, about 6.5 million tokens), the set grows to about 850 labels,
     and a new arm's agreement is read before its ladder night and printed beside its Elo. It is a screen: no arm
     is adopted or dropped on agreement alone, and a later decision says so if that ever changes.
   - **DOES NOT TRACK**: wave 2 is not bought. The labels stay as data; no arm is chosen by them; what outside
     knowledge has shown remains J200's and J203's direct measurement on the map.
   - **INCONCLUSIVE**: the search changes Forge's move at about 18% of the decisions it searches (5,282 of 29,083
     in J210), so P1 rests on roughly a hundred decisions and may simply be too narrow a base. If P1's point is
     above 0 on all 515 labels and on the 409 nobody selected, **and P2's or P3's point is above 0** (with both at
     or below 0 the random seats agree with the judges at least as much as the search, and more labels of the same
     kind are not what is missing), wave 2 is bought once and the same rule is read once
     more on every label (the decision that buys it writes the new file's labelled count and sha256 into the
     rule's `D538_RUN` and makes its `look` 2, and nothing else), and that second reading is final: at `look` 2
     the rule's `wave2` is false under every word; two looks at one rule, said here, so the chance of a false
     TRACKS is at most twice one look's. If either of P1's two points is at or below 0, wave 2 is not bought.
10. **What is not decided.** No seat, budget, wire or protocol change. No player is registered. The judges are
    not put in a game loop (D418's seat is another thing). A policy distilled from the labels (D534 point 4's
    second road) needs a decision of its own, and this rule's TRACKS is a precondition for it, not a schedule.

**Alternatives rejected.**

- **Buying wave 2 now.** 6.5 million tokens for 392 more rows of a score nobody has shown to mean anything on the
  ladder. The validity night costs no tokens and a few machine hours.
- **A rank correlation over many players as the verdict.** Most measured seats are within 25 Elo of each other
  with intervals that overlap; their order is mostly noise, and a correlation over them would be decided by which
  seats were put in. Three pairs with gaps of about 40 Elo or more can each be wrong in a way that shows.
- **Counting only the labels that leave Forge's move.** A seat that always leaves Forge would score best. The
  labels that are Forge's move are what makes leaving it cost something.
- **Measuring the labels as J203 did, more branch games.** It answers a different question (is the judged option
  better on a Forge-against-Forge map) and J203 sized it: about 60 comparisons a night at one point of win
  probability, too slow to tell seats apart.
- **Asking the judges and the players the same thing exactly** (the player from a redacted frame, or the judges
  without the opponent's list). The player is the ladder's seat as it plays; changing what it sees would measure a
  seat that does not exist. The difference is point 5's first line.

**Unverified as written** (to be struck or corrected at the lane's first build).

- That the lane compiles against the pinned jar, that the decision self-test reaches 434 checks (D537's 404
  and this lane's 30), and that gate step 12m passes unchanged: none run. `agreement.py` and its unit tests are
  Python and have run (24 tests; 32 in `tools/atlas/tests/`).
- **That `agreement.py`'s port of `LabelProbe.repeatSeed` gives the Java's numbers.** The port was written from
  the source and its two constants (`repeatSeed(538, "J186/s01/d9", 0) = 100225255197839`, repeat 1
  `134260492138398`) are Python's; the decision self-test holds the Java to the same two, and the smoke run's rows
  must pass `--rule`'s audit with `seedMismatch` 0. If the build shows the port wrong, the port is corrected and
  the constants with it; the rule's refusal stands.
- That every one of the 605 keys replays without a `mismatch` on today's bridge: J203 replayed all six nights'
  spines on 2026-11-09 without one, and since then only the search's rollouts changed.
- The night's length: 605 × 3 × ten search players and 605 × 2 is 19,360 replays; at 6 s a replay and 7 workers
  about 4.6 hours. `replayMs` in the smoke run gives the real figure.
- P1's base ("roughly a hundred decisions") is J210's rate applied to 515; the atlas's decisions are not a ladder
  night's mix.
