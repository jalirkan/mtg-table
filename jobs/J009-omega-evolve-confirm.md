id: J009
title: Omega evolve with discovery + confirmation (D331) and recording (replaces J004)
cpu: heavy
after: J003
repos: mtg-table@main (d549e7a or later: has D331)
est: ~1.5–2 h on the 9700X (4 × 600 discovery drafts + up to 4 × 300 confirmation drafts, best of 3); ~1.3 GB of recordings

This replaces J004 (Justin's Omega rerun): it's the same aim with the new cut rule. A card
is cut only after it stands out in one batch of drafts and is confirmed on a second batch of
fresh seeds. J004 is marked skipped. The seeds start at 20001, which is clear of J004's runs
and of the AI ladder's reserved deck-set seeds. Old evolve output folders are refused because
the settings changed, so this uses a new `--out`.

## Pilot
The knobs are loosened on purpose so that the confirmation path runs (about 6 minutes):
```bash
cd /home/justin-a/code/mtg-table && git checkout main && git pull
tools/cubelab.sh evolve cubes/omega-cube-180.md --pool cubes/omega-seed-pool.tsv \
  --generations 1 --drafts-per-gen 30 --games 3 --jobs 7 --seed 20001 --record-every 5 \
  --out var/cubelab/evolve/omega-rigor-pilot --date 2026-10-04 \
  --evolve fdrQ=1 --evolve minSeen=1 --evolve minOnColour=1 --evolve minGames=1 \
  --evolve deadPlayRateHi=0.99 --evolve confirmMinDrafts=10 --evolve confirmMaxDrafts=10
```
All of these checks must hold:
- Exit code 0. No match in gen-01/run/drafts.jsonl or gen-01/confirm/drafts.jsonl has
  engineError, and every match has at least 1 game.
- gen-01/run/drafts.jsonl has 30 lines, seeds 20001–20030. gen-01/confirm/drafts.jsonl has 10
  lines, seeds 1020001–1020010.
- In gen-01/stats.json: decision.discovery.family is between 250 and 600,
  decision.discovery.deff is between 1.0 and 1.6, and decision.confirmBatch.drafts == 10.
- `node tools/check-redaction.mjs` passes on every .jsonl.gz under gen-01/run/games and
  gen-01/confirm/games.
- changelog.md contains "Discovered, then confirmed or not".

## Commands
```bash
tools/cubelab.sh evolve cubes/omega-cube-180.md --pool cubes/omega-seed-pool.tsv \
  --generations 4 --drafts-per-gen 600 --games 3 --jobs 7 --seed 20001 --record-all \
  --out var/cubelab/evolve/omega-rigor-600 --date 2026-10-04
```
This is resumable: after a stop, run the same line again.

## Abort if
- More than 1% of matches in any run/ or confirm/ folder end in an engine error.
- Any generation's decision.discovery.deff is over 2.0.
- Any generation's decision.discovery.candidates is over 30.
- A swap that isn't a note-cut lacks "confirmed on fresh seeds" in its evidence.
- Free disk drops under 10 GB.

## Report
- Per generation:
  - discovery drafts, seeds and decisive games;
  - deff and family size;
  - each candidate with its rule, its discovery p and q, its confirmation p and Holm p, and
    whether it was confirmed;
  - the size and seeds of the confirmation batch;
  - the swaps, with their evidence.
- Totals: discovery drafts, confirmation drafts, wall time, and engine errors.
- Recordings: the number of games recorded, their total size, and check-redaction on a sample
  of 20 games.
- Copy changelog.md, evolve.json, every gen-NN/result.json and gen-01/stats.json into
  results/J009/.
