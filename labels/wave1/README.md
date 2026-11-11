# Judged labels, wave 1 (2026-11-11)

Two blind LLM judges (A and B, separate Opus runs) read 320 move-atlas decisions drawn at random (seed 538,
stratified by kind) from the 712 decisions no judge had read. The decision record is D538
(`docs/decisions/D538-label-probe.md`, branch `pc/label-probe` until it merges).

| file | what |
|---|---|
| `labels-judged-v1.jsonl` | the unified set: 605 decisions (this wave, J203's 160, round 2's 125 not in J203), 515 with an agreed label |
| `picks-A.jsonl`, `picks-B.jsonl` | each judge's pick, second choice, confidence (1 to 3) and one-line reason, 320 rows each |
| `draw.json` | the draw: population, pool, quotas, the order drawn, and `wave2Keys`, the 392 decisions not yet read |
| `batches/` | the 24 batch files as the judges read them (positions, options in each judge's own order are in `scripts/keymap.json`) |
| `prompt-example.txt` | one judge prompt, paths shortened |
| `cost.tsv` | tokens, tool uses and wall time of each of the 48 runs: 5,293,643 tokens in all |
| `merge.json`, `score.json` | the merge's counts and the read against the atlas's maps |
| `scripts/` | the sampler, the batch builder, the merge and the score, as run (paths shortened, so they document rather than rerun) |

Agreement: 281 of 320 (0.878); 180 on Forge's move, 101 on another, 39 split.
