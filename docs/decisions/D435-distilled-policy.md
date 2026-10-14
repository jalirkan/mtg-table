## D435 — the distilled policy (B1): search-v2's candidates scored by a small model trained on search-v2's own choices, the rows exported by the searching seat, a ladder kind of its own

*Branch `pc/j126-distill`, for lab job J126 (pc-jobs). The block D435–D436 is this lane's; D436 is unused.*

**2026-10-14**

**Context.** The search growth plan the owner approved on 2026-10-08 ends with B1:
distil search-v2 (D412: the anytime search at 1.5 s a decision) into a policy that plays
close to it at a fraction of the time, for faster lab games and for the live hint
(D429). The cloud's brief (pc-jobs README, 2026-10-14 00:45) asks for rows of (state,
search-v2 choice) at the decisions the search covers, a small model trained with
`tools/ml` on D361's feature encoder, a split by game with a held-out test set, top-1
agreement per decision kind, and two fixed matches (D398): distilled vs search-v2 and
distilled vs Forge Default. Nothing exported decision rows with the search's own
candidates: D347's decision records carry the state frame and the option tokens, which
a Python reader would have to turn back into candidate features, and then the Java seat
would need the same features computed a second way.

**Decision.**

1. **One feature function, in Java** (`mtgtable.ai.DistillFeatures`). The state is
   D361's encoder (`FeatureEncoder` over `GamePosition`, the deciding seat's knowledge
   only) on the vocabulary with no cube card: the 243 board features and the nine
   special slots x 17 states, 396 numbers, one schema for every cube. Each of the
   search's candidates (Forge's answer first) is a short vector per kind: a priority
   play (29: what it is, its cost, its body, its targets and whose), an attack
   declaration (18: how many, power, evasion, what stays home, power against the
   opponent's life, the difference to Forge's), a block declaration (19: kills,
   deaths, chumps, trades, damage let through, lethal). No card name, id or text.
   The exporter and the distilled seat call the same function, so training and play
   read one implementation; `fixtures/distill/names.json` is the layout Python reads,
   and `DistillSelfTest` fails when the two drift.
2. **The rows come from the searching seat** (`mtgtable.ai.DistillRows`):
   `MTGTABLE_DISTILL_ROWS=<dir>` in a JVM's environment makes every p, a and b decision
   of a search seat append one JSON line to `<dir>/rows-<pid>.jsonl` — the state
   (sparse), every candidate's vector, the index PLAYED (0 after a fallback or an
   invalid declaration), the fallback, the decision's wall time — after a header line
   naming the layout. The cube lab names each game (`lab:<draft id>:g<n>`) and writes an
   `end` line when it finishes, so a reader keeps only ended games and a game a killed
   worker left half-written (replayed from its seed by the next worker) is not counted
   twice. A reader keys a game by its rows folder and the lab's key (`<folder>|lab:<seed>:g<n>`): the lab's key repeats across cubes drafted at the same seeds. Off unless the variable is set; nothing else changes.
3. **The model** (`tools/ml/distill.py`, numpy, gradients by hand and checked): per
   kind, a scorer over the decision's candidates, `x_i = [state, c_i, c_i − c_0]`
   standardised, `w2·relu(W1 x_i + b1) + u·x_i`, softmax over the candidates,
   cross-entropy on the played index, Adam, early stopping on validation loss. The
   split is by game (`sha256("J126|<game>")` mod 100: 80/10/10), the same rule as
   dataset.py's split_of; rows whose search fell back are left out and counted. A kind
   with too few training rows gets no head.
4. **The seat** (`SearchConfig` `distill=<model.json>`, `mtgtable.ai.DistillModel`):
   the search's own candidate generation at p, a and b, then the model's arg max (the
   lowest index on a tie: Forge's answer when nothing scores above it), no rollout;
   Forge's answer at a kind the model does not cover, and at every decision search-v2
   does not search either (mulligans and targets are Forge's in search-v2: D417's
   switches were not adopted, J115 and J116). The Java forward pass matches numpy's to
   1e-9 on `fixtures/distill/golden.json`. A distilled seat never exports rows.
5. **On the ladder**, the kind `search-distill`: search-v2's params plus `model`, the
   12-hex sha256 prefix of `var/ml/models/distill-<model>.json`, pinned to the file's
   content exactly as `search-eval` is (D354). `distill.py register` copies the model
   there and writes a registry (the committed players plus
   `search-v2-distill-<sha12>`) for `ai-ladder.sh match --registry`.
6. **Time is measured the same way on both sides.** `search.<kind>.us` (the decision's
   wall time from before its candidates are generated to its verdict) is counted by
   the search and by the distilled seat alike, and the match line carries each side's
   `msMean` per kind and `msPerDecision` over p + a + b. The job's speed rule compares
   search-v2's mean time over the held-out decisions (from the rows) with the distilled
   seat's measured in its match against search-v2.

**Rejected.** Reading D347's decision records and recomputing candidate features in
Python (two implementations of one feature, and the Java one needed anyway); the full
cube vocabulary in the state (three cubes, three schemas, three models, and the card
block is what overfit in D305); a per-candidate "after" state from applying each
candidate to a copy (a copy and a resolution per candidate is most of a rollout's cost,
which is what distillation removes); a new dependency (torch): numpy trains a model
this size in minutes.

**Measured** (engine-free and engine self-tests, this branch): `DistillSelfTest` 29
checks; the ai-bench self-test's four J126 scenarios (rows exported for a priority play
and an attack by search-v2, the distilled seat deciding both with no rollout in about
0.4 ms including candidate generation, and writing no row); `tools/ml/tests/test_distill.py`
9 tests (a planted rule learned to 0.94–0.97 held-out agreement).
