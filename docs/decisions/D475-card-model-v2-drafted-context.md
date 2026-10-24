## D475 — card model v2: drafted context, the drafter's own mix, power concentration measured, a robust generator (amends D473)

*Branch `pc/balance-model-v2`. D475 (`node tools/decisions.mjs next` gave D474, which #199 holds). Amends **D473**
(the library card model and the balanced-cube generator); builds on **D377** (the makeup null), **D447** (the
deck census) and the first measurement night of generated cubes, J160 (`pc-results/results/J160/summary.md`), with
J159 (`results/J159/summary.md`) as the noise floor.*

**2026-10-24**

**Context.** J160 measured D473's five generated cubes: the model's transfer error was RMSE .030 over colours and
.047 over qualifying pairs (Omega, J159: .017 / .021); every cube predicted "even to .01" measured gaps of
.04–.10; blue was under-predicted wherever blue's own power was drafted (Ancestral Recall in .51 of the high
cube's blue decks, Time Walk .54) and on Omega (.448 predicted, .477 / .480 measured); WU and UG ran over the
prediction on every cube that judged them; and the lab drafter built 15–71% three-colour decks against the 4%
D473's mix assumed. D473's census values come from random decks; its deck mix and play curve from J145's
Omega decks. v2 asks what drafted games, the drafter's real decks and an honest search can fix — and checks
every claim by leaving the night out.

**Decision.**

1. **Drafted context as a source.** `balance-model` takes measured nights (`--night <dir>`, repeated, or
   `--sources a,b`): a J145-shaped folder or a report folder of per-cube files (J160's `report/`); each deck
   names its cube, found under `cubes/` by id. Every arm-B game is fitted (J145, J159: lab, human-picks and
   Forge-ranks drafters; J160: five cubes, lab) — 32,777 games, 534 cards, decks clustered by draft, makeup
   groups by band. Each deck's census strength (the sum of its cards' census values, legacy + powered or pauper
   by the cube's majority band) enters as a covariate with a free coefficient **alpha** per band, and each card's
   own term is ridge-shrunk toward 0 — so toward alpha × its census value: a card with little drafted data keeps
   that, one with a lot goes where the drafted games say (the "blend"; `buildDesign`'s `prior` / `priorKey`).
   **5-fold CV by draft** (no draft on both sides, every game scored) chose it: held-out Brier .24806 makeup
   groups only, .24501 census values × alpha, .24253 drafted values alone (lambda 800), **.24193 the blend**
   (lambda 1600). alpha = .948 (legacy), .827 (pauper): drafted context compresses the census's spread a little.
   Its bootstrap carries the census's replicates as the prior, so a value's interval holds both sources' noise.
   `cards-drafted.tsv` lists census, drafted-alone and blend values for every card side by side.
2. **The drafter's own mix.** The lab drafter (lab.ts, the TypeScript code and weights a night drafts with) is
   simulated on the candidate cube at fresh seeds (`SIM_SEED` 947,500,001; 2,000 grid drafts, about 6 s): it
   re-drafts J160's recorded decks exactly from their seeds (the test holds ten), and the deck profile from the
   facts equals the recorded one on all 32,800 decks. Its decks give the mix `predictPayoffsV2` uses — the
   three-colour share, cards a colour, gold, colourless and splash for two- and three-colour decks, the makeup
   term of each — and the rating play curve. The per-scale mix measured on the nights' lab decks is reported
   (legacy: 18.6% three-colour, 8.4 cards a colour, 0.58 gold, 5.3 colourless, 0.32 splash; pauper: 70.7%) but
   not used for a new cube: the cube's own simulated decks are what the drafter will build from it.
3. **Power concentration: measured, and it is not what was wrong.** A card's concentration is its share of
   its colours' decks over the share the mix and the rating curve give it; it multiplies the card's weight.
   Ancestral Recall (.51 of the high cube's blue decks) is .98 and Time Walk (.54) 1.03 — the rating curve
   already puts a 100-rated card in about half its colour's decks — against about 1.4 over a uniform share
   within the class. The night's own decks (the oracle mix) with census values still predict the high cube's
   blue at .498 (measured .566), and Omega's at .441: **the blue miss is in the cards' values, not in where the
   drafter puts them.** Drafted values move exactly those cards: Time Walk +2.6 → +5.0 points, Ancestral +1.4 →
   +3.0, Sower of Temptation +1.9 → +4.9, Man-o'-War (unmeasured in the legacy census) 0 → +2.3. That closes
   Omega's blue miss when the other Omega night is in the fit (J159 held out: .476 against .477; J145 held
   out: .478 against .480; concentration alone with census values: .449). It does **not** close the high
   cube's miss out of sample: no other night drafted Ancestral or Time Walk, and with J160 held out v2 says
   .501 (with only the high cube held out .517; in-sample .546). Concentration stays in the predictor because
   it helped where it could be judged (Omega pairs, J159 held out: .020 → .017; cube held out .023 → .020) and
   cost nothing on J160 (.028 / .042 either way).
4. **A robust generator.** The flow is v1's, on v2's values and SDs. The search (`balanceSearchRobust`) scores a
   swap by the **mean gap over bootstrap replicates** (max |colour − .5| + max |pair − .5|, pairs a night would
   judge: 400+ deck-games at 2,000 drafts) on the mix and concentration the drafter shows on the flow's cube,
   on the even replicates; takes a swap only if it buys .002 of that mean (`--min-gain`); allows a card within
   25 Forge rating points of the one it replaces (`--rating-window`) and 3 points of the level; then the result
   is re-drafted and kept only if its mean gap on the **odd replicates**, which the search never saw, beats the
   flow's by the same .002. Each cube prints three gaps: the point gap, the robust gap (95%), and the gap with
   the validation's transfer error (.021 a colour, .030 a pair) added to every cell — what a night should expect
   to measure before its own noise. #196's .003–.008 were point gaps of a search choosing between cards on their
   noise; v2's point gaps are .040–.055, robust .047–.058, with transfer .09–.10.
5. **Validation before any night: leave one night out.** Every measured cube is re-predicted with the drafted
   fit refitted without its night (J160's five cubes: without all of J160 — only Omega's drafted games and the
   census remain; J159: without J159, J145 in), v1's prediction of record beside it (reproduced exactly: J159
   .017 / .021):

   | night held out | v1 colours / pairs | **v2** colours / pairs |
   |---|---|---|
   | J145 (Omega; J159 in) | .018 / .024 | **.007 / .018** |
   | J159 (Omega; J145 in) | .017 / .021 | **.007 / .017** |
   | J160 legacy-even-high | .044 / .063 | **.040 / .056** |
   | J160 legacy-even-high-nopower | .028 / .025 | **.025 / .016** |
   | J160 legacy-even-mid | .025 / .039 | **.025 / .034** |
   | J160 legacy-even-mid-nopower | .027 / .040 | **.026 / .037** |
   | J160 pauper-even | .023 / .056 | **.022 / .058** |
   | J160 pooled (25 colour cells, 23 pairs) | .030 / .047 | **.028 / .042** |

   Each refit estimates its own alpha and makeup terms; the penalty (1600) is the one CV by draft chose on all
   the drafted games, the one choice a held-out night shares with the fit (lambda 800 and 3200 give J160
   held out .025 / .041 and .026 / .042 on the night's own decks, against 1600's .025 / .042).

   **Out of sample on a new cube, v2 is only a little better than v1** (.030 → .028, .047 → .042). Its large
   gains on Omega come from the other Omega night: a cube re-measured is predicted well once it has been
   drafted once, a new cube is not. Leaving the cube out instead of the night (the other J160 cubes in) gives
   .022 / .036 on J160 and .018 / .024, .014 / .020 on Omega. The decomposition says why: on the night's own
   decks (the oracle mix) v2's values score .025 / .042 on J160, so the drafter's mix accounts for almost none of
   the remaining error; the values do. Pair-identity and colour-identity terms in the drafted fit (WU's and UG's
   excess as a deck property) were tried and did not transfer (J160 pooled .025 / .042 with or without them, on
   the oracle decks), so they are not in v2.
6. **The cubes.** `cubes/library/balanced/v2/`, new ids (`balanced-v2-…`, so a night's decks still name one
   cube): `balanced-v2-legacy-even-high`, `-legacy-even-mid`, `-pauper-even`, and `-legacy-even-high-nopower`,
   `-legacy-even-mid-nopower` (`--exclude cubes/library/powered-exclude.txt --suffix -nopower`; the pauper cube
   is the same 180 cards without the list, so as in D473 it has no `-nopower` file). v1's files are untouched
   (J160 measured them; the v1 command regenerates them byte for byte). The pauper level scan found no level
   above 0 its colours could hold, so `-pauper-even` sits at 0 like `-mid`. Gaps (max |colour − .5| + max
   |pair − .5|, judged pairs only):

   | cube | search | point | robust (95%) | with transfer (95%) | flow alone: robust |
   |---|---|---|---|---|---|
   | balanced-v2-legacy-even-high | 7 swaps kept | .040 | .047 (.025–.073) | .093 (.051–.146) | .071 |
   | balanced-v2-legacy-even-high-nopower | 6 swaps kept | .055 | .058 (.034–.095) | .100 (.058–.159) | .079 |
   | balanced-v2-legacy-even-mid | flow kept (1 tried) | .041 | .051 (.025–.074) | .096 (.053–.148) | .051 |
   | balanced-v2-legacy-even-mid-nopower | flow kept (1 tried) | .040 | .049 (.026–.071) | .091 (.049–.145) | .048 |
   | balanced-v2-pauper-even | 11 swaps kept | .052 | .054 (.031–.081) | .091 (.045–.151) | .119 |

   Every colour cell's 95% interval with the transfer error is about ±.05 and every pair's ±.06–.07: each cube is
   predicted even to within what the model can tell, and a night measuring .05–.10 on one is consistent with
   it. The per-cell tables are in each document's header and in `model.json`. They are candidates to measure;
   nothing in the game, the bridge or evolve reads them.

   **Inputs** (each sha256 in `model.json`): J144's census (D473's two files), J145's and J159's
   `out/drafted-decks.jsonl.gz`, `out/games.jsonl.gz`, `out/balance.json`, J160's `report/<cube>.drafted-decks.jsonl.gz`,
   `.games.jsonl.gz` and `.balance.json` for its five cubes, the five cube documents and Omega's, and D473's facts
   file (`9b0b6501…`). Command: `tools/cubelab.sh balance-model --census <lab-j144> --omega <lab-j145> --night
   <lab-j159> --night <lab-j160/report> --facts <facts> --out <dir> --cubes-out cubes/library/balanced/v2`
   (and again with `--exclude … --suffix -nopower`), seed 1, 200 replicates, about three minutes on one core.

**Rejected.** Census values alone (worst by CV by draft, and they leave Omega's blue miss on any mix); drafted
values alone (they forget everything the census knows about a card the nights rarely drafted); summing values
over the drafter's simulated decks as the predictor of record (it ties v2 on J160 held out, .027 / .042, but is
worse on Omega with the cube held out, .026 / .037 and .020 / .034 — kept as the `v2decks` column); a per-band
analytic mix for a new cube (the three-colour share runs from 4% to 71% across cubes of one band: the cube's own
simulated drafts know it, a band average does not); pair- and colour-identity terms (point 5); stopping the
search at a point gap (#196's rule).

**Not decided here.** Which v2 candidate a night measures, and whether v2's out-of-sample gain (.002 a colour,
.005 a pair) is worth a night on its own — the lab's pre-registration. What would move the new-cube error: a
night's drafted games of the cards a candidate leans on (the high cube's blue power had none before J160).
