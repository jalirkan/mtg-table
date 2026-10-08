## D416 — The cube lab gets an opt-in human-pick drafter: one seat drafts grid lines with ForgeCoach's 17Lands pick model, so a mirrored head-to-head can ask whether it builds stronger decks

*Branch `c/human-pick-drafter`.* Reads ForgeCoach #119 (`docs/human-picks.md`, `src/cube/humanPicks.ts`,
`scripts/human-picks/fit.py`, the shipped `public/cubes/<cube>.picks.json`), J111 and J112
(`results/J111/`, `results/J112/` on `pc-results`). Changes nothing a plain run does.

**2026-10-08**

**Why.** ForgeCoach #119 fitted a conditional-logit pick model to 17Lands' human Powered Cube picks:
a per-card pick strength *s* plus colour-commitment and curve coefficients. On held-out human drafts
cut to Vintage's cards it names the human's pick 73% of the time; the cube lab drafter's ratings name
it 35%. J111 found the lab drafter over-drafts blue (1.4–2.1× expected) and that Forge plays blue
worse; J112 found a stronger pilot barely reorders card win rates. Whether picking like humans makes
**stronger decks** in Forge's games is a different question from predicting human picks, and only a
head-to-head answers it. That is a PC job (J114); this decision is the drafter it needs.

**Decision.**

1. **`tools/cubelab.sh run … --drafter human-picks:<file> [--drafter-seat A|B]`** (`humanpicks.ts`).
   The named seat chooses its grid lines with the pick model; the other seat is the current drafter
   (`aiChooser`, the cube's ratings and weights). The deal, who opens each grid and both deckbuilders
   (lab builder, the cube's ratings) are a plain run's for that seed. Off, a run is byte-for-byte the
   old one, and its version id does not change for this reason.
2. **The utility is ForgeCoach's, exactly.** `u = s·(1 + γ·t) + β·x`, t = min(1, pool / tScale), the
   eleven features of `humanPicks.ts` `pickFeatures` / fit.py `features`, constants from the file. The
   file's colours replace the lab's for a covered nonland card (ForgeCoach `modelFacts`: a cube
   document files the Moxen under their colours; the model saw them colourless). Every other fact is
   the LabCard's (Forge colours, `cmc`, `land`, `produces`, whose rules match ForgeCoach's
   `producesOf`). Tests: fit.py's own features and probabilities on 30 held-out Vintage picks
   (ForgeCoach's golden file), and `humanPicks.ts`'s output on eight hand-made packs over both cubes,
   built from LabCards.
3. **Uncovered cards** (not on Arena: Vintage 28 of 180, Synergy 101 of 180) get
   `s = a + b·rating`, the least-squares line of *s* on the lab rating over the cube's covered
   cards: the expected human strength given the number the current drafter uses. Vintage
   −3.785 + 0.0587·rating (r 0.53), Synergy −2.099 + 0.0294·rating (r 0.48). Fitted when the drafter is
   built; written to `run.json`. Regression to the mean is intended: a rating says less about human
   strength than the file does, and the line says how much.
4. **A grid line is worth Σ exp(u) over its cards, in pick order** — the card with the highest u
   against the pool first, each later card against the pool plus the cards before it. exp(u) is the
   Luce weight the model gives a card, so the line's value is the chance mass a human's single pick
   would put on it. Why not Σ u: a logit's utility is defined only up to an additive constant, and a
   crossing second line holds 2 cards against a parallel line's 3, so Σ u would rank them by an
   arbitrary constant; Σ exp(u) ranks the same whatever the constant. exp also makes the best card
   dominate, as the current drafter's `setValue` (best + 0.6 × the rest) does. Ties: the lower line.
5. **Grid only.** Winston's take-or-pass compares a pile with a blind card's expected value, a
   scale the model does not give; the chooser refuses. One cube, the cube's ratings: no `--bridge`,
   `--synergy`, head-to-head or `--explore`. The picks file must name this cube's file.
6. **A run folder is one drafter.** `drafter` (kind, seat, file, its sha256, coverage, the fallback
   line) is in `run.json`, is one of `IDENTITY_FIELDS` (a folder never mixes drafters) and enters the
   lab version through `versionWeights` (seat and sha256).
7. **The files are read from a ForgeCoach checkout**, the one the PC keeps for jobs (J107, J112):
   `{ForgeCoach}/public/cubes/<cube>.picks.json`, pinned by the job's `repos:` line and checked by
   sha256. Only Vintage's and Synergy's files are copied here, as test fixtures (NOTICE 8b).

**Not decided here.** Whether the human-pick drafter becomes ForgeCoach's Draft vs AI drafter: that
follows only a J114 PASS, and is ForgeCoach's change.
