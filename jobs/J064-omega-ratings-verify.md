id: J064
title: Omega ratings raise (D360): pre-registered A/B, old vs raised ratings, 2 x 3,000 drafts per arm, best of 3, unrecorded
public_title: Omega ratings raise check
public_est: ~4 h
cpu: heavy
after: J050
repos: mtg-table@f038f4e
decides: promote cubes/omega-cube-180.ratings-raised.tsv to Omega's default ratings (D360; the rename is Justin's call)
hypothesis: the raised cards are played much more (~0.39 -> ~0.75 on-colour) without any becoming weak, and balance is no worse
rule: D360 and the job's "Pre-registered reading": played rate up >= 0.2, no raised card weak (D357 pooled, Holm), matchup_verify.py with A as candidate does not ACCEPT
followup: omega-ratings-promote
est: ~3-4 h on the 9700X (12,000 drafts best of 3; J039 ran 3,400-4,000 drafts an hour on 7 workers), plus a ~10 min pilot
resumable: yes
max_workers: 7
mem_per_worker_gb: 1.6
timeout: 10h
clean: var/cubelab/runs/j064-a1 var/cubelab/runs/j064-a2 var/cubelab/runs/j064-b1 var/cubelab/runs/j064-b2 var/cubelab/runs/j064-a var/cubelab/runs/j064-b var/cubelab/runs/j064-pilot-a var/cubelab/runs/j064-pilot-b
progress: cubelab var/cubelab/runs/j064-a1 var/cubelab/runs/j064-b1 var/cubelab/runs/j064-a2 var/cubelab/runs/j064-b2
metrics: a = cubelab var/cubelab/runs/j064-a1 var/cubelab/runs/j064-a2
metrics: b = cubelab var/cubelab/runs/j064-b1 var/cubelab/runs/j064-b2
headline: a.drafts, b.drafts, a.engine_error_rate, b.engine_error_rate

D360 raised the drafters' ratings of the 30 Omega cards that J039's exploration found holding
their own when played (D356), by a shrunk, capped rule, into
`cubes/omega-cube-180.ratings-raised.tsv`. That file is NOT Omega's default yet: this job is
the A/B that decides whether it becomes one. Arm A drafts Omega v1 with the old ratings (no
`--ratings`: Forge's ranks, which J039 drafted with); arm B with the raised file. Both arms
draft the SAME seeds, in two batches of 3,000 drafts each. Same cube, weights, profiles and
games; only the ratings differ. Unrecorded (no `--record` flag).

Seeds: D340's verification block, untouched so far. Batch 1 810,000,001-810,003,000, batch 2
810,003,001-810,006,000, in both arms; the pilot 810,900,001-810,900,020. Clear of the lab
range the queue counts through, of every evolve's discovery and confirmation seeds, and of the
reserved deck-set seeds (900,000,000+).

**Pre-registered reading** (D360, written before any game under the new ratings; read once,
after all four runs):

1. Played: the 30 raised cards' pooled on-colour play rate, A vs B (`v.a_played_rate`,
   `v.b_played_rate`). A draft-only replay of these seeds expects about 0.39 vs 0.75.
2. Performance in B, D357's pooled-confirmation statistics: per raised card, *weak* (win
   rate shown under the batch mean - 0.05) and *dominant* (shown over mean + 0.05); one-sided
   exact binomials on effective counts (games over the batch's design effect); look 1 =
   batch 1 alone at 0.05, look 2 = both batches pooled (`pooledTest`) at 0.05 / 2; Holm over
   the cards and both directions at each look; weak (dominant) if either look says so. A card
   with under 100 games in B is reported, not judged.
3. Balance: the colour pairs' spread (best minus worst shrunk win rate, pairs with >= 100
   games) and their de-noised between-pair SD in each arm (J039's spread: 0.44-0.55); D344's
   `matchup_verify.py test` both ways, one look.

Promote (rename the file to `cubes/omega-cube-180.ratings.tsv`, Justin's call) only if the
played rate rises by at least 0.2, no raised card is weak, and `matchup_verify.py` with A as
the candidate does not ACCEPT (B is not less balanced). A weak card does not block the others:
its line goes back to its old rating. A dominant card is reported for the notes; it is not an
automatic revert. The checks below are "is it broken" checks; the verdict is the reading
above, written in the summary.

## Pilot
Is it broken: 20 drafts per arm at one game a draft, and the reader on them.
```bash
tools/cubelab.sh run cubes/omega-cube-180.md --format grid --drafts 20 --games 1 --jobs {workers} --seed 810900001 \
  --out var/cubelab/runs/j064-pilot-a
tools/cubelab.sh run cubes/omega-cube-180.md --format grid --drafts 20 --games 1 --jobs {workers} --seed 810900001 \
  --ratings cubes/omega-cube-180.ratings-raised.tsv --out var/cubelab/runs/j064-pilot-b
grep -q '"ratingsFile": "cubes/omega-cube-180.ratings-raised.tsv"' var/cubelab/runs/j064-pilot-b/run.json
grep -q '"ratingsFile": null' var/cubelab/runs/j064-pilot-a/run.json
node tools/cubelab/ratings-verify.ts --a var/cubelab/runs/j064-pilot-a --b var/cubelab/runs/j064-pilot-b \
  --raised docs/evidence/omega-ratings-raise.json --md var/cubelab/runs/j064-pilot-verify.md
```
metrics: pa = cubelab var/cubelab/runs/j064-pilot-a
metrics: pb = cubelab var/cubelab/runs/j064-pilot-b
metrics: pv = sh: node tools/cubelab/ratings-verify.ts --a var/cubelab/runs/j064-pilot-a --b var/cubelab/runs/j064-pilot-b --raised docs/evidence/omega-ratings-raise.json
check: pa.drafts == 20
check: pb.drafts == 20
check: pa.engine_errors == 0
check: pb.engine_errors == 0
check: pv.raised == 30
check: pv.a_drafts == 20
check: pv.b_drafts == 20
check: pv.b_played_rate > pv.a_played_rate

## Commands
Arms interleaved by batch, so a stop leaves A and B the same size. Each line is resumable (run
it again with the same `--out`).
```bash
tools/cubelab.sh run cubes/omega-cube-180.md --format grid --drafts 3000 --games 3 --jobs {workers} --seed 810000001 \
  --out var/cubelab/runs/j064-a1
tools/cubelab.sh run cubes/omega-cube-180.md --format grid --drafts 3000 --games 3 --jobs {workers} --seed 810000001 \
  --ratings cubes/omega-cube-180.ratings-raised.tsv --out var/cubelab/runs/j064-b1
tools/cubelab.sh run cubes/omega-cube-180.md --format grid --drafts 3000 --games 3 --jobs {workers} --seed 810003001 \
  --out var/cubelab/runs/j064-a2
tools/cubelab.sh run cubes/omega-cube-180.md --format grid --drafts 3000 --games 3 --jobs {workers} --seed 810003001 \
  --ratings cubes/omega-cube-180.ratings-raised.tsv --out var/cubelab/runs/j064-b2
```
cores: 1
```bash
node tools/cubelab/ratings-verify.ts --a var/cubelab/runs/j064-a1,var/cubelab/runs/j064-a2 \
  --b var/cubelab/runs/j064-b1,var/cubelab/runs/j064-b2 --raised docs/evidence/omega-ratings-raise.json \
  --md var/cubelab/runs/j064-verify.md > var/cubelab/runs/j064-verify.json
mkdir -p var/cubelab/runs/j064-a var/cubelab/runs/j064-b
cat var/cubelab/runs/j064-a1/drafts.jsonl var/cubelab/runs/j064-a2/drafts.jsonl > var/cubelab/runs/j064-a/drafts.jsonl
cat var/cubelab/runs/j064-b1/drafts.jsonl var/cubelab/runs/j064-b2/drafts.jsonl > var/cubelab/runs/j064-b/drafts.jsonl
python3 tools/ml/matchup_verify.py test --orig var/cubelab/runs/j064-a --cand var/cubelab/runs/j064-b --per-arm 6000 --looks 1 \
  | tee var/cubelab/runs/j064-balance-b-vs-a.txt
python3 tools/ml/matchup_verify.py test --orig var/cubelab/runs/j064-b --cand var/cubelab/runs/j064-a --per-arm 6000 --looks 1 \
  | tee var/cubelab/runs/j064-balance-a-vs-b.txt
```
metrics: v = sh: node tools/cubelab/ratings-verify.ts --a var/cubelab/runs/j064-a1,var/cubelab/runs/j064-a2 --b var/cubelab/runs/j064-b1,var/cubelab/runs/j064-b2 --raised docs/evidence/omega-ratings-raise.json
check: a.drafts == 6000
check: b.drafts == 6000
check: a.engine_error_rate <= 1%
check: b.engine_error_rate <= 1%
check: v.a_drafts == 6000
check: v.b_drafts == 6000
check: v.raised == 30
check: v.a_mean_min >= 0.45 and v.a_mean_max <= 0.55
check: v.b_mean_min >= 0.45 and v.b_mean_max <= 0.55
check: v.deff_max <= 2
check: v.b_played_rate > v.a_played_rate
check: v.b_cards_100_games >= 25

What the checks mean: both arms complete and as clean as J039 (engine errors at most 1%); the
batch means and design effects where the evolve's numbers say a batch is sound; the raise did
what a ratings change must do at all (the raised cards are played more in B); and enough of
the 30 cards reach 100 games in B to judge (the replay expects all 30; Council's
Judgment, the rarest, about 78 decks, some 190 games). None of them is the verdict: the reading above is.

## Abort if
abort: a.drafts >= 300 and a.engine_error_rate > 2%
abort: b.drafts >= 300 and b.engine_error_rate > 2%
abort: b.drafts >= 300 and b.engine_error_rate > a.engine_error_rate + 2%
- More than 5% of games end as timeouts or draws.
- Any "SAVED Forge preferences".
- Free disk under 10 GB.

## Report
collect: var/cubelab/runs/j064-verify.json
collect: var/cubelab/runs/j064-verify.md
collect: var/cubelab/runs/j064-balance-b-vs-a.txt
collect: var/cubelab/runs/j064-balance-a-vs-b.txt
collect: var/cubelab/runs/j064-pilot-verify.md
collect: var/cubelab/runs/j064-a1/run.json
collect: var/cubelab/runs/j064-b1/run.json

summary.md:
- Drafts, games, engine errors, timeouts and wall time per arm and batch.
- Every `j064-verify.json` number beside its check.
- Reading 1: the pooled played rate A vs B and the per-card table from `j064-verify.md` (A
  and B on-colour play, B win rate and games).
- Reading 2: which raised cards are weak or dominant, at which look, with their p values; the
  cards under 100 games in B, as such. Do not read a direction into a card neither look
  judged.
- Reading 3: each arm's pair table, spread and between-pair SD, and both `matchup_verify.py`
  lines verbatim (ACCEPT / REJECT, z, bound).
- The verdict by the pre-registered rule: promote, promote with named cards reverted, or do
  not promote, and why. Promotion itself is Justin's: the job changes no file in the repo.
