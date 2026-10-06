# The lab warehouse

`tools/lab/warehouse.py` (D363) keeps a queryable copy of everything the lab writes on the PC:
the overnight queue's drafts and games, the run folders, the AI ladder's SPRT tests, the
experiment log and the ML and gate reports. The copy is Parquet tables under `var/warehouse/`
and a DuckDB file of views over them. Query it with SQL in the DuckDB command line, or with
SQL and pandas from Python.

The raw data stays as it is, and the warehouse never writes to it:

- the queue's `var/cubelab/queue/<normal|bridge>/<key>/drafts.jsonl` and `night-N.json`;
- the run folders' `drafts.jsonl` and `run.json` (`var/cubelab/runs/`);
- the recordings, `games/<seed>/g<n>-seat<k>.jsonl.gz`;
- the ladder's `var/ai-ladder*/sprt.jsonl`;
- `docs/evidence/experiments.jsonl`;
- the reports under `var/ml/`.

The warehouse is derived from them. Delete `var/warehouse/`, or run `ingest --rebuild`, and it
is built again.

## Commands

```bash
python3 tools/lab/warehouse.py ingest     # read what is new, write Parquet, rewrite the views
python3 tools/lab/warehouse.py verify     # every table's rows against the JSONL, and the sizes (JSON; exit 1 on a mismatch)
python3 tools/lab/warehouse.py sql        # rewrite var/warehouse/lab.duckdb alone (ingest does it too)
python3 tools/lab/warehouse.py export     # var/warehouse/warehouse.json: the numbers-only summary ForgeCoach's #lab/data shows
duckdb var/warehouse/lab.duckdb           # the DuckDB command line
```

The PC has `duckdb`, `pyarrow`, `pandas` and `zstandard` for its plain `python3`. Anywhere
else, install them with `pip install --user duckdb pyarrow pandas`.

`ingest` takes these flags. Every path is relative to the repo, which is where it runs.

| flag | default | |
|---|---|---|
| `--root` | `var/cubelab/queue` | the queue's root: `<root>/*/*/drafts.jsonl`, and `night-*.json` for the nights |
| `--runs` | `var/cubelab/runs` | run folders, searched recursively for `drafts.jsonl` |
| `--out` | `var/warehouse` | |
| `--ladder` | every `var/ai-ladder*` folder | folders holding `sprt.jsonl` (repeatable) |
| `--experiments` | `docs/evidence/experiments.jsonl` | |
| `--ml` | `var/ml` | gate reports (any `*.json` naming a `gate`), `balance.json` / `stats.json` / `summary.json` / `report.json`, and `power.tsv` |
| `--facts` | `var/cubelab/facts` | the lab's cached engine facts: types, colours, mana value and AI flags for `cards` |
| `--cards-db` | `var/cards/cards.sqlite` | the card library's index, for Scryfall oracle ids. It is read only if present, and nothing is fetched. |
| `--batch-rows` | 50000 | rows per Parquet row group (memory) |
| `--checkpoint-mb` | 512 | commit every so many MB of JSONL read |
| `--rebuild` | off | delete the tables and the state first |

## Querying

From the DuckDB command line:

```sql
-- card win rates in plain decisive games, per cube
select sg.cube, dc.card, count(*) as games, avg(sg.won::int) as win_rate
from deck_cards dc join seat_games sg on sg.draft_id = dc.draft_id and sg.seat = dc.seat
where not sg.explore and sg.decisive
group by all having count(*) >= 50 order by win_rate desc limit 20;

-- one night's drafts, by cube
select cube, count(*) from drafts where source = 'queue' and night = 3 group by cube;
```

From pandas:

```python
import duckdb
con = duckdb.connect("var/warehouse/lab.duckdb", read_only=True)
df = con.sql("select * from games where explore").df()
```

Open the file `read_only=True` from pandas and notebooks, so that an ingest can replace it while
they are open. An ingest writes a new `lab.duckdb` and renames it into place, so a session that
is already open keeps the old views until it reconnects.

`notebooks/` holds six notebooks: card win rates by cube, colour-pair balance, exploring
against plain games, the SPRT and gate history, pick-order heatmaps, and `saved_queries.py`.
Each is a plain `.py` file with `# %%` cells, which VS Code and Jupyter (through jupytext) open
as a notebook, and `python3 notebooks/<name>.py` runs it top to bottom. They find
`var/warehouse/lab.duckdb` from the working directory upwards. Set `LAB_WAREHOUSE` to point
elsewhere. Files rather than `.ipynb` keep outputs out of git.

### Saved queries

`notebooks/sql/` holds the questions asked most often, one plain SQL file each.
`saved_queries.py` runs all five, and the DuckDB command line runs any one of them:

```bash
duckdb var/warehouse/lab.duckdb -c "set variable min_games = 200" -c ".read notebooks/sql/card_win_rates.sql"
```

| file | answers | threshold (`set variable`) |
|---|---|---|
| `card_win_rates.sql` | each card's win rate per cube, with Wilson's 95% interval and the AI flag | `min_games`, default 100 |
| `pair_trends.sql` | each colour pair's share and win rate per cube, night by night | `min_games`, default 1 |
| `game_length.sql` | turns (mean, median, 90th percentile), draws, timeouts, errors and the on-play win rate per cube | |
| `pick_vs_deck.sql` | when each card is taken (mean and median decision) and how often the taking seat's deck plays it | `min_taken`, default 1 |
| `nightly_volume.sql` | each queue night's planned and arrived drafts, games, exploring drafts, recordings, quarantined recordings, timeouts, errors and versions | |

Every rate is over plain games: exploring drafts (D358) are left out. Every file and notebook
opens with the Forge-against-Forge caveat (below). `saved_queries.py` caps DuckDB at 2 GB
(`LAB_DUCKDB_MEMORY`), because the lab runs beside it. The tests run every file on the
warehouse built from the committed fixtures.

## How it stays current

`ingest` is incremental and idempotent. `var/warehouse/_state.json` records, for each
`drafts.jsonl`, the byte offset read so far, with the file's inode, size, mtime and a hash of its
first 4 KiB.

- A run reads only the complete lines appended since then. A line still being written is left
  for the next run, so `ingest` is safe beside a running queue night.
- A file that shrank, was replaced (another inode), was rewritten (another first 4 KiB) or
  vanished is **reset**. Its rows are removed from every table (each row carries `src_file`),
  and it is read again from the start. Only the Parquet files that hold its rows are rewritten.
- An ingest writes its rows to part files named by its run id, as `.tmp` files that it renames
  when done. It commits the run id to `_state.json` last. At the next start, any part file of
  an uncommitted run is deleted, so a killed ingest leaves nothing behind. A long first ingest
  commits every `--checkpoint-mb`.
- An ingest takes a lock (`var/warehouse/.lock`), so two cannot run at once.
- The small tables (below) are rewritten whole on every run.

**Nightly.** Add a last block to each queue-night job, after the night and its redaction pass:

```bash
python3 tools/lab/warehouse.py ingest && python3 tools/lab/warehouse.py verify > var/warehouse/verify.json \
  && python3 tools/lab/warehouse.py export
```

Give it a `cores: 1` line before it. It reads only that night's lines. On synthetic data in a 4-core container, 3,000
drafts took 8 s, and a run with nothing new takes about 2 s.

**Rebuild** with `python3 tools/lab/warehouse.py ingest --rebuild`, or by deleting
`var/warehouse/`. Rebuild after a schema change to this tool. A new column also appears without
a rebuild, because the views read with `union_by_name`, but older rows hold nulls for it. If
`var/warehouse/` moves, run `sql` again, because the views name the Parquet files by absolute
path.

## Layout

```text
var/warehouse/
  lab.duckdb                       views only (no data)
  _state.json  .lock
  _schema/<table>.parquet          an empty file with each partitioned table's columns (the view of an empty table)
  drafts/source=<queue|runs>/night=<N>/part-<run id>.parquet
  games/…  decks/…  deck_cards/…  picks/…           (the same partitions)
  cards/cards.parquet  cube_cards/…  runs/…  versions/…  nights/…  sprt/…  experiments/…
  gate_reports/…  ml_reports/…  matchup_power/…
```

Files are zstd-compressed, with dictionary-encoded strings. `source` is `queue` or `runs`.
`night` is the queue night whose plan handed out the draft's seed. It is **0** for a run
folder, or for a queue seed that no `night-N.json` lists. Both are partition columns, so
`where night = 3` reads only that night's files.

## The schema

`draft_id` is `<source>/<key>#<seed>`, for example `queue/normal/synergy#101`,
`queue/bridge/pauper+modern-era#7` or `runs/explore#102`. It stays the same across ingests and
rebuilds, and it joins the five partitioned tables. `key` is the queue key (`normal/<cube>`,
`bridge/<a>+<b>`), or a run folder's path under `--runs`. `cube` is the cube id (`synergy`), or
`bridge:<a>+<b>` for a bridge draft. `src_file` is the `drafts.jsonl` a row came from.

**Exploring drafts (D358) are marked, never dropped.** `explore` is true on the draft and on
each of its games. Card win rates should use `where not explore`, as the lab's own readers do.
The position data keeps those games.

### drafts: one row per `drafts.jsonl` line

| column | |
|---|---|
| `draft_id`, `src_file`, `cube`, `key`, `kind` | `kind` is `normal` or `bridge` |
| `cube_title`, `format` | the cube document's title, and `grid` or `winston` |
| `seed`, `ver` | the lab version (D341), or `unversioned` for lines from before it |
| `explore`, `explore_epsilon`, `explore_close_call`, `explore_opening` | the D358 tag |
| `winner`, `wins_a`, `wins_b`, `n_games` | `winner` is `A`, `B` or `draw` |
| `engine_error`, `worker` | |
| `a_opens`, `dealt`, `profile_a`, `profile_b` | the profiles: the line's own (D347), else `run.json`'s |
| `bridge_sources` | a bridge draft's cubes |
| `ms_draft`, `ms_build`, `ms_match` | timing |
| `line_no`, `json_bytes` | where the line is in its file |
| `source`, `night` | partition columns |

### games: one row per game

| column | |
|---|---|
| `draft_id`, `src_file`, `cube`, `key`, `seed`, `ver`, `explore` | as in `drafts` |
| `game`, `on_play`, `on_play_verified`, `winner`, `turns`, `ms`, `timeout`, `reason`, `error` | |
| `cpu_ms`, `game_cpu_ms` | the worker's CPU time, and the game thread's (D315) |
| `recorded`, `rec_dir`, `rec_bytes`, `rec_frames`, `rec_errors` | the recordings: `<rec_dir>/g<game>-seat0.jsonl.gz` and `-seat1` |
| `decisions`, `decision_errors` | the AI seats' decision records (D347) |
| `explore_randomised`, `explore_changed`, `explore_close_calls`, `explore_close_calls_changed`, `explore_coins`, `explore_failures`, `explore_by_kind` (JSON), `explore_on_play_drawn` | an exploring game's counts, for both seats (D358) |

### decks: one row per drafter, describing the deck that played

The `lab` deck is used, or Forge's when `played = 'forge'`.

`draft_id`, `src_file`, `cube`, `seat` (`A` / `B`), `played`, `colors`, `splash`, `n_cards`,
`lands`, `spells`, `creatures`, `avg_cmc`, `score`, `stretched`, `deck_errors`, `forge_colors`,
`forge_value`, `n_picks`, `pool_size`.

### deck_cards: one row per card line of a played deck

`draft_id`, `src_file`, `cube`, `seat`, `card` (the name), `card_id`, `count`, `colors` (the
deck's), and `from_cube`. `from_cube` is the cube a bridge draft's card came from, or the
draft's own cube.

### picks: one row per pick decision

`draft_id`, `src_file`, `cube`, `seat`, `n` (the drafter's decision number), `kind` (`grid`,
`pile`, `blind`, `forced`), `at`, `how`, `value`, `seen` (the list of names on offer) and
`took` (the list of names taken). A grid decision takes a row or a column, up to three cards.

### The small tables

| table | from | columns |
|---|---|---|
| `cards` | every card a cube document lists or the data names | `card_id` is the card library's `normName` of the name, one id per card across cubes. Also `name`, `cubes` (the ids of the cubes listing it), `n_cubes`, `in_data`, `oracle_id` (only when `var/cards/cards.sqlite` is there), and `type_line`, `colors`, `cmc` and `is_land` (from the lab's engine facts, when cached). `ai_flag` is `All` (Forge's `AI:RemoveDeck:All`: the AI cannot play the card, D343) or `Random`, from the facts or the cube documents' notes. |
| `cube_cards` | `cubes/*-cube-*.md`, through the cube lab's own parser (`tools/cubelab/cube.ts`, run under Node) | `cube`, `card_id`, `name`, `section`, `themes`, `roles`, `pair` |
| `runs` | each folder's `run.json` | `source`, `key`, `folder`, `cube`, `cube_file`, `cube_sha`, `format`, `games`, `profiles`, `ratings_file`, `record_every`, `play_explore` (JSON), `bridge_sources`, `n_versions`, `version_changes` |
| `versions` | `run.json`'s `versions` (D341) | `source`, `key`, `id`, `git_sha`, `code_tree`, `dirty`, `diff_sha`, `forge_jar_sha256`, `ratings_sha256`, `cube_sha`, `weights_sha`, `node`, `since`, `first_seed`, `allowed_change` (JSON) |
| `nights` | `night-N.json` | `night`, `file`, `drafts` (planned), `games`, `format`, `play_explore`, `chunks`, `keys`, `runs`, `first_run_at`, `last_run_at` |
| `quarantine` | the redaction pass's lists, `<root>-quarantine-n<N>/failed.txt` (J061) | `night`, `list_file`, `path` (the recording), and from the path `key`, `seed`, `game`, `seat`, `draft_id` |
| `cold_archives` | the cold tier's night manifests, `<root>/archive/cold-night-<N>.json` (`archive.py cold`, D378) | one row per tar.zst: `night`, `unit` (the archive's name), `kind` (`recordings` or `quarantine`), `key`, `file` (where it is, on the archive drive), `mirror_file`, `members`, `raw_bytes`, `hot_bytes`, `archive_bytes`, `sha256`, `vers`, `archived_at`, `restored_at`, `manifest` |
| `sprt` | `sprt.jsonl` (D319, D321, D354's gate 3) | `file`, `ts`, `id`, `host`, `a`, `b`, `ah`, `bh`, `elo0`, `elo1`, `alpha`, `beta`, `result`, `llr`, `lower`, `upper`, `games`, `pairs`, `score`, `purpose` |
| `experiments` | `docs/evidence/experiments.jsonl` | `file`, `id`, `kind` (`start` / `end`), `ts`, `host`, `cmd`, `purpose`, `hypothesis`, `status`, `games`, `git_sha`, `json` (the whole line) |
| `gate_reports` | `var/ml/**/*.json` with a `gate` of `fit`, `regret` or `sprt` (D354) | `path`, `gate`, `pass`, `name`, `model`, `model_sha12`, `mtime`, `reasons` (JSON), `json` (the report without its per-row list) |
| `ml_reports` | `var/ml/**/{balance,stats,summary,report}.json` | `path`, `kind`, `mtime`, `bytes`, `json` |
| `matchup_power` | `var/ml/**/power.tsv` (D324, D342, D343) | `path` (the model's folder), `name`, `card_id`, `power`, `sd_post`, `sd_boot`, `points`, `prior`, `games`, `land`, `ai`, `cubes` |

Times (`ts`, `mtime`, `since`, `first_run_at` and `last_run_at`) are UTC timestamps, stored
without a zone.

### seat_games, a view

`seat_games` has one row per game and seat. Most win rates start from it:

| column | |
|---|---|
| `draft_id`, `source`, `night`, `cube`, `key`, `seed`, `ver`, `explore`, `game`, `seat` | |
| `colors`, `played` | the seat's deck |
| `on_play` | whether this seat was on the play |
| `decisive` | `winner` is `A` or `B` |
| `won` | |
| `turns`, `timeout`, `errored` | |

### recording_location, a view

`recording_location` has one row per recorded queue game. It says where the game's
recordings are now: `draft_id`, `night`, `key`, `seed`, `game`, `rec_dir` (where the
recorder wrote them), `tier` (`hot`, or `cold` once `archive.py cold` has moved the night),
`archive_file` and `mirror_file` (the tar.zst holding them), and `restored_at`.
`archive.py restore-night --night N` brings a cold night back.

## The public summary: warehouse.json

`export` writes `var/warehouse/warehouse.json` (`--to` elsewhere). It is a summary with
numbers only, for ForgeCoach's `#lab/data` page. The runner publishes a sanitised copy beside
`status.json` and `ladder.json` on ForgeCoach's `lab-status` branch whenever the file changes,
and serves it locally at `/public-warehouse.json` (`docs/guides/lab-runner.md`). Its fields,
schema 1, were agreed with the page:

```
schema: 1, generatedAt (ISO), warehouseVer
tables[]  {name, rows, bytes}
nights[]  {night (a number, or "other": run folders and lines outside a night plan), drafts, games, recorded, quarantined, engineErrors}
archive   {gzipBytes, zstdBytes} | null     (from --archive FILE, a JSON with those two numbers)
disk      {freeGB, usedPct} | null          (the disk that holds var/warehouse)
cubes[]   {cube, drafts, games, avgTurns, onPlayWinRate}
pairs[]   {cube, pair ("WU"), games, winRate, lo, hi}
cards[]   {cube, card, games, winRate, lo, hi}
```

- Rates are in [0, 1], over plain decisive games without an error. `lo` and `hi` are Wilson's
  95% interval over games. The games of one draft, and the two seats of one game, are
  correlated, so the intervals are optimistic.
- `cards` lists only cards with at least 100 games, the top 25 and the bottom 25 per cube by
  win rate. Each card is named as the cube document names it (`cube_cards`), with control
  characters removed and at most 60 characters.
- There are no decks, seeds, picks, hands, recordings or paths.
- The runner's allowlist (`tools/runner/warehouse.ts`) checks every field again. It drops
  unknown keys, any row with a count that is not a non-negative integer or a rate outside
  [0, 1], and any card name with a character outside letters, digits, spaces and card-name
  punctuation.

`tools/lab/warehouse-sample.json` is an export of the synthetic warehouse below (made-up
results, real card names), which ForgeCoach copies as its sample.

## Reading the numbers

- **Forge against Forge.** Every lab game is Forge Default against Forge Default. A card's win
  rate measures the card in Forge Default's hands, in the decks the lab's drafters build. It
  does not measure the card's strength for a person. The same holds for a colour pair's rate,
  for game length and for the play/draw edge.

- A card's deck win rate is not its strength. Good cards sit in good decks, and colours travel
  together. `matchup_power` is the matchup model's estimate adjusted for the rest of the deck
  (D324). Act on a card only where its `sd_post` is small (review 2, N7).
- **AI-limited cards (D343)** (`cards.ai_flag = 'All'`): Forge's AI cannot play them, so their
  rates measure Forge rather than the card.
- With a few dozen games, the interval is the finding. The notebooks print Wilson's 95%
  interval beside every rate.
- Split by `ver` when the code changed between nights (D341).

## Measured

These numbers come from synthetic data in this container (4 shared cores). The queue root was
45,000 draft lines in 10 keys over 3 nights (884 MB). Its lines were the committed fixtures'
lines, with card names drawn from the real cubes and 15% exploring.

| | |
|---|---|
| full ingest | 98 s, peak RSS 499 MB |
| re-ingest with nothing new | 2 s |
| ingest of 3,000 appended lines | 8 s |
| truncation reset of a 7,500-line file | 17 s, peak RSS 516 MB |
| `verify` | 11 s |
| each notebook | 1.4–2.5 s |
| `saved_queries.py` | 27 s, peak RSS 1.07 GB (DuckDB capped at 2 GB) |

The five tables took 26.7 MB, against 884 MB of JSONL:

| table | rows | size |
|---|---|---|
| `picks` | 1.62 M | 19.5 MB |
| `deck_cards` | 2.52 M | 6.2 MB |
| `drafts`, `games`, `decks` | | under 0.4 MB each |

Synthetic lines repeat themselves more than real ones, so real data will compress less.
`J065` measures the real ratio, and `J066` the real time and size.
