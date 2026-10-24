# J158 labels.jsonl — the rung-3 label contract, with the D470 void mark

`labels.jsonl` here is a copy of `/home/justin-a/code/lab/data/lab-j158/report/labels.jsonl`.
- **Where it comes from.** It was written by the job's own `labels.py` (db496097), run by hand with the Report block's command over the two complete spines, ff5 461 and peasant7 463.
- **What was added.** The post-processing added two fields, `void` and `voidEvidence`. Nothing else changed: the reader's own file is `report/labels-raw.jsonl` beside it.
- **One row a branched decision of seat A.** All paths in a row are absolute, under the data folder, where every file rung 4 reads is kept.

| field | what it is |
|---|---|
| `v`, `contract` | 1, `mtg-table rung-3 label v1 (J158)` |
| `pair`, `deckA`, `deckB`, `spineSeed`, `sha` | the pair (`ff5`, `peasant7`), its two deck files, the spine's seed (461, 463), the mtg-table commit (db496097) |
| `d`, `kind`, `turn` | the decision's id in the spine (seat A's d-th listed decision), `p` / `a` / `b`, the game turn |
| `forgeOption`, `forgeToken` | Forge's choice: option 0, the one the spine played, and its token |
| `options[]` | every option: `o`, `token`, `label`, `random` {n, mean, lo, hi}, `forge` {n, mean, lo, hi}. Means are seat A's score 0–1, with Wilson intervals |
| `bestRandom`, `bestForge` | the best option under each map |
| `regret`, `regretLo`, `regretHi` | **the label**: the random map's best minus option 0, with atlas.json's paired-bootstrap interval |
| `regretForge`, `regretForgeLo`, `regretForgeHi` | the same under the Forge map, as information |
| `confident` | `regretLo > 0` and the decision complete; `confidentForge` is the same under the Forge map |
| `complete`, `decided`, `inQ`, `settled`, `gap`, `rho`, `sameBest` | J156's definitions. `settled` = decided, or every option <= 0.05 under both maps. `gap` = the best minus the worst random mean |
| `branches` | `{random: 200, forge: 40, branchTimeoutSec: 120}` |
| `view` | `{seat, player: "Drafter A", deck: "A"}` |
| `frameLog` | the spine's baseline frame log from seat A's view (`phaseB/baseline/frames/baseline-seat<k>.jsonl.gz`) |
| `rows` | `{file, seatRow, match}`: the spine's baseline rows file and seat A's row that is this decision (D361's encoder, state `s` and candidates `c`, Forge's answer first). `match` = that row's tokens, kind and turn equal the decision's |
| `branchFrames`, `branchesFile`, `atlas` | the pattern of the decision's branch frame logs, every branch's row (`phaseB/branches.jsonl`) and the spine's atlas.json |
| `notForTraining` | the D451 point 3 marker: confirm-set decks; training on them needs a decision of its own |
| **`void`** (added) | `"D470"` or `null`, by the rule below |
| **`voidEvidence`** (added, void rows only) | for `random` and `forge`: how many played branch indices were identical across the options, and how many indices had an errored or timed-out option |

## The void rule
- **When a label is void.** A label is `void: "D470"` when its decision is a **block** (`kind: "b"`) and, in both continuations, every branch index at which all options played (no error, no timeout) has the same `turns`, `steps` and `result` under every option. Each continuation needs at least one such index.
- **Why it is void.** Every option there played Forge's block, so the regret measures nothing. The cause is in D470: the copied combat kept Forge's block and the seat was never asked again.
- **How it was detected.** From `branches.jsonl`, not hard-coded.
- **What matched.** Three, all on ff5 461:
  - **d10** `block:35>78`: random 156 of 156 played indices identical, Forge 37 of 37;
  - **d14** `block:21>71`: 74 of 74, and 2 of 2. The rest of its branches are D470's NPE.
  - **d30** `block:25>80,40>81`: 200 of 200, and 40 of 40.
- **Controls.** No non-block decision in J158 matches. Every block decision in the two spines does (ff5 has three; peasant7 none).
- **Void rows stay in the file and in the counts.** A reader that trains or sizes on these labels filters `void == null`.

## Counts

| | labels | confident | voided | labels without void | confident without void | rows unmatched |
|---|---|---|---|---|---|---|
| ff5 461 | 16 | 4 | 3 | 13 | 4 | 0 |
| peasant7 463 | 16 | 2 | 0 | 16 | 2 | 0 |
| **total** | **32** | **6** | **3** | **29** | **6** | **0** |

- **Before a label set is pooled with later ones.**
  - **D470:** these block decisions are void, and fixed maps are not comparable at them.
  - **D471:** J158's random map is pre-G6, a different random policy. ff5's decks carry X cards whose random X was never drawn. Never pool it with a post-G6 atlas.
- **pauper5 464** (partial, no atlas.json) has no labels.
