# J021 — Omega evolve with discovery + confirmation (hand-run, unrecorded)

Run by the PC session while the queue was blocked, as the cloud session's 14:30 note asked it to be
reported: `tools/cubelab.sh evolve cubes/omega-cube-180.md --pool cubes/omega-seed-pool.tsv
--generations 4 --drafts-per-gen 600 --games 3 --seed 20001 --date 2026-10-04`, out
`~/code/mtg-table-install/var/cubelab/evolve/omega-rigor-600-norec`, mtg-table 6fbcdea, no
recording. 7 workers for generation 1, 3 workers after 14:10 (sharing the machine with J020/J029).
Wall time 13:50-15:22. Engine errors: 0.

## Result in one line
**No swaps.** After 2,400 discovery drafts and 145 confirmation drafts the cube going out is the cube
going in (v1 -> v1). The new rule did its job: the one card that stood out did not hold up on fresh games.

## Per generation
| Gen | Discovery drafts (seeds) | Tests | Design effect | Candidates | Confirmation | Swaps | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | 600 (20001-20600), 1,468 decisive games | 390 | 1.09 | 1: Sheoldred, the Apocalypse (dominant-win) | 145 fresh drafts (1020001-1020145): NOT confirmed | 0 | insufficient data; 4 leads; ~1,233 drafts/gen would find half |
| 2 | 600 | 387 | 1.04 | 0 | none | 0 | nothing dead or dominant, nothing leaning |
| 3 | 600 | 388 | 1.01 | 0 | none | 0 | insufficient data; 1 lead; ~3,428 drafts/gen |
| 4 | 600 | 390 | 1.00 | 0 | none | 0 | insufficient data; 1 lead; ~2,788 drafts/gen |

The candidate: Sheoldred won 398 of 692 decisive games in discovery (0.58 vs 0.50, p 8.5e-5, q 0.033)
and 73 of 162 on fresh seeds (0.45, p 0.909, Holm 0.909): a discovery that was noise. Generation 1's
watch list: Voice of Resurgence, Garruk Wildspeaker, Incinerate, Fire // Ice (all lean-dominant, thin).
Colour-pair balance in generation 1 ran from WG 0.43 to WR 0.55. No Abort condition appeared
(deff 1.00-1.09, candidates at most 1). changelog.md is attached; index.html and the cube file are in the out folder.

## Reading
600 drafts a generation is not enough to move this cube: the job's own estimates ask for roughly 1,200
to 3,400 a generation. 33-40 cards are "rating-limited" (rarely played when on colour but rated low),
which the report calls a ratings question, not a drafts one. If the aim is actual swaps, the next run
wants about 1,500-3,000 drafts a generation (about 25-50 minutes each at the measured rate), or a
ratings pass on the rating-limited cards first.
