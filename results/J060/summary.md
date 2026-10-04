# J060 — Evaluator gate 1 (fit), PC summary (written 2026-10-04 10:40 EDT)

**What it measured:** trained the evaluator (train_eval.py, numpy) on night-1's dataset (6,343,314 decision rows, 39,177 games, 120 reserved decks dropped) and scored it on a held-out split by deck pair (631,661 test rows, 333 pairs, 0 test rows from a deck seen in training). Ran 05:38–09:14 (3 h 36 min), mtg-table 7e48088; adopted cleanly across the 07:35 runner restart.

**Headline (gate 1: PASS, all 5 checks pass):**
- A. Decision rows, log loss: evaluator 0.4969 vs core 0.5542 — evaluator better by +0.0573 [95% CI +0.0467, +0.0679], 333 pair groups, 2,000 bootstraps.
- B. Turn-end positions (27,257 from 1,500 games, leaf scale 351.6 from J056): evaluator 0.5271 vs hand leaf 0.5931 — better by +0.0660 [+0.0516, +0.0792].
- C. Calibration: ECE 0.0089; worst bin (≥ 200 rows) off by 0.018.

**Model chosen:** one hidden layer of 128, card dim 4, 39,917 parameters; val log loss 0.5071 (best epoch 20 of 32).

**Things to look at (not failures):**
- The grid stopped on its time budget after 7 of its configurations; 4 of the 7 had their best val at epoch 1 (likely overfitting or lr too high for those), so the search is thin — the winner may not be the best available.
- Leaf rows: 33 rebuild failures out of ~27k positions (0 files skipped).
- Memory: RSS peak 4.86 GB (declared 9 GB) — the float32 fix works. But numpy's BLAS ran ~16 threads (~680% CPU) on a job sized as 1 worker; beside J059 it cut J059's rate ~13%. See memory-pc.md: declare the real width or pin OMP/OPENBLAS threads.
