# Where things live on Justin's PC (2026-10-12)

A map, not a plan. Nothing here moved today; the two "grew, not planned" entries are marked.

| Path | What | Who writes it |
|---|---|---|
| `/home/justin-a/code/mtg-table` | the engine bridge repo (main checkout) | PC session, cloud |
| `/home/justin-a/code/fc-lanes/<lane>` | ForgeCoach worktrees, one per lane (`test-main` tracks main and serves port 5173; `verify-combat` serves 5174) | PC session |
| `/home/justin-a/code/pc-results` | this repo: HEARTBEAT.md (PC ↔ cloud), study/ | PC session |
| `/home/justin-a/scenery-packs/fc-main` | the ForgeCoach checkout the worktrees hang off, and the shared `node_modules` | PC session |
| `/home/justin-a/code/forgecoach-scenery` | the live scenery pack repo (jsDelivr serves its pack-v5.1 branch) | PC session, pushes are Justin's call |
| `/home/justin-a/forge`, `/home/justin-a/.forge` | Justin's own Forge install and decks. Never written. | Justin |
| `/home/justin-a/scenery-packs/` **(grew)** | the art pipeline: SDXL/DreamShaper in `hf-cache/` (7 GB), `tools/sg_*.py`, every pack's work, the ladder (`pack-v6-ladder/`), the card-back and sleeve work (`two-seats-work/`), `logs/gpu.lock` | PC session |
| `/home/justin-a/mpc-autofill/` **(grew)** | the MPC Autofill desktop tool, `cards.xml` (the 18-card test order), `backs/` (the three Tumbling Blocks PNGs), `BACK-ASSIGNMENT.md` | PC session; the cloud's later direction says the tool belongs inside `~/Downloads` instead |
| `/home/justin-a/.local/share/forgecoach/` | the lab's results and the runner's state | the lab |
| `/home/justin-a/.local/bin/forgecoach` | the lab launcher | the lab |
| `/home/justin-a/Downloads/autofill-linux.zip` | the tool's download | Justin |

Proposed, not done: one `~/forgecoach-work/` with `scenery/`, `print/`, `art/` for everything the projects generate that is not source; `scenery-packs` moves only on a day with no GPU job pointing at it.
