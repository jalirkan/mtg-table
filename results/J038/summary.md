# J038 — exploration calibration on Omega v1 (PC summary, 2026-10-04 02:50)

Measured: one evolve generation of 400 drafts (997 games, 0 engine errors, 1 timeout) with exploration on, to check that forcing low-rated cards into decks works as designed before the big run (J039).

- Exploration hit 144 of 400 drafts (share 0.36, asked 0.30; z 2.6, inside the ±4 check). Forced decks 244 vs 243 expected (z 0.06), so the random forcing is honest.
- Pooled effect of forcing a low-rated card instead of the builder's choice: +0.006 ± 0.05 (SE 0.025) — no measurable cost to deck strength. Balance check -0.04 (≈0, good).
- Per card: 65 targets, 1 "holds its own" (Batterskull, +0.16, CI -0.05 to +0.37 before multiple-testing), 4 undecided, 60 too few forced decks — expected for one 400-draft generation.
- All 13 checks PASS; 13.5 min on 7 workers, 1.26 GB peak per worker.

Nothing looks wrong. It is a calibration run; card verdicts come from J039 (see `../J039/summary-pc.md`).
