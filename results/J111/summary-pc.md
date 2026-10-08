# J111 — the blue question: contention or Forge's play? (PC summary, 2026-10-08 06:45 EDT)

**Done, exit 0 in 76 s, every check PASS.** Read-only over 7 normal queue folders, 58,261 drafts, 0 bad lines.
(No `summary.md` from the job; my reading is here, `blue.json` is the data.)

## The answer: (b) Forge plays blue worse — in all 7 cubes, pooled too
- Blue decks win less than non-blue in every cube (pooled, every profile: e.g. fair-fight 46.9% vs 58.1%,
  peasant 43.3% vs 58.5%).
- The contention test: in one-blue drafts, blue's win rate is the same whether the other seat took few blue
  cards (42.6%, n 11,920) or many (42.6%, n 11,692). Contention's total effect is 0.001 per SD, i.e. nothing.
  So it is not "two drafters fighting over blue".
- Uncontested blue at equal deck quality still wins only 40.6% [39.5, 41.6] pooled. The deficit survives
  controlling for quality: Forge's AI plays blue worse (counterspells, bounce, tempo — the cards Forge's
  `AI:RemAIDeck` flags often sit on).
- Blue is also over-drafted: fair-fight's blue deck share is 72% against an expected 40% from card counts
  (1.8× expected), so the ratings pull Forge into blue and then it plays it badly.

## What I would take from it (the cloud's call)
Ratings-from-lab for blue cards are depressed by the engine, not by the cube. Either correct blue's card
ratings for the engine's handicap or read blue results with that discount; and the over-draft suggests the
draft ranks over-value blue for this AI.
