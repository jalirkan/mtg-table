# J112 — cube stats from search-v2 games? (PC summary, 2026-10-08 13:50 EDT)

**Done, exit 0, every check PASS, verdict FAIL (`jr.verdict_code 0`).** 07:52 → 13:33 EDT (5 h 41 m), 7 workers at
2.07 GB peak, 41 GB free on `/` throughout. (The job wrote no `summary.md`; my reading is here.)

## The pre-registered rule, and the numbers
PASS needed Vintage's rho(B) − rho(A) interval above 0 and Synergy's point estimate not negative.
- **Vintage (131 overlap cards, 2,000 paired drafts):** rho(A, Forge Default) 0.535, rho(B, search-v2) 0.461,
  **difference −0.074 [−0.154, +0.006]**. Search-v2 games rank cards slightly LESS like 17Lands humans; the
  bootstrap puts 96.5% of the mass below zero. The shipped ratings' rho is 0.477.
- **Synergy (58 cards, 1,000 paired drafts):** rho(A) 0.318, rho(B) 0.423, difference +0.105 [−0.049, +0.279].
  Not negative, so Synergy alone would have let it through; Vintage decides.
- Both arms played identical decks (0 mismatches, 0 unpaired seeds). The two arms' card rates agree with each
  other at rho 0.78, so this is a modest shift, not noise.
- **Blue (secondary):** search-v2 does not close Forge's blue gap. Vintage one-blue win rate 46.2% → 44.8%
  (paired diff −0.014 [−0.041, +0.014]); Synergy 34.5% → 37.7% (+0.032 [−0.003, +0.069]). Blue at equal
  quality: Vintage 44.4% → 43.0%, Synergy 30.6% → 37.2%. Mixed and small.
- Cost: search-v2 games take 41 s against 3.2 s for Default (13×), 2 timeouts in 2,999 games, 1 engine error.

## My read
Metas stay Forge-Default-piloted, as the rule says. Search makes the AI stronger (the ladder's +73 Elo) but
does not make its card evaluations more human; if anything Vintage got a little less human. The blue deficit
is a drafting/play-style thing the pilot does not fix either. Not worth 13× the compute for the metas.
