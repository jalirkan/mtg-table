# Play-AI review 2026-11-05: tables and scripts

The report is `../play-ai-review-2026-11-05.md`. Every script is read-only over the runner's clone
(`~/code/lab/mtg-table/var/...`) and `~/code/lab/data`, and runs in seconds with numpy: `cd bin && python3 <script>`.

| table | script | what |
|---|---|---|
| `tables/ladder.md` | `bin/ladder.py` | every fixed match and SPRT the ladder holds, with rollouts a decision |
| `tables/gate2-within.md` | `bin/gate2_within.py` | gate 2's 291 decisions read inside the decision: option spread, spread over noise, correlation and slope with the truth, by kind, turn and option count |
| `tables/leaf-within.md` | `bin/leaf_within.py` | gate 1's 27,628 turn-end positions: log-loss by turn band, between-game share, turn-to-turn agreement with the winner |
| `tables/atlas-nights.md` | `bin/atlas_nights.py` | every atlas label file: labels, confident, partial, worker-hours, disk |
| `tables/atlas-agreement.md` | `bin/atlas_agreement.py` | random map vs Forge map per night; o0's regret on both; futility controls |
| `tables/branch-census.md` | `bin/branch_census.py` | branch frame logs on disk by continuation (random vs Forge map) |
