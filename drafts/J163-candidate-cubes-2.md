<!--
DRAFT, written 2026-10-24 by the PC session's lab job writer into pc-results drafts/; NOT POSTED. Before posting,
the main session:
  1. Merges pc/balance-model-v2 (mtg-table PR #200, head b2e1b18d, D475: balance-model v2 and the five cubes under
     cubes/library/balanced/v2/) to main, then replaces 10fe4e7e in the repos line with that merge's sha. The pilot
     requires merged == 1, the five v2 files, and v1's balanced-legacy-even-high-nopower.md byte-identical to the
     file J160 measured (sha256 27a26fb5...; unchanged from 8a33ea78 to b2e1b18d, checked 2026-10-24).
  2. Creates /home/justin-a/code/lab/data/lab-j163 EMPTY before posting (the J144 lesson). The pilot creates it
     again if absent.
  3. Leaves /home/justin-a/code/lab/data/lab-j160/report/ and lab-j159/out/ exactly as they are: v2's regeneration
     reads them as its drafted nights, and the pilot checks every one of their sha256s against v2's model.json
     (all 24 of its data inputs matched on 2026-10-24).
  4. Checks the regeneration at the pin, which this writer did NOT run (the machine held J162 at 6 workers and a
     serial gate): balance-model v2 twice with the pilot's flags (the guide's two commands, --night lab-j159
     --night lab-j160/report, plain and --exclude cubes/library/powered-exclude.txt --suffix -nopower; about 3 min
     each on one core) must write the five committed v2 cubes byte-identical, and v1's -nopower run (J160's second
     command, about 1 min) must write balanced-legacy-even-high-nopower.md byte-identical. The pilot's regen check
     fails otherwise. J160's pilot regenerated v1's at 8a33ea78; D475 says v1 is unchanged byte for byte without
     --night; the v2 cubes' byte-identity is so far only the branch's own claim.
  5. Adds no after line: J162 is lower-numbered and the core budget serialises them.
Lint: tools/runner.sh check is clean with a real sha in place of 10fe4e7e (see the end of the Pilot section).
-->
id: J163
title: The library loop, night 2 -- (a) the confirmation of J160's one candidate, balanced-legacy-even-high-nopower (v1's file, byte-identical to J160's), at 3x on fresh seeds (6,000 lab-vs-lab grid drafts, 12,000 games), registered CONFIRMED CANDIDATE / NOT CONFIRMED on this night alone; (b) model v2's five cubes (D475: balanced-v2-legacy-even-high, -high-nopower, -mid, -mid-nopower, balanced-v2-pauper-even) at 1x (2,000 drafts, 4,000 games each), each with J145's balance read; (c) v2's first out-of-sample test against its predictions of record, regenerated at the pin in the pilot: (i) is v2's per-cell error smaller than v1's was on J160, (ii) coverage of v2's with-transfer intervals, (iii) the selection bias, (iv) candidates among the v2 cubes. J145's judged arm only, Forge Default both seats, recorded rows; drafts 819,k00,001 and up, game seeds (1,900 + k) x 1,000,000 + g; no cube promoted, swapped or regenerated
public_title: Library loop night 2: a candidate confirmed or not, and model v2 tested
public_est: ~5 h
public_decides: Whether the J160 candidate cube holds at 3x, and model v2 misses less than v1
cpu: heavy
cores: 7
max_workers: 7
mem_per_worker_gb: 3
repos: mtg-table@10fe4e7e (origin/main: the merge that brings pc/balance-model-v2, D475 -- tools/cubelab/balance-model-v2-cmd.ts and cubes/library/balanced/v2/; merged == 1, checked by the pilot)
decides: (a) whether J160's one candidate, balanced-legacy-even-high-nopower, is a CONFIRMED CANDIDATE: no colour OFF and no qualifying pair OFF on a 3x measurement at fresh seeds, read on this night alone (D447 point 9; study/omega-swap-rule-v2.md step 5), with the v2 draft rule's PASS and the swap rule's BALANCED bar printed beside it and decided by neither; (b) and (c) whether library card model v2 (D475) misses less than v1 did, on the five cubes it generated, measured once each: (i) its pooled per-cell RMSE (colours; qualifying pairs) against v1's on J160 (.0303 / .0470), SMALLER or NOT SMALLER each; (ii) the share of the measured cells inside v2's with-transfer 95% intervals, against what honest intervals give (HONEST / TOO NARROW / TOO WIDE); (iii) the selection bias, as J160's; (iv) which v2 cube, if any, has no colour OFF and no qualifying pair OFF on this night alone -- a candidate for a later 3x confirmation. No cube is promoted, swapped or regenerated, and the refit (the loop's step 4) is not this job's
hypothesis: (a) NOT CONFIRMED is the likelier answer, and CONFIRMED is open. On J160 the candidate passed narrowly: black .451 (.424-.481) UNCLEAR, .001 inside the band's edge; UR .543 (.515-.570) UNCLEAR; five pairs qualified. At 3x the intervals shrink by sqrt 3 and every one of the ten pairs reaches 400 deck-games (J160's thinnest, WB, had 180), so five more pairs are judged, among them BR .440 (.373-.509, 248) and BG .462 (210). A rough simulation from J160's cells (no engine, 2026-10-24) puts P(CONFIRMED) at about .02 with J160's points as the truth and about .47 with each cell shrunk halfway to .5 (the candidate was chosen as the best of five, so its J160 cells flatter it); the v2 PASS under .01 either way. (b)-(c) v2's validation (study/omega-balance-model-v2.md section 4) expects .028 / .042 on a cube no night has drafted (J160 held out) and .022 / .036 with only the cube held out; these five cubes share 130-148 of 180 cards with their v1 namesakes and 151-162 with some J160 cube, so the night is out of sample for the cube lists and the night, not for most cards: expected pooled RMSE about .022-.030 colours and .036-.045 pairs, so SMALLER on both is expected and NOT SMALLER on either would say the drafted fit's gain does not carry to new lists; transfer SD near v2's .021 / .030; coverage of the plain with-transfer interval about .91-.92 (its expectation given each cell's measurement noise) and about .95 widened, so HONEST. Selection bias: v2's robust search was judged on held-out replicates, so the measured max pair gap should sit near the with-transfer expectation (about .055-.065 a pair) and the measured objective inside each cube's with-transfer gap interval (.05-.15) rather than at the point gap (.040-.055). Candidates: each cube's with-transfer gap (~.09-.10) leaves room for 0-2 of the five; the mid cubes carry Scute Swarm, Rampaging Baloths and Craterhoof Behemoth, J160's stall suspects, so expect timeouts there again
rule: THE LIBRARY LOOP'S SECOND NIGHT (pc-results study/omega-swap-rule-v2.md, "The loop" steps 3 and 5, and study/omega-balance-model-v2.md; the reads below written into this file before any J163 game). MEASURE: J145's judged arm only, at fresh seeds: grid drafts by the lab drafter on both seats (the cube's default ratings, Forge's ranks), each draft's two decks played against each other twice, each on the play once, Bo1, Forge Default both seats, --record rows (D450); 6,000 drafts for (a), 2,000 for each v2 cube; read with J145's balance.py unchanged in its rules (J160's text, the --job default the only edit; J145's rule, verbatim in substance: a deck's colours are its colours with 3+ spells; 4-5-colour decks excluded; PAYOFF = colour c's win rate in decisive games between decks that differ in c, deck-clustered bootstrap, 1,000 replicates, seed 145; a cell OFF when its 95% interval excludes .5 AND its point is outside [.45, .55], EVEN when the interval sits inside [.45, .55], else UNCLEAR; pull reported, never judged). A QUALIFYING PAIR has 400+ arm-B deck-games. (a) THE CONFIRMATION (confirm.py): CONFIRMED CANDIDATE when on this night alone no colour is OFF and no qualifying pair is OFF; NOT CONFIRMED otherwise; INCOMPLETE without judged games; J160's games are never pooled in. Printed beside it and deciding nothing: the v2 draft rule's PASS (every colour EVEN, no qualifying pair OFF), the swap rule's BALANCED bar at confirmation (every colour EVEN and every qualifying pair EVEN; Justin's question 3 picks between that and "not OFF"), J160's cells as the unpooled reference row with each cell's change and z, and v1's prediction of record. THE PREDICTIONS: balance-model at the pin, three runs by the pilot from sha256-checked inputs (lab-j144's census, lab-j145, lab-j159's out/ and lab-j160's report/, the facts cache 32653ed2fcd7d8d2.json; --reps 200 --seed 1): v1 -nopower (J160's second command), whose model.json is (a)'s v1 reference and which must regenerate balanced-legacy-even-high-nopower byte-identical; and v2 twice (--night lab-j159 --night lab-j160/report --drafts 2000; the second --exclude cubes/library/powered-exclude.txt --suffix -nopower), which must regenerate the five v2 cubes byte-identical, or the pilot fails; the v2 model.json files' cubes[].record.cells are the predictions of record (est, the bootstrap sd, and loT-hiT, the with-transfer 95% interval). THE REGISTERED READS on the v2 cubes (modeltest.py, per cube and pooled over the five): (i) PER-CELL ERROR = RMSE(pred, measured) over the five colours and the qualifying pairs; THE READ: SMALLER when v2's pooled RMSE (to 4 decimals) is below v1's pooled RMSE on J160 (J160's report/model-test.json, sha256-checked: colours .0303, pairs .0470), else NOT SMALLER, colours and pairs each; beside it, never replacing it, max |pred - measured|, the noise-corrected transfer SD (J160's definition, the predicted var v2's bootstrap sd^2) against v2's validation (.021 / .030), and v2's own expectations (.028 / .042 J160 held out; .022 / .036 cube held out); (ii) COVERAGE = the share of those cells whose measured payoff lies inside [loT, hiT]; beside it the share honest intervals would give, given each cell's own measurement SE (mean of 2 Phi(1.96 sdT / sqrt(sdT^2 + se^2)) - 1, sdT = (hiT - loT) / 3.92), and the share inside the interval widened by that SE with its Wilson 95% interval over the pooled cells: HONEST when .95 is inside it, TOO NARROW when .95 is above it, TOO WIDE when .95 is below it; (iii) SELECTION BIAS, as J160's: the measured max |payoff - .5| over the qualifying pairs minus the predicted max |pred - .5| over the same pairs, per cube, with the noise-only expectation of the measured gap (each pair N(pred, measured SE), 4,000 draws, seed 163) and its share at or above the measured gap, the same with v2's transfer error added, and the measured objective (max colour gap + max qualifying pair gap) against v2's point, robust and with-transfer gaps, inside the with-transfer 95% interval or not; (iv) A CANDIDATE = a v2 cube with no colour OFF and no qualifying pair OFF on this night alone (D447 point 9; confirmed only at 3x on fresh seeds later), the v2 PASS beside it. REPORTED, NOT READ: the power effect per v2 family; the cells missed beyond both bootstrap intervals; (a)'s cube against v1's prediction at J163 and at J160 as reference rows, never pooled; each cube's pull. No cube is promoted, swapped or regenerated; no refit
followup: morning-read
est: ~5 h (4.5-6 h) on 6 workers (the memory rule gave J159, J160 and J162 6 of the 7 asked). J160 measured the same pipeline at 6 workers: 2,000 drafts in 65-92 s and 4,000 games in 21-49 min a cube, 7,083 games an hour overall (20,000 games in 3 h 0 min), and the candidate itself at 7,583 an hour (high-nopower, 33 min a 1x cube). (a) is then ~1.65 h (6,000 drafts ~4 min, 12,000 games ~95 min); (b) ~3 h if each v2 cube plays like its v1 namesake (high 28 min, high-nopower 33, mid 43, mid-nopower 50, pauper 23; the mid cubes keep J160's stall suspects); the pilot ~20 min (three balance-model runs, ~1 + 3 + 3 min unloaded, then the 20-draft smoke); the reads ~3 min. The longest step is (a): ~1.65 h at 6 workers, ~2.5 h at 4 under memory pressure, so `timeout: 4h`. Storage on the data folder: ~2.5-3 GB (J160: 1.8 GB for 20,000 games, 53-81 KB of rows a game; J163 plays 32,000); 677.9 GB free at J160's end
resumable: yes
timeout: 4h
clean: var/lab-j163-local var/cubelab/homes-J163
progress: metric played games of 32000
metrics: qwriters = sh: pgrep -fc '[c]ubelab.* queue run' || true
metrics: played = lines /home/justin-a/code/lab/data/lab-j163/balanced-*/games/B-lab/games.jsonl
metrics: engine_errors = count /home/justin-a/code/lab/data/lab-j163/balanced-*/games/B-lab/games.jsonl "\"engineError\":\""
metrics: timeouts = count /home/justin-a/code/lab/data/lab-j163/balanced-*/games/B-lab/games.jsonl "\"timeout\":true"
metrics: data_free_gb = sh: python3 -c "import shutil; print(round(shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9, 1))" 2>/dev/null || echo 0
metrics: data_used_gb = sh: python3 -c "import os; print(round(sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk('/home/justin-a/code/lab/data/lab-j163') for f in fs) / 1e9, 2))" 2>/dev/null || echo 0
metrics: runs = cubelab /home/justin-a/code/lab/data/lab-j163/balanced-*/runs/lab
metrics: st = sh: python3 var/lab-j163-local/bin/status.py 2>/dev/null || echo '{"expected":0}'
metrics: armed = sh: cat var/lab-j163-local/armed.txt 2>/dev/null || echo 0
metrics: cf = sh: cat /home/justin-a/code/lab/data/lab-j163/report/confirmation.json 2>/dev/null || echo '{"code":-9}'
metrics: cfstrict = sh: python3 -c "import json,sys; json.load(open('/home/justin-a/code/lab/data/lab-j163/report/confirmation.json'), parse_constant=lambda c: sys.exit(1)); print(1)" 2>/dev/null || echo 0
metrics: mt = sh: cat /home/justin-a/code/lab/data/lab-j163/report/model-test.json 2>/dev/null || echo '{"code":-9}'
metrics: mtstrict = sh: python3 -c "import json,sys; json.load(open('/home/justin-a/code/lab/data/lab-j163/report/model-test.json'), parse_constant=lambda c: sys.exit(1)); print(1)" 2>/dev/null || echo 0
headline: played, engine_errors, timeouts, st.cubes, st.expected, cf.code, mt.code, mt.nTested, mt.pooled.rmseColour, mt.pooled.rmsePair, mt.reads.ii.coverage, mt.nCandidates

**Why** (pc-results `study/omega-swap-rule-v2.md`, `study/omega-balance-model-v2.md` and `results/J160/summary.md`,
2026-10-24). The library loop generates whole cubes from the library's 1,000-odd cards, predicted to win evenly in
every colour and pair when the lab drafter drafts them and Forge plays them, and spends engine nights measuring
them. Its first night, J160, did two things this night follows up:
- **It found one candidate.** `balanced-legacy-even-high-nopower` was BALANCED ON PAYOFF with no qualifying pair
  OFF -- narrowly: black .451 (.424-.481) UNCLEAR, .001 inside the band. The loop's rule (step 5; D447 point 9)
  calls nothing balanced on one night: a candidate is measured again on fresh seeds at three times the size before
  it is called anything. This is that measurement.
- **It showed the model missing.** v1's per-cell error on its own cubes was RMSE .030 colours / .047 pairs (Omega:
  .017 / .021), and "even to .01" cubes measured gaps of .04-.10. Model v2 (D475) answers it: card values fitted in
  drafted context (32,777 arm-B games), the lab drafter's own deck mix simulated per cube, a search judged on held-
  out replicates, and intervals that carry the transfer error (.021 a colour, .030 a pair). Its validation is
  leave-one-night-out on the nights it was fitted from; **this night is the first measurement it has never seen**,
  of five new cube lists. The v2 write-up names the read: "whether v2's per-cell errors are smaller than v1's were on
  J160".

**What this night is not.** No cube is promoted, swapped or regenerated; no refit (step 4) runs; the v2 stop rule
is not applied. A CONFIRMED CANDIDATE is not BALANCED: the swap rule's BALANCED bar (every colour EVEN, and every
qualifying pair EVEN or not OFF by Justin's question 3) is printed, and choosing between the bars is Justin's.
Pull is reported for each cube and never judged.

**What changed from J160, and nothing else** (every other line is J160's, which is J145's arm B):
- **The cubes.** (a) v1's `balanced-legacy-even-high-nopower.md`, the file J160 measured (sha256 checked by the
  pilot), at 6,000 drafts; (b) the five v2 files under `cubes/library/balanced/v2/` at 2,000 each. No v1 cube is
  measured at 1x, and v2's pauper cube has no `-nopower` file (as v1's: the powered list holds no pauper card).
- **The predictions.** Three balance-model runs in the pilot, never into `cubes/`: v1 -nopower (J160's second
  command), for (a)'s reference row and the candidate's regeneration; v2 plain and v2 -nopower (the guide's
  commands, D475), whose `model.json` files are the predictions of record for (c). The pilot fails unless every
  measured cube regenerates byte-identical. v2's runs read lab-j159's `out/` and lab-j160's `report/` as their
  drafted nights; all 24 of its data inputs' sha256s are written into the pilot (taken from v2's committed model.json,
  matched on 2026-10-24).
- **The scripts.** `profile.ts` is J160's (its header comment only); `balance.py` is J160's with its `--job` default;
  `status.py` reads `cubes.tsv` (id, path, drafts) and only the cube folders it names. `modeltest.py` is J160's
  with v2's model format beside v1's, the coverage read (ii), the comparison with v1's J160 error (i) and v2's
  objective intervals in (iii); on J160's own files with v1's models it reproduces J160's `model-test.json`
  cell for cell (checked 2026-10-24). `confirm.py` is new: (a)'s registered verdict.
- **J160's two FAILs are fixed.** J160's `runs` and `played` metrics globbed `lab-j160/*/...`, which matched the
  pilot's folder and counted its 20 drafts and 40 games (results/J160/summary.md). Every games and runs glob here
  is `lab-j163/balanced-*/...`: the cube folders are named by their cube ids, all of which start `balanced-`, and
  the pilot, self-test and report folders do not (`pilot/`, `selftest/`, `report/`). `status.py` counts only
  the folders `cubes.tsv` names.
- **Fresh seeds, disjoint from every earlier job file's** (D447 point 9; checked by grep over all 117 files in
  pc-jobs' `jobs/` and the nine in pc-results' `drafts/` on 2026-10-24: no number of the form 819,xxx,xxx appears in
  any of them, no `--seed-base` or `$((S + K))` base of 1900-1909 (the bases in use run up to 1801-1809, J160's),
  and no game seed of 1,9xx x 1,000,000; the only 19xx strings are check thresholds -- 1900, 1950, 1960 -- in J114,
  J134 and J141):

  | block | cube | drafts | arm-B game seeds S x 1,000,000 + g |
  |---|---|---|---|
  | (a) | `balanced-legacy-even-high-nopower` (v1, 3x) | **819,100,001-819,106,000** | **S = 1901**, g 1-12,000 |
  | (b) 1 | `balanced-v2-legacy-even-high` | **819,200,001-819,202,000** | **S = 1902** |
  | (b) 2 | `balanced-v2-legacy-even-high-nopower` | **819,300,001-819,302,000** | **S = 1903** |
  | (b) 3 | `balanced-v2-legacy-even-mid` | **819,400,001-819,402,000** | **S = 1904** |
  | (b) 4 | `balanced-v2-legacy-even-mid-nopower` | **819,500,001-819,502,000** | **S = 1905** |
  | (b) 5 | `balanced-v2-pauper-even` | **819,600,001-819,602,000** | **S = 1906** |
  | pilot smoke | `balanced-v2-legacy-even-high-nopower` | **819,900,001-819,900,020** | **S = 1909** |

  The self-test's decks (`decks --cube`, seed 1908) and its fabricated games draw no game; balance-model's own
  drafter simulation uses its fixed 947,500,001+ (no game); the read's bootstrap seed is J145's 145 and the model
  test's simulation seed 163, both resampling only. J160 used drafts 818,100,001-818,900,020 and bases 1801-1809.
- **The aborts read only this run's own files** (the J152 lesson): `armed` is written by this job's pilot and
  removed by its last block.
- **No `after:`** (J162 is lower-numbered; the core budget serialises) and no `pilot_cores:` (the J146 lesson).
- **Names:** `lab-j163`, `var/lab-j163-local`, `homes-J163`, `J163:` in messages, `"job": "J163"` in the reads.

**Workers and memory** (J160's). `max_workers: 7`, `mem_per_worker_gb: 3`: J160 measured a peak worker RSS of 2.34
GB at 6 workers with 0 pressure events. The runner sizes 6 on this PC's budget, and fewer under pressure. The
reads are numpy on one core; (a)'s bootstrap holds a 1,000 x 24,000 weight matrix (~200 MB). Nothing heavy beside.

**Where it writes** (J160's). Every lab command runs under `LAB_DATA_DIR=/home/justin-a/code/lab/data`, so
`var/lab-j163/<cube>/...` is re-rooted to `/home/justin-a/code/lab/data/lab-j163/<cube>/...` (`runs/lab`,
`prof/lab`, `games/B-lab`, `out/`), the pilot's to `lab-j163/pilot/`, the self-test's decks to
`lab-j163/selftest/`, the night's reads to `lab-j163/report/`; the scripts, the regenerated models and the
self-tests stay in the clone (`var/lab-j163-local/`). `clean:` names only the clone's folders; the job is
resumable, so a fresh start would need the data folder's `lab-j163` moved aside by hand and
`var/lab-j163-local/armed.txt` removed.

Never `summary.md` or `metrics.json`. Not beside a queue night (it aborts if one starts). Everything resumes: `run`
and `census-play` skip what is done; `profile.ts`, the reads and balance-model are deterministic.

## Pilot
About 20 minutes: the data folder, the pin and the tools; the six cubes at the pin, parsed, the candidate's bytes
J160's; the models' tests; the inputs' sha256s; the three balance-model runs and the byte-identical regeneration;
the scripts and the three reads' planted self-tests; then 20 lab-vs-lab drafts of one v2 cube, their 40 games,
and all three reads over them. No `cores:` line on either block.
```bash
mkdir -p var/lab-j163-local/bin
if [ -n "${LAB_DATA_DIR:-}" ] && [ "$LAB_DATA_DIR" != /home/justin-a/code/lab/data ]; then echo "J163: LAB_DATA_DIR is $LAB_DATA_DIR, not /home/justin-a/code/lab/data" >&2; exit 1; fi
python3 -c "import json, sys; v = json.load(open('config.json')).get('labDataDir'); sys.exit(0 if v in (None, '', '/home/justin-a/code/lab/data') else 'J163: config.json labDataDir is %r, not /home/justin-a/code/lab/data' % v)"
mkdir -p /home/justin-a/code/lab/data/lab-j163
python3 -c "import shutil, sys; f = shutil.disk_usage('/home/justin-a/code/lab/data').free / 1e9; print('J163: data folder free GB', round(f, 1)); sys.exit(0 if f >= 50 else 'J163: under 50 GB free on the data folder')"
echo 1 > var/lab-j163-local/datadir.txt
# the abort gate (the J152 lesson): this job's own run is armed from here; the last Commands block disarms it
echo 1 > var/lab-j163-local/armed.txt
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/lab-j163-local/merged.txt || echo 0 > var/lab-j163-local/merged.txt
grep -q "case 'balance-model'" tools/cubelab/cli.ts && test -s tools/cubelab/balance-model-v2-cmd.ts && test -s web/test/cubelab-balance-model-v2.test.ts && grep -q 'export function cubeDecksCommand' tools/cubelab/deckcensus.ts && grep -q 'export const RECORD_MODES' tools/cubelab/censusplay.ts && echo 1 > var/lab-j163-local/has-tools.txt || echo 0 > var/lab-j163-local/has-tools.txt
# the cubes, in measuring order: (a) J160's candidate at 6,000 drafts, then (b) the five v2 cubes at 2,000 (id, path, drafts)
: > var/lab-j163-local/cubes.tsv
for X in "balanced-legacy-even-high-nopower cubes/library/balanced/balanced-legacy-even-high-nopower.md 6000" \
         "balanced-v2-legacy-even-high cubes/library/balanced/v2/balanced-v2-legacy-even-high.md 2000" \
         "balanced-v2-legacy-even-high-nopower cubes/library/balanced/v2/balanced-v2-legacy-even-high-nopower.md 2000" \
         "balanced-v2-legacy-even-mid cubes/library/balanced/v2/balanced-v2-legacy-even-mid.md 2000" \
         "balanced-v2-legacy-even-mid-nopower cubes/library/balanced/v2/balanced-v2-legacy-even-mid-nopower.md 2000" \
         "balanced-v2-pauper-even cubes/library/balanced/v2/balanced-v2-pauper-even.md 2000"; do
  set -- $X
  if test -s "$2"; then printf '%s\t%s\t%s\n' "$1" "$2" "$3" >> var/lab-j163-local/cubes.tsv; else echo "J163: $2 is not at the pin"; fi
done
cat var/lab-j163-local/cubes.tsv
# (a)'s cube is the file J160 measured, byte for byte
python3 -c "import hashlib; h = hashlib.sha256(open('cubes/library/balanced/balanced-legacy-even-high-nopower.md', 'rb').read()).hexdigest(); print('J163: candidate sha256', h); open('var/lab-j163-local/cand-ok.txt', 'w').write('1' if h == '27a26fb5f48422245f0c45b1b7ef8ca8123391df7a5e62cd2c9b5671f22cad52' else '0')"
# each parses as 180 cards with no warning, every card in the library pool (profile.ts's population)
node --input-type=module -e "import fs from 'node:fs'; import { parseCube } from './tools/cubelab/cube.ts'; const pool = new Set(fs.readFileSync('cubes/library/library-pool.tsv', 'utf8').split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split('\t')[0])); const rows = fs.readFileSync('var/lab-j163-local/cubes.tsv', 'utf8').split('\n').filter(Boolean).map((l) => l.split('\t')); const per = {}; let ok = 0; for (const [c, f] of rows) { const p = parseCube(fs.readFileSync(f, 'utf8')); const notInPool = p.cards.filter((x) => !pool.has(x.name)).length; const good = p.cards.length === 180 && p.warnings.length === 0 && notInPool === 0; per[c] = { cards: p.cards.length, warnings: p.warnings.length, notInPool, ok: good }; if (good) ok++; } const doc = { present: rows.length, v2: rows.filter(([c]) => c.startsWith('balanced-v2-')).length, ok, per }; fs.writeFileSync('var/lab-j163-local/parse.json', JSON.stringify(doc, null, 2)); console.log(JSON.stringify(doc));"
env -u LAB_DATA_DIR node --test web/test/cubelab-balance-model.test.ts web/test/cubelab-balance-model-v2.test.ts web/test/cubelab-deck-census.test.ts
# the models' inputs (full sha256): v1's as J160 checked them, v2's 27 data inputs as v2's committed model.json
# records them (lab-j159's out/, lab-j160's report/), and J160's model-test.json, read (i)'s v1 reference
python3 - <<'PY'
import hashlib, json
D = '/home/justin-a/code/lab/data'
want = {
    'var/cubelab/facts/32653ed2fcd7d8d2.json': '9b0b65014b87a9f8a62b303bc9513771497f43f641c35ac34acff901a4eaea38',
    f'{D}/lab-j144/out/census-decks.jsonl.gz': 'b167bf1d5c1f159d79f7064607a17450fa570190199f3166e8a2c607d44dcf55',
    f'{D}/lab-j144/out/census-games.jsonl.gz': 'd55c0d22c6a5d219f15b6a9b75468c0a63b31e0dbe47d0aef9271d53c79e1510',
    f'{D}/lab-j145/out/drafted-decks.jsonl.gz': '49fda34e6d2411c00c2158533b6781e085339ba38b0628f917d6d05721490c8d',
    f'{D}/lab-j145/out/games.jsonl.gz': '38ce348ff403408a3b13766451ceff14dc84bcd35a64b9e85ebf23300a727d39',
    f'{D}/lab-j145/out/balance.json': '6832c663614632e8e9be04c33149f9fd6fa233de39fb4cdead2e180706248d2d',
    f'{D}/lab-j145/census/decks/decks.jsonl': '4a259bee7febfe845f489897e6e4446a8e4fefdd49578d833d1756358c7a66ea',
    f'{D}/lab-j159/out/drafted-decks.jsonl.gz': '8c3d7821f01880992571e932f2d610976ca7527f0c7d5b834608ff8bf54a0f0e',
    f'{D}/lab-j159/out/games.jsonl.gz': '3139f994d5f052fc2f46adc5026a8afd47e955a0f73adb8c4aa83359208fa29d',
    f'{D}/lab-j159/out/balance.json': 'ca81a64abb60dbd9278d33d451653c86ed3689326677b8e261816a434cce441f',
    f'{D}/lab-j160/report/balanced-legacy-even-high.drafted-decks.jsonl.gz': '42dab0de7a272dc188b4a3ab91451e11e47c9d33cf1ce94149c17ab51a283e1d',
    f'{D}/lab-j160/report/balanced-legacy-even-high.games.jsonl.gz': 'dba68c20f001f2e3b174c9eeae135ad885cbe45738ef34fff7acce42e8061940',
    f'{D}/lab-j160/report/balanced-legacy-even-high.balance.json': '20756bee5e133340c09169c7dec34e85973bc00800adf5b38ce6776bd5a77c97',
    f'{D}/lab-j160/report/balanced-legacy-even-high-nopower.drafted-decks.jsonl.gz': '6f22412f86f7494aa17e4d73e3ff828220eb937e021405b1b3626eb092622995',
    f'{D}/lab-j160/report/balanced-legacy-even-high-nopower.games.jsonl.gz': '06e87637fd6946bcf12f69e528ef84b2de279a6c50099f9eca4d26c8ae8c0f51',
    f'{D}/lab-j160/report/balanced-legacy-even-high-nopower.balance.json': 'ffb5f6341cf878b56f5b4539d6608721d4ec3e3dc07f80b44115a58185b75776',
    f'{D}/lab-j160/report/balanced-legacy-even-mid.drafted-decks.jsonl.gz': '9f5054684a29b424078c25c4d660cfa087c58116396c88c480a5dcce3c12fde9',
    f'{D}/lab-j160/report/balanced-legacy-even-mid.games.jsonl.gz': '9b642b17b35cefab46260f6bc0a678f94b67f6e967215bd6ba543c9a6dc7a34a',
    f'{D}/lab-j160/report/balanced-legacy-even-mid.balance.json': 'baebf96a4bc9b481e5ea0a1204ba0081eec9d38bfba7ee65d9b12821735e696c',
    f'{D}/lab-j160/report/balanced-legacy-even-mid-nopower.drafted-decks.jsonl.gz': 'fd1e54a6bb99cd412985453f04b5a72ffd140d9c8d7139f911c79b2d5601038b',
    f'{D}/lab-j160/report/balanced-legacy-even-mid-nopower.games.jsonl.gz': '7eb82fdbfaa7bcba6d52279b998a6ce2bc6966d4ba43b586bfc40bf16e9132cf',
    f'{D}/lab-j160/report/balanced-legacy-even-mid-nopower.balance.json': '818cb134b8b2aa55843366ee818e3256860c280466151208548ea05d8decdd13',
    f'{D}/lab-j160/report/balanced-pauper-even.drafted-decks.jsonl.gz': '95a207fbd36f2b2e6a18994ff7245c935f0237ff3a3548d9743869a076ffaf1f',
    f'{D}/lab-j160/report/balanced-pauper-even.games.jsonl.gz': 'cc75bd118ff6d2311b502820368ff25d7368ec6dc43784d6fc0c164543b9ea12',
    f'{D}/lab-j160/report/balanced-pauper-even.balance.json': '36527f4dd1dbac5b0d21d450039c4d7b73ef13e80b893e0ae3b68b3c60b0417e',
    f'{D}/lab-j160/report/model-test.json': '2c93753486968349f0d5b89d8ce06a0380da187a21688cc7d384f6d12b814af2',
}
got = {}
for f, h in want.items():
    try:
        got[f] = hashlib.sha256(open(f, 'rb').read()).hexdigest() == h
    except OSError:
        got[f] = False
print(json.dumps({'checked': len(got), 'ok': sum(got.values()), 'bad': [f for f, v in got.items() if not v]}))
open('var/lab-j163-local/inputs-ok.txt', 'w').write('1' if all(got.values()) else '0')
PY
# the predictions: balance-model at the pin, from those inputs, into the clone (never into cubes/); no engine.
# v1 -nopower (J160's second command, ~1 min): (a)'s reference row and the candidate's regeneration
env -u LAB_DATA_DIR tools/cubelab.sh balance-model --census /home/justin-a/code/lab/data/lab-j144 --omega /home/justin-a/code/lab/data/lab-j145 --facts var/cubelab/facts/32653ed2fcd7d8d2.json --reps 200 --seed 1 --out var/lab-j163-local/model-v1-nopower --cubes-out var/lab-j163-local/model-v1-nopower/cubes --exclude cubes/library/powered-exclude.txt --suffix -nopower
# v2, the guide's two commands (D475, ~3 min each): the predictions of record for (b) and (c)
env -u LAB_DATA_DIR tools/cubelab.sh balance-model --census /home/justin-a/code/lab/data/lab-j144 --omega /home/justin-a/code/lab/data/lab-j145 --night /home/justin-a/code/lab/data/lab-j159 --night /home/justin-a/code/lab/data/lab-j160/report --facts var/cubelab/facts/32653ed2fcd7d8d2.json --reps 200 --seed 1 --drafts 2000 --out var/lab-j163-local/model-v2 --cubes-out var/lab-j163-local/model-v2/cubes
env -u LAB_DATA_DIR tools/cubelab.sh balance-model --census /home/justin-a/code/lab/data/lab-j144 --omega /home/justin-a/code/lab/data/lab-j145 --night /home/justin-a/code/lab/data/lab-j159 --night /home/justin-a/code/lab/data/lab-j160/report --facts var/cubelab/facts/32653ed2fcd7d8d2.json --reps 200 --seed 1 --drafts 2000 --out var/lab-j163-local/model-v2-nopower --cubes-out var/lab-j163-local/model-v2-nopower/cubes --exclude cubes/library/powered-exclude.txt --suffix -nopower
# every cube measured tonight must be generated by one of the three runs, byte-identical to the committed file
python3 - <<'PY'
import filecmp, json, os
L = 'var/lab-j163-local'
rows = [l.rstrip('\n').split('\t') for l in open(f'{L}/cubes.tsv') if l.strip()]
where, version = {}, {}
for d in ('model-v1-nopower', 'model-v2', 'model-v2-nopower'):
    m = json.load(open(f'{L}/{d}/model.json'))
    for c in (m.get('candidates') or []) + (m.get('cubes') or []):
        where.setdefault(c['id'], d)
        version[d] = 'v2' if 'cubes' in m else 'v1'
r = {'present': len(rows), 'predicted': 0, 'identical': 0, 'mismatch': 0, 'unpredicted': [], 'mismatched': [], 'by': {},
     'generatedNotMeasured': sorted(set(where) - {c for c, _, _ in rows}), 'versions': version}
for c, path, _ in rows:
    if c not in where:
        r['unpredicted'].append(c)
        continue
    r['predicted'] += 1
    r['by'][c] = where[c]
    gen = f'{L}/{where[c]}/cubes/{c}.md'
    if os.path.exists(gen) and filecmp.cmp(gen, path, shallow=False):
        r['identical'] += 1
    else:
        r['mismatch'] += 1
        r['mismatched'].append(c)
r['candidateFromV1'] = 1 if r['by'].get('balanced-legacy-even-high-nopower') == 'model-v1-nopower' else 0
r['v2FromV2'] = sum(1 for c, d in r['by'].items() if c.startswith('balanced-v2-') and d.startswith('model-v2'))
json.dump(r, open(f'{L}/regen.json', 'w'), indent=2)
print(json.dumps(r))
PY
cat > var/lab-j163-local/bin/profile.ts <<'TS'
// J145's deck profiles (pc-results drafts/J145-balance-omega.md), used unchanged by J159, J160 and J163: every drafted deck of a cube-lab run folder,
// profiled by the census's own rule (tools/cubelab/deckcensus.ts profileOf: a spell counts for its printed
// colours and every colour of its cost; a deck's colours are those with 3+ spells), copied into a census-play
// decks folder (decks.jsonl + decks/<id>.dck), with a replay list that plays each draft's two decks against
// each other twice, each on the play once (pairs.jsonl: game g's seed S x 1,000,000 + g, side a on the play
// when it is even).  No engine.  Run from the mtg-table clone's root.
//   node profile.ts --run <run folder> --name <tag> --seed-base S --cube <cube.md> --out <dir>
import fs from 'node:fs';
import path from 'node:path';

const arg = (k: string): string => { const i = process.argv.indexOf(`--${k}`); if (i < 0 || !process.argv[i + 1]) throw new Error(`profile.ts: --${k} is required`); return process.argv[i + 1] as string; };
const run = arg('run'), name = arg('name'), out = arg('out'), cubeFile = arg('cube');
const seedBase = Number(arg('seed-base'));
const dc = await import(path.resolve('tools/cubelab/deckcensus.ts'));
const { openForgeScripts } = await import(path.resolve('tools/forge-scripts.ts'));
const scripts = openForgeScripts(dc.defaultScriptsZip(process.cwd()));
if (!scripts) throw new Error('profile.ts: no Forge card scripts');
const { lib } = dc.censusPopulation(fs.readFileSync('cubes/library/library-pool.tsv', 'utf8'), fs.readFileSync('cubes/library/census.tsv', 'utf8'), dc.scriptLookup(scripts));
const byName = new Map(lib.map((c: { name: string }) => [c.name, c]));
const cubeName = dc.cubeNameOf(cubeFile);
const { parseCube } = await import(path.resolve('tools/cubelab/cube.ts'));
const inCube = new Set(parseCube(fs.readFileSync(cubeFile, 'utf8')).cards.map((c: { name: string }) => c.name));
const meta = JSON.parse(fs.readFileSync(path.join(run, 'run.json'), 'utf8'));
const drafterOf = (seat: string): string => (meta.drafter && meta.drafter.seat === seat ? meta.drafter.kind : 'lab');
const BASIC = new Set(['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes']);

function mainOf(file: string): Array<[number, string]> {
  const out2: Array<[number, string]> = [];
  let inMain = false;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const l = raw.trim();
    if (/^\[.*\]$/.test(l)) { inMain = /^\[main\]$/i.test(l); continue; }
    const m = /^(\d+)\s+(.+?)(\|.*)?$/.exec(l);
    if (inMain && m) out2.push([Number(m[1]), (m[2] as string).trim()]);
  }
  return out2;
}

fs.mkdirSync(path.join(out, 'decks'), { recursive: true });
const drafts = fs.readFileSync(path.join(run, 'drafts.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).sort((x, y) => x.seed - y.seed);
const lines: string[] = [], pairs: string[] = [];
const tally = { drafts: drafts.length, decks: 0, skippedDrafts: 0, forgeBuilt: 0, notInCube: 0, unknown: 0, byK: [0, 0, 0, 0, 0, 0] as number[] };
let j = 0;
for (const d of drafts) {
  const ids: string[] = [];
  for (const dr of d.drafters) {
    const rel = dr.played === 'lab' && dr.deckFile ? dr.deckFile : dr.forgeDeckFile;
    const src = rel ? path.join(run, rel) : '';
    if (!rel || !fs.existsSync(src)) continue;
    const main = mainOf(src);
    if (main.reduce((a, [n]) => a + n, 0) < 40) continue;
    const spells: unknown[] = [];
    const names: string[] = [];
    for (const [n, nm] of main) {
      if (BASIC.has(nm)) continue;
      const c = byName.get(nm) as { land: boolean } | undefined;
      if (!c) { tally.unknown += n; continue; }
      if (!inCube.has(nm)) tally.notInCube += n;
      if (c.land) continue;
      for (let i = 0; i < n; i++) { spells.push(c); names.push(nm); }
    }
    const p = dc.profileOf(spells);
    const colours3 = 'WUBRG'.split('').filter((x) => p.spellsByColour[x] >= 3).join('');
    const id = `${name}-${d.seed}-${dr.seat}`;
    fs.copyFileSync(src, path.join(out, 'decks', `${id}.dck`));
    lines.push(JSON.stringify({ v: 1, id, band: `cube:${cubeName}`, file: `decks/${id}.dck`, run: name, draft: d.seed, seat: dr.seat, drafter: drafterOf(dr.seat), played: dr.played,
      colours3, k: colours3.length, profile: p, spells: names }));
    tally.decks++;
    tally.byK[colours3.length] = (tally.byK[colours3.length] as number) + 1;
    if (dr.played !== 'lab') tally.forgeBuilt++;
    ids.push(id);
  }
  if (ids.length !== 2) { tally.skippedDrafts++; continue; }
  j++;
  for (const g of [2 * j - 1, 2 * j]) pairs.push(JSON.stringify({ g, seed: seedBase * 1_000_000 + g, a: ids[0], b: ids[1], draft: d.seed }));
}
fs.writeFileSync(path.join(out, 'decks.jsonl'), `${lines.join('\n')}\n`);
fs.writeFileSync(path.join(out, 'pairs.jsonl'), `${pairs.join('\n')}\n`);
const summary = { v: 1, run: name, cube: cubeName, drafter: meta.drafter ?? null, seedBase, ...tally, pairs: pairs.length };
fs.writeFileSync(path.join(out, 'profile.json'), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary));
TS
cat > var/lab-j163-local/bin/balance.py <<'PY'
import argparse, gzip, json, math, os
import numpy as np
# J145's read (pc-results drafts/J145-balance-omega.md, "The registered rules"): Omega's colour balance from
# three arms, numpy only, no engine.  The rules are the cloud's, registered 2026-10-19 23:55 UTC before any data.
# J159 (night 0 of the Omega swap rule) ran it unchanged but for the job name and the real-drafts gap
# (`real.gap`: the coach helper's fetch failing is a reported gap, never a failure).  J160 (the library loop's
# first night, pc-results study/omega-swap-rule-v2.md) runs J159's text with three edits only: the job and the
# cube are arguments (--job, --cube; one read per generated cube), the pull note says pull is reported and never
# judged (the loop optimises payoff; the lab drafter is the only drafter), and a read with no --real says a
# generated cube has no real drafts.  J163 (the library loop's second night) runs J160's text with one edit: the
# --job default.  Every rule below is J145's, unchanged:
#
#  CELLS.  Colour level (5) decides; pairs (10) are reported with intervals; triples only where a cell has 40+
#  decks; 4- and 5-colour decks are excluded everywhere (and 0-colour ones, which have no colour to count).
#  A deck's colours are its colours with 3+ spells (the census's rule, deckcensus.ts profileOf).
#  PULL (arm A, drafted decks): the share of two-colour decks containing colour c, target 2/5; mono and
#  three-colour shares beside it, not judged; one reading per drafter, never pooled.  REGISTERED CHANGE (the
#  cloud, 2026-10-20, before any data): the human-pick model, first named the primary reading, is demoted to
#  context (its Omega file covers 105 of 180 cards, unevenly by colour, which biases what pull measures), so
#  NO drafter's pull is judged tonight: all three are reported with their labels as information and the
#  model's per-colour coverage beside it; pull is judged once the draft-deck ledger holds 30+ real Omega
#  decks (real drafts then primary, the same band) or a full-coverage human model exists.  Intervals: a percentile bootstrap clustered by
#  draft (the drafts resampled with replacement, 1,000 replicates), since a lab-vs-lab draft's two decks
#  compete for colours.
#  PAYOFF (arm B, the drafted decks played against each other; arm C, the cube's census): colour c's win rate
#  in the games between decks that differ in c (one has it, the other not), decisive games only; target
#  0.5; a deck-clustered bootstrap (J141's: multinomial deck weights, a deck-game weighted by its deck's,
#  1,000 replicates).  Arm B's judged reading is the lab-vs-lab folder (both seats one drafter and one
#  builder, so a colour's rate is not a drafter's strength); the other folders' games are context.
#  "CLEARLY OFF EVEN": a cell is OFF when its 95% interval excludes the target AND the point is at least
#  0.08 from it for pull (0.05 for payoff); else EVEN if its interval sits inside [target - 0.08, target +
#  0.08] for pull ([0.45, 0.55] for payoff); else UNCLEAR.  Tonight's verdict: BALANCED ON PAYOFF when no
#  colour is OFF on arm B's judged payoff (lab vs lab), else NOT BALANCED ON PAYOFF; pull is not judged.
#  Everything else is a candidate (D447 point 9).
#  A vs C: OFF in B but EVEN in C reads "the drafter/deck-building favours or starves it"; OFF in both "the
#  cards".  CLOSENESS: per colour and pair, the winner's final life and the game's turns, median and IQR.
#  Real drafts (the coach helper's aggregate): shown; labelled (as context, never in the verdict) only at 30+.
ap = argparse.ArgumentParser()
ap.add_argument('--pull', action='append', default=[])     # name=<drafter>,<profile dir>: that drafter's decks of one run (decks.jsonl)
ap.add_argument('--payoff', action='append', default=[])   # name=<decks dir>,<census-play games dir>
ap.add_argument('--coverage', action='append', default=[])  # name=<coverage.json>: a pick model's coverage, shown beside that drafter's pull
ap.add_argument('--judged-payoff', default='Blab')
ap.add_argument('--census', default=None)                  # name=<decks dir>,<games dir>: arm C
ap.add_argument('--real', default=None)                    # the coach helper's GET /draft-decks?cube=... answer
ap.add_argument('--boot', type=int, default=1000)
ap.add_argument('--seed', type=int, default=145)
ap.add_argument('--min-triple', type=int, default=40)
ap.add_argument('--real-min', type=int, default=30)
ap.add_argument('--job', default='J163')
ap.add_argument('--cube', required=True)
ap.add_argument('--out', required=True)
a = ap.parse_args()

C5 = 'WUBRG'
PAIRS = [x + y for i, x in enumerate(C5) for y in C5[i + 1:]]
TRIPLES = [x + y + z for i, x in enumerate(C5) for j, y in enumerate(C5) if j > i for z in C5[j + 1:]]
PULL_T, PULL_B, PAY_T, PAY_B = 0.4, 0.08, 0.5, 0.05


def r4(x):
    return None if x is None or not math.isfinite(float(x)) else round(float(x), 4)


def jsonl(p):
    if not os.path.exists(p):
        return []
    op = gzip.open if p.endswith('.gz') else open
    with op(p, 'rt', encoding='utf8') as f:
        return [json.loads(l) for l in f if l.strip() and l.endswith('\n')]


def colours3(d):
    if 'colours3' in d:
        return d['colours3']
    sb = d['profile']['spellsByColour']
    return ''.join(c for c in C5 if sb.get(c, 0) >= 3)


def pct(reps):
    reps = np.sort(reps[np.isfinite(reps)])
    if len(reps) == 0:
        return None, None
    return r4(reps[int(math.floor(0.025 * (len(reps) - 1)))]), r4(reps[int(math.ceil(0.975 * (len(reps) - 1)))])


def label(est, lo, hi, t, band):
    if est is None or lo is None or hi is None:
        return 'UNCLEAR'
    if (lo > t or hi < t) and abs(est - t) >= band - 1e-12:
        return 'OFF'
    if lo >= t - band - 1e-12 and hi <= t + band + 1e-12:
        return 'EVEN'
    return 'UNCLEAR'


def cell(num, den, W, t=None, band=None):
    """A share sum(num)/sum(den) with its replicates under weight matrix W (rows: replicates, cols: units)."""
    n, d = float(num.sum()), float(den.sum())
    est = n / d if d else None
    sd = W @ den
    reps = np.where(sd > 0, (W @ num) / np.where(sd > 0, sd, 1), np.nan)
    lo, hi = pct(reps)
    out = {'n': int(d), 'hits': int(n), 'est': r4(est), 'lo': lo, 'hi': hi}
    if t is not None:
        out['target'] = t
        out['label'] = label(out['est'], lo, hi, t, band)
    return out


def weights(n, tag):
    return np.random.default_rng([a.seed, tag]).multinomial(n, np.full(n, 1 / n), size=a.boot).astype(float) if n else np.zeros((a.boot, 0))


# ---------------------------------------------------------------- PULL
def pull_of(decks, tag):
    drafts = sorted({d['draft'] for d in decks})
    di = {s: i for i, s in enumerate(drafts)}
    W = weights(len(drafts), tag)
    S = [colours3(d) for d in decks]
    k = np.array([len(s) for s in S])
    unit = np.array([di[d['draft']] for d in decks])
    def agg(mask):  # per-draft sums of a deck mask
        v = np.zeros(len(drafts))
        np.add.at(v, unit, mask.astype(float))
        return v
    out = {'decks': len(decks), 'drafts': len(drafts), 'byK': {str(i): int((k == i).sum()) for i in range(6)},
           'kShares': {str(i): r4((k == i).mean()) if len(k) else None for i in range(6)}, 'twoColour': {}, 'mono': {}, 'threeColour': {}, 'pairs': {}, 'triples': {}}
    two, one, three = agg(k == 2), agg(k == 1), agg(k == 3)
    for c in C5:
        has = np.array([c in s for s in S])
        out['twoColour'][c] = cell(agg((k == 2) & has), two, W, PULL_T, PULL_B)
        out['mono'][c] = cell(agg((k == 1) & has), one, W)
        out['threeColour'][c] = cell(agg((k == 3) & has), three, W)
    for p in PAIRS:
        out['pairs'][p] = cell(agg(np.array([s == p for s in S])), two, W)
    for t in TRIPLES:
        m = np.array([s == t for s in S])
        if m.sum() >= a.min_triple:
            out['triples'][t] = cell(agg(m), three, W)
    return out


# ---------------------------------------------------------------- PAYOFF (and closeness)
def payoff_of(decks, rows, ledgers, tag):
    by = {d['id']: d for d in decks}
    S = {i: colours3(d) for i, d in by.items()}
    ok = lambda i: 1 <= len(S[i]) <= 3
    ids = sorted(by)
    ix = {i: n for n, i in enumerate(ids)}
    dg_deck, dg_win, dg_own, dg_opp = [], [], [], []
    excluded = {'engineError': 0, 'notDecisive': 0, 'deckOutside1to3': 0}
    games = []
    for r in rows:
        if r.get('engineError'):
            excluded['engineError'] += 1
            continue
        if r.get('winner') not in ('a', 'b'):
            excluded['notDecisive'] += 1
            continue
        if r['a'] not in by or r['b'] not in by or not ok(r['a']) or not ok(r['b']):
            excluded['deckOutside1to3'] += 1
            continue
        games.append(r)
        for side, me, op in (('a', r['a'], r['b']), ('b', r['b'], r['a'])):
            dg_deck.append(ix[me]); dg_win.append(1.0 if r['winner'] == side else 0.0); dg_own.append(S[me]); dg_opp.append(S[op])
    dd = np.array(dg_deck, int)
    win = np.array(dg_win)
    W = weights(len(ids), tag)
    WD = W[:, dd] if len(dd) else np.zeros((a.boot, 0))
    def pc(mask, t=None, band=None):
        m = mask.astype(float)
        return cell(m * win, m, WD, t, band) if len(dd) else {'n': 0, 'hits': 0, 'est': None, 'lo': None, 'hi': None, **({'target': t, 'label': 'UNCLEAR'} if t is not None else {})}
    out = {'decks': len(ids), 'games': len(games), 'excluded': excluded, 'colour': {}, 'pairs': {}, 'triples': {}, 'byK': {}}
    for c in C5:
        out['colour'][c] = pc(np.array([(c in o) and (c not in p) for o, p in zip(dg_own, dg_opp)]), PAY_T, PAY_B)
    for p in PAIRS:
        out['pairs'][p] = pc(np.array([o == p and q != p for o, q in zip(dg_own, dg_opp)]))
    deck_count = {}
    for i in ids:
        deck_count[S[i]] = deck_count.get(S[i], 0) + 1
    for t in TRIPLES:
        if deck_count.get(t, 0) >= a.min_triple:
            out['triples'][t] = pc(np.array([o == t and q != t for o, q in zip(dg_own, dg_opp)]))
    for kk in (1, 2, 3):
        out['byK'][str(kk)] = pc(np.array([len(o) == kk and len(q) != kk for o, q in zip(dg_own, dg_opp)]))
    # closeness: the winner's final life (the ledger's last turn) and the game's turns
    led = {}
    for l in ledgers:
        t = ((l.get('ledger') or {}).get('turns') or [])
        if t:
            led[l['g']] = t[-1]['s']
    def close(sel):
        life = [led[r['g']][0 if r['winner'] == 'a' else 1][0] for r in sel if r['g'] in led]
        turns = [r['turns'] for r in sel if r.get('turns') is not None]
        q = lambda xs: None if not xs else {'n': len(xs), 'median': r4(np.median(xs)), 'q1': r4(np.percentile(xs, 25)), 'q3': r4(np.percentile(xs, 75))}
        return {'winnerLife': q(life), 'turns': q(turns)}
    out['closeness'] = {'all': close(games), 'colour': {c: close([r for r in games if c in S[r['a']] or c in S[r['b']]]) for c in C5},
                        'pairs': {p: close([r for r in games if S[r['a']] == p or S[r['b']] == p]) for p in PAIRS}}
    return out


def load_payoff(spec):
    name, rest = spec.split('=', 1)
    ddir, gdir = rest.split(',', 1)
    decks = jsonl(os.path.join(ddir, 'decks.jsonl'))
    rows = jsonl(os.path.join(gdir, 'games.jsonl'))
    led = jsonl(os.path.join(gdir, 'ledger.jsonl'))
    return name, decks, rows, led


doc = {'v': 1, 'job': a.job, 'cube': a.cube, 'options': {'boot': a.boot, 'seed': a.seed, 'minTriple': a.min_triple, 'realMin': a.real_min},
       'caveat': 'Every game is piloted by Forge\'s Default AI on both seats. J141 found the live search seat lifts every colour about equally (+8.9 points), so a Forge-only payoff is the right first cut, but it is Forge\'s.',
       'pull': {}, 'payoff': {}}
for t, spec in enumerate(a.pull):
    name, rest = spec.split('=', 1)
    kind, d = rest.split(',', 1)
    decks = [x for x in jsonl(os.path.join(d, 'decks.jsonl')) if x.get('drafter') == kind]
    doc['pull'][name] = pull_of(decks, 100 + t)
    doc['pull'][name]['drafter'] = kind
for t, spec in enumerate(a.payoff):
    name, decks, rows, led = load_payoff(spec)
    doc['payoff'][name] = payoff_of(decks, rows, led, 200 + t)
if a.census:
    name, decks, rows, led = load_payoff(a.census)
    doc['payoff'][name] = payoff_of(decks, rows, led, 300)
    doc['censusArm'] = name

# real drafts: the helper's aggregate (counts only), shown; labelled at 30+ decks, never in the verdict.
# J159: a fetch that failed (no file, not JSON, or not ok) is a GAP, reported, never a failure
real = None
if a.real:
    try:
        rj = json.load(open(a.real))
    except (OSError, ValueError):
        rj = {}
    if not isinstance(rj, dict):
        rj = {}
    if rj.get('ok') and isinstance(rj.get('decks'), list):
        S = [''.join(c for c in C5 if (x.get('spells') or {}).get(c, 0) >= 3) for x in rj['decks']]
        k = np.array([len(s) for s in S])
        n2 = int((k == 2).sum())
        real = {'decks': len(S), 'byK': {str(i): int((k == i).sum()) for i in range(6)}, 'twoColour': {}, 'labelled': len(S) >= a.real_min}
        W = weights(len(S), 400)
        for c in C5:
            m = np.array([len(s) == 2 and c in s for s in S], float)
            real['twoColour'][c] = cell(m, (k == 2).astype(float), W, PULL_T if real['labelled'] else None, PULL_B if real['labelled'] else None)
        real['twoColourDecks'] = n2
        real['gap'] = False
        if not S:
            real['note'] = 'the coach helper answered: 0 Omega decks in the draft-deck ledger'
    else:
        real = {'decks': 0, 'gap': True, 'note': 'GAP: the coach helper did not answer (or answered not ok), so real drafts were not read on this night'}
doc['real'] = real

for spec in a.coverage:
    name, f = spec.split('=', 1)
    if name in doc['pull'] and os.path.exists(f):
        doc['pull'][name]['coverage'] = json.load(open(f))

# the verdict: payoff only (the registered change: no drafter's pull is judged tonight)
pay = doc['payoff'].get(a.judged_payoff)
cens = doc['payoff'].get(doc.get('censusArm')) if doc.get('censusArm') else None
off_pay = [c for c in C5 if pay and pay['colour'][c].get('label') == 'OFF'] if pay else []
verdict = 'INCOMPLETE' if not pay or pay['games'] == 0 else ('BALANCED ON PAYOFF' if not off_pay else 'NOT BALANCED ON PAYOFF')
avc = {}
for c in C5:
    b = pay['colour'][c]['label'] if pay else None
    cc = cens['colour'][c]['label'] if cens else None
    avc[c] = {'B': b, 'C': cc, 'reads': 'the drafter/deck-building favours or starves it' if b == 'OFF' and cc == 'EVEN' else 'the cards' if b == 'OFF' and cc == 'OFF' else None}
doc['verdict'] = {'colourLevel': verdict, 'code': {'BALANCED ON PAYOFF': 1, 'NOT BALANCED ON PAYOFF': 0, 'INCOMPLETE': -1}[verdict], 'offPayoffB': off_pay,
                  'pullJudged': False, 'pullNote': 'pull is reported, never judged: the library loop optimises payoff only (study/omega-swap-rule-v2.md), and the lab drafter is the one drafter on this night',
                  'judgedPayoff': a.judged_payoff,
                  'unclearPayoffB': [c for c in C5 if pay and pay['colour'][c].get('label') == 'UNCLEAR'], 'aVsC': avc}
doc['labels'] = {f'pull.{n}.{c}': {'OFF': 1, 'EVEN': 0, 'UNCLEAR': -1}[p['twoColour'][c]['label']] for n, p in doc['pull'].items() for c in C5}
doc['labels'].update({f'payoff.{n}.{c}': {'OFF': 1, 'EVEN': 0, 'UNCLEAR': -1}[p['colour'][c]['label']] for n, p in doc['payoff'].items() for c in C5})


def clean(o):
    if isinstance(o, dict):
        return {k: clean(v) for k, v in o.items()}
    if isinstance(o, list):
        return [clean(v) for v in o]
    if isinstance(o, np.integer):
        return int(o)
    if isinstance(o, (np.floating, float)):
        return r4(o)
    return o


doc = clean(doc)
os.makedirs(a.out, exist_ok=True)
with open(os.path.join(a.out, 'balance.json'), 'w') as f:
    f.write(json.dumps(doc, indent=2, allow_nan=False) + '\n')

f3 = lambda x: '–' if x is None else f'{x:.3f}'
iv = lambda c: '–' if not c or c.get('lo') is None else f"{f3(c['lo'])}–{f3(c['hi'])}"
L = [f"**Forge-pilot caveat:** {doc['caveat']}", '', f'# {a.job}: is {a.cube} balanced by colour? (J145\'s judged arm: lab vs lab)', '',
     f"**Colour level: {verdict}.** OFF on arm-B payoff ({a.judged_payoff}, lab vs lab): {', '.join(off_pay) or 'none'}. **Pull is reported, never judged** (the library loop optimises payoff only; the lab drafter is the one drafter). "
     'The registered rule: a cell is OFF when its 95% interval excludes the target and the point is at least 0.08 (pull) or 0.05 (payoff) from it; EVEN when the interval sits inside that band; else UNCLEAR. '
     'BALANCED ON PAYOFF when no colour is OFF on arm-B payoff. Everything else below is a candidate (D447 point 9). No card is swapped on this night.', '',
     '## Pull (arm A, reported, never judged): share of two-colour decks containing the colour (target 0.400; labels are information)', '',
     '| drafter | decks | k = 1 / 2 / 3 (excluded 0, 4, 5) | ' + ' | '.join(C5) + ' |', '|---|---|---|' + '---|' * 5]
for n, p in doc['pull'].items():
    bk = p['byK']
    L.append(f"| {n} ({p.get('drafter', n)}) | {p['decks']} | {bk['1']} / {bk['2']} / {bk['3']} ({bk['0']}, {bk['4']}, {bk['5']}) | " +
             ' | '.join(f"{f3(p['twoColour'][c]['est'])} [{iv(p['twoColour'][c])}] {p['twoColour'][c]['label']}" for c in C5) + ' |')
for n, p in doc['pull'].items():
    cv = p.get('coverage')
    if cv:
        L.append(f"\n{n}'s pick model covers {cv.get('covered')} of the cube's {cv.get('cards')} cards: " + ', '.join(f"{k} {v['covered']}/{v['cards']}" for k, v in (cv.get('bySection') or {}).items()) + ' (the rest valued by its rating fallback).')
L += ['', 'Beside it, not judged: mono decks by colour (share of mono decks) and three-colour decks containing the colour (share of three-colour decks, average 0.6).', '',
      '| drafter | ' + ' | '.join(f'mono {c}' for c in C5) + ' | ' + ' | '.join(f'3c {c}' for c in C5) + ' |', '|---|' + '---|' * 10]
for n, p in doc['pull'].items():
    L.append(f'| {n} | ' + ' | '.join(f3(p['mono'][c]['est']) for c in C5) + ' | ' + ' | '.join(f3(p['threeColour'][c]['est']) for c in C5) + ' |')
L += ['', '**Pairs** (share of two-colour decks, average 0.100; candidates):', '', '| drafter | ' + ' | '.join(PAIRS) + ' |', '|---|' + '---|' * 10]
for n, p in doc['pull'].items():
    L.append(f'| {n} | ' + ' | '.join(f"{f3(p['pairs'][x]['est'])} [{iv(p['pairs'][x])}]" for x in PAIRS) + ' |')
for n, p in doc['pull'].items():
    if p['triples']:
        L.append(f"\nTriples with {a.min_triple}+ decks ({n}): " + '; '.join(f"{t} {f3(c['est'])} [{iv(c)}] of {c['n']}" for t, c in p['triples'].items()))
L += ['', '## Payoff: the colour\'s win rate in games between decks that differ in it (target 0.500)', '',
      '| arm | decks | games | ' + ' | '.join(C5) + ' |', '|---|---|---|' + '---|' * 5]
for n, p in doc['payoff'].items():
    tag = ' (judged)' if n == a.judged_payoff else ' (census, the pool)' if n == doc.get('censusArm') else ' (context)'
    L.append(f"| {n}{tag} | {p['decks']} | {p['games']} | " + ' | '.join(f"{f3(p['colour'][c]['est'])} [{iv(p['colour'][c])}] n {p['colour'][c]['n']} {p['colour'][c]['label']}" for c in C5) + ' |')
L += ['', '**A vs C** (report, don\'t act): ' + '; '.join(f"{c}: B {v['B']}, C {v['C']}" + (f" -- {v['reads']}" if v['reads'] else '') for c, v in avc.items()), '',
      '**Pairs' + "'" + ' payoff** (a pair\'s decks against decks that are not that pair; candidates):', '', '| arm | ' + ' | '.join(PAIRS) + ' |', '|---|' + '---|' * 10]
for n, p in doc['payoff'].items():
    L.append(f'| {n} | ' + ' | '.join(f"{f3(p['pairs'][x]['est'])} [{iv(p['pairs'][x])}]" for x in PAIRS) + ' |')
L += ['', '**By colour count** (decks with k colours against decks with another k; information): ' + '; '.join(
    f"{n}: " + ', '.join(f"k{kk} {f3(c['est'])} [{iv(c)}]" for kk, c in p['byK'].items()) for n, p in doc['payoff'].items())]
L += ['', '## Closeness (reported only): the winner\'s final life and the game\'s turns, median [IQR]', '', '| arm | cell | games | winner life | turns |', '|---|---|---|---|---|']
q = lambda x: '–' if not x else f"{f3(x['median'])} [{f3(x['q1'])}–{f3(x['q3'])}]"
for n, p in doc['payoff'].items():
    cl = p['closeness']
    for key, v in [('all', cl['all'])] + [(c, cl['colour'][c]) for c in C5] + [(x, cl['pairs'][x]) for x in PAIRS]:
        L.append(f"| {n} | {key} | {(v['turns'] or {}).get('n', 0)} | {q(v['winnerLife'])} | {q(v['turns'])} |")
L += ['', '## Real drafts (the draft-deck ledger, colour counts only)', '']
if real and real.get('decks'):
    L.append(f"{real['decks']} deck(s); by colours with 3+ spells {real['byK']}; " + ('labelled as context (30+ decks), never in the verdict: ' if real['labelled'] else f"shown only (under {a.real_min} decks): ") +
             ', '.join(f"{c} {f3(real['twoColour'][c]['est'])}" + (f" {real['twoColour'][c].get('label')}" if real['labelled'] else '') for c in C5))
else:
    L.append((real or {}).get('note', 'not read: a generated cube has no real drafts'))
with open(os.path.join(a.out, 'balance.md'), 'w') as f:
    f.write('\n'.join(L) + '\n')
print(json.dumps({'verdict': verdict, 'offPayoff': off_pay, 'pull': {n: p['decks'] for n, p in doc['pull'].items()}, 'payoff': {n: p['games'] for n, p in doc['payoff'].items()}}))
PY
cat > var/lab-j163-local/bin/modeltest.py <<'PY'
import argparse, json, math, os
import numpy as np
# J163's model test (pc-results drafts/J163-candidate-cubes-2.md, "The registered reads"): model v2's predicted colour
# and pair payoffs for each of its five cubes (balance-model v2's two model.json files -- the cubes, and the -nopower
# ones made with --exclude -- regenerated at the pin from sha-checked inputs, byte-identical to the committed cubes),
# beside what this night measured on J145's judged arm (each cube's balance.json, payoff.Blab).  No engine.  It is
# J160's modeltest.py with v2's model format (`cubes[].record.cells`: est, sd, and loT / hiT, the "with transfer"
# interval) read beside v1's (`candidates[].pred`), and with the coverage read and the comparison with v1's J160
# error added.  Written before any J163 game; the reads:
#
#  (i)   PER-CELL ERROR: RMSE(pred, measured) over the qualifying cells -- the five colours and the pairs with 400+
#        arm-B deck-games -- per cube and pooled over the night's v2 cubes; THE READ: is v2's pooled RMSE smaller
#        than v1's was on J160 (colours .0303, pairs .0470, read from J160's model-test.json), SMALLER or NOT
#        SMALLER, colours and pairs each.  Beside it: max |pred - measured|, the noise-corrected transfer SD
#        (J160's definition, sqrt(max(0, RMSE^2 - mean measured var - mean predicted var)), the predicted var
#        v2's bootstrap sd^2, v1's ((hi - lo) / 3.92)^2) against v2's own validation (.021 / .030), and v2's
#        leave-one-night-out expectation on J160 (.028 / .042).
#  (ii)  COVERAGE: the share of the qualifying cells whose measured payoff lies inside v2's "with transfer" 95%
#        interval [loT, hiT], per cube and pooled.  Beside it, never replacing it: the share expected of that
#        interval if it is honest, given each cell's own measurement noise (mean over cells of
#        2 Phi(1.96 sdT / sqrt(sdT^2 + se^2)) - 1, sdT = (hiT - loT) / 3.92), and the share inside the interval
#        widened by the cell's own measurement SE (|meas - pred| <= 1.96 sqrt(sdT^2 + se^2)), which is .95 if the
#        intervals are honest, with its Wilson 95% interval over the pooled cells: HONEST when .95 is inside it,
#        TOO NARROW when its upper end is below .95, TOO WIDE when its lower end is above.
#  (iii) SELECTION BIAS, as J160's: the measured max pair gap (max |payoff - .5| over the qualifying pairs) minus the
#        predicted max |pred - .5| over the same pairs, per cube; beside it the noise-only expectation of that gap
#        (each qualifying pair drawn N(pred, measured SE), 4,000 draws) and its share at or above the measured gap,
#        the same with v2's transfer error added (N(pred, sqrt(SE^2 + sdT^2))), and the generator's objective (max
#        colour gap + max qualifying pair gap) measured against v2's point, robust and with-transfer gaps -- inside
#        the with-transfer 95% interval or not.
#  (iv)  A CANDIDATE, as J160's: a cube with no colour OFF and no qualifying pair OFF on this night alone (J145's
#        classifier, band [.45, .55]), a candidate per D447 point 9, confirmed only on fresh seeds later at 3x; the
#        v2 draft rule's stricter PASS (every colour EVEN and no qualifying pair OFF) beside it, never replacing it.
#  REPORTED, NOT READ: the power effect per v2 family (J160's (iii)); the cells missed beyond both intervals; the
#  reference rows (J160's candidate, balanced-legacy-even-high-nopower, at J163's 3x and at J160's 1x, each against
#  v1's prediction of record), never pooled.  No cube is promoted, swapped or regenerated by this read.
#   python3 modeltest.py --model m.json ... --measured <id>=<balance.json> ... [--reference <id>[@tag]=<balance.json>] [--v1-ref <J160 model-test.json>] --out <stem>
ap = argparse.ArgumentParser()
ap.add_argument('--model', action='append', required=True)
ap.add_argument('--measured', action='append', default=[])
ap.add_argument('--reference', action='append', default=[])
ap.add_argument('--v1-ref', default=None)
ap.add_argument('--arm', default='Blab')
ap.add_argument('--min-pair', type=int, default=400)
ap.add_argument('--sims', type=int, default=4000)
ap.add_argument('--seed', type=int, default=163)
ap.add_argument('--job', default='J163')
ap.add_argument('--out', required=True)
a = ap.parse_args()

C5 = 'WUBRG'
PAIRS = [x + y for i, x in enumerate(C5) for y in C5[i + 1:]]
T, BAND = 0.5, 0.05
V2_VALIDATION = {'transferSdColour': 0.021, 'transferSdPair': 0.030, 'heldOutRmseColour': 0.028, 'heldOutRmsePair': 0.042}
rng = np.random.default_rng(a.seed)


def num(x):
    return None if x is None or isinstance(x, bool) or not isinstance(x, (int, float)) or not math.isfinite(float(x)) else float(x)


def r4(x):
    return None if x is None or not math.isfinite(float(x)) else round(float(x), 4)


def se(c):
    lo, hi = num((c or {}).get('lo')), num((c or {}).get('hi'))
    return None if lo is None or hi is None else (hi - lo) / 3.92


def label(est, lo, hi):
    # balance.py's payoff label, unchanged
    if est is None or lo is None or hi is None:
        return 'UNCLEAR'
    if (lo > T or hi < T) and abs(est - T) >= BAND - 1e-12:
        return 'OFF'
    if lo >= T - BAND - 1e-12 and hi <= T + BAND + 1e-12:
        return 'EVEN'
    return 'UNCLEAR'


def load(p):
    try:
        return json.load(open(p))
    except (OSError, ValueError):
        return None


def phi(z):
    return 0.5 * (1 + math.erf(z / math.sqrt(2)))


def wilson(k, n):
    if not n:
        return None, None
    p, z = k / n, 1.96
    c = (p + z * z / (2 * n)) / (1 + z * z / n)
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / (1 + z * z / n)
    return c - h, c + h


models = [load(f) or {} for f in a.model]
preds = {}
for model in models:
    # v1 (D473): candidates[].pred.{colour,pair}[k] = {est, lo, hi, sd}
    for c in model.get('candidates') or []:
        if isinstance(c, dict) and 'id' in c and c['id'] not in preds:
            mc, mp = num(c.get('maxColourGap')), num(c.get('maxPairGap'))
            sg_ = num(c.get('searchedGap'))
            pr = {kind: {k: {'est': num(v.get('est')), 'lo': num(v.get('lo')), 'hi': num(v.get('hi')), 'sd': se(v), 'loT': None, 'hiT': None}
                         for k, v in ((c.get('pred') or {}).get(kind) or {}).items() if isinstance(v, dict)} for kind in ('colour', 'pair')}
            preds[c['id']] = {'model': 'v1', 'pred': pr, 'flowGap': num(c.get('flowGap')),
                              'pointGap': sg_ if sg_ is not None else (None if mc is None or mp is None else mc + mp), 'robust': None, 'honest': None, 'kept': None}
    # v2 (D475): cubes[].record.cells[k] = {est, sd, loT, hiT}; record.pointGap / robust / honest; flow.pointGap
    for c in model.get('cubes') or []:
        if isinstance(c, dict) and 'id' in c and c['id'] not in preds:
            rec = c.get('record') or {}
            cells = rec.get('cells') or {}
            def cell(k):
                v = cells.get(k) or {}
                e, s = num(v.get('est')), num(v.get('sd'))
                return {'est': e, 'sd': s, 'lo': None if e is None or s is None else e - 1.96 * s, 'hi': None if e is None or s is None else e + 1.96 * s,
                        'loT': num(v.get('loT')), 'hiT': num(v.get('hiT'))}
            preds[c['id']] = {'model': 'v2', 'pred': {'colour': {k: cell(k) for k in C5}, 'pair': {k: cell(k) for k in PAIRS}},
                              'flowGap': num((c.get('flow') or {}).get('pointGap')), 'pointGap': num(rec.get('pointGap')),
                              'robust': rec.get('robust'), 'honest': rec.get('honest'), 'kept': c.get('kept')}


def cube_of(cid, path, pred_key):
    doc = load(path)
    pay = ((doc or {}).get('payoff') or {}).get(a.arm) if isinstance(doc, dict) else None
    p = preds.get(pred_key)
    out = {'id': cid, 'balance': path, 'predicted': p is not None, 'model': (p or {}).get('model'), 'measured': bool(pay and pay.get('games')),
           'games': int((pay or {}).get('games') or 0), 'colourLevel': ((doc or {}).get('verdict') or {}).get('colourLevel') if isinstance(doc, dict) else None,
           'colours': {}, 'pairs': {}}
    if not out['measured']:
        return out
    for kind, keys, src, pkey in (('colours', C5, 'colour', 'colour'), ('pairs', PAIRS, 'pairs', 'pair')):
        for k in keys:
            m = (pay.get(src) or {}).get(k) or {}
            me = {'est': num(m.get('est')), 'lo': num(m.get('lo')), 'hi': num(m.get('hi')), 'n': int(m.get('n') or 0)}
            me['label'] = label(me['est'], me['lo'], me['hi'])
            pr = ((p or {}).get('pred') or {}).get(pkey, {}).get(k) if p else None
            qual = me['n'] >= a.min_pair and me['est'] is not None
            d = None if (pr is None or pr['est'] is None or me['est'] is None) else me['est'] - pr['est']
            c = {'meas': me, 'pred': pr, 'diff': d, 'qualifies': qual}
            sm, sp = se(me), (pr or {}).get('sd')
            if d is not None and sm is not None and sp is not None:
                c['missBeyondIntervals'] = abs(d) > 1.96 * math.sqrt(sm ** 2 + sp ** 2)
            if d is not None and pr.get('loT') is not None and pr.get('hiT') is not None and sm is not None:
                sdT = (pr['hiT'] - pr['loT']) / 3.92
                c['inTransfer'] = pr['loT'] - 1e-12 <= me['est'] <= pr['hiT'] + 1e-12
                c['inTransferWidened'] = abs(d) <= 1.96 * math.sqrt(sdT ** 2 + sm ** 2) + 1e-12
                c['expectedInTransfer'] = 2 * phi(1.96 * sdT / math.sqrt(sdT ** 2 + sm ** 2)) - 1 if sdT > 0 else 0.0
                c['sdT'] = sdT
            out[kind][k] = c
    qp = [k for k in PAIRS if out['pairs'][k]['qualifies']]
    out['qualifyingPairs'] = qp
    out['coloursOff'] = [c for c in C5 if out['colours'][c]['meas']['label'] == 'OFF']
    out['coloursNotEven'] = [c for c in C5 if out['colours'][c]['meas']['label'] != 'EVEN']
    out['pairsOff'] = [k for k in qp if out['pairs'][k]['meas']['label'] == 'OFF']
    out['pairsNotEven'] = [k for k in qp if out['pairs'][k]['meas']['label'] != 'EVEN']
    out['candidate'] = not out['coloursOff'] and not out['pairsOff']
    out['v2Pass'] = not out['coloursNotEven'] and not out['pairsOff']
    gapm = lambda cells: max((abs(c['meas']['est'] - T) for c in cells), default=None)
    gapp = lambda cells: max((abs(c['pred']['est'] - T) for c in cells if c['pred'] and c['pred']['est'] is not None), default=None)
    cols = [out['colours'][c] for c in C5 if out['colours'][c]['meas']['est'] is not None]
    prs = [out['pairs'][k] for k in qp]
    g = {'measuredColour': gapm(cols), 'measuredPair': gapm(prs), 'measuredPairAllTen': gapm([out['pairs'][k] for k in PAIRS if out['pairs'][k]['meas']['est'] is not None])}
    g['measuredObjective'] = None if g['measuredColour'] is None or g['measuredPair'] is None else g['measuredColour'] + g['measuredPair']
    if p:
        g['predictedColour'] = gapp(cols)
        g['predictedPair'] = gapp(prs)
        g['flowObjective'] = p['flowGap']
        g['pointObjective'] = p['pointGap']
        hon, rob = p.get('honest') or {}, p.get('robust') or {}
        g['robustObjective'] = {'mean': num(rob.get('mean')), 'lo': num(rob.get('lo')), 'hi': num(rob.get('hi'))} if rob else None
        g['transferObjective'] = {'mean': num(hon.get('mean')), 'lo': num(hon.get('lo')), 'hi': num(hon.get('hi'))} if hon else None
        if g['measuredObjective'] is not None and hon and num(hon.get('lo')) is not None:
            g['objectiveInsideTransfer'] = num(hon['lo']) <= g['measuredObjective'] <= num(hon['hi'])
        g['selectionBias'] = None if g['measuredPair'] is None or g['predictedPair'] is None else g['measuredPair'] - g['predictedPair']
        for nm, cells in (('Colour', cols), ('Pair', prs)):
            ok = [c for c in cells if c['pred'] and c['pred']['est'] is not None and se(c['meas']) is not None]
            if ok and g[f'measured{nm}'] is not None:
                mu = np.array([c['pred']['est'] for c in ok])
                sd = np.array([se(c['meas']) for c in ok])
                draws = np.abs(rng.normal(mu, sd, size=(a.sims, len(ok))) - T).max(axis=1)
                g[f'noiseExpected{nm}'] = float(draws.mean())
                g[f'noiseShareAtOrAbove{nm}'] = float((draws >= g[f'measured{nm}'] - 1e-12).mean())
                if all(c.get('sdT') is not None for c in ok):
                    sdt = np.sqrt(sd ** 2 + np.array([c['sdT'] for c in ok]) ** 2)
                    draws = np.abs(rng.normal(mu, sdt, size=(a.sims, len(ok))) - T).max(axis=1)
                    g[f'transferExpected{nm}'] = float(draws.mean())
                    g[f'transferShareAtOrAbove{nm}'] = float((draws >= g[f'measured{nm}'] - 1e-12).mean())
        g['selectionBiasBeyondNoise'] = None if g.get('noiseExpectedPair') is None else g['measuredPair'] - g['noiseExpectedPair']
        out['transfer'] = stats([c for c in cols], [c for c in prs])
    out['gaps'] = g
    return out


def stats(colcells, paircells):
    res = {}
    for nm, cells in (('Colour', colcells), ('Pair', paircells)):
        ok = [c for c in cells if c['diff'] is not None]
        if not ok:
            continue
        d = np.array([c['diff'] for c in ok])
        rm = float(np.sqrt((d ** 2).mean()))
        mv = float(np.mean([se(c['meas']) ** 2 for c in ok if se(c['meas']) is not None] or [0]))
        pv = float(np.mean([c['pred']['sd'] ** 2 for c in ok if c['pred'].get('sd') is not None] or [0]))
        res[f'rmse{nm}'] = rm
        res[f'maxAbs{nm}'] = float(np.abs(d).max())
        res[f'transferSd{nm}'] = math.sqrt(max(0.0, rm ** 2 - mv - pv))
        res[f'n{nm}'] = len(ok)
        res[f'missBeyondIntervals{nm}'] = sum(1 for c in ok if c.get('missBeyondIntervals'))
        cov = [c for c in ok if 'inTransfer' in c]
        if cov:
            res[f'coverageN{nm}'] = len(cov)
            res[f'coverage{nm}'] = sum(1 for c in cov if c['inTransfer']) / len(cov)
            res[f'coverageExpected{nm}'] = float(np.mean([c['expectedInTransfer'] for c in cov]))
            res[f'coverageWidened{nm}'] = sum(1 for c in cov if c['inTransferWidened']) / len(cov)
    allcov = [c for c in colcells + paircells if c['diff'] is not None and 'inTransfer' in c]
    if allcov:
        k = sum(1 for c in allcov if c['inTransferWidened'])
        lo, hi = wilson(k, len(allcov))
        res['coverageN'] = len(allcov)
        res['coverage'] = sum(1 for c in allcov if c['inTransfer']) / len(allcov)
        res['coverageExpected'] = float(np.mean([c['expectedInTransfer'] for c in allcov]))
        res['coverageWidened'] = k / len(allcov)
        res['coverageWidenedLo'], res['coverageWidenedHi'] = lo, hi
        res['coverageRead'] = 'HONEST' if lo <= 0.95 <= hi else ('TOO NARROW' if hi < 0.95 else 'TOO WIDE')
    return res


cubes = {}
for spec in a.measured:
    cid, path = spec.split('=', 1)
    cubes[cid] = cube_of(cid, path, cid)
refs = {}
for spec in a.reference:
    rid, path = spec.split('=', 1)
    refs[rid] = cube_of(rid, path, rid.split('@', 1)[0])

tested = [x for x in cubes.values() if x['measured'] and x['predicted']]
pooled = stats([c for x in tested for c in x['colours'].values()], [c for x in tested for k, c in x['pairs'].items() if c['qualifies']])

v1 = None
v1doc = load(a.v1_ref) if a.v1_ref else None
if isinstance(v1doc, dict) and isinstance(v1doc.get('pooled'), dict):
    v1 = {'file': a.v1_ref, 'rmseColour': num(v1doc['pooled'].get('rmseColour')), 'rmsePair': num(v1doc['pooled'].get('rmsePair')),
          'transferSdColour': num(v1doc['pooled'].get('transferSdColour')), 'transferSdPair': num(v1doc['pooled'].get('transferSdPair')),
          'nColour': v1doc['pooled'].get('nColour'), 'nPair': v1doc['pooled'].get('nPair')}
read_i = {'v1': v1, 'v2ValidationOnJ160': V2_VALIDATION}
for nm in ('Colour', 'Pair'):
    v2r, v1r = pooled.get(f'rmse{nm}'), (v1 or {}).get(f'rmse{nm}')
    read_i[f'rmse{nm}'] = v2r
    read_i[f'smaller{nm}'] = None if v2r is None or v1r is None else bool(r4(v2r) < r4(v1r))
    read_i[f'read{nm}'] = 'n/a' if read_i[f'smaller{nm}'] is None else ('SMALLER' if read_i[f'smaller{nm}'] else 'NOT SMALLER')
read_ii = {k: pooled.get(k) for k in ('coverageN', 'coverage', 'coverageExpected', 'coverageWidened', 'coverageWidenedLo', 'coverageWidenedHi', 'coverageRead',
                                      'coverageColour', 'coverageExpectedColour', 'coverageWidenedColour', 'coveragePair', 'coverageExpectedPair', 'coverageWidenedPair')}

power = {}
for cid, x in cubes.items():
    if cid.endswith('-nopower'):
        continue
    np_id = cid + '-nopower'
    y = cubes.get(np_id)
    fam = {'with': cid, 'without': np_id if y else None}
    if not y or not x['measured'] or not y['measured']:
        fam['note'] = 'n/a: no -nopower cube measured' if not y else 'n/a: a side has no games'
    else:
        def draws(z):
            mu = np.array([z['colours'][c]['meas']['est'] for c in C5])
            sd = np.array([se(z['colours'][c]['meas']) for c in C5])
            return np.abs(rng.normal(mu, sd, size=(a.sims, 5)) - T).max(axis=1)
        dd = draws(x) - draws(y)
        fam['measuredColourGapWith'] = x['gaps']['measuredColour']
        fam['measuredColourGapWithout'] = y['gaps']['measuredColour']
        fam['diff'] = x['gaps']['measuredColour'] - y['gaps']['measuredColour']
        fam['lo'], fam['hi'] = float(np.percentile(dd, 2.5)), float(np.percentile(dd, 97.5))
        pw, pn = x['gaps'].get('predictedColour'), y['gaps'].get('predictedColour')
        fam['predictedDiff'] = None if pw is None or pn is None else pw - pn
        mpw, mpn = x['gaps'].get('measuredPair'), y['gaps'].get('measuredPair')
        fam['pairGapDiff'] = None if mpw is None or mpn is None else mpw - mpn
    power[cid] = fam

doc = {'v': 1, 'job': a.job, 'arm': a.arm, 'minPairDeckGames': a.min_pair, 'band': [T - BAND, T + BAND], 'sims': a.sims, 'seed': a.seed,
       'model': {'files': a.model, 'predicted': sorted(preds)},
       'caveat': 'Every game is piloted by Forge\'s Default AI on both seats, and every deck is the lab drafter\'s and builder\'s; the model predicts exactly that and nothing about people.',
       'reads': {'i': read_i, 'ii': read_ii}, 'cubes': cubes, 'reference': refs, 'pooled': pooled, 'power': power,
       'candidates': [x['id'] for x in cubes.values() if x['measured'] and x.get('candidate')],
       'v2Pass': [x['id'] for x in cubes.values() if x['measured'] and x.get('v2Pass')],
       'unpredicted': [x['id'] for x in cubes.values() if not x['predicted']],
       'nCubes': len(cubes), 'nMeasured': sum(1 for x in cubes.values() if x['measured']), 'nPredicted': sum(1 for x in cubes.values() if x['predicted']), 'nTested': len(tested)}
doc['code'] = 1 if tested and doc['nMeasured'] == doc['nCubes'] and v1 is not None else -1
doc['nCandidates'] = len(doc['candidates'])


def clean(o):
    if isinstance(o, dict):
        return {k: clean(v) for k, v in o.items()}
    if isinstance(o, list):
        return [clean(v) for v in o]
    if isinstance(o, (bool, np.bool_)):
        return bool(o)
    if isinstance(o, np.integer):
        return int(o)
    if isinstance(o, (np.floating, float)):
        return r4(o)
    return o


doc = clean(doc)
os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
with open(a.out + '.json', 'w') as f:
    f.write(json.dumps(doc, indent=2, allow_nan=False) + '\n')

f3 = lambda x: '-' if x is None else f'{x:.3f}'
sg = lambda x: '-' if x is None else f'{x:+.3f}'
iv = lambda o: '-' if not o else f"{f3(o.get('mean'))} ({f3(o.get('lo'))}-{f3(o.get('hi'))})"
pl, ri, rii = doc['pooled'], doc['reads']['i'], doc['reads']['ii']
v1d = ri.get('v1') or {}
L = [f"**Forge-pilot caveat:** {doc['caveat']}", '', f'# {a.job}: model v2 tested -- predicted against measured, on its own five cubes', '',
     'The registered reads (written before any game): (i) is v2\'s per-cell error (RMSE over the five colours and the pairs with '
     f'{a.min_pair}+ arm-B deck-games, pooled) smaller than v1\'s was on J160; (ii) coverage, the share of those cells inside v2\'s "with transfer" '
     '95% intervals; (iii) the selection bias, as J160\'s; (iv) a candidate (D447 point 9), a cube with no colour OFF and no qualifying pair OFF on '
     'this night alone. No cube is promoted, swapped or regenerated.', '',
     f"**(i) Per-cell error, pooled over {doc['nTested']} v2 cube(s):** colours RMSE {f3(pl.get('rmseColour'))} against v1's {f3(v1d.get('rmseColour'))} on J160: **{ri.get('readColour')}**; "
     f"qualifying pairs RMSE {f3(pl.get('rmsePair'))} (n {pl.get('nPair', 0)}) against v1's {f3(v1d.get('rmsePair'))} (n {v1d.get('nPair')}): **{ri.get('readPair')}**. "
     f"Beside it: max |pred - measured| {f3(pl.get('maxAbsColour'))} / {f3(pl.get('maxAbsPair'))}; transfer SD {f3(pl.get('transferSdColour'))} / {f3(pl.get('transferSdPair'))} "
     f"against v2's validation {V2_VALIDATION['transferSdColour']:.3f} / {V2_VALIDATION['transferSdPair']:.3f}; v2's J160-held-out expectation {V2_VALIDATION['heldOutRmseColour']:.3f} / {V2_VALIDATION['heldOutRmsePair']:.3f}; "
     f"cells missed beyond both intervals (bootstrap only): {pl.get('missBeyondIntervalsColour', 0)} colour(s), {pl.get('missBeyondIntervalsPair', 0)} pair(s).", '',
     f"**(ii) Coverage, pooled over {rii.get('coverageN') or 0} cells:** {f3(rii.get('coverage'))} inside v2's with-transfer intervals (colours {f3(rii.get('coverageColour'))}, pairs {f3(rii.get('coveragePair'))}); "
     f"expected of honest intervals given each cell's own measurement noise {f3(rii.get('coverageExpected'))}. Widened by each cell's measurement SE: {f3(rii.get('coverageWidened'))} "
     f"(Wilson 95% {f3(rii.get('coverageWidenedLo'))}-{f3(rii.get('coverageWidenedHi'))}) against .95: **{rii.get('coverageRead') or 'n/a'}**.", '',
     f"**(iv) Candidates among the v2 cubes (no colour OFF, no qualifying pair OFF, this night alone):** {', '.join(doc['candidates']) or 'none'}. "
     f"The v2 draft rule's stricter PASS (every colour EVEN, no qualifying pair OFF): {', '.join(doc['v2Pass']) or 'none'}. Confirmed only on fresh seeds at 3x later; nothing is promoted."]
if doc['unpredicted']:
    L.append(f"\nMeasured with no prediction in the model files (excluded from (i)-(iii)): {', '.join(doc['unpredicted'])}.")
L += ['', '## Per cube', '', '| cube | model | games | colour level | (i) RMSE colours / pairs (n pairs) | transfer SD colours / pairs | (ii) coverage (expected; widened) | (iii) measured max pair gap | predicted | selection bias | noise-only expected (share >=) | with transfer (share >=) | objective measured / v2 point / robust / with transfer (inside?) | (iv) |',
      '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|']
for x in list(cubes.values()) + [dict(r, id=f"{r['id']} (reference)") for r in refs.values()]:
    if not x['measured']:
        L.append(f"| {x['id']} | {x.get('model') or '-'} | 0 | - | - | - | - | - | - | - | - | - | - | no games |")
        continue
    tr, g = x.get('transfer') or {}, x['gaps']
    inside = g.get('objectiveInsideTransfer')
    L.append(f"| {x['id']} | {x.get('model') or '-'} | {x['games']} | {x['colourLevel']} | {f3(tr.get('rmseColour'))} / {f3(tr.get('rmsePair'))} ({tr.get('nPair', 0)}) | {f3(tr.get('transferSdColour'))} / {f3(tr.get('transferSdPair'))} | "
             f"{f3(tr.get('coverage'))} ({f3(tr.get('coverageExpected'))}; {f3(tr.get('coverageWidened'))}) | {f3(g.get('measuredPair'))} | {f3(g.get('predictedPair'))} | {sg(g.get('selectionBias'))} | "
             f"{f3(g.get('noiseExpectedPair'))} ({f3(g.get('noiseShareAtOrAbovePair'))}) | {f3(g.get('transferExpectedPair'))} ({f3(g.get('transferShareAtOrAbovePair'))}) | "
             f"{f3(g.get('measuredObjective'))} / {f3(g.get('pointObjective'))} / {iv(g.get('robustObjective'))} / {iv(g.get('transferObjective'))} ({'-' if inside is None else 'yes' if inside else 'no'}) | "
             f"{'CANDIDATE' if x['candidate'] else 'no'}{' (v2 PASS)' if x['v2Pass'] else ''} |")
L += ['', '## The power effect (reported, not read): max colour gap with power minus without', '', '| family | with | without | measured diff (95%) | predicted diff | pair-gap diff |', '|---|---|---|---|---|---|']
for cid, f in power.items():
    if 'diff' not in f:
        L.append(f"| {cid} | - | - | {f.get('note')} | - | - |")
    else:
        L.append(f"| {cid} | {f3(f['measuredColourGapWith'])} | {f3(f['measuredColourGapWithout'])} | {sg(f['diff'])} ({sg(f['lo'])} to {sg(f['hi'])}) | {sg(f.get('predictedDiff'))} | {sg(f.get('pairGapDiff'))} |")
for x in list(cubes.values()) + list(refs.values()):
    if not x['measured']:
        continue
    L += ['', f"### {x['id']}{' (reference, never pooled)' if x in refs.values() else ''}", '', '| cell | predicted | with transfer | measured (95%) | n | label | measured - predicted | inside with-transfer | qualifies |', '|---|---|---|---|---|---|---|---|---|']
    for kind, keys in (('colours', C5), ('pairs', PAIRS)):
        for k in keys:
            c = x[kind][k]
            pr, me = c['pred'], c['meas']
            wt = '-' if not pr or pr.get('loT') is None else f"{f3(pr['loT'])}-{f3(pr['hiT'])}"
            ins = '-' if 'inTransfer' not in c else ('yes' if c['inTransfer'] else 'NO')
            L.append(f"| {k} | {f3(pr['est']) if pr else '-'} | {wt} | {f3(me['est'])} ({f3(me['lo'])}-{f3(me['hi'])}) | {me['n']} | {me['label']} | {sg(c['diff'])} | {ins} | {'yes' if kind == 'colours' or c['qualifies'] else 'no'} |")
with open(a.out + '.md', 'w') as f:
    f.write('\n'.join(L) + '\n')
print(json.dumps({'code': doc['code'], 'tested': doc['nTested'], 'readColour': ri.get('readColour'), 'readPair': ri.get('readPair'), 'coverage': rii.get('coverage'), 'coverageRead': rii.get('coverageRead'), 'candidates': doc['candidates']}))
PY
cat > var/lab-j163-local/bin/confirm.py <<'PY'
import argparse, json, math, os
# J163's confirmation read (pc-results drafts/J163-candidate-cubes-2.md, "The registered reads", (a)): J160's one
# candidate, balanced-legacy-even-high-nopower, measured again at 3x (6,000 lab-vs-lab drafts, 12,000 games) on fresh
# seeds, read by J145's balance.py, and judged on THIS NIGHT ALONE (J160's games are never pooled in):
#
#   CONFIRMED CANDIDATE when no colour is OFF and no pair with 400+ arm-B deck-games is OFF (J145's classifier,
#   band [.45, .55]: OFF when the 95% interval excludes .5 and the point is .05 or more from it; EVEN when the
#   interval sits inside the band; else UNCLEAR) -- J160's (iv), the bar the candidate passed on J160;
#   NOT CONFIRMED otherwise; INCOMPLETE when the read has no judged games.
#   Printed beside it, never replacing it: the v2 draft rule's stricter PASS (every colour EVEN, no qualifying pair
#   OFF), and study/omega-swap-rule-v2.md's BALANCED bar at confirmation (every colour EVEN and every qualifying pair
#   EVEN -- Justin's question 3 chooses between that and "not OFF"; this read decides neither).
#   Reported, never pooled: J160's own cells for the cube (the unpooled reference row), each cell's change and its
#   z (the change over sqrt(se1^2 + se2^2), se = interval width / 3.92), and v1's prediction of record (the
#   regenerated v1 -nopower model.json) beside both.  No engine; no cube is promoted, swapped or regenerated.
#   python3 confirm.py --balance <J163 balance.json> --reference <J160 balance.json> --model <v1 model.json> --cube <id> --out <stem>
ap = argparse.ArgumentParser()
ap.add_argument('--balance', required=True)
ap.add_argument('--reference', default=None)
ap.add_argument('--model', default=None)
ap.add_argument('--cube', required=True)
ap.add_argument('--arm', default='Blab')
ap.add_argument('--min-pair', type=int, default=400)
ap.add_argument('--job', default='J163')
ap.add_argument('--out', required=True)
a = ap.parse_args()

C5 = 'WUBRG'
PAIRS = [x + y for i, x in enumerate(C5) for y in C5[i + 1:]]
T, BAND = 0.5, 0.05


def num(x):
    return None if x is None or isinstance(x, bool) or not isinstance(x, (int, float)) or not math.isfinite(float(x)) else float(x)


def r4(x):
    return None if x is None or not math.isfinite(float(x)) else round(float(x), 4)


def label(est, lo, hi):
    # balance.py's payoff label, unchanged
    if est is None or lo is None or hi is None:
        return 'UNCLEAR'
    if (lo > T or hi < T) and abs(est - T) >= BAND - 1e-12:
        return 'OFF'
    if lo >= T - BAND - 1e-12 and hi <= T + BAND + 1e-12:
        return 'EVEN'
    return 'UNCLEAR'


def load(p):
    try:
        return json.load(open(p))
    except (OSError, ValueError, TypeError):
        return None


def cells_of(path):
    doc = load(path)
    pay = ((doc or {}).get('payoff') or {}).get(a.arm) if isinstance(doc, dict) else None
    if not pay or not pay.get('games'):
        return None
    out = {'games': int(pay['games']), 'decks': int(pay.get('decks') or 0), 'colourLevel': ((doc.get('verdict') or {}).get('colourLevel')), 'cells': {}}
    for kind, keys, src in (('colour', C5, 'colour'), ('pair', PAIRS, 'pairs')):
        for k in keys:
            m = (pay.get(src) or {}).get(k) or {}
            c = {'kind': kind, 'est': num(m.get('est')), 'lo': num(m.get('lo')), 'hi': num(m.get('hi')), 'n': int(m.get('n') or 0)}
            c['label'] = label(c['est'], c['lo'], c['hi'])
            c['qualifies'] = kind == 'colour' or (c['n'] >= a.min_pair and c['est'] is not None)
            out['cells'][k] = c
    cs = out['cells']
    out['coloursOff'] = [k for k in C5 if cs[k]['label'] == 'OFF']
    out['coloursNotEven'] = [k for k in C5 if cs[k]['label'] != 'EVEN']
    out['qualifyingPairs'] = [k for k in PAIRS if cs[k]['qualifies']]
    out['pairsOff'] = [k for k in out['qualifyingPairs'] if cs[k]['label'] == 'OFF']
    out['pairsNotEven'] = [k for k in out['qualifyingPairs'] if cs[k]['label'] != 'EVEN']
    out['candidate'] = not out['coloursOff'] and not out['pairsOff']
    out['v2Pass'] = not out['coloursNotEven'] and not out['pairsOff']
    out['balancedStrong'] = not out['coloursNotEven'] and not out['pairsNotEven']
    out['worstCell'] = max((abs(cs[k]['est'] - T) for k in list(C5) + out['qualifyingPairs'] if cs[k]['est'] is not None), default=None)
    return out


night = cells_of(a.balance)
ref = cells_of(a.reference) if a.reference else None
pred = None
m = load(a.model) if a.model else None
for c in ((m or {}).get('candidates') or []):
    if isinstance(c, dict) and c.get('id') == a.cube:
        pred = {k: num(((c.get('pred') or {}).get('colour' if k in C5 else 'pair') or {}).get(k, {}).get('est')) for k in list(C5) + PAIRS}

if night is None:
    verdict, code = 'INCOMPLETE', -1
elif night['candidate']:
    verdict, code = 'CONFIRMED CANDIDATE', 1
else:
    verdict, code = 'NOT CONFIRMED', 0
doc = {'v': 1, 'job': a.job, 'cube': a.cube, 'arm': a.arm, 'minPairDeckGames': a.min_pair, 'band': [T - BAND, T + BAND],
       'rule': 'CONFIRMED CANDIDATE when, on this night alone, no colour is OFF and no pair with 400+ deck-games is OFF; never pooled with J160',
       'verdict': verdict, 'code': code,
       'v2Pass': None if night is None else night['v2Pass'], 'balancedStrong': None if night is None else night['balancedStrong'],
       'night': night, 'reference': ref, 'predictedV1': pred}
if night and ref:
    ch = {}
    for k in list(C5) + PAIRS:
        x, y = night['cells'][k], ref['cells'][k]
        if x['est'] is None or y['est'] is None or None in (x['lo'], x['hi'], y['lo'], y['hi']):
            continue
        s = math.sqrt(((x['hi'] - x['lo']) / 3.92) ** 2 + ((y['hi'] - y['lo']) / 3.92) ** 2)
        ch[k] = {'change': x['est'] - y['est'], 'z': (x['est'] - y['est']) / s if s > 0 else None, 'labelThen': y['label'], 'labelNow': x['label']}
    doc['change'] = ch
    doc['labelsChanged'] = [k for k, v in ch.items() if v['labelThen'] != v['labelNow']]


def clean(o):
    if isinstance(o, dict):
        return {k: clean(v) for k, v in o.items()}
    if isinstance(o, list):
        return [clean(v) for v in o]
    if isinstance(o, bool):
        return o
    if isinstance(o, float):
        return r4(o)
    return o


doc = clean(doc)
os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
with open(a.out + '.json', 'w') as f:
    f.write(json.dumps(doc, indent=2, allow_nan=False) + '\n')

f3 = lambda x: '-' if x is None else f'{x:.3f}'
sg = lambda x: '-' if x is None else f'{x:+.3f}'
L = ['**Forge-pilot caveat:** every game is Forge\'s Default AI on both seats and every deck the lab drafter\'s; nothing here is about people.', '',
     f'# {a.job}: the confirmation of {a.cube} at 3x on fresh seeds', '',
     f"**{verdict}** (registered before any game: no colour OFF and no pair with {a.min_pair}+ deck-games OFF, on this night alone; J160 is never pooled in).", '']
if night:
    L += [f"On {night['games']} judged games ({night['colourLevel']}): colours OFF {', '.join(night['coloursOff']) or 'none'}; not EVEN {', '.join(night['coloursNotEven']) or 'none'}. "
          f"Qualifying pairs ({len(night['qualifyingPairs'])}): {', '.join(night['qualifyingPairs']) or 'none'}; OFF {', '.join(night['pairsOff']) or 'none'}; not EVEN {', '.join(night['pairsNotEven']) or 'none'}. "
          f"Worst cell |payoff - .5| {f3(night['worstCell'])}.", '',
          f"Beside it, never replacing it: the v2 draft rule's PASS (every colour EVEN, no qualifying pair OFF): **{'yes' if night['v2Pass'] else 'no'}**; "
          f"the swap rule's BALANCED bar at confirmation (every colour EVEN and every qualifying pair EVEN; question 3): **{'yes' if night['balancedStrong'] else 'no'}**.", '']
    if ref:
        L.append(f"J160 (the unpooled reference, {ref['games']} games): candidate {'yes' if ref['candidate'] else 'no'}; v2 PASS {'yes' if ref['v2Pass'] else 'no'}; labels changed since: {', '.join(doc.get('labelsChanged') or []) or 'none'}.")
    L += ['', '| cell | v1 predicted | J160 (95%) n label | J163 (95%) n label | change (z) | qualifies tonight |', '|---|---|---|---|---|---|']
    for k in list(C5) + PAIRS:
        x = night['cells'][k]
        y = (ref or {}).get('cells', {}).get(k) if ref else None
        c = (doc.get('change') or {}).get(k) or {}
        yt = '-' if not y else f"{f3(y['est'])} ({f3(y['lo'])}-{f3(y['hi'])}) {y['n']} {y['label']}"
        L.append(f"| {k} | {f3((pred or {}).get(k))} | {yt} | {f3(x['est'])} ({f3(x['lo'])}-{f3(x['hi'])}) {x['n']} {x['label']} | {sg(c.get('change'))} ({sg(c.get('z'))}) | {'yes' if x['qualifies'] else 'no'} |")
with open(a.out + '.md', 'w') as f:
    f.write('\n'.join(L) + '\n')
print(json.dumps({'verdict': verdict, 'code': code, 'v2Pass': doc['v2Pass'], 'balancedStrong': doc['balancedStrong']}))
PY
cat > var/lab-j163-local/bin/status.py <<'PY'
import json, os, sys
# J163's per-cube tally for the runner's metrics (no engine): the cubes at the pin (var/lab-j163-local/cubes.tsv: id,
# path, drafts -- J160's candidate at 6,000, each v2 cube at 2,000), and for each one measured so far its drafts,
# decks, planned and played games, record checks and its read.  Only the cube folders named in cubes.tsv are read,
# never pilot/, selftest/ or report/ (J160's two FAILs were a glob that counted the pilot).
D = os.environ.get('J163_DATA', '/home/justin-a/code/lab/data/lab-j163')
L = os.environ.get('J163_LOCAL', 'var/lab-j163-local')
cubes = []
for l in open(f'{L}/cubes.tsv'):
    if l.strip() and not l.startswith('#'):
        cid, path, n = l.rstrip('\n').split('\t')
        cubes.append((cid, path, int(n)))


def j(p):
    try:
        return json.load(open(p))
    except (OSError, ValueError):
        return None


def lines(p):
    try:
        with open(p, 'rb') as f:
            return sum(1 for l in f if l.endswith(b'\n') and l.strip())
    except OSError:
        return 0


o = {'expected': len(cubes), 'expectedDrafts': sum(n for _, _, n in cubes), 'expectedGames': sum(2 * n for _, _, n in cubes),
     'profiled': 0, 'cubes': 0, 'drafts': 0, 'decks': 0, 'planned': 0, 'games': 0, 'unknown': 0, 'notInCube': 0,
     'arms': 0, 'problems': 0, 'balStrict': 0, 'shortDrafts': 0, 'shortDecks': 0, 'shortGames': 0, 'shortJudged': 0, 'minVerdict': -9,
     'confirmDrafts': 0, 'confirmGames': 0}
verdicts = []
for cid, path, n in cubes:
    pr = j(f'{D}/{cid}/prof/lab/profile.json')
    if not pr:
        continue
    o['profiled'] += 1
    o['drafts'] += pr.get('drafts', 0)
    o['decks'] += pr.get('decks', 0)
    o['planned'] += pr.get('pairs', 0)
    o['unknown'] += pr.get('unknown', 0)
    o['notInCube'] += pr.get('notInCube', 0)
    if pr.get('drafts', 0) != n:
        o['shortDrafts'] += 1
    if pr.get('decks', 0) < 0.995 * 2 * n:
        o['shortDecks'] += 1
    g = lines(f'{D}/{cid}/games/B-lab/games.jsonl')
    o['games'] += g
    if g < 0.99 * 2 * n:
        o['shortGames'] += 1
    if n > 2000:
        o['confirmDrafts'], o['confirmGames'] = pr.get('drafts', 0), g
    rec = (j(f'{D}/{cid}/games/B-lab/census-play.json') or {}).get('record') or {}
    if rec.get('mode') == 'rows':
        o['arms'] += 1
    o['problems'] += len(rec.get('problems') or []) + (rec.get('rowsCheck') or {}).get('problems', 0) + (rec.get('leakCheck') or {}).get('leaks', 0)
    try:
        b = json.load(open(f'{D}/{cid}/out/balance.json'), parse_constant=lambda x: (_ for _ in ()).throw(ValueError(x)))
    except (OSError, ValueError):
        continue
    o['cubes'] += 1
    o['balStrict'] += 1
    verdicts.append((b.get('verdict') or {}).get('code', -9))
    if ((b.get('payoff') or {}).get('Blab') or {}).get('games', 0) < 0.75 * 2 * n:
        o['shortJudged'] += 1
if verdicts:
    o['minVerdict'] = min(verdicts)
print(json.dumps(o))
PY
# balance.py's planted self-test (J145's, on the judged path): 2,000 real decks of (a)'s cube, black +0.10
export LAB_DATA_DIR=/home/justin-a/code/lab/data
tools/cubelab.sh decks --cube cubes/library/balanced/balanced-legacy-even-high-nopower.md --count 2000 --seed 1908 --out var/lab-j163/selftest/decks
python3 - /home/justin-a/code/lab/data/lab-j163/selftest/decks var/lab-j163-local <<'PY'
import json, os, random, subprocess, sys
# balance.py's planted self-test (J145's, on the judged path): fabricated games over real decks, black decks given
# +0.10; black must read OFF on Blab and no other colour OFF
decks_dir, L = sys.argv[1], sys.argv[2]
out = f'{L}/selftest/games'
os.makedirs(out, exist_ok=True)
decks = {}
for l in open(os.path.join(decks_dir, 'decks.jsonl')):
    d = json.loads(l)
    decks[d['id']] = ''.join(c for c in 'WUBRG' if d['profile']['spellsByColour'][c] >= 3)
ids = sorted(decks)
rnd = random.Random(145)
with open(os.path.join(out, 'games.jsonl'), 'w') as G, open(os.path.join(out, 'ledger.jsonl'), 'w') as Lg:
    for g in range(1, 8001):
        a, b = rnd.sample(ids, 2)
        pa = 0.5 + 0.1 * (('B' in decks[a]) - ('B' in decks[b]))
        w = 'a' if rnd.random() < pa else 'b'
        G.write(json.dumps({'v': 1, 'g': g, 'seed': g, 'a': a, 'b': b, 'winner': w, 'turns': rnd.randint(8, 20), 'engineError': None}) + '\n')
        life = [rnd.randint(1, 20), 0] if w == 'a' else [0, rnd.randint(1, 20)]
        Lg.write(json.dumps({'g': g, 'ledger': {'turns': [{'t': 1, 's': [[life[0]], [life[1]]]}]}}) + '\n')
subprocess.run(['python3', f'{L}/bin/balance.py', '--payoff', f'Blab={decks_dir},{out}', '--judged-payoff', 'Blab', '--boot', '400', '--cube', 'selftest', '--out', f'{L}/selftest'], check=True)
os.replace(f'{L}/selftest/balance.json', f'{L}/selftest/selftest-balance.json')
os.replace(f'{L}/selftest/balance.md', f'{L}/selftest/selftest-balance.md')
d = json.load(open(f'{L}/selftest/selftest-balance.json'))
c = d['payoff']['Blab']['colour']
ok = c['B']['label'] == 'OFF' and all(c[x]['label'] != 'OFF' for x in 'WURG') and d['verdict']['colourLevel'] == 'NOT BALANCED ON PAYOFF' and d['verdict']['offPayoffB'] == ['B']
print(json.dumps({x: c[x]['label'] for x in 'WUBRG'}))
open(f'{L}/selftest-ok.txt', 'w').write('1' if ok else '0')
PY
# modeltest.py's planted self-test: v2's model format, known RMSEs, coverage, the reads (i) and (ii) both ways, gaps,
# labels, the power difference, a v1 reference row, an unpredicted cube, a missing read
python3 - var/lab-j163-local <<'PY'
import json, os, subprocess, sys
# modeltest.py's planted self-test: a fabricated v2-format model (and a v1 one for the reference row), a fabricated
# J160 model-test.json, and balance.json documents with known answers
L = sys.argv[1]
D = f'{L}/mt-selftest'
os.makedirs(D, exist_ok=True)
C5 = 'WUBRG'
PAIRS = [x + y for i, x in enumerate(C5) for y in C5[i + 1:]]
def v2cell(k):
    h = 0.045 if k in C5 else 0.06
    return {'est': 0.5, 'sd': 0.01, 'loT': 0.5 - h, 'hiT': 0.5 + h, 'deckSum': 0.5, 'deckGamesAtNight': 1000}
gapdoc = lambda m, lo, hi: {'mean': m, 'lo': lo, 'hi': hi}
model = {'v': 3, 'cubes': [{'id': i, 'kept': True, 'flow': {'pointGap': 0.08, 'robust': gapdoc(0.08, 0.05, 0.11), 'honest': gapdoc(0.12, 0.07, 0.18)},
          'record': {'pointGap': 0.0, 'robust': gapdoc(0.05, 0.03, 0.08), 'honest': gapdoc(0.09, 0.04, 0.15), 'cells': {k: v2cell(k) for k in list(C5) + PAIRS}}}
         for i in ('A', 'A-nopower', 'F')]}
json.dump(model, open(f'{D}/model-v2.json', 'w'))
cell = lambda e, h: {'est': e, 'lo': e - h, 'hi': e + h}
v1 = {'v': 1, 'candidates': [{'id': 'R', 'pred': {'colour': {c: dict(cell(0.5, 0.03), sd=0.015) for c in C5}, 'pair': {p: dict(cell(0.5, 0.035), sd=0.018) for p in PAIRS}},
       'maxColourGap': 0.0, 'maxPairGap': 0.0, 'flowGap': 0.1}]}
json.dump(v1, open(f'{D}/model-v1.json', 'w'))
json.dump({'pooled': {'rmseColour': 0.0303, 'rmsePair': 0.047, 'transferSdColour': 0.021, 'transferSdPair': 0.0385, 'nColour': 25, 'nPair': 23}}, open(f'{D}/j160-model-test.json', 'w'))
def bal(colours, pairs):
    return {'verdict': {'colourLevel': 'BALANCED ON PAYOFF'}, 'payoff': {'Blab': {'games': 4000,
            'colour': {c: dict(cell(*colours[c]), n=2000) for c in C5},
            'pairs': {p: dict(cell(*pairs[p][:2]), n=pairs[p][2]) for p in PAIRS}}}}
offs = [0.02, -0.02, 0.02, -0.02, 0.0]
# A: colours +-.02 (EVEN, inside), seven qualifying pairs +-.03 (inside), three thin pairs far off (excluded)
A = bal({c: (0.5 + o, 0.02) for c, o in zip(C5, offs)}, {p: ((0.53 if i % 2 == 0 else 0.47), 0.03, 500) if i < 7 else (0.7, 0.05, 300) for i, p in enumerate(PAIRS)})
# A-nopower: white .56 (.54-.58), OFF and outside its with-transfer interval (and the widened one); every pair .5
B = bal({c: ((0.56, 0.02) if c == 'W' else (0.5, 0.02)) for c in C5}, {p: (0.5, 0.03, 500) for p in PAIRS})
# C: no prediction; all even.  F: every colour .60 -- far outside, for the NOT SMALLER and TOO NARROW paths
Cc = bal({c: (0.5, 0.02) for c in C5}, {p: (0.5, 0.03, 500) for p in PAIRS})
F = bal({c: (0.6, 0.02) for c in C5}, {p: (0.5, 0.03, 300) for p in PAIRS})
for n, d in (('A', A), ('A-nopower', B), ('C', Cc), ('F', F), ('R', Cc)):
    json.dump(d, open(f'{D}/{n}.json', 'w'))
py = f'{L}/bin/modeltest.py'
base = ['python3', py, '--model', f'{D}/model-v2.json', '--model', f'{D}/model-v1.json', '--v1-ref', f'{D}/j160-model-test.json', '--sims', '500']
subprocess.run(base + ['--measured', f'A={D}/A.json', '--measured', f'A-nopower={D}/A-nopower.json', '--measured', f'C={D}/C.json', '--reference', f'R@x={D}/R.json', '--out', f'{D}/out'], check=True, stdout=subprocess.DEVNULL)
subprocess.run(base + ['--measured', f'F={D}/F.json', '--out', f'{D}/far'], check=True, stdout=subprocess.DEVNULL)
subprocess.run(base + ['--measured', f'A={D}/missing.json', '--out', f'{D}/none'], check=True, stdout=subprocess.DEVNULL)
g, fr, h = (json.load(open(f'{D}/{n}.json')) for n in ('out', 'far', 'none'))
a, b = g['cubes']['A'], g['cubes']['A-nopower']
near = lambda x, y: x is not None and abs(x - y) < 1e-4
ri, rii = g['reads']['i'], g['reads']['ii']
want = {
    'code': g['code'] == 1 and g['nTested'] == 2 and g['unpredicted'] == ['C'],
    'A rmse': near(a['transfer']['rmseColour'], 0.0179) and near(a['transfer']['rmsePair'], 0.03) and a['transfer']['nPair'] == 7,
    'A gaps': near(a['gaps']['measuredPair'], 0.03) and near(a['gaps']['selectionBias'], 0.03) and near(a['gaps']['measuredObjective'], 0.05) and a['gaps']['objectiveInsideTransfer'] is True,
    'A coverage': near(a['transfer']['coverage'], 1.0) and a['transfer']['coverageN'] == 12,
    'B coverage': near(b['transfer']['coverage'], 0.9333) and near(b['transfer']['coverageWidened'], 0.9333) and b['colours']['W']['inTransfer'] is False,
    'A candidate': a['candidate'] and a['v2Pass'] and a['pairsOff'] == [] and len(a['qualifyingPairs']) == 7,
    'B not': (not b['candidate']) and b['coloursOff'] == ['W'],
    'pooled': near(g['pooled']['rmseColour'], 0.0228) and near(g['pooled']['rmsePair'], 0.0193) and g['pooled']['nPair'] == 17,
    'read i': ri['readColour'] == 'SMALLER' and ri['readPair'] == 'SMALLER' and near(ri['v1']['rmseColour'], 0.0303),
    'read ii': near(rii['coverage'], 0.963) and rii['coverageN'] == 27 and rii['coverageRead'] == 'HONEST',
    'power': near(g['power']['A']['diff'], -0.04) and g['power']['A']['hi'] < 0,
    'lists': g['candidates'] == ['A', 'C'] and g['v2Pass'] == ['A', 'C'] and g['nCandidates'] == 2,
    'reference': g['reference']['R@x']['model'] == 'v1' and g['reference']['R@x']['predicted'] and near(g['reference']['R@x']['transfer']['rmseColour'], 0.0) and 'coverage' not in g['reference']['R@x']['transfer'],
    'far': fr['reads']['i']['readColour'] == 'NOT SMALLER' and fr['reads']['ii']['coverageRead'] == 'TOO NARROW' and near(fr['reads']['ii']['coverage'], 0.0),
    'none': h['code'] == -1 and h['nTested'] == 0,
}
print(json.dumps(want))
open(f'{L}/mt-selftest-ok.txt', 'w').write('1' if all(want.values()) else '0')
PY
# confirm.py's planted self-test: CONFIRMED with and without the v2 PASS and the strong bar, NOT CONFIRMED, INCOMPLETE
python3 - var/lab-j163-local <<'PY'
import json, os, subprocess, sys
# confirm.py's planted self-test: four fabricated reads of the candidate with known verdicts
L = sys.argv[1]
D = f'{L}/cf-selftest'
os.makedirs(D, exist_ok=True)
C5 = 'WUBRG'
PAIRS = [x + y for i, x in enumerate(C5) for y in C5[i + 1:]]
def bal(colours, pairs):
    c = lambda e, lo, hi, n: {'est': e, 'lo': lo, 'hi': hi, 'n': n}
    return {'verdict': {'colourLevel': 'BALANCED ON PAYOFF'}, 'payoff': {'Blab': {'games': 12000, 'decks': 12000,
            'colour': {k: c(*colours.get(k, (0.5, 0.49, 0.51)), 6000) for k in C5},
            'pairs': {k: c(*pairs.get(k, (0.5, 0.47, 0.53, 900))) for k in PAIRS}}}}
docs = {
    # every colour EVEN; UR UNCLEAR (qualifying); BR OFF but thin (300 deck-games): CONFIRMED, v2 PASS, not the strong bar
    'one': bal({}, {'UR': (0.54, 0.515, 0.565, 1200), 'BR': (0.42, 0.36, 0.48, 300)}),
    # black UNCLEAR (.451, .424-.481, J160's): CONFIRMED, no v2 PASS
    'two': bal({'B': (0.451, 0.424, 0.481)}, {}),
    # WU OFF on 500 deck-games: NOT CONFIRMED
    'three': bal({}, {'WU': (0.56, 0.53, 0.59, 500)}),
    # every cell EVEN: CONFIRMED, v2 PASS and the strong bar
    'four': bal({}, {}),
}
for n, d in docs.items():
    json.dump(d, open(f'{D}/{n}.json', 'w'))
res = {}
for n in list(docs) + ['missing']:
    subprocess.run(['python3', f'{L}/bin/confirm.py', '--balance', f'{D}/{n}.json', '--reference', f'{D}/three.json', '--cube', 'X', '--out', f'{D}/out-{n}'], check=True, stdout=subprocess.DEVNULL)
    res[n] = json.load(open(f'{D}/out-{n}.json'))
want = {
    'one': res['one']['code'] == 1 and res['one']['v2Pass'] is True and res['one']['balancedStrong'] is False and res['one']['night']['pairsNotEven'] == ['UR'],
    'two': res['two']['code'] == 1 and res['two']['v2Pass'] is False and res['two']['night']['coloursNotEven'] == ['B'],
    'three': res['three']['code'] == 0 and res['three']['verdict'] == 'NOT CONFIRMED' and res['three']['night']['pairsOff'] == ['WU'],
    'four': res['four']['code'] == 1 and res['four']['balancedStrong'] is True and res['four']['labelsChanged'] == ['WU'],
    'missing': res['missing']['code'] == -1 and res['missing']['verdict'] == 'INCOMPLETE',
}
print(json.dumps(want))
open(f'{L}/cf-selftest-ok.txt', 'w').write('1' if all(want.values()) else '0')
PY
```
metrics: merged = sh: cat var/lab-j163-local/merged.txt 2>/dev/null || echo 0
metrics: has_tools = sh: cat var/lab-j163-local/has-tools.txt 2>/dev/null || echo 0
metrics: datadir = sh: cat var/lab-j163-local/datadir.txt 2>/dev/null || echo 0
metrics: inputs_ok = sh: cat var/lab-j163-local/inputs-ok.txt 2>/dev/null || echo 0
metrics: cand_ok = sh: cat var/lab-j163-local/cand-ok.txt 2>/dev/null || echo 0
metrics: pc = sh: cat var/lab-j163-local/parse.json 2>/dev/null || echo '{"present":0}'
metrics: regen = sh: cat var/lab-j163-local/regen.json 2>/dev/null || echo '{"present":0}'
metrics: selftest = sh: cat var/lab-j163-local/selftest-ok.txt 2>/dev/null || echo 0
metrics: mtselftest = sh: cat var/lab-j163-local/mt-selftest-ok.txt 2>/dev/null || echo 0
metrics: cfselftest = sh: cat var/lab-j163-local/cf-selftest-ok.txt 2>/dev/null || echo 0
```bash
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J163
D=/home/justin-a/code/lab/data/lab-j163/pilot
C=balanced-v2-legacy-even-high-nopower
P=cubes/library/balanced/v2/$C.md
tools/cubelab.sh run "$P" --format grid --drafts 20 --seed 819900001 --games 0 --jobs {workers} --out var/lab-j163/pilot/runs/lab
node var/lab-j163-local/bin/profile.ts --run "$D/runs/lab" --name lab --seed-base 1909 --cube "$P" --out "$D/prof/lab"
tools/cubelab.sh census-play --decks var/lab-j163/pilot/prof/lab --replay var/lab-j163/pilot/prof/lab/pairs.jsonl --jobs {workers} --record rows --out var/lab-j163/pilot/games/B-lab
python3 var/lab-j163-local/bin/balance.py --pull "lab=lab,$D/prof/lab" --payoff "Blab=$D/prof/lab,$D/games/B-lab" --judged-payoff Blab --boot 200 --job J163 --cube "$C" --out "$D/out"
head -12 "$D/out/balance.md"
python3 var/lab-j163-local/bin/modeltest.py --model var/lab-j163-local/model-v2/model.json --model var/lab-j163-local/model-v2-nopower/model.json --model var/lab-j163-local/model-v1-nopower/model.json --measured "$C=$D/out/balance.json" --v1-ref /home/justin-a/code/lab/data/lab-j160/report/model-test.json --sims 500 --out "$D/out/model-test"
head -14 "$D/out/model-test.md"
# confirm.py over the smoke's read, as if it were (a)'s cube (exercises the path; the verdict is not read)
python3 var/lab-j163-local/bin/confirm.py --balance "$D/out/balance.json" --reference /home/justin-a/code/lab/data/lab-j160/report/balanced-legacy-even-high-nopower.balance.json --model var/lab-j163-local/model-v1-nopower/model.json --cube balanced-legacy-even-high-nopower --out "$D/out/confirmation"
head -8 "$D/out/confirmation.md"
```
metrics: pruns = cubelab /home/justin-a/code/lab/data/lab-j163/pilot/runs/lab
metrics: pprof = sh: cat /home/justin-a/code/lab/data/lab-j163/pilot/prof/lab/profile.json 2>/dev/null || echo '{"decks":0}'
metrics: pgames = lines /home/justin-a/code/lab/data/lab-j163/pilot/games/B-lab/games.jsonl
metrics: perr = count /home/justin-a/code/lab/data/lab-j163/pilot/games/B-lab/games.jsonl "\"engineError\":\""
metrics: prec = sh: python3 -c "import json; x = json.load(open('/home/justin-a/code/lab/data/lab-j163/pilot/games/B-lab/census-play.json')).get('record') or {}; print(json.dumps({'rows': 1 if x.get('mode') == 'rows' else 0, 'problems': len(x.get('problems') or []) + (x.get('rowsCheck') or {}).get('problems', 0) + (x.get('leakCheck') or {}).get('leaks', 0)}))" 2>/dev/null || echo '{"rows":0}'
metrics: pbal = sh: cat /home/justin-a/code/lab/data/lab-j163/pilot/out/balance.json 2>/dev/null || echo '{"verdict":{"code":-9}}'
metrics: pstrict = sh: python3 -c "import json,sys; json.load(open('/home/justin-a/code/lab/data/lab-j163/pilot/out/balance.json'), parse_constant=lambda c: sys.exit(1)); print(1)" 2>/dev/null || echo 0
metrics: pmt = sh: cat /home/justin-a/code/lab/data/lab-j163/pilot/out/model-test.json 2>/dev/null || echo '{"v":0}'
metrics: pmtstrict = sh: python3 -c "import json,sys; json.load(open('/home/justin-a/code/lab/data/lab-j163/pilot/out/model-test.json'), parse_constant=lambda c: sys.exit(1)); print(1)" 2>/dev/null || echo 0
metrics: pcf = sh: cat /home/justin-a/code/lab/data/lab-j163/pilot/out/confirmation.json 2>/dev/null || echo '{"code":-9}'
metrics: pcfstrict = sh: python3 -c "import json,sys; json.load(open('/home/justin-a/code/lab/data/lab-j163/pilot/out/confirmation.json'), parse_constant=lambda c: sys.exit(1)); print(1)" 2>/dev/null || echo 0
check: merged == 1
check: has_tools == 1
check: datadir == 1
check: inputs_ok == 1
check: cand_ok == 1
check: pc.present == 6 and pc.v2 == 5 and pc.ok == 6
check: regen.present == 6 and regen.predicted == 6 and regen.identical == 6 and regen.mismatch == 0 and regen.candidateFromV1 == 1 and regen.v2FromV2 == 5
check: selftest == 1
check: mtselftest == 1
check: cfselftest == 1
check: data_free_gb >= 50
check: qwriters == 0
check: pruns.drafts == 20
check: pprof.decks == 40 and pprof.pairs == 40
check: pprof.unknown + pprof.notInCube == 0
check: pgames == 40
check: perr <= 1
check: prec.rows == 1 and prec.problems == 0
check: pstrict == 1
check: pbal.pull.lab.decks == 40
check: pmtstrict == 1
check: pmt.v == 1 and pmt.nPredicted == 1 and pmt.reads.i.v1.nPair == 23
check: pcfstrict == 1 and pcf.code >= 0

The pilot asks whether anything is broken:
- **The setting, the pin and the tools.** The data folder as the README says; the pin on origin/main with
  `balance-model` v2, `decks --cube` and `--record`.
- **The cubes.** All six present ((a)'s and the five v2 files), each 180 cards that parse with no warning, every
  card in the library pool so `profile.ts` knows them all; (a)'s file byte-identical to J160's (sha256).
- **The predictions.** The two models' tests (v1's loads every committed v1 cube as `run` and `draft` do; v2's
  every committed v2 cube, and re-drafts a trimmed slice of J160 exactly) and the deck census's pass; the 26 input
  files' sha256s (v1's seven, v2's eighteen more, and J160's `model-test.json`); the three balance-model runs
  regenerate every measured cube byte-identical, (a)'s from v1 and the five from v2, so the tables the reads use
  are the drafted cubes' own.
- **The reads.** `balance.py`'s planted self-test (J145's): 8,000 fabricated games over 2,000 real decks of (a)'s
  cube with black decks +0.10 read black OFF, no other colour OFF and NOT BALANCED ON PAYOFF. `modeltest.py`'s, on
  a fabricated v2-format model: RMSE .0179 colours and .03 over 7 qualifying pairs (3 thin far-off pairs
  excluded), pooled .0228 / .0193 over 17 pairs, both SMALLER than a planted v1 .0303 / .047; coverage 1.0 on one
  cube and 14/15 on the other (white outside both its interval and the widened one), pooled 26/27 HONEST; a far
  cube reads NOT SMALLER and TOO NARROW; the selection bias .03 with the objective inside its interval; the
  candidate lists; the power difference -.04 with an interval below 0; a v1 reference row read with no coverage;
  the unpredicted cube excluded; and -1 on a missing read. `confirm.py`'s: CONFIRMED with the v2 PASS (a
  qualifying pair UNCLEAR, a thin pair OFF), CONFIRMED without it (black .451, J160's), NOT CONFIRMED (a
  qualifying pair OFF), CONFIRMED with the strong bar, and INCOMPLETE on a missing read.
- **The pipeline.** 20 lab-vs-lab drafts of a v2 cube, 40 decks from cards the library knows and the cube lists, 40
  replay games recorded and checked, and all three reads' strict JSON over them (the pilot's numbers are not read).

No check is on a share, a rate, a label or a prediction's size. Dry run: not done (J162 and a serial gate held the
machine; nothing was played or regenerated to write this file). Run outside the runner on 2026-10-24, no engine:
`modeltest.py` on J160's report files with J160's v1 models (J160's `transfer` and selection-bias numbers for every
cube reproduced exactly, pooled .0303 / .0470), and on v2's committed model.json files (study/omega-balance-model-
v2/) with J160's reads standing in as measurements (the v2 path end to end; the numbers mean nothing); the
extracted `balance.py` on J160's candidate folders (balance.json byte-identical to J160's); `status.py` on J160's
layout; both new planted self-tests (pass); every input sha256 above (all match); the six cube files at b2e1b18d
(180 cards, 0 warnings, 0 outside the pool). Not run: balance-model at the pin (see the header, item 4).
`tools/runner.sh check`: clean with a real sha in place of `10fe4e7e`.

## Commands
(a) first: if the night is cut short, the confirmation is the result most worth having. A step is one cube.
```bash
# (a) the confirmation: balanced-legacy-even-high-nopower (J160's candidate (v1), at 3x)
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J163
C=balanced-legacy-even-high-nopower
P=cubes/library/balanced/balanced-legacy-even-high-nopower.md
D=/home/justin-a/code/lab/data/lab-j163/$C
grep -qxF "$(printf '%s\t%s\t%s' "$C" "$P" 6000)" var/lab-j163-local/cubes.tsv || { echo "J163: $C is not in cubes.tsv as the pilot wrote it" >&2; exit 1; }
python3 -c "import shutil, sys; sys.exit(0 if shutil.disk_usage('/home/justin-a/code/lab/data').free >= 50e9 else 'J163: under 50 GB free on the data folder')"
# 6,000 lab-vs-lab grid drafts, draft and build only: drafts 819,100,001-819,106,000
tools/cubelab.sh run "$P" --format grid --drafts 6000 --seed 819100001 --games 0 --jobs {workers} --out "var/lab-j163/$C/runs/lab"
# each draft's two decks against each other, twice, each on the play once: game g's seed 1,901 x 1,000,000 + g, g 1-12,000
test -s "$D/prof/lab/pairs.jsonl" || node var/lab-j163-local/bin/profile.ts --run "$D/runs/lab" --name lab --seed-base 1901 --cube "$P" --out "$D/prof/lab"
tools/cubelab.sh census-play --decks "var/lab-j163/$C/prof/lab" --replay "var/lab-j163/$C/prof/lab/pairs.jsonl" --jobs {workers} --record rows --out "var/lab-j163/$C/games/B-lab"
test "$(wc -l < "$D/games/B-lab/games.jsonl")" -eq "$(wc -l < "$D/prof/lab/pairs.jsonl")"
# J145's read on the judged arm (lab vs lab), this cube alone
python3 var/lab-j163-local/bin/balance.py --pull "lab=lab,$D/prof/lab" --payoff "Blab=$D/prof/lab,$D/games/B-lab" --judged-payoff Blab --boot 1000 --seed 145 --job J163 --cube "$C" --out "$D/out"
gzip -9 -c "$D/prof/lab/decks.jsonl" > "$D/out/drafted-decks.jsonl.gz"
gzip -9 -c "$D/games/B-lab/games.jsonl" > "$D/out/games.jsonl.gz"
head -12 "$D/out/balance.md"
# (a)'s registered verdict, early (the last block writes the same read into report/)
python3 var/lab-j163-local/bin/confirm.py --balance "$D/out/balance.json" --reference /home/justin-a/code/lab/data/lab-j160/report/balanced-legacy-even-high-nopower.balance.json --model var/lab-j163-local/model-v1-nopower/model.json --cube "$C" --job J163 --out "$D/out/confirmation"
head -10 "$D/out/confirmation.md"
```
```bash
# (b) 1: balanced-v2-legacy-even-high (model v2)
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J163
C=balanced-v2-legacy-even-high
P=cubes/library/balanced/v2/balanced-v2-legacy-even-high.md
D=/home/justin-a/code/lab/data/lab-j163/$C
grep -qxF "$(printf '%s\t%s\t%s' "$C" "$P" 2000)" var/lab-j163-local/cubes.tsv || { echo "J163: $C is not in cubes.tsv as the pilot wrote it" >&2; exit 1; }
python3 -c "import shutil, sys; sys.exit(0 if shutil.disk_usage('/home/justin-a/code/lab/data').free >= 50e9 else 'J163: under 50 GB free on the data folder')"
# 2,000 lab-vs-lab grid drafts, draft and build only: drafts 819,200,001-819,202,000
tools/cubelab.sh run "$P" --format grid --drafts 2000 --seed 819200001 --games 0 --jobs {workers} --out "var/lab-j163/$C/runs/lab"
# each draft's two decks against each other, twice, each on the play once: game g's seed 1,902 x 1,000,000 + g, g 1-4,000
test -s "$D/prof/lab/pairs.jsonl" || node var/lab-j163-local/bin/profile.ts --run "$D/runs/lab" --name lab --seed-base 1902 --cube "$P" --out "$D/prof/lab"
tools/cubelab.sh census-play --decks "var/lab-j163/$C/prof/lab" --replay "var/lab-j163/$C/prof/lab/pairs.jsonl" --jobs {workers} --record rows --out "var/lab-j163/$C/games/B-lab"
test "$(wc -l < "$D/games/B-lab/games.jsonl")" -eq "$(wc -l < "$D/prof/lab/pairs.jsonl")"
# J145's read on the judged arm (lab vs lab), this cube alone
python3 var/lab-j163-local/bin/balance.py --pull "lab=lab,$D/prof/lab" --payoff "Blab=$D/prof/lab,$D/games/B-lab" --judged-payoff Blab --boot 1000 --seed 145 --job J163 --cube "$C" --out "$D/out"
gzip -9 -c "$D/prof/lab/decks.jsonl" > "$D/out/drafted-decks.jsonl.gz"
gzip -9 -c "$D/games/B-lab/games.jsonl" > "$D/out/games.jsonl.gz"
head -12 "$D/out/balance.md"
```
```bash
# (b) 2: balanced-v2-legacy-even-high-nopower (model v2)
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J163
C=balanced-v2-legacy-even-high-nopower
P=cubes/library/balanced/v2/balanced-v2-legacy-even-high-nopower.md
D=/home/justin-a/code/lab/data/lab-j163/$C
grep -qxF "$(printf '%s\t%s\t%s' "$C" "$P" 2000)" var/lab-j163-local/cubes.tsv || { echo "J163: $C is not in cubes.tsv as the pilot wrote it" >&2; exit 1; }
python3 -c "import shutil, sys; sys.exit(0 if shutil.disk_usage('/home/justin-a/code/lab/data').free >= 50e9 else 'J163: under 50 GB free on the data folder')"
# 2,000 lab-vs-lab grid drafts, draft and build only: drafts 819,300,001-819,302,000
tools/cubelab.sh run "$P" --format grid --drafts 2000 --seed 819300001 --games 0 --jobs {workers} --out "var/lab-j163/$C/runs/lab"
# each draft's two decks against each other, twice, each on the play once: game g's seed 1,903 x 1,000,000 + g, g 1-4,000
test -s "$D/prof/lab/pairs.jsonl" || node var/lab-j163-local/bin/profile.ts --run "$D/runs/lab" --name lab --seed-base 1903 --cube "$P" --out "$D/prof/lab"
tools/cubelab.sh census-play --decks "var/lab-j163/$C/prof/lab" --replay "var/lab-j163/$C/prof/lab/pairs.jsonl" --jobs {workers} --record rows --out "var/lab-j163/$C/games/B-lab"
test "$(wc -l < "$D/games/B-lab/games.jsonl")" -eq "$(wc -l < "$D/prof/lab/pairs.jsonl")"
# J145's read on the judged arm (lab vs lab), this cube alone
python3 var/lab-j163-local/bin/balance.py --pull "lab=lab,$D/prof/lab" --payoff "Blab=$D/prof/lab,$D/games/B-lab" --judged-payoff Blab --boot 1000 --seed 145 --job J163 --cube "$C" --out "$D/out"
gzip -9 -c "$D/prof/lab/decks.jsonl" > "$D/out/drafted-decks.jsonl.gz"
gzip -9 -c "$D/games/B-lab/games.jsonl" > "$D/out/games.jsonl.gz"
head -12 "$D/out/balance.md"
```
```bash
# (b) 3: balanced-v2-legacy-even-mid (model v2; J160's stall suspects are in it)
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J163
C=balanced-v2-legacy-even-mid
P=cubes/library/balanced/v2/balanced-v2-legacy-even-mid.md
D=/home/justin-a/code/lab/data/lab-j163/$C
grep -qxF "$(printf '%s\t%s\t%s' "$C" "$P" 2000)" var/lab-j163-local/cubes.tsv || { echo "J163: $C is not in cubes.tsv as the pilot wrote it" >&2; exit 1; }
python3 -c "import shutil, sys; sys.exit(0 if shutil.disk_usage('/home/justin-a/code/lab/data').free >= 50e9 else 'J163: under 50 GB free on the data folder')"
# 2,000 lab-vs-lab grid drafts, draft and build only: drafts 819,400,001-819,402,000
tools/cubelab.sh run "$P" --format grid --drafts 2000 --seed 819400001 --games 0 --jobs {workers} --out "var/lab-j163/$C/runs/lab"
# each draft's two decks against each other, twice, each on the play once: game g's seed 1,904 x 1,000,000 + g, g 1-4,000
test -s "$D/prof/lab/pairs.jsonl" || node var/lab-j163-local/bin/profile.ts --run "$D/runs/lab" --name lab --seed-base 1904 --cube "$P" --out "$D/prof/lab"
tools/cubelab.sh census-play --decks "var/lab-j163/$C/prof/lab" --replay "var/lab-j163/$C/prof/lab/pairs.jsonl" --jobs {workers} --record rows --out "var/lab-j163/$C/games/B-lab"
test "$(wc -l < "$D/games/B-lab/games.jsonl")" -eq "$(wc -l < "$D/prof/lab/pairs.jsonl")"
# J145's read on the judged arm (lab vs lab), this cube alone
python3 var/lab-j163-local/bin/balance.py --pull "lab=lab,$D/prof/lab" --payoff "Blab=$D/prof/lab,$D/games/B-lab" --judged-payoff Blab --boot 1000 --seed 145 --job J163 --cube "$C" --out "$D/out"
gzip -9 -c "$D/prof/lab/decks.jsonl" > "$D/out/drafted-decks.jsonl.gz"
gzip -9 -c "$D/games/B-lab/games.jsonl" > "$D/out/games.jsonl.gz"
head -12 "$D/out/balance.md"
```
```bash
# (b) 4: balanced-v2-legacy-even-mid-nopower (model v2; J160's stall suspects are in it)
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J163
C=balanced-v2-legacy-even-mid-nopower
P=cubes/library/balanced/v2/balanced-v2-legacy-even-mid-nopower.md
D=/home/justin-a/code/lab/data/lab-j163/$C
grep -qxF "$(printf '%s\t%s\t%s' "$C" "$P" 2000)" var/lab-j163-local/cubes.tsv || { echo "J163: $C is not in cubes.tsv as the pilot wrote it" >&2; exit 1; }
python3 -c "import shutil, sys; sys.exit(0 if shutil.disk_usage('/home/justin-a/code/lab/data').free >= 50e9 else 'J163: under 50 GB free on the data folder')"
# 2,000 lab-vs-lab grid drafts, draft and build only: drafts 819,500,001-819,502,000
tools/cubelab.sh run "$P" --format grid --drafts 2000 --seed 819500001 --games 0 --jobs {workers} --out "var/lab-j163/$C/runs/lab"
# each draft's two decks against each other, twice, each on the play once: game g's seed 1,905 x 1,000,000 + g, g 1-4,000
test -s "$D/prof/lab/pairs.jsonl" || node var/lab-j163-local/bin/profile.ts --run "$D/runs/lab" --name lab --seed-base 1905 --cube "$P" --out "$D/prof/lab"
tools/cubelab.sh census-play --decks "var/lab-j163/$C/prof/lab" --replay "var/lab-j163/$C/prof/lab/pairs.jsonl" --jobs {workers} --record rows --out "var/lab-j163/$C/games/B-lab"
test "$(wc -l < "$D/games/B-lab/games.jsonl")" -eq "$(wc -l < "$D/prof/lab/pairs.jsonl")"
# J145's read on the judged arm (lab vs lab), this cube alone
python3 var/lab-j163-local/bin/balance.py --pull "lab=lab,$D/prof/lab" --payoff "Blab=$D/prof/lab,$D/games/B-lab" --judged-payoff Blab --boot 1000 --seed 145 --job J163 --cube "$C" --out "$D/out"
gzip -9 -c "$D/prof/lab/decks.jsonl" > "$D/out/drafted-decks.jsonl.gz"
gzip -9 -c "$D/games/B-lab/games.jsonl" > "$D/out/games.jsonl.gz"
head -12 "$D/out/balance.md"
```
```bash
# (b) 5: balanced-v2-pauper-even (model v2)
export LAB_DATA_DIR=/home/justin-a/code/lab/data
export CUBELAB_HOME_ROOT=var/cubelab/homes-J163
C=balanced-v2-pauper-even
P=cubes/library/balanced/v2/balanced-v2-pauper-even.md
D=/home/justin-a/code/lab/data/lab-j163/$C
grep -qxF "$(printf '%s\t%s\t%s' "$C" "$P" 2000)" var/lab-j163-local/cubes.tsv || { echo "J163: $C is not in cubes.tsv as the pilot wrote it" >&2; exit 1; }
python3 -c "import shutil, sys; sys.exit(0 if shutil.disk_usage('/home/justin-a/code/lab/data').free >= 50e9 else 'J163: under 50 GB free on the data folder')"
# 2,000 lab-vs-lab grid drafts, draft and build only: drafts 819,600,001-819,602,000
tools/cubelab.sh run "$P" --format grid --drafts 2000 --seed 819600001 --games 0 --jobs {workers} --out "var/lab-j163/$C/runs/lab"
# each draft's two decks against each other, twice, each on the play once: game g's seed 1,906 x 1,000,000 + g, g 1-4,000
test -s "$D/prof/lab/pairs.jsonl" || node var/lab-j163-local/bin/profile.ts --run "$D/runs/lab" --name lab --seed-base 1906 --cube "$P" --out "$D/prof/lab"
tools/cubelab.sh census-play --decks "var/lab-j163/$C/prof/lab" --replay "var/lab-j163/$C/prof/lab/pairs.jsonl" --jobs {workers} --record rows --out "var/lab-j163/$C/games/B-lab"
test "$(wc -l < "$D/games/B-lab/games.jsonl")" -eq "$(wc -l < "$D/prof/lab/pairs.jsonl")"
# J145's read on the judged arm (lab vs lab), this cube alone
python3 var/lab-j163-local/bin/balance.py --pull "lab=lab,$D/prof/lab" --payoff "Blab=$D/prof/lab,$D/games/B-lab" --judged-payoff Blab --boot 1000 --seed 145 --job J163 --cube "$C" --out "$D/out"
gzip -9 -c "$D/prof/lab/decks.jsonl" > "$D/out/drafted-decks.jsonl.gz"
gzip -9 -c "$D/games/B-lab/games.jsonl" > "$D/out/games.jsonl.gz"
head -12 "$D/out/balance.md"
```
cores: 1
```bash
# the night's reads, into report/: (a)'s confirmation, then the model test over the five v2 cubes, with (a)'s cube at
# J163 and at J160 as reference rows against v1's prediction (never pooled)
D=/home/justin-a/code/lab/data/lab-j163
J160=/home/justin-a/code/lab/data/lab-j160/report
mkdir -p "$D/report"
M=()
while IFS="$(printf '\t')" read -r C P N; do
  test -s "$D/$C/out/balance.json"
  case "$C" in balanced-v2-*) M+=(--measured "$C=$D/$C/out/balance.json") ;; esac
  for F in balance.json balance.md drafted-decks.jsonl.gz games.jsonl.gz; do cp "$D/$C/out/$F" "$D/report/$C.$F"; done
  cp "$D/$C/games/B-lab/census-play.json" "$D/report/$C.census-play.json"
  cp "$D/$C/prof/lab/profile.json" "$D/report/$C.profile.json"
done < var/lab-j163-local/cubes.tsv
A=balanced-legacy-even-high-nopower
python3 var/lab-j163-local/bin/confirm.py --balance "$D/$A/out/balance.json" --reference "$J160/$A.balance.json" --model var/lab-j163-local/model-v1-nopower/model.json --cube "$A" --job J163 --out "$D/report/confirmation"
python3 var/lab-j163-local/bin/modeltest.py --model var/lab-j163-local/model-v2/model.json --model var/lab-j163-local/model-v2-nopower/model.json --model var/lab-j163-local/model-v1-nopower/model.json "${M[@]}" --reference "$A@J163=$D/$A/out/balance.json" --reference "$A@J160=$J160/$A.balance.json" --v1-ref "$J160/model-test.json" --sims 4000 --seed 163 --job J163 --out "$D/report/model-test"
cp var/lab-j163-local/model-v2/model.json "$D/report/model-v2.json"
cp var/lab-j163-local/model-v2/summary.md "$D/report/model-v2-summary.md"
cp var/lab-j163-local/model-v2-nopower/model.json "$D/report/model-v2-nopower.json"
cp var/lab-j163-local/model-v1-nopower/model.json "$D/report/model-v1-nopower.json"
cp var/lab-j163-local/regen.json "$D/report/regen.json"
cp var/lab-j163-local/parse.json "$D/report/parse.json"
python3 var/lab-j163-local/bin/status.py > "$D/report/counts.json"
head -12 "$D/report/confirmation.md"
head -40 "$D/report/model-test.md"
# disarm the abort gate: a re-post of this file starts disarmed until its own pilot
rm -f var/lab-j163-local/armed.txt
```
check: st.expected == 6
check: st.cubes == st.expected
check: runs.drafts == st.expectedDrafts
check: st.drafts == st.expectedDrafts and st.shortDrafts == 0
check: st.shortDecks == 0
check: st.unknown + st.notInCube == 0
check: played == st.planned
check: st.shortGames == 0
check: engine_errors <= 0.01 * played
check: timeouts <= 0.02 * played
check: st.arms == st.expected
check: st.problems == 0
check: st.balStrict == st.expected and st.minVerdict >= 0 and st.shortJudged == 0
check: cfstrict == 1 and cf.code >= 0
check: mtstrict == 1
check: mt.code == 1 and mt.nMeasured == 5 and mt.nTested == 5

What the checks mean: every cube at the pin was drafted as many times as `cubes.tsv` says (6,000 for (a), 2,000 for
each v2 cube; `runs.drafts` and `played` now see the cube folders only, so the pilot's 20 drafts and 40 games
cannot enter them as they did J160's) and every planned game played (engine errors at most 1%, timeouts at most
2%), every cube with at least 99.5% of its decks and 99% of its games, every deck profiled from known cube cards,
every recorded game checked clean, each cube's read wrote strict JSON with a colour verdict over at least 75% of its
games judged, (a)'s confirmation wrote a verdict (CONFIRMED CANDIDATE or NOT CONFIRMED; INCOMPLETE fails), and the
model test wrote strict JSON with all five v2 cubes measured and predicted and v1's J160 reference read. No check
is on a payoff, a gap, an RMSE, a coverage, a label, the confirmation's answer or which cube is a candidate.

## Abort if
abort: qwriters > 0
abort: armed == 1 and played >= 500 and engine_errors > 0.02 * played
abort: armed == 1 and played >= 500 and timeouts > 0.05 * played
abort: data_free_gb < 50

`armed` is 1 only from this job's pilot to its last Commands block, so the two lines on the games' files cannot fire
on another run's files (the J152 lesson); `lab-j163` was also created empty before posting, and its games glob
(`balanced-*`) never reads the pilot's folder. `qwriters` (a queue night beside it) and `data_free_gb` (the data
folder's free space) are the machine's, as in J159 and J160.

## Report
collect: /home/justin-a/code/lab/data/lab-j163/report/*
collect: var/lab-j163-local/selftest/selftest-balance.json

`report/` holds `confirmation.json` / `.md` ((a)'s verdict), `model-test.json` / `.md` (the reads (i)-(iv)),
`model-v2.json`, `model-v2-nopower.json` and `model-v1-nopower.json` (the predictions of record), `model-v2-
summary.md`, `regen.json`, `parse.json`, `counts.json`, and per cube `<cube>.balance.json`, `.balance.md`,
`.drafted-decks.jsonl.gz`, `.games.jsonl.gz`, `.census-play.json` and `.profile.json`; no two collected files share
a basename. The runner collects only after the final checks pass (J160's collected nothing for that reason): on a
FAIL, the main session copies `report/` beside the summary by hand. A `.games.jsonl.gz` over 5 MB is skipped by
`collect` (J160's were ~110 KB at 4,000 games; (a)'s ~330 KB) and stays in the data folder.

summary.md is the PC session's. Its FIRST LINE is the Forge-pilot caveat (every game is Forge's Default AI on both
seats and every deck the lab drafter's; the models predict exactly that and nothing about people). Then, in this
order:
- **(a) The confirmation, first** (`confirmation.md`): CONFIRMED CANDIDATE or NOT CONFIRMED, on this night alone,
  with the cells that decided it (colours not EVEN, the qualifying pairs -- at 3x every pair with 400+ deck-games,
  about all ten -- and which are OFF or not EVEN); the v2 PASS and the swap rule's BALANCED bar beside it, deciding
  nothing; J160's cells as the unpooled reference row with each change and its z, and the labels that moved; v1's
  prediction beside both. Say what follows by the loop, without doing it: a CONFIRMED CANDIDATE goes to Justin
  with the two bars (question 3); NOT CONFIRMED ends this cube's run as a candidate, and the cell that failed is
  the model's next question.
- **(b)-(c) The model test** (`model-test.md`): (i) v2's pooled RMSE against v1's on J160, SMALLER or NOT SMALLER
  for colours and pairs, with the per-cube rows, the transfer SD against v2's .021 / .030, and v2's own
  expectations (.028 / .042 a new night; .022 / .036 a new cube); (ii) coverage against its expectation and the
  widened share's HONEST / TOO NARROW / TOO WIDE, with the cells outside named; (iii) the selection bias per cube,
  the noise-only and with-transfer expectations, and whether each measured objective sits inside v2's with-transfer
  gap interval; (iv) the candidates and the v2 PASS. Name, as J160's summary did, what the model still gets wrong,
  cell by cell, and whether J160's misses (blue with power, WU and UG over, red and black under) repeat.
- **Per cube**, in `cubes.tsv`'s order: the colour level, each colour's payoff with interval, n and label, the
  pairs with deck-games and labels, the qualifying pairs named; the predicted table beside it.
- **Pull**, per cube, reported and never judged: the two-colour shares and the k counts, beside the three-colour
  share v2 predicted from its simulated drafts (model-v2.json `cubes[].record.mix`).
- **The power effect** per v2 family (reported, not read), beside J160's.
- **Every other difference is a candidate** (D447 point 9).
- **The run**: drafts and games an hour per cube, (a) against its own J160 rate, the mid cubes' stalls against
  J160's (Scute Swarm and the rest are in both v2 mid cubes), engine errors, timeouts, the peak worker RSS against 3
  GB, the storage against ~2.5-3 GB, against J160's 3 h 0 min for 20,000 games.
