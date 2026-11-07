id: J196
title: Evaluator v3 for the win-chance strip only (the play-AI review of 2026-11-05, §5 row 7): v2's architecture and hyperparameters, one fit over queue nights 1-5 (v2's nights 1-3 dataset unchanged, plus nights 4-5's 75,991 games encoded over the same vocabulary and merged with D518's dataset_merge.py), holding half of each training game's rows (D518's --load-subsample 0.5), judged by D364's eval_compare against v2 on v2's own held-out pairs
public_title: Evaluator v3 (win chance)
public_est: ~7-9 h
public_decides: Whether a win-chance model trained on five nights beats the current one
cpu: heavy
cores: 6
max_workers: 6
mem_per_worker_gb: 1.5
repos: mtg-table@310ba71b657b93d4ce755fcd17aeb6b85d003ac4 (placeholder: the merge commit of D518's lane, pc/d518-eval-v3-tooling, built as a08bce7e off main ea313c01, D517's merge. It adds tools/ml/dataset_merge.py, train_eval.py --load-subsample and config.json coach.evalModel, and changes no trainer default, model, leaf, bridge or wire. The trainer, encoder and comparison are otherwise v2's: from ef7e73f, J092's pin, to main f6a5a732, tools/ml/{train_eval,evalnet,encode,dataset,eval_compare,eval_search}.py changed only in e1413636 (D451, atlas games skipped as notForTraining), which no queue game touches)
decides: whether evaluator v3 becomes the coach's win-chance model (D361). The helper's model is resolved by D518: --eval-model wins, then config.json coach.evalModel (null today), then the night-1 ensemble (v1 and four seeds, D368). BETTER sends v3 to a follow-up that registers it for the strip only, by setting coach.evalModel under a decision of its own; this job only produces and compares. "Not shown better" kills v3. It never decides the search leaf: J194 and the review's §3b closed that, so nothing here touches tools/ai-ladder/players.json, the Java leaf or D354's gates
hypothesis: more games still help a win predictor. Nights 4-5 hold 75,991 recorded games (night-4.json 37,994, night-5.json 37,997), 151,847 chair recordings on disk (75,918 + 75,929; both chairs of every game, as on nights 1-3), against v2's 119,816 chair recordings from 59,997 games: five nights are 2.27x v2's games. J092's curve: going from half to all of the training pairs lowered test log-loss by 0.0093 [+0.0061, +0.0123] (unweighted); 2.27x is about 1.2 doublings, so a gain of roughly +0.006 to +0.011 on v2's test pairs is expected if the curve keeps its slope (hypothesis). The comparison's interval on v2's 873 plain test pairs is about +-0.0034 wide each side (J092's v1-v2 "all" line, +0.0153 [+0.0120, +0.0187]), so such a gain shows. Against it: 75% of nights 4-5's games have a Reckless or Cautious seat (D375; night-4.json seat_mixed 28,473 of 37,994), while v2's test pairs are Default against Default; and v3 holds a fixed half of each training game's rows (D518 §3), where v2 held all of them
rule: written before the run, from the play-AI review of 2026-11-05 §5 row 7, word for word: judged by "D364's `eval_compare` against v2 on the same pairs; `human_eval` at 30 games", kill "not better on compare". Read here as D364's COMPARE_RULE, unchanged: `tools/ml/eval_compare.py var/ml/data/nights-1-3 --model <v3> --against <v2> --reference var/ml/data/nights-1-3`, so both models score exactly v2's held-out test rows (plain games, v2's 916 test pairs of which 873 hold plain games, the rows v2's own report scored), and the `reference` subset is that whole set. v3 is BETTER when log-loss(v2) - log-loss(v3) > 0 with the lower end of its 95% interval (2,000 resamples of deck pairs, seed 20261004) above 0: v3 then goes to the registration follow-up, for the win-chance strip only. Otherwise "not shown better": v3 is killed, not served, and not refitted with other settings. Nothing is tuned on any test split; v3's fit early-stops on its own validation split. `human_eval` at 30 games is not this job's gate (D518, after D369): its FIRST_CHECK reads "the evaluator play.sh serves when the 30th game is in", once, and scores an evaluator against core, not one evaluator against another. The human test set holds 14 games (the review, §1b) and lives in the owner's checkout, not the lab clone. If v3 is registered before the 30th game, FIRST_CHECK reads v3; if not, it reads whatever the strip serves then
followup: register-v3-strip
est: ~7-9 h (unverified as a whole; each part from a measurement). Encode nights 4-5: ~80 min at 6 workers (J087's run1 encoded nights 1-3's 119,822 recordings, 19,517,006 rows, and ran the split audit in 61.8 min at 6 workers, about 32 recordings a second; nights 4-5 are 151,847 recordings at ~171 rows each against nights 1-3's 163, measured on a 240-recording sample). Merge: ~10-15 min (D518's estimate: ~25.9 M rows rewritten at ~7,700 rows a second a process, ~10 min at --jobs 6, plus a 1.7 GB copy of nights 1-3's shards). Split audit: ~3 min (J092's run1, 82 s for 119,816 games). Dry load: ~2 h (D518 measured 53-54 min a dry load of nights-1-3, at share 1 and at 0.5 alike, because both read every shard; five nights are ~2.3x the shards). The fit: ~3-4 h, of which ~2 h is the same load, ~45-85 min the epochs (v2's winner ran ~21 s an epoch over 3.85 M rows a epoch beside three other workers; here an epoch reads about 9 M, and early stopping may come later; an estimate), and ~15 min the baselines and scoring. Comparisons and the strip's load check: ~30-40 min (each loads only a test split, 2-5 M rows). Sum: ~7.3-8.6 h
resumable: no
timeout: 8h
clean: var/ml/gates/pilot-v3 var/ml/models/nights-1-5-eval.json var/ml/reports/v3-audit.json var/ml/reports/v3-audit.txt var/ml/reports/v3-dry.json var/ml/reports/v3.json var/ml/reports/v3.txt var/ml/reports/v3-serve.txt var/ml/reports/v3-compare.json var/ml/reports/v3-compare.txt var/ml/reports/v3-compare-n15.json var/ml/reports/v3-compare-n15.txt var/ml/reports/v3-compare-v1.json var/ml/reports/v3-compare-v1.txt
metrics: ds13 = sh: python3 tools/ml/gate_metrics.py dataset var/ml/data/nights-1-3
metrics: ds45 = sh: python3 tools/ml/gate_metrics.py dataset var/ml/data/nights-4-5
metrics: ds = sh: python3 tools/ml/gate_metrics.py dataset var/ml/data/nights-1-5
metrics: audit = sh: python3 tools/ml/gate_metrics.py report var/ml/reports/v3-audit.json
metrics: dry = sh: python3 tools/ml/gate_metrics.py report var/ml/reports/v3-dry.json
metrics: model = sh: python3 tools/ml/gate_metrics.py file var/ml/models/nights-1-5-eval.json
metrics: serve = sh: head -1 var/ml/reports/v3-serve.txt 2>/dev/null | python3 -c "import json,sys; r=json.loads(sys.stdin.readline() or '{}'); print(1 if r.get('ready') is True and r.get('schema') == '82815752c2f5e346' else 0)" 2>/dev/null || echo 0
metrics: cmp = sh: python3 tools/ml/gate_metrics.py report var/ml/reports/v3-compare.json
metrics: cmpn = sh: python3 tools/ml/gate_metrics.py report var/ml/reports/v3-compare-n15.json
metrics: cmp1 = sh: python3 tools/ml/gate_metrics.py report var/ml/reports/v3-compare-v1.json
headline: ds.rows, ds.games, audit.pass, dry.peakGB, cmp.better, cmp.subsets_reference_pairs, cmpn.better, cmp1.better

**The follow-up, `register-v3-strip`** (on BETTER only). v3 is copied to `var/ml/models/eval-<sha12>.json`, as D437
named v2, and `config.json` `coach.evalModel` is set to it by a decision of its own (D518 §4). That decision also
says whether v3 is served alone, which drops D368's `sd`, or with seeds. On "not shown better" nothing follows.

**What it reads: hot data only.** Two inputs in the lab clone, `~/code/lab/mtg-table`:
- v2's encoded dataset, `var/ml/data/nights-1-3` (19,517,006 rows, 1.7 GB);
- nights 4-5's recordings under `var/cubelab/queue/{normal,bridge}/*/games/`, all on the hot disk. D518 counted
  38,000 of 38,000 seed folders hot for each night.

Nights 1-2's recordings are on the cold drive (D378) and nothing here needs them. That is why v3 merges rather than
re-encodes: nights 4-5 are encoded alone over night 1's vocabulary, exactly as v2's dataset was, and D518's
`tools/ml/dataset_merge.py` joins them to `nights-1-3`, which keeps v2's rows byte for byte. No cold drive, no
restore.

**What "over nights 1-5" means here.** Every game of the overnight queue's nights 1-5 that `dataset.py` keeps:
- all cubes and the bridge folders (D364 §2);
- exploring games kept, as for v2 (D358);
- reserved decks dropped (D340);
- night 1's vocabulary (`--vocab-from var/ml/data/night-1`), so schema `82815752c2f5e346`, v1's and v2's, and v2 scores
  the new rows. A 240-recording sample of nights 4-5, encoded on f6a5a732, gave that schema id.

The review's §2 counts nights 1-3 as 119,816 "games". Those are chair recordings, two to a game: 59,997 games. Its
"75,988 games" for nights 4-5 is about right as games (75,991), and is coincidentally twice night 4's 37,994. So nights
4-5 are 1.27x nights 1-3's games, not 0.63x, and five nights are 135,988 games. Not included: the atlas's branch games
(D451 `notForTraining`), the ladder's and the bench's recordings, and the owner's games (D347: their own split,
never trained on).

**The merge, and why the comparison on v2's test pairs is fair** (D518 §1-2). A pair's name is
`cubelab <seed> A|cubelab <seed> B` in every cube, and nights 4-5 share 5,237 seed numbers with nights 1-3. Those
are always a different cube's or bridge's draft, never the same draft. `dataset_merge.py` refuses a pair named in
two sources unless `--allow-shared-seeds`, so the flag is required here. With it, the merge **keeps each pair's name
and split**: a shared seed's games from both sources are one split group, in the split its name hashes to, exactly
as one `dataset.py` run over all five nights would make it. The merge refuses outright any game whose split would
change, and it tests for that. A pair's split is a hash of its name alone from 20 pairs on (`assign_pairs`), so:
- every v2 test row is a test row of the five-night dataset;
- no v3 training or validation row comes from a v2 test pair.

v3 therefore never sees v2's held-out pairs, and the rule's comparison, on v2's own dataset, scores both models on
rows neither trained or early-stopped on. `eval_compare` checks it again and refuses otherwise. The one place the
joined names show is the report-only five-night comparison: its `reference` subset holds nights 4-5's games of shared
seeds, because they are the same pair by name. That is why the rule reads v2's own dataset, where nothing is joined.

**Memory** (D518 §3, measured on `nights-1-3`). `--load-subsample F` holds ceil(F × c) of every c-row game's rows in
train and val, the same rows of a game in any dataset that holds it. It never samples test.

| | share 1 | share 0.5 |
|---|---|---|
| dry-load peak on nights-1-3 | 10.88 GB | 6.05 GB |
| time per dry load | 53 min | 54 min |

The peak is close to linear in the rows held: about 0.555 GB a million rows. **For five nights this is an
extrapolation, not a measurement**, because nights 4-5 are not encoded yet. About 25.1 M rows are held at 0.5
(**~14 GB**), 18.2 M at 0.33 (~10 GB) and 45.4 M at 1 (~25 GB, past a heavy unit's ~21 GB `MemoryMax`). v3 uses
**0.5**, under J092's 17 GB cap, with `--subsample 0.5` on the held rows, so an epoch sees a quarter of a game's
rows, as v2's `--subsample 0.25` did, drawn from a fixed half. This is the one place v3's trainer is not v2's. Rows
of one game share its outcome (within-game residual correlation 0.774, design effect 148, J092), so the half costs
little of what a game teaches. One dry load at 0.5 checks the extrapolation before the fit. If it peaks at 17 GB or
more, the job stops, and the share is re-chosen in a new job, never inside this one.

**What trained v2** (J092, 2026-10-06, `mtg-table@ef7e73f`, done):
- the dataset: J087's run1, 61.8 min at 6 workers;
- the work after it: 4 h 44 min. That was the dry load and the curve (85 min), the successive-halving search (108
  configurations, 6,261 s of search on 4 forked workers within a 2 h 22 min block) and gate 1 and the comparison
  (56 min);
- the model: hidden [128], card dim 8, l2 1e-3, card_l2 1e-3, dropout 0.1, lr 1e-3, batch 4096, `--fast --compact
  --subsample 0.25 --aux-turns 0.1`; best epoch 31 of 55; **51,545 parameters**, 219 board columns, 1,142,169 bytes,
  sha256 `dcdae3745b84…`;
- test log-loss 0.4915 against core's 0.5566; gate 1 PASS;
- against v1 on night 1's test pairs: +0.0134 [+0.0089, +0.0180], BETTER.

v3 uses **that configuration as it is**, in one plain fit with `--seed 0`, and runs no search (D518, Rejected): a
search may choose another architecture, and the review asks for v2's model trained on more games. The vocabulary and
schema are the same, so v3 should also have 51,545 parameters (expected, not verified). The auxiliary turns head is
trained as v2's was and never exported.

**Two comparisons beside the rule**, reported and changing nothing:
- (b) DATA = `var/ml/data/nights-1-5`: the `new` subset is nights 4-5's own pairs, and `exploring` is apart;
- (c) v3 against v1 (`night-1-eval.json`) on v2's test pairs. v1 is the first member of the night-1 ensemble the
  strip serves today. `eval_compare` takes one model a side, so the ensemble itself cannot be compared. Say so beside
  the line.

**Never the search leaf.** The search leaf needs Java parity and D354's three gates, and §3b and J194 closed it. For
a model that only the strip serves, the checks that matter are:
- it beats v2 on the same pairs;
- it stays calibrated: ECE on every line of the comparison;
- `eval_serve.py` (D361: schema, vocabulary, live-unsafe features) accepts it.

No leaf rows are built: the turn-end line would replay nights 1-2's recordings, which are cold, and it is optional in
`eval_compare`.

## Pilot
metrics: numpy_ok = sh: python3 -c "import numpy; print(1)" 2>/dev/null || echo 0
metrics: v2 = sh: python3 tools/ml/gate_metrics.py file var/ml/models/nights-1-3-eval.json
metrics: n13 = sh: python3 tools/ml/gate_metrics.py dataset var/ml/data/nights-1-3
metrics: n5 = sh: test -s var/cubelab/queue/night-5.json && echo 1 || echo 0
metrics: seeds3 = sh: sed 's#.*/##' var/ml/gates/pilot-v3/n3.txt 2>/dev/null | sort -u | grep -c . || echo 0
metrics: seeds45 = sh: sed 's#.*/##' var/ml/gates/pilot-v3/n45.txt 2>/dev/null | sort -u | grep -c . || echo 0
metrics: pd13 = sh: python3 tools/ml/gate_metrics.py dataset var/ml/gates/pilot-v3/d13
metrics: pd45 = sh: python3 tools/ml/gate_metrics.py dataset var/ml/gates/pilot-v3/d45
metrics: pd15 = sh: python3 tools/ml/gate_metrics.py dataset var/ml/gates/pilot-v3/d15
metrics: same_schema = sh: python3 -c "import json; a=json.load(open('var/ml/gates/pilot-v3/d45/stats.json'))['schemaId']; b=json.load(open('var/ml/models/nights-1-3-eval.json'))['schemaId']; print(1 if a==b=='82815752c2f5e346' else 0)" 2>/dev/null || echo 0
metrics: paudit = sh: python3 tools/ml/gate_metrics.py report var/ml/gates/pilot-v3/audit.json
metrics: pdry = sh: python3 tools/ml/gate_metrics.py report var/ml/gates/pilot-v3/dry.json
metrics: pcmp = sh: python3 tools/ml/gate_metrics.py report var/ml/gates/pilot-v3/compare.json
metrics: pserve = sh: head -1 var/ml/gates/pilot-v3/serve.txt 2>/dev/null | python3 -c "import json,sys; r=json.loads(sys.stdin.readline() or '{}'); print(1 if r.get('ready') is True else 0)" 2>/dev/null || echo 0
metrics: free_gb = sh: df -BG --output=avail var | tail -1 | tr -dc 0-9
check: numpy_ok == 1
check: v2.exists == 1
check: n13.rows == 19517006
check: n13.reservedChecked == 1
check: n5 == 1
check: seeds3 >= 20
check: seeds45 >= 20
check: pd13.written == 1
check: pd45.written == 1
check: pd45.reservedChecked == 1
check: pd45.rows >= 1000
check: same_schema == 1
check: pd15.rows == pd13.rows + pd45.rows
check: pd15.games == pd13.games + pd45.games
check: paudit.pass == 1
check: pdry.written == 1
check: pdry.peakGB < 2
check: pcmp.written == 1
check: pcmp.testPairsTrainedOn_old == 0
check: pcmp.testPairsTrainedOn_new == 0
check: pserve == 1
check: free_gb >= 20
About 20 minutes, the whole chain at a small size:
- the tests, D518's `test_eval_v3.py` included;
- 60 seed folders of night 3 (hot) and 60 of nights 4-5, each picked by its night's own plan. Each sample needs at
  least 20 distinct seed numbers, or the merge refuses it: below 20 pairs a dataset is split by rank, not by the hash;
- each sample encoded over night 1's vocabulary, then merged with `--allow-shared-seeds`, then the split audit against
  the night-3 sample;
- a dry load and a 3-epoch toy fit at `--load-subsample 0.5`;
- the strip's loader on the toy model;
- the rule's exact invocation shape: the toy model against the real v2 on the night-3 sample, with
  `--reference var/ml/data/nights-1-3`.

Its verdict means nothing; only the plumbing is checked.
```bash
python3 -m unittest tools/ml/tests/test_eval_v3.py tools/ml/tests/test_eval_v2.py tools/ml/tests/test_dataset.py tools/ml/tests/test_eval_serve.py tools/ml/tests/test_gates.py
P=var/ml/gates/pilot-v3; mkdir -p "$P"
python3 - "$P" <<'PY'
import json, os, sys
P, root = sys.argv[1], "var/cubelab/queue"
def folders(nights, k):
    out = []
    for n in nights:
        for c in json.load(open(os.path.join(root, f"night-{n}.json")))["chunks"]:
            g = os.path.join(root, c["key"], "games")
            out += [os.path.join(g, str(s)) for s in range(int(c["seed"]), int(c["seed"]) + int(c["drafts"]))]
    out = [p for p in sorted(out) if os.path.isdir(p) and any(f.endswith(".jsonl.gz") for f in os.listdir(p))]
    picked, seen = [], set()
    for p in out[::max(1, len(out) // (4 * k))]:   # spread over every folder; one folder per seed number
        s = os.path.basename(p)
        if s not in seen:
            seen.add(s); picked.append(p)
        if len(picked) == k:
            break
    return picked
open(os.path.join(P, "n3.txt"), "w").write("\n".join(folders([3], 60)) + "\n")
open(os.path.join(P, "n45.txt"), "w").write("\n".join(folders([4, 5], 60)) + "\n")
PY
python3 tools/ml/dataset.py --vocab-from var/ml/data/night-1 --out "$P/d13" --shard-rows 5000 --jobs {workers} $(cat "$P/n3.txt")
python3 tools/ml/dataset.py --vocab-from var/ml/data/night-1 --out "$P/d45" --shard-rows 5000 --jobs {workers} $(cat "$P/n45.txt")
python3 tools/ml/dataset_merge.py "$P/d13" "$P/d45" --out "$P/d15" --allow-shared-seeds --jobs {workers}
python3 tools/ml/split_audit.py "$P/d15" --reference "$P/d13" --report "$P/audit.json"
export OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1
python3 tools/ml/train_eval.py "$P/d15" --split-by pair --compact --fast --load-subsample 0.5 --subsample 0.5 \
    --aux-turns 0.1 --hidden 128 --dim 8 --batch 1024 --dry-load --report "$P/dry.json"
python3 tools/ml/train_eval.py "$P/d15" --split-by pair --compact --fast --load-subsample 0.5 --subsample 0.5 \
    --hidden 16 --dim 8 --epochs 3 --patience 2 --aux-turns 0.1 --out "$P/m.json" --report "$P/m-report.json"
timeout 120 python3 tools/ml/eval_serve.py --model "$P/m.json" --expect-schema 82815752c2f5e346 </dev/null > "$P/serve.txt" 2>&1 || true
python3 tools/ml/eval_compare.py "$P/d13" --model "$P/m.json" --against var/ml/models/nights-1-3-eval.json \
    --reference var/ml/data/nights-1-3 --report "$P/compare.json"
```

## Commands
cores: 6
mem_gb: 18
```bash
mkdir -p var/ml/reports var/ml/models
# nights 4-5 over night 1's vocabulary, as nights 1-3 were (J087/J092); a retry skips a finished encode
test -s var/ml/data/nights-4-5/stats.json || \
  python3 tools/ml/dataset.py --queue-root var/cubelab/queue --nights 4,5 --vocab-from var/ml/data/night-1 \
      --out var/ml/data/nights-4-5 --shard-rows 5000 --jobs {workers}
# one dataset over five nights (D518): nights-1-3's shards copied as they are, every pair's name and split kept;
# --allow-shared-seeds is required (5,237 seed numbers are in both); nights-1-3 is read, never written
test -s var/ml/data/nights-1-5/stats.json || \
  python3 tools/ml/dataset_merge.py var/ml/data/nights-1-3 var/ml/data/nights-4-5 --out var/ml/data/nights-1-5 \
      --allow-shared-seeds --jobs 6
# every v2 game present and in its old split; no five-night test pair a v2 training or validation pair
python3 tools/ml/split_audit.py var/ml/data/nights-1-5 --reference var/ml/data/nights-1-3 \
    --report var/ml/reports/v3-audit.json | tee var/ml/reports/v3-audit.txt
```
cores: 1
mem_gb: 18
```bash
export OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1
# the share is 0.5 (D518's extrapolation: ~14 GB at five nights); this dry load checks it before the fit
python3 tools/ml/train_eval.py var/ml/data/nights-1-5 --split-by pair --compact --fast --load-subsample 0.5 \
    --subsample 0.5 --aux-turns 0.1 --hidden 128 --dim 8 --batch 4096 --dry-load --report var/ml/reports/v3-dry.json | tail -3
python3 -c "import json,sys; r=json.load(open('var/ml/reports/v3-dry.json')); sys.exit(0 if r['peakGB'] < 17 else 1)" \
  || { echo "dry load: 17 GB or more at --load-subsample 0.5; the share is re-chosen in a new job"; exit 1; }
```
cores: 1
mem_gb: 18
```bash
export OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1
# v2's winning configuration (J092 v2.txt, configuration 45), one plain fit, early stopping on v3's own validation
# split; half of each train and val game's rows held, a quarter of each game's rows an epoch, as v2's
python3 tools/ml/train_eval.py var/ml/data/nights-1-5 --split-by pair --compact --fast --load-subsample 0.5 --subsample 0.5 \
    --hidden 128 --dim 8 --l2 0.001 --card-l2 0.001 --dropout 0.1 --lr 0.001 --batch 4096 --epochs 400 --patience 24 \
    --aux-turns 0.1 --seed 0 --out var/ml/models/nights-1-5-eval.json --report var/ml/reports/v3.json \
    | tee var/ml/reports/v3.txt
```
cores: 1
mem_gb: 18
```bash
export OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1
M3=var/ml/models/nights-1-5-eval.json; M2=var/ml/models/nights-1-3-eval.json; M1=var/ml/models/night-1-eval.json
# the strip's own loader accepts v3 (D361's refusals); its first line is the ready line
timeout 120 python3 tools/ml/eval_serve.py --model $M3 --expect-schema 82815752c2f5e346 </dev/null > var/ml/reports/v3-serve.txt 2>&1 || true
# THE RULE (D364's eval_compare, v2's own test rows)
python3 tools/ml/eval_compare.py var/ml/data/nights-1-3 --model $M3 --against $M2 --reference var/ml/data/nights-1-3 \
    --report var/ml/reports/v3-compare.json | tee var/ml/reports/v3-compare.txt
# beside it, report only: five nights' test pairs (reference, new, exploring); shared seeds join old pairs by name
python3 tools/ml/eval_compare.py var/ml/data/nights-1-5 --model $M3 --against $M2 --reference var/ml/data/nights-1-3 \
    --report var/ml/reports/v3-compare-n15.json | tee var/ml/reports/v3-compare-n15.txt
# report only: against v1, the first member of the ensemble the strip serves today
python3 tools/ml/eval_compare.py var/ml/data/nights-1-3 --model $M3 --against $M1 --reference var/ml/data/night-1 \
    --report var/ml/reports/v3-compare-v1.json | tee var/ml/reports/v3-compare-v1.txt
```
check: ds45.reservedChecked == 1
check: ds45.games >= 150000
check: ds.rows == ds13.rows + ds45.rows
check: ds.games == ds13.games + ds45.games
check: audit.pass == 1
check: dry.written == 1
check: dry.peakGB < 17
check: model.exists == 1
check: serve == 1
check: cmp.written == 1
check: cmp.testPairsTrainedOn_old == 0
check: cmp.testPairsTrainedOn_new == 0
check: cmp.subsets_reference_pairs == cmp.subsets_all_pairs
check: cmp.subsets_reference_pairs >= 800
check: cmpn.written == 1
check: cmp1.written == 1

The checks ask whether the job ran correctly, never what it found:
- the nights 4-5 dataset was checked for reserved decks and holds at least 150,000 of the 151,847 recordings
  (`dataset.py` skips a few without decision rows or a label);
- the merge lost nothing;
- the split audit passed;
- the five-night load at 0.5 fitted under 17 GB;
- the model loads in the strip's own loader;
- the rule's comparison ran on held-out pairs only, and its `reference` subset is all of v2's plain test pairs
  (J092's "all" subset had 873).

"Not shown better" passes them. It is a result, not a failed job.

## Abort if
abort: elapsed_s > 50400

## Report
collect: var/ml/data/nights-4-5/stats.json
collect: var/ml/data/nights-1-5/stats.json
collect: var/ml/data/nights-1-5/merge.json
collect: var/ml/reports/v3-audit.txt
collect: var/ml/reports/v3-dry.json
collect: var/ml/reports/v3.txt
collect: var/ml/reports/v3-serve.txt
collect: var/ml/reports/v3-compare.txt
collect: var/ml/reports/v3-compare.json
collect: var/ml/reports/v3-compare-n15.txt
collect: var/ml/reports/v3-compare-n15.json
collect: var/ml/reports/v3-compare-v1.txt
collect: var/ml/reports/v3-compare-v1.json

summary.md:
- **the reading under the rule:** BETTER or "not shown better", from `v3-compare.txt`'s `reference` line alone:
  - v2's and v3's log-loss;
  - log-loss(v2) - log-loss(v3) with its 95% interval, rows, games, the effective n and the pairs;
  - ECE of both;
  - on BETTER, "goes to the registration follow-up (coach.evalModel, a decision of its own), for the strip only";
    otherwise "killed";
- **the dataset:**
  - nights 4-5's recordings, rows and games per split and per night;
  - exploring games kept, reserved games dropped;
  - the merged totals, `merge.json`'s checks, and the split audit's line;
  - how many nights 4-5 games joined a pair that nights 1-3 already had (the 5,237 shared seed numbers);
- **memory:** the dry load's peak at 0.5 against D518's ~14 GB extrapolation, the held rows per split
  (`loadSubsample`), and the real run's `memory` lines;
- **the fit:**
  - the configuration (v2's), best epoch and epochs trained, the seconds;
  - parameters (expected 51,545);
  - the auxiliary head's test MAE against the constant's;
  - the `held out` lines (plain against exploring) and the within-game correlation;
- **beside the rule, report only:**
  - the five-night comparison's `reference`, `new` and `exploring` lines. `new` is nights 4-5's own,
    profile-mixed pairs, and the five-night `reference` holds nights 4-5's games of shared seeds;
  - v3 against v1 on v2's test pairs. Say that the strip serves v1's five-seed ensemble today (coach.evalModel null)
    and that `eval_compare` cannot score an ensemble;
- **the model:** sha256 (12 hex), bytes, and the strip loader's ready line.

Do not tune anything against a test split. Do not refit with other settings after reading the comparison. Never write
"no gain" for an interval that includes 0: write "not shown better". Do not set coach.evalModel or point the ladder at
v3 from this job. Registration is the follow-up's, only on BETTER.
