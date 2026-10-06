id: J081
title: Evaluator gate 2 on v2 (D354): rank J050's set with evaluator v2 at the live horizon and score it against J050's truth tables, no new truth
public_title: Regret gate scoring v2
public_est: ~20 min
cpu: heavy
after: J092
repos: mtg-table@7e48088 (a commit whose bridge/src tree is dc7c308, the tree J050's truth and hand ranker were graded with: 7e48088, J050/J051's own pin, unless a later one has the same tree; the pilot refuses any other, D341)
decides: promote evaluator v2 (J067's var/ml/models/nights-1-3-eval.json) past gate 2 (D354), and so whether a gate-3 SPRT on v2 is posted
hypothesis: v2's leaf has lower regret than the hand leaf at the live horizon; expected small, since v1 scored only +0.0017 [-0.0036, +0.0075] on this set (J051) and v2 is the same kind of model trained on about three times the data
rule: gates.py REGRET_RULE (D354 gate 2), unchanged: PASS when mean regret(hand) - regret(eval) > 0 and its paired bootstrap 95% interval (10,000 resamples of decisions, seed 20261004) excludes 0, on >= 240 scored decisions; worded by D372's reporting rule (REGRET_REPORT, MDE 0.015): a FAIL whose interval reaches 0.015 is "underpowered, not 'no gain'", a FAIL whose interval ends below 0.015 "rules out a gain of 0.015 or more", never "no gain"
est: ~10-20 min (J051 ran three rankings in 941 s on 7 JVMs; this job runs two, the evaluator at 3 and 12 rounds, about 24k end-of-turn playouts, plus JVM boots)
resumable: yes
max_workers: 7
mem_per_worker_gb: 2.5
timeout: 4h
progress: lines var/ml/gates/regret-v2/rank-eval-3.jsonl.shard-*.jsonl of 291
metrics: set = sh: python3 tools/ml/gate_metrics.py lines var/ml/gates/regret/set.jsonl
metrics: re3 = sh: python3 tools/ml/gate_metrics.py grade var/ml/gates/regret-v2/rank-eval-3.jsonl var/ml/gates/regret/set.jsonl
metrics: re12 = sh: python3 tools/ml/gate_metrics.py grade var/ml/gates/regret-v2/rank-eval-12.jsonl var/ml/gates/regret/set.jsonl
metrics: g2 = sh: python3 tools/ml/gate_metrics.py report var/ml/gates/regret-v2/report.json
metrics: power = sh: python3 -c "import json, math; r=json.load(open('var/ml/gates/regret-v2/report.json')); d=[x['hand']['regret']-x['eval']['regret'] for x in r['rows']]; n=len(d); m=sum(d)/n; sd=math.sqrt(sum((x-m)**2 for x in d)/(n-1)); hi=r['diffHandMinusEval']['hi']; print(json.dumps({'written':1,'n':n,'sd':sd,'realisedMde':(1.959964+0.841621)*sd/math.sqrt(n),'mde':0.015,'hiBelowMde':1 if hi<0.015 else 0,'reading':0 if r['pass'] else (1 if n>=240 and hi<0.015 else 2)}))" 2>/dev/null || echo '{"written":0}'
headline: g2.scored, g2.regretHand, g2.regretEval, g2.diffHandMinusEval_estimate, g2.diffHandMinusEval_lo, g2.diffHandMinusEval_hi, power.realisedMde, g2.pass

Gate 2 (D354) for evaluator v2, scored exactly as J051 scored v1, on the same decisions and the
same truth. Nothing here computes truth: J050's 291 decisions (`var/ml/gates/regret/set.jsonl`,
sha256 032a7470…94f9) and their full-game truth tables (`truth.jsonl`, 233,204 playouts, 8 h of
the PC) are reused as they are, and so is J050's hand ranker at 3 rounds (`rank-hand-3.jsonl`, the
screen) and J051's at 12 (`rank-hand-12.jsonl`). The job ranks every decision with v2's leaf
(`--leaf eval:var/ml/models/nights-1-3-eval.json`): the same rollouts to the end of THIS turn,
3 rounds, seed 1, no racing. It then runs `gate_regret_score.py` with v2's table as `--eval`. The
12-round ranker is reported, not gated. Everything it writes goes under `var/ml/gates/regret-v2/`;
J050's and J051's files are only read.

**Pre-registered** (written before J067 has finished and before any v2 ranking exists):
- **The set and the truth are J050's, reused.** v2 is the SECOND model scored on this set; v1 (J051)
  was the first. The rule, the rankers' settings and the 240 minimum are REGRET_RULE, unchanged, and
  no part of the set, the truth or the hand ranker is regraded.
- **Held out for v2 too.** The set's decisions come from night 1's test deck pairs. D364's split
  sends a pair to a split by a hash of the pair alone, so those pairs are test pairs of nights 1-3
  and v2 never trained or early-stopped on them. J067's split audit checks it on the data, and this
  job's pilot checks it again on the set itself: every set pair in v2's test split, none in its
  training or validation pairs.
- **Multiple testing, honestly.** v1's FAIL does not change v2's test: v2's rule, interval and
  verdict are computed exactly as v1's were and nothing is adjusted for, or carried over from, J051.
  But the same 291 decisions and the same truth have now been used twice. Each look has the rule's
  own one-sided false-pass rate of about 2.5% when a model has no real gain; across the two looks
  the chance that at least one passes by luck is at most about 5% (less here, because the two
  models pick the same option on most decisions and share the hand ranker and the truth's noise).
  The decision to run this job was made after v1's FAIL was known; v2's design (J067, D364) was
  fixed and posted before J051 read, and nothing in v2's training or selection reads the set or the
  truth. A third model on this set should be judged with a fresh set or a correction, not this rule
  again: grow the set (D372: about 710 scored decisions bring the worst case to 1 point).
- **Power.** The realised MDE is reported beside D372's pre-registered 0.015. For reference, from
  J051's own rows: sd of the paired difference 0.048, n 291, realised MDE 0.0079 at 80% power (the
  two rankers' regrets were equal on 81% of decisions).

**Pinned code (D341, D354).** The scorer refuses tables graded by different code, and D354 pins one
commit so the truth and the rankers share it. The truth and the hand rankers were graded at
`7e48088`, bridge/src tree `dc7c308`; every `main` commit from c09ddfa on has another tree (D358's
exploration, A9's face-down self-test, D370's zstd refusal), D372's scorer included. So this job is pinned to that tree, and its pilot refuses
unless the pilot ranking's own version stamp (`.meta.json`: bridge tree, uncommitted changes, jar
sha256) equals the truth's and the hand ranker's. That commit's scorer predates D372, so it prints
no `reading:` line: the `power` metric above applies D372's rule to `report.json`'s rows, as D372
says to for J051. The evaluator's Java (`mtgtable.eval`) is the same at `7e48088` and on `main`, and
D364's export format is unchanged, so v2 loads there; the pilot proves it.

## Pilot
About 3 minutes: the gate-1 and schema refusals, the held-out and input checks, and v2's ranker on
three decisions of the set.
```bash
./bridge/build.sh
P=var/ml/gates/pilot-g2v2; rm -rf "$P"; mkdir -p "$P"
head -3 var/ml/gates/regret/set.jsonl > "$P/three.jsonl"
python3 tools/ml/gate_regret_grade.py rank --leaf eval:var/ml/models/nights-1-3-eval.json --requests "$P/three.jsonl" \
    --out "$P/rank-eval-3.jsonl" --jobs 1 --name pilot-g2v2
```
metrics: v2 = sh: python3 tools/ml/gate_metrics.py file var/ml/models/nights-1-3-eval.json
metrics: g1 = sh: python3 tools/ml/gate_metrics.py report var/ml/gates/fit-v2/report.json
metrics: g1same = sh: python3 -c "import sys, json; sys.path.insert(0, 'tools/ml'); import gates as G; r=json.load(open('var/ml/gates/fit-v2/report.json')); print(1 if r.get('modelSha12') == G.file_sha12('var/ml/models/nights-1-3-eval.json') else 0)" 2>/dev/null || echo 0
metrics: schema = sh: python3 -c "import sys, json; sys.path.insert(0, 'tools/ml'); import encode as E, evalnet as N; m=json.load(open('var/ml/models/nights-1-3-eval.json')); v1=json.load(open('var/ml/models/night-1-eval.json')); s=E.Schema(E.Vocab(list(m['vocab']))); N.check_schema(m, E.Vocab(list(m['vocab']))); print(json.dumps({'same': 1 if s.schema_id == m['schemaId'] and s.n == m['nFeatures'] else 0, 'asV1': 1 if m['schemaId'] == v1['schemaId'] else 0}))" 2>/dev/null || echo '{"same":0}'
metrics: held = sh: python3 -c "import sys, json; sys.path.insert(0, 'tools/ml'); import gates as G; t=G.model_training('var/ml/models/nights-1-3-eval.json'); h=G.heldout(t['data'], t['splitBy']); s=G.read_jsonl('var/ml/gates/regret/set.jsonl'); print(json.dumps({'set': len(s), 'inTest': sum(1 for d in s if d['pair'] in h['pairs']), 'inTrain': sum(1 for d in s if d['pair'] in h['trainPairs'])}))" 2>/dev/null || echo '{"set":0}'
metrics: inputs = sh: python3 -c "import sys, os, json; sys.path.insert(0, 'tools/ml'); import gates as G; s=G.read_jsonl('var/ml/gates/regret/set.jsonl'); print(json.dumps({'setSha': 1 if G.file_sha('var/ml/gates/regret/set.jsonl') == '032a747058d1ad25e8facb7e50b3e60ce3d0daeee9244c9a7e999734a1c294f9' else 0, 'logs': sum(1 for d in s if os.path.isfile(d['log'])), 'pools': sum(1 for d in s if os.path.isfile(d['oppPool']))}))" 2>/dev/null || echo '{"setSha":0}'
metrics: ver = sh: python3 -c "import sys, json; sys.path.insert(0, 'tools/ml'); import gates as G; L=lambda p: json.load(open(p)); t=L('var/ml/gates/regret/truth.jsonl.meta.json'); h3=L('var/ml/gates/regret/rank-hand-3.jsonl.meta.json'); h12=L('var/ml/gates/regret/rank-hand-12.jsonl.meta.json'); p=L('var/ml/gates/pilot-g2v2/rank-eval-3.jsonl.meta.json'); sha=G.file_sha('var/ml/gates/regret/set.jsonl'); print(json.dumps({'truth': 0 if G.version_diff(t['version'], p['version']) else 1, 'hand3': 0 if G.version_diff(h3['version'], p['version']) else 1, 'hand12': 0 if G.version_diff(h12['version'], p['version']) else 1, 'requests': 1 if t['requestsSha'] == sha and h12['requestsSha'] == sha and h3['requestsSha'] == 'd5e5d3d68569904b0dca1db197bfde53e2e66b78880c0cf10381f79c70ca7230' else 0, 'model': 1 if p['modelSha'] == G.file_sha12('var/ml/models/nights-1-3-eval.json') else 0, 'notV1': 1 if p['modelSha'] != G.file_sha12('var/ml/models/night-1-eval.json') else 0}))" 2>/dev/null || echo '{"truth":0}'
metrics: reuse = sh: python3 -c "import sys, json; sys.path.insert(0, 'tools/ml'); import gates as G; s={str(d['id']) for d in G.read_jsonl('var/ml/gates/regret/set.jsonl')}; ok=lambda f: len({str(a.get('id')) for a in G.read_jsonl('var/ml/gates/regret/' + f) if a.get('status') == 'ok'} & s); print(json.dumps({'truth': ok('truth.jsonl'), 'hand3': ok('rank-hand-3.jsonl'), 'hand12': ok('rank-hand-12.jsonl')}))" 2>/dev/null || echo '{"truth":0}'
metrics: prank = sh: python3 tools/ml/gate_metrics.py grade var/ml/gates/pilot-g2v2/rank-eval-3.jsonl var/ml/gates/pilot-g2v2/three.jsonl
check: v2.exists == 1
check: g1.written == 1
check: g1.pass == 1
check: g1same == 1
check: schema.same == 1
check: schema.asV1 == 1
check: held.set == 291
check: held.inTest == held.set
check: held.inTrain == 0
check: inputs.setSha == 1
check: inputs.logs == 291
check: inputs.pools == 291
check: ver.truth == 1
check: ver.hand3 == 1
check: ver.hand12 == 1
check: ver.requests == 1
check: ver.model == 1
check: ver.notV1 == 1
check: reuse.truth == 291
check: reuse.hand3 == 291
check: reuse.hand12 == 291
check: prank.answered == 3
check: prank.ok >= 2
check: prank.refused == 0

Refusals, not timings:
- **Gate 1 on v2 passed** (J067's `var/ml/gates/fit-v2/report.json`, `pass`), and that report is
  about this very file (its `modelSha12` is the model's). J067 ends `done` on a gate-1 FAIL too, so
  `after:` alone does not say it; a FAIL stops v2 here, as D354 says.
- **v2's schema is the pinned encoder's**: `encode.Schema` over v2's own vocabulary gives v2's
  `schemaId` and feature count (`evalnet.check_schema`), and it is v1's id (D364's
  `--vocab-from`). The Java half (`EvalModel` refuses another schema) is the pilot ranking's `ok`.
- **Held out**: every one of the set's 291 pairs is a test pair of v2's own split and none a
  training or validation pair (`gates.heldout` on v2's dataset, D364's rule).
- **The inputs are J050's, untouched and readable**: the set's sha256 is J050's manifest's
  `setSha`; every log and pool file the set names is on the hot disk (night 1 must not have gone
  to the cold drive: J070, D378); the truth and both hand rankers answered all 291 `ok`.
- **D341**: the pilot's own ranking carries the same compared stamp (bridge tree, uncommitted
  changes, jar) as the truth and both hand rankers; the truth's and the 12-round hand ranker's
  requests are the set, the 3-round hand ranker's are J050's 390 candidates (it was J050's screen;
  `candidatesSha` d5e5d3d6…), and the pilot's model is v2, not v1.

## Commands
```bash
R=var/ml/gates/regret; O=var/ml/gates/regret-v2; M=var/ml/models/nights-1-3-eval.json
mkdir -p "$O"
sha256sum "$M" var/ml/models/night-1-eval.json "$R/set.jsonl" "$R/truth.jsonl" "$R/rank-hand-3.jsonl" \
    "$R/rank-hand-12.jsonl" > "$O/inputs.sha256"
python3 tools/ml/gate_regret_grade.py rank --leaf eval:$M --requests "$R/set.jsonl" --out "$O/rank-eval-3.jsonl" \
    --jobs {workers} --name g2v2-eval-3
python3 tools/ml/gate_regret_grade.py rank --leaf eval:$M --rounds 12 --requests "$R/set.jsonl" --out "$O/rank-eval-12.jsonl" \
    --jobs {workers} --name g2v2-eval-12
python3 tools/ml/gate_regret_score.py --set "$R/set.jsonl" --truth "$R/truth.jsonl" --hand "$R/rank-hand-3.jsonl" \
    --eval "$O/rank-eval-3.jsonl" --hand2 "$R/rank-hand-12.jsonl" --eval2 "$O/rank-eval-12.jsonl" \
    --report "$O/report.json" | tee "$O/verdict.txt" || true
```
check: re3.answered == set.lines
check: re12.answered == set.lines
check: g2.written == 1
check: g2.scored >= 1
check: power.written == 1

No `--allow-version-change` anywhere: if the scorer refuses the tables, the job fails at `g2.written`.

## Abort if
abort: re3.answered >= 30 and re3.error > re3.answered / 5

## Report
collect: var/ml/gates/regret-v2/verdict.txt
collect: var/ml/gates/regret-v2/report.json
collect: var/ml/gates/regret-v2/inputs.sha256
collect: var/ml/gates/regret-v2/rank-eval-3.jsonl.meta.json
collect: var/ml/gates/regret-v2/rank-eval-12.jsonl.meta.json

summary.md:
- gate 2's verdict line for v2, then D372's reading in words from the `power` metric (`reading`
  0 = PASS, 1 = FAIL with a gain of 0.015 or more ruled out, 2 = FAIL underpowered: "a gain of
  0.015 is not ruled out; not 'no gain'"); never "no gain";
- the realised MDE (`power.realisedMde`, with `power.sd` and n) beside the pre-registered 0.015, and
  J051's 0.0079 for v1;
- mean regret for hand, v2 and Forge's own choice; the paired difference with its interval; v1's
  J051 numbers beside them (eval 0.0192, hand - eval +0.0017 [-0.0036, +0.0075]), descriptive only;
- the per-type table and pick agreement; the 12-round secondary; the unscored decisions and why;
- that this is the second model scored on J050's set (the multiple-testing paragraph above, in
  one line);
- the version stamps (D341): HEAD and bridge tree of the truth, the hand rankers and v2's rankers
  (`report.json` `versions`, all one tree), the jar, and v2's model sha256 (12 hex, from
  `inputs.sha256` and the rank meta's `modelSha`).

A PASS makes v2 eligible for gate 3 (an SPRT job on v2, D354, posted by the cloud session; J052 was
v1's and failed its pilot). A FAIL stops v2 here.
