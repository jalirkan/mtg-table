id: J120
title: Synergy evolve with Counter Blitz's counters cards (Final Fantasy X Commander) in the seed pool: 4 generations x 400 drafts, best of 3, exploration on, unrecorded
public_title: Synergy evolve: Final Fantasy counters cards
public_est: ~3 h
public_decides: Whether any Final Fantasy counters cards earn a Synergy Cube slot
cpu: heavy
max_workers: 7
mem_per_worker_gb: 1.5
repos: mtg-table@c7d1e4d (branch c/hopeful-johnson-20lca7: main plus cubes/synergy-fic-pool.tsv and cubes/synergy-fic-notes.tsv, data only)
est: ~2-3 h on the 9700X (4 x 400 discovery drafts best of 3, plus up to 4 x 300 confirmation drafts; J009 ran about 1,400 drafts an hour)
resumable: yes
timeout: 8h
clean: var/cubelab/evolve/synergy-fic var/cubelab/evolve/synergy-fic-pilot
progress: evolve var/cubelab/evolve/synergy-fic generations 4
metrics: big = evolve var/cubelab/evolve/synergy-fic
metrics: ex = sh: node tools/cubelab/explore-health.ts var/cubelab/evolve/synergy-fic
headline: big.generations_done, big.drafts, big.engine_error_rate, ex.treated, ex.holds, ex.weak, ex.undecided, ex.too_few
decides: whether any of Counter Blitz's counters cards goes into the Synergy Cube (Justin's call: the lab informs it, his notes decide; nothing here edits cubes/synergy-cube-180.md)
hypothesis: none to confirm: a descriptive run. The evolve loop cuts only a card it confirms dead or dominant on fresh seeds, and a pool card enters only into a slot a cut opens, so it may add no Final Fantasy card at all; with the try notes, the seven strongest-reading ones are first in line for any slot that opens
rule: written 2026-10-10 before the run. A swap counts only as evolve decides it (D331 discovery then confirmation, D357 pooled repeats). A Final Fantasy card that enters is read from its generations' stats.json and, if it is rated under deadMinRating, from the changelog's pooled exploration table after generation 4 (holds its own / weak when played / undecided / too few), never from a per-generation table. No verdict cuts or adds a card in the real cube: the summary reports, Justin decides
followup: synergy-fic-cards

**Why.** Justin opened the Final Fantasy X Commander deck "Counter Blitz" (FIC, 2025) and asked whether its
cards belong in a cube; its counters cards fit the Synergy Cube's CTR theme. `cubes/synergy-fic-pool.tsv` holds
the deck's 37 nonland cards of at most two colours that are +1/+1 counters cards or removal (23 new in Final
Fantasy, 14 reprints), less the three Synergy already has. `cubes/synergy-fic-notes.tsv` marks seven `try`
(Auron, Summon: Ixion, Kimahri, Tromell, Maester Seymour, Shelinda, Wakka), read from the cards, not from games;
it is passed with --notes, so Synergy's own notes file stays Justin's. The engine's facts replace the pool's
support and AI-flag columns (enrichPool), so this run is also the first check that Forge 2.0.14 has these cards:
the pilot's output says which it found.

Exploration is on because Forge may have no draft rank for a card printed only in a Commander set: such a card
is rated `unrated` (40), under deadMinRating (60), so the builder would sit it in pools and the loop could only
call it rating-limited. Exploration forces it into decks at random and measures it (D356).

Seeds: discovery 140,000,001-140,001,600 (400 a generation); confirmation batches at 141,000,001-141,001,200
(300 apart per generation, D331's confirmSeedOffset). The pilot 142,000,001-142,000,030 and its confirmation
at 143,000,001+. All in the D340 lab range, clear of every seed an earlier job used (the highest lab seed in
`jobs/` is 20,261,008) and of the queue's per-cube count from 1. A new `--out`. Unrecorded (no --record flag).

## Pilot
Is it broken: one 30-draft generation at the full settings but one game a draft.
```bash
tools/cubelab.sh evolve cubes/synergy-cube-180.md --pool cubes/synergy-fic-pool.tsv --notes cubes/synergy-fic-notes.tsv \
  --generations 1 --drafts-per-gen 30 --games 1 --jobs {workers} --seed 142000001 \
  --out var/cubelab/evolve/synergy-fic-pilot --explore on
node tools/cubelab/explore-health.ts var/cubelab/evolve/synergy-fic-pilot | tee var/cubelab/evolve/synergy-fic-pilot/health.json
grep -q 'Low-rated cards, judged by exploration' var/cubelab/evolve/synergy-fic-pilot/changelog.md
```
metrics: pilot = evolve var/cubelab/evolve/synergy-fic-pilot
metrics: pex = sh: node tools/cubelab/explore-health.ts var/cubelab/evolve/synergy-fic-pilot
check: pilot.generations_done == 1
check: pilot.drafts == 30
check: pilot.engine_errors == 0
check: pex.explore_on == 1
check: pex.explored_drafts between 2 and 20
check: pex.explored_engine_error_rate == 0

## Commands
```bash
tools/cubelab.sh evolve cubes/synergy-cube-180.md --pool cubes/synergy-fic-pool.tsv --notes cubes/synergy-fic-notes.tsv \
  --generations 4 --drafts-per-gen 400 --games 3 --jobs {workers} --seed 140000001 \
  --out var/cubelab/evolve/synergy-fic --explore on
node tools/cubelab/explore-health.ts var/cubelab/evolve/synergy-fic | tee var/cubelab/evolve/synergy-fic/health.json
```
Resumable: after a stop, run the same lines again (finished generations are skipped, a started one
resumes its drafts).
check: big.generations_done == 4
check: big.drafts == 1600
check: big.engine_error_rate <= 1%
check: ex.generations_done == 4
check: ex.explored_drafts + ex.plain_drafts == 1600
check: ex.share_z between -4 and 4
check: ex.explored_engine_error_rate <= ex.plain_engine_error_rate + 1%

What the checks mean: the run finished at its size, the engine did not fail, and exploration took its share of
the drafts and broke nothing (as J039's). No check is on a card's numbers: the result is read, not gated.

## Abort if
abort: big.drafts >= 200 and big.engine_error_rate > 1%
abort: ex.explored_drafts >= 100 and ex.explored_engine_error_rate > ex.plain_engine_error_rate + 2%
- Any generation's decision.discovery.deff over 2.0, or decision.discovery.candidates over 30.
- A swap that is not a note-cut without "confirmed on fresh seeds" in its evidence.
- Free disk under 10 GB.

## Report
collect: var/cubelab/evolve/synergy-fic/health.json
collect: var/cubelab/evolve/synergy-fic/changelog.md
collect: var/cubelab/evolve/synergy-fic/evolve.json
collect: var/cubelab/evolve/synergy-fic/synergy-cube-180.md
collect: var/cubelab/evolve/synergy-fic/gen-*/result.json
collect: var/cubelab/evolve/synergy-fic/gen-*/stats.json
collect: var/cubelab/evolve/synergy-fic-pilot/health.json

summary.md:
- Forge: which of the 37 pool cards the engine found (the pilot's and the run's pool facts) and which it did
  not; those are never added.
- Per generation: discovery drafts, explored and plain drafts, decisive games (plain), design effect, family
  size, each candidate with its discovery p and q and its confirmation p and Holm p, and the swaps with their
  evidence. Name every Final Fantasy card that entered, the card it replaced and why.
- For each Final Fantasy card that entered: its numbers from the generations it was in (decks, deck rate,
  decisive games, win rate with interval), and its row in the pooled exploration table if it has one, as
  written. Do not read a direction into an undecided card or one with too few forced decks.
- If no Final Fantasy card entered: say so plainly, and that it says nothing about the cards (no slot opened);
  name the seven `try` cards as still untested.
- Every health.json number beside its check. Totals: discovery and confirmation drafts, wall time, engine
  errors and timeouts.
