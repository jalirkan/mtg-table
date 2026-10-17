## D451 — The move atlas: both seats random under mechanical guardrails, every option of a decision forked and played out under a random and a Forge continuation, the two regret maps side by side (`cubelab.sh atlas`)

*Branch `pc/move-atlas`, stacked on `pc/record-the-cake` (D450, whose block D450–D452 this is).*

**2026-10-16** (written with the prototype; the smoke below is the only play)

**Context.** Justin, 2026-10-16 evening, in substance: explore moves with BOTH sides making random
moves under mechanical guardrails, so that the result owes nothing to Forge's play, and use sense
about what counts as a sensible move; he wants to see what we would gain. Until now every lab game
was Forge's AI on both sides (D358's exploration replaces a few decisions at random and keeps the
rest Forge's), so every value the lab measured — a card's, a move's — is "with Forge playing on". An
option's value under random play afterwards is a second map of the same decision; where the two
maps agree, the value is the move's; where they part, it is the play after it.

**Decision.**

1. **The random seat is D358's exploration path at epsilon 1** (`ExploreMath.Config.random`, the
   `playExplore` block's `random: true`), not a new `--ai-policy random` seat. The path already owns
   the seeded per-seat generator that never touches Forge's `MyRandom`, the random attack and blocks
   (redrawn until Forge says the declaration is legal), the random single target, the decision
   records' `explore` mark and the cube lab's per-game seeding; a second seat would duplicate all of
   it. What the random seat adds: at a priority it picks uniformly among pass, each land it may play,
   Forge's own answer, and EVERY spell or non-mana ability it can play and pay for now — Forge's
   per-card judgment is not asked, and a targeted play gets targets drawn uniformly from the legal
   ones it can see (a part with divided damage, a cross-target constraint, or no visible legal target
   leaves the play out). Mana payment (Forge's auto-pay), costs, modes and every other choice stay
   Forge's: the engine's own answers to "how", not "what". Nothing changes for a seat that is not the
   random seat: `cubelab.sh seat-identity` plays a Forge, a search, a D358-exploring and a plain census
   game and holds each to a golden made from origin/main before D450 (`fixtures/cubelab/seat-identity.json`).
2. **The guardrails are mechanical, never strategy.** They say what counts as a move, not which move
   is good:
   - **G1, the land drop:** whenever a land play is legal, the seat plays a land (uniformly among its
     lands). A land drop is not a decision about the game's direction; skipping it at random would
     make most random games mana-screw games.
   - **G2, no pass before the land drop:** in its own first main phase with the stack empty the seat
     never passes while a land drop is pending. G1 makes it unreachable here; it is kept as a counted
     check (`noPassMain1`, expected 0).
   - **G3, no pure no-op twice in a row:** an activated ability whose resolution left the public state
     unchanged (the turn and phase, every life total, poison and counter, every zone's size, every
     permanent's id, controller, power, toughness, damage, counters and attachment — not the stack,
     mana or tapped status, which a cost changes) is not offered again at the seat's next decision with
     the stack empty. It stops loops, not plays (`noRepeatNoOp`).
   - **G4, keep:** the opening hand is always kept (no exploration there).
   - **The turn cap** (default 40, game turns): a game still running at the start of turn 41 is ended
     as a draw and recorded as one (`TurnCap`), in phase A's games and in every branch.
   "Sense about what counts as a sensible move" is held to that: a mana ability is not a move, a spell
   with no legal target is not castable, a land drop is always made, a loop is not repeated. Everything
   else is uniform. G1 and G4 are read back from every random seat's own decision records after the
   run (`guardrailCheck`): a land offered and not played, or a mulligan, fails the atlas.
3. **The pair, by rule** (`--pair auto`): the line of `tools/ai-bench/pairs-confirm.txt` with the most
   ladder games and the most even record, as ONE score — the smallest |p − ½| + 1.96·√(p(1−p)/n), p deck
   A's share of the line's decisive ladder games (every pilot, both seats), n those games: the pair we
   are most sure is even. Ties: more games, then the earlier line. The plan records the table; a resumed
   atlas keeps its plan's pair (the ladder keeps growing). The confirm set is the ladder's held-out set
   (D318): the atlas only measures on it, and its rows are rows of deck-set decks, which the dataset
   builders drop (D340, `tools/ml/reserved.py`), so none of it reaches a training set.
4. **Phase A:** N games from the opening, both seats the random seat, seed S × 1,000,000 + r (deck A
   on the play in every other game), every game recorded as D450's rows, ledger and both frame logs.
   Reported: A wins / B wins / draws (by the cap), game length, and how many rollouts put a 95%
   interval of ± 2 points on seat A's score at the measured variance (1.96² · var / 0.02²).
5. **Phase B, the fork.** The baseline game (seed S, Forge's Default on both seats, recorded) is played
   with every seat our controller with an observing search (D450, `observe=1,cands=8`); the search's
   own candidate generation lists seat A's options at each p, a and b decision with two or more
   (Forge's answer first) and hands them to an observe hook. A unit (one decision, one continuation, a
   chunk of branches) replays the baseline from its seed — Forge is deterministic for a fixed seed,
   decks and pilots (D450's replays) — checks that the decision lists the baseline's options, and
   there plays every option out on each of its branches: a copy as the search makes one
   (`LenientGameCopier`), the option forced as seat A's first answer, then **what seat A cannot see
   redealt from the multiset** (`Determinizer`: seat B's hand and library pooled and dealt again, both
   libraries shuffled), played to the end or the cap by the continuation — Forge on both seats, or the
   random seat on both. Branch i of every option uses one seed (the redeal, the engine stream, the
   random seats' draws): options are compared on common random numbers. Determinizing rather than
   playing on seat B's real cards keeps every atlas value a statement about what seat A could know
   (D312, D348) and is what makes the branches differ (with the real library order every Forge branch
   of an option would draw the same cards).
6. **The fork's checks.** Every branch: the copy after the redeal is the position — turn, phase, life,
   every zone's size, the battlefield card for card, seat A's hand card for card, seat B's hand and
   library the same cards between them (`forkProblems`, on every branch row). On request
   (`--leak-checks`, default 1 per unit): the branch is played again after seat B's real hand and
   library were dealt again IN THE REAL GAME — seat A's state at the fork, the result and seat A's rows
   must not move — and after seat A's own hand was swapped with its library, which must move them (the
   negative control). Every rows file passes D450's check (ids against the seat's own log) and every
   frame log `tools/check-redaction.mjs`. A problem is in `atlas.json`'s `checks` and exits 3.
7. **The arithmetic** (`tools/cubelab/atlasmath.ts`, engine-free, tested on synthetic data). A branch
   scores 1 / ½ / 0 from seat A's side. An option's value under a continuation is the mean with a
   Wilson interval (draws count half). Regret = the best option's mean − option 0's (Forge's answer,
   the one the baseline played), with a paired bootstrap interval over branches; the best is picked
   after the fact, so the point leans high and the interval is the part to read. The two maps'
   agreement at a decision is Spearman's correlation between the options' means under each
   continuation, with a bootstrap interval, and whether they name the same best option; over decisions,
   the mean correlation with a bootstrap interval and the same-best share with Wilson's. The decisions
   where the maps disagree most are listed lowest correlation first.
8. **Method only.** `atlas.json` (strict) and `atlas.md` (the two regret maps side by side and a plain
   paragraph on what they agree and disagree about) report with intervals and no outcome rule; nothing
   in an atlas is a verdict on a card, a deck or the AI. Its outputs are never `summary.md` or
   `metrics.json`.

**Rejected.** A new `--ai-policy random` seat (point 1). Branches on seat B's real hidden cards (an
oracle map, and identical Forge branches; point 5). Uniform choice over every engine question,
modes and costs included (Forge's choice API has dozens of entry points; the engine's own answer to
"how" is kept and named). A seed per option (no common random numbers: the option differences would
need several times the branches). Writing the branches inside the baseline's single process (one
worker; the replay costs one game per unit, ~1% of a unit's time). An outcome rule for the agreement
(Justin asked to see what we would gain: the job reports it with intervals).

**Measured** (this branch, two workers beside the lab's seven; `--pair auto` chose line 18,
peasant-900000007 A vs B: 736 ladder games, deck A 357 of 736, score 0.051, ahead of vintage-900000007's
0.055 and fair-fight-900000005's 0.061).

- *The other seats are untouched.* `seat-identity` with the golden made from origin/main (7a87bb02, its
  own classes): the Forge, search (seeded, fixed two rounds), D358-exploring and plain census games of
  this branch are main's, every decision of both seats; main against itself twice, the same. Frame CUT
  points are not compared: the recorder cuts on a 500 ms clock and a cold JVM cut the mulligans once more.
- *`atlas-selftest`* (two rollouts, two decisions, 2 + 2 branches, the no-leak check on every unit):
  16 forks, all the position; 8 no-leak checks, none moved, every negative control moved. Before the
  fork state was in the comparison, one control did not move: a turn-16 attack whose game ended before
  seat A decided again (now the state at the fork carries the control).
- *Smoke*, `--rollouts 50 --decisions 3 --branch-random 16 --branch-forge 8 --chunk 8 --jobs 2`, seed 451:
  7 min 16 s of wall time. Phase A: seat A 37, seat B 13, no draw, none capped; seat A's score 74.0%
  [60.5, 84.1]; 21.6 turns on average (median 22, 10th–90th 17–28); about 1,886 rollouts put ± 2 points
  on seat A's score at that variance (2,401 at the worst). 5.5 s a game a worker, 8.0 CPU-s a game.
  Phase B: the baseline went 13 turns (B won) and listed 15 decisions of seat A, 37 options; branched at
  d0, d7, d14 (evenly spaced): 168 branch games, 3.0 s each a worker (random 3.0, Forge 2.0, a unit's
  replay included). The two maps named the same best option at 2 of 3; at d7 (turn 8, Fact or Fiction
  vs pass vs equip) random values 50.0 / 12.5 / 18.8 and Forge 25.0 / 37.5 / 12.5 (n 16 and 8): at
  these branch counts every interval straddles the other. Checks: 7,579 rows (ids against the seat's
  own log), 438 frame logs, 168 forks, 6 no-leak checks — all clean; the guardrails read back from 324
  random seats' logs: a land offered at 1,716 of 11,744 priority decisions and taken at all 1,716;
  100 of 100 opening hands kept; G3 never fired (no pure no-op was chosen at random in these games).
- *Size*: a phase A game 234 KB (rows 74, frame logs 158, ledger 2), a branch game 136 KB.
