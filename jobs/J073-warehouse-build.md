id: J073
title: Lab warehouse, first build (J066 re-posted after the notebook fix): every queue and run-folder draft line into Parquet tables with DuckDB views (D363), row counts checked against the JSONL, table sizes reported, the numbers-only warehouse.json for ForgeCoach's #lab/data
public_title: Lab warehouse build
public_est: ~30 min
cpu: heavy
cores: 1
repos: mtg-table@57eb39a (main with the lab warehouse, PR #55, D363, and the notebook null fix, PR #60)
est: about 2 min per GB of drafts.jsonl on one core (98 s for 884 MB of synthetic lines in the cloud container), plus the pilot's ~2 min
resumable: yes
max_workers: 1
mem_per_worker_gb: 1
timeout: 3h
metrics: v = sh: cat var/warehouse-J066/verify.json 2>/dev/null || echo '{"ok":0}'

Justin asked for a DuckDB + Parquet "lab warehouse" so he can query everything the lab writes with SQL
and pandas. `tools/lab/warehouse.py` (D363, `docs/guides/lab-warehouse.md`) is on the pinned commit.
This job builds it for the first time from the real data on the PC, and checks it.

The job is READ-ONLY on the lab's data: `var/cubelab/queue`, `var/cubelab/runs`, `var/ai-ladder*`,
`var/ml` and `docs/evidence/experiments.jsonl`. It writes only under `var/warehouse/`,
`var/warehouse-pilot/` and `var/warehouse-J066/`; `var/warehouse/warehouse.json` is the summary the runner publishes. It reads only complete lines, so it is safe beside a
running queue night. It is single-process. Memory peaked at 0.5 GB on 884 MB of synthetic JSONL, and
it is bounded by the row-group size, not the data size.

**Resumable.** The ingest commits every 512 MB of JSONL. A restart continues from the last commit, and
any part files of a killed run are deleted when the next one starts.

## Pilot
About 2 minutes. The first 300 lines of every queue key folder go into a scratch root, which is then
ingested, verified, ingested again (the second ingest must read nothing), read by every notebook
(the saved queries among them), and summarised by `export` into the pilot folder (never the published path).
```bash
python3 -c "import duckdb, pyarrow, pandas; print(duckdb.__version__, pyarrow.__version__, pandas.__version__)"
rm -rf var/warehouse-pilot && mkdir -p var/warehouse-pilot/queue
cp var/cubelab/queue/night-*.json var/warehouse-pilot/queue/ 2>/dev/null || true
for f in var/cubelab/queue/*/*/drafts.jsonl; do
  k="${f#var/cubelab/queue/}"; d="var/warehouse-pilot/queue/$(dirname "$k")"; mkdir -p "$d"
  head -n 300 "$f" > "$d/drafts.jsonl"
  cp "$(dirname "$f")/run.json" "$d/" 2>/dev/null || true
done
python3 tools/lab/warehouse.py ingest --root var/warehouse-pilot/queue --runs var/warehouse-pilot/no-runs \
    --out var/warehouse-pilot/wh --report var/warehouse-pilot/ingest.json
python3 tools/lab/warehouse.py verify --out var/warehouse-pilot/wh > var/warehouse-pilot/verify.json
python3 tools/lab/warehouse.py ingest --root var/warehouse-pilot/queue --runs var/warehouse-pilot/no-runs \
    --out var/warehouse-pilot/wh --report var/warehouse-pilot/ingest-again.json
for nb in notebooks/*.py; do
  LAB_WAREHOUSE=var/warehouse-pilot/wh/lab.duckdb MPLBACKEND=agg python3 "$nb" > "var/warehouse-pilot/$(basename "$nb" .py).txt"
done
python3 tools/lab/warehouse.py export --out var/warehouse-pilot/wh --to var/warehouse-pilot/summary.json
```
metrics: pilot = sh: cat var/warehouse-pilot/verify.json
metrics: pi = sh: cat var/warehouse-pilot/ingest.json
metrics: pi2 = sh: cat var/warehouse-pilot/ingest-again.json
metrics: pilot_lines = lines var/warehouse-pilot/queue/*/*/drafts.jsonl
metrics: notebooks = files var/warehouse-pilot/*.txt
metrics: ps = sh: cat var/warehouse-pilot/summary.json
check: pilot.ok == 1
check: pilot.tables.drafts.rows > 0
check: pilot.tables.drafts.rows + pilot.bad_lines == pilot_lines
check: pilot.tables.games.rows == pilot.tables.games.expected
check: pilot.tables.picks.rows == pilot.tables.picks.expected
check: pilot.tables.deck_cards.rows == pilot.tables.deck_cards.expected
check: pilot.views >= 16
check: pi2.lines == 0
check: pi.peakMB < 2000
check: notebooks == 6
check: ps.schema == 1

## Commands
cores: 1
mem_gb: 2
```bash
mkdir -p var/warehouse-J066
python3 tools/lab/warehouse.py ingest --report var/warehouse-J066/ingest.json
python3 tools/lab/warehouse.py verify > var/warehouse-J066/verify.json
python3 tools/lab/warehouse.py ingest --report var/warehouse-J066/ingest-again.json
for nb in notebooks/*.py; do MPLBACKEND=agg python3 "$nb" > "var/warehouse-J066/$(basename "$nb" .py).txt"; done
python3 tools/lab/warehouse.py export
cp var/warehouse/warehouse.json var/warehouse-J066/warehouse.json
du -sb var/warehouse/* | sort -k2 > var/warehouse-J066/du.txt
du -sh var/warehouse var/cubelab/queue var/cubelab/runs 2>/dev/null >> var/warehouse-J066/du.txt
rm -rf var/warehouse-pilot
```
metrics: ing = sh: cat var/warehouse-J066/ingest.json
metrics: again = sh: cat var/warehouse-J066/ingest-again.json
metrics: queue_lines = lines var/cubelab/queue/*/*/drafts.jsonl
metrics: nbs = files var/warehouse-J066/*.txt
metrics: wj = sh: cat var/warehouse-J066/warehouse.json
check: v.ok == 1
check: v.tables.drafts.rows == v.tables.drafts.expected
check: v.tables.games.rows == v.tables.games.expected
check: v.tables.decks.rows == v.tables.decks.expected
check: v.tables.deck_cards.rows == v.tables.deck_cards.expected
check: v.tables.picks.rows == v.tables.picks.expected
check: v.tables.drafts.rows + v.bad_lines == v.jsonl_lines
check: v.by_source.queue.lines >= 1
check: v.by_source.queue.lines <= queue_lines
check: v.views >= 16
check: ing.peakMB < 2000
check: nbs == 7
check: wj.schema == 1

**What the checks mean.** `verify` counts every table against the JSONL independently of the ingest,
file by file, up to the offsets it committed. `ok` is 1 only when every file's drafts, games, decks,
deck-card and pick rows all match. The runner's own `lines` count (`queue_lines`) is taken after
`verify`, so it can only be larger: a queue night may still be appending lines.
`v.by_source.queue.lines <= queue_lines` holds then, and equality holds on a quiet machine.

## Abort if
abort: elapsed_s > 10800

## Report
collect: var/warehouse-J066/ingest.json
collect: var/warehouse-J066/verify.json
collect: var/warehouse-J066/ingest-again.json
collect: var/warehouse-J066/du.txt
collect: var/warehouse-J066/card_win_rates.txt
collect: var/warehouse-J066/colour_pairs.txt
collect: var/warehouse-J066/exploring_vs_plain.txt
collect: var/warehouse-J066/sprt_gates.txt
collect: var/warehouse-J066/pick_order.txt
collect: var/warehouse-J066/saved_queries.txt
collect: var/warehouse-J066/warehouse.json

summary.md should give:
- the JSONL read (MB, lines, bad lines), the ingest's seconds and peak MB;
- each table's rows and bytes (from `verify.json`), the five draft tables' total against the JSONL (`ratio`),
  and `du.txt`;
- the second ingest's seconds (nothing new to read);
- any `mismatchedFiles` in `verify.json`;
- one line from each notebook's output saying it ran;
- warehouse.json's counts (nights, cubes, pairs, cards) and whether the runner published it to `lab-status`.

The warehouse stays in `var/warehouse/`, and Justin opens it with `duckdb var/warehouse/lab.duckdb`.

**Nightly, after this job.** No separate job is needed. Each later queue-night job gets one last block
after the redaction pass, `cores: 1` before it:
`python3 tools/lab/warehouse.py ingest && python3 tools/lab/warehouse.py verify > var/warehouse/verify.json && python3 tools/lab/warehouse.py export`.
The export rewrites `var/warehouse/warehouse.json`, and the runner publishes its sanitised copy to
ForgeCoach's `lab-status` branch when the file changes (D363, `tools/runner/warehouse.ts`).
It reads only that night's appended lines (8 s for 3,000 synthetic drafts), and a run with nothing new
takes about 2 s.
