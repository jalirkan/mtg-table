id: J063
title: Outside exam (D359): a reduced r17 evaluator trained on night 1's Vintage-cube games, scored on 17Lands' Powered Cube human games against simple rules
public_title: Evaluator outside exam
public_est: ~2 h
cpu: heavy
after: J050
repos: mtg-table@c2a28ef (main with the outside exam, D359; pinned so the rows, the model and the exam share one code version)
est: ~1.5-2 h (encode ~15-30 min at 7 workers; the grid gets 1 h; both downloads, 158 MB, a few minutes; the rows ~5 min; each exam ~2 min)
resumable: no
max_workers: 7
mem_per_worker_gb: 1.5
timeout: 5h
clean: var/ml/data/r17-pilot var/ml/data/r17-vintage-n1 var/ml/models/r17-pilot.json var/ml/models/r17-vintage-n1.json var/ml/17lands/pilot var/ml/17lands/rows-premier var/ml/17lands/rows-trad var/ml/reports/outside-exam.json var/ml/reports/outside-exam-trad.json
metrics: ds = sh: python3 tools/ml/gate_metrics.py dataset var/ml/data/r17-vintage-n1
metrics: model = sh: python3 tools/ml/gate_metrics.py file var/ml/models/r17-vintage-n1.json
metrics: ext = sh: python3 tools/ml/gate_metrics.py ext var/ml/17lands/rows-premier
metrics: trad = sh: python3 tools/ml/gate_metrics.py ext var/ml/17lands/rows-trad
metrics: exam = sh: python3 tools/ml/gate_metrics.py exam var/ml/reports/outside-exam.json
headline: ds.rows, ds.games, ext.testUserRows, exam.decided, exam.pass

The outside exam Justin approved (D359): does what the position evaluator learned from Forge-vs-Forge games
carry over to HUMAN games? A reduced evaluator (schema `r17`: only what both sources record at the end of a
half-turn: turn, play/draw, life, hand sizes, each battlefield's cards and counts) is trained on night 1's
Vintage-cube games (`normal/vintage` and the bridge folders naming vintage; reserved decks dropped, D340;
exploring games left out). It is then scored on 17Lands' public Powered Cube replays (152 of the Vintage
cube's 180 cards) against prior, life-difference, board-count and reduced-core rules fitted on OUR data only.

**Data credit: 17Lands** public datasets, https://www.17lands.com/public_datasets, CC BY 4.0
(https://creativecommons.org/licenses/by/4.0/); filtered and re-encoded. Only the published files are
downloaded (`ext17l.py fetch`: resumed, size-checked against Content-Length), never the API. They stay
under `var/` and are never committed or collected.

The verdict rule is fixed in `tools/ml/outside_exam.py` (`EXAM_RULE`) and in D359, and no flag changes it.
On PremierDraft's held-out `test` half (a hash of the game id), the user's rows, turn >= 3, vocabulary share
>= 0.5: PASS when the best simple rule's log-loss minus the evaluator's is > 0, with the lower end of its
95% interval (2,000 resamples over games) above 0, on >= 2,000 games and 10,000 rows. A FAIL verdict is a
result, not a failed job. TradDraft's file is reported beside it, without a verdict.

`after: J029` because it reads night 1's recordings, which J029 finished (`--nights 1` keeps only the seeds
night 1's plan handed out). It only reads `var/cubelab/queue`, so it may run beside a queue night.

## Pilot
metrics: numpy_ok = sh: python3 -c "import numpy; print(1)" 2>/dev/null || echo 0
metrics: night1 = sh: test -s var/cubelab/queue/night-1.json && echo 1 || echo 0
metrics: pds = sh: python3 tools/ml/gate_metrics.py dataset var/ml/data/r17-pilot
metrics: pext = sh: python3 tools/ml/gate_metrics.py ext var/ml/17lands/pilot/rows
metrics: pexam = sh: python3 tools/ml/gate_metrics.py exam var/ml/reports/outside-exam-pilot.json
metrics: dry_peak_gb = sh: python3 -c "import json; print(json.load(open('var/ml/reports/r17-pilot-dry.json'))['peakGB'])" 2>/dev/null || echo 99
check: numpy_ok == 1
check: night1 == 1
check: pds.written == 1
check: pds.reservedChecked == 1
check: pds.rows >= 1000
check: dry_peak_gb < 4
check: pext.written == 1
check: pext.partial == 1
check: pext.q50 >= 1000
check: pext.peakGB < 4
check: pexam.written == 1
check: pexam.decided == 0
check: pexam.peakGB < 4
About 10 minutes, the whole pipeline at small size: the exam's tests; r17 rows from the first 60 night-1
seed folders of `normal/vintage`; a dry load of the fit's command line on them (its peak memory); a
range read of the first 20 MB of the PremierDraft replay file (about 37,000 games) into r17 rows; a
3-epoch toy model; and the exam on the range-read rows, which must report NO VERDICT (a partial download
is never a verdict).
```bash
python3 -m unittest tools/ml/tests/test_outside_exam.py
mkdir -p var/ml/reports var/ml/models var/ml/17lands/pilot
python3 tools/ml/dataset.py --schema r17 --vocab cubes/vintage-cube-180.md --out var/ml/data/r17-pilot \
    --jobs {workers} $(ls -d var/cubelab/queue/normal/vintage/games/* | head -60)
python3 tools/ml/train_eval.py var/ml/data/r17-pilot --split-by pair --grid --time-budget 3600 --batch 1024 \
    --dry-load --report var/ml/reports/r17-pilot-dry.json
python3 tools/ml/train_eval.py var/ml/data/r17-pilot --split-by pair --epochs 3 --out var/ml/models/r17-pilot.json
python3 tools/ml/ext17l.py fetch --set powered-premier --dir var/ml/17lands/pilot --max-bytes 20000000
python3 tools/ml/ext17l.py rows var/ml/17lands/pilot/replay_data_public.Cube_-_Powered.PremierDraft.csv.gz \
    --cards var/ml/17lands/pilot/cards.csv --out var/ml/17lands/pilot/rows --perspective both
python3 tools/ml/outside_exam.py --model var/ml/models/r17-pilot.json --ext var/ml/17lands/pilot/rows \
    --report var/ml/reports/outside-exam-pilot.json | tail -3
```
Record the pilot's encode rate (rows and seconds from its output) and the range read's games per second.

## Commands
```bash
mkdir -p var/ml/reports var/ml/models var/ml/17lands
python3 tools/ml/dataset.py --schema r17 --queue-root var/cubelab/queue --cube vintage --nights 1 \
    --out var/ml/data/r17-vintage-n1 --jobs {workers}
```
cores: 1
mem_gb: 4
```bash
python3 tools/ml/train_eval.py var/ml/data/r17-vintage-n1 --split-by pair --grid --time-budget 3600 --batch 1024 \
    --grid-log var/ml/reports/r17-vintage-n1-grid.jsonl --out var/ml/models/r17-vintage-n1.json \
    --report var/ml/reports/r17-vintage-n1.json | tee var/ml/reports/r17-vintage-n1.txt
```
cores: 1
mem_gb: 4
```bash
python3 tools/ml/ext17l.py fetch --set powered-premier --dir var/ml/17lands
python3 tools/ml/ext17l.py fetch --set powered-trad --dir var/ml/17lands
python3 tools/ml/ext17l.py rows var/ml/17lands/replay_data_public.Cube_-_Powered.PremierDraft.csv.gz \
    --cards var/ml/17lands/cards.csv --out var/ml/17lands/rows-premier --perspective both \
    | tee var/ml/reports/ext-premier.txt
python3 tools/ml/ext17l.py rows var/ml/17lands/replay_data_public.Cube_-_Powered.TradDraft.csv.gz \
    --cards var/ml/17lands/cards.csv --out var/ml/17lands/rows-trad --perspective both \
    | tee var/ml/reports/ext-trad.txt
python3 tools/ml/outside_exam.py --model var/ml/models/r17-vintage-n1.json --ext var/ml/17lands/rows-premier \
    --report var/ml/reports/outside-exam.json | tee var/ml/reports/outside-exam.txt
python3 tools/ml/outside_exam.py --model var/ml/models/r17-vintage-n1.json --ext var/ml/17lands/rows-trad \
    --report var/ml/reports/outside-exam-trad.json | tee var/ml/reports/outside-exam-trad.txt
```
check: ds.reservedChecked == 1
check: ds.games >= 1000
check: model.exists == 1
check: ext.games >= 250000
check: ext.partial == 0
check: ext.testUserRows >= 10000
check: trad.written == 1
check: exam.written == 1
check: exam.decided == 1

## Abort if
abort: elapsed_s > 18000

## Report
collect: var/ml/data/r17-vintage-n1/stats.json
collect: var/ml/reports/r17-vintage-n1.txt
collect: var/ml/reports/ext-premier.txt
collect: var/ml/reports/ext-trad.txt
collect: var/ml/17lands/rows-premier/stats.json
collect: var/ml/reports/outside-exam.txt
collect: var/ml/reports/outside-exam.json
collect: var/ml/reports/outside-exam-trad.txt

summary.md, plainly, with the credit line "Human games: 17Lands public datasets, CC BY 4.0" at the top:
- our r17 dataset: rows, games and deck pairs per split, the games dropped and why (reserved, exploring,
  deck vocabulary), and the r17 model's grid winner with its own test numbers against prior, life, board
  and core (`r17-vintage-n1.txt`);
- the 17Lands rows: games read, user-side positions, qualifying at 0.5 and 0.8, rows in the test half;
- the verdict line, b* with its difference and interval, the evaluator against the reduced core, the
  evaluator's ECE and reliability on 17Lands, and the per-turn-bucket table;
- the transfer gap (our advantage over b*, 17Lands', the share kept);
- TradDraft's numbers beside PremierDraft's (no verdict);
- the peak memory of the fit (`memory` in `r17-vintage-n1.json`), the rows and the exam (`peakGB`).

Do not tune anything against 17Lands data and do not rerun the exam with other settings: the rule is
D359's. On a FAIL, the finding is the transfer gap, not a reason to change the rule.
