id: J098
title: The lab's card strengths against human results (D396): J062's M0 power and the Vintage meta win rates against 17Lands' Powered Cube GIH WR, by Spearman with a bootstrap interval, the biggest disagreements and colour groups; no Forge
public_title: Card ratings vs human results
public_est: ~20 min
cpu: heavy
cores: 1
after: J075
repos: mtg-table@fd1c91d (main with tools/ml/cards17l.py, D396)
decides: whether the lab's card ratings may be presented to a human drafter (ForgeCoach's deck assistant) as more than "strength in Forge's hands", and which of M0 power and the per-cube meta win rate is the better guide
hypothesis: the lab's M0 card power ranks the Vintage cube's cards only weakly like human GIH WR (Forge is the only pilot), and Forge rates aggressive cards (red, cheap creatures) above where humans do
rule: D396 CARDS_RULE (cards17l.py), written before any real data was compared: on nonland Vintage-cube cards with >= 500 human GIH games (PremierDraft, AI-limited cards out), Spearman(power, GIH WR) with a 2,000-resample bootstrap over cards: AGREES when rho >= 0.5 and the 95% interval's lower end > 0.3, WEAK when the lower end > 0 but not that, NONE otherwise; Forge OVERRATES (UNDERRATES) a group when mean z(lab) - z(human) has a 95% interval above (below) 0, read for the pre-registered groups red and cheap creatures (mana value <= 2); everything else (meta win rate, GP WR, IWD, other colours, TradDraft pooled) is reported without a verdict
est: ~5 min of downloads (30 MB: the game data, PremierDraft 26.9 MB and TradDraft 2.9 MB), ~1 min to count PremierDraft's 266k games, seconds to compare
resumable: no
max_workers: 1
mem_per_worker_gb: 1
timeout: 2h
clean: var/ml/cards17l
metrics: power_ok = sh: grep -m1 -v '^#' var/ml/matchup/nights-1-2/power.tsv | grep -q $'^name\t.*\tsdPost\t' && echo 1 || echo 0
metrics: meta_ok = sh: python3 -c "import json; d=json.load(open('var/cubelab/meta-regen/out/vintage-cube-180.meta.json')); print(1 if len(d.get('cards') or {}) >= 150 else 0)" 2>/dev/null || echo 0
metrics: pst = sh: python3 -c "import json; d=json.load(open('var/ml/cards17l/pilot/premier.json')); print(json.dumps({'written': 1, 'games': d['games'], 'partial': 1 if d['partial'] else 0, 'cards': len(d['cards'])}))" 2>/dev/null || echo '{"written":0}'
metrics: pc = sh: python3 tools/ml/cards17l.py metrics var/ml/cards17l/pilot/report.json
metrics: st = sh: python3 -c "import json; d=json.load(open('var/ml/cards17l/premier.json')); print(json.dumps({'written': 1, 'games': d['games'], 'partial': 1 if d['partial'] else 0, 'cards': len(d['cards']), 'bad': d['badRows']}))" 2>/dev/null || echo '{"written":0}'
metrics: p = sh: python3 tools/ml/cards17l.py metrics var/ml/cards17l/report-premier.json
metrics: pooled = sh: python3 tools/ml/cards17l.py metrics var/ml/cards17l/report-pooled.json
headline: p.compared, p.nonland, p.rho, p.lo, p.hi, p.reading, p.R_mean, p.cheapCreature_mean

The outside review's T3. Every card rating the lab makes is "this card in Forge's hands against Forge":
J062's M0 power (which allocates the queue) and the per-cube meta win rates (which ForgeCoach's deck
assistant reads). This job measures whether they rank cards the way humans' results do. 17Lands publishes
Arena's Powered Cube games. J063 used its **replay** files. This job reads the same release's **game
data**: one row per game, with every card's opening-hand, drawn, tutored and deck counts, from which GIH WR
and IWD are computed as 17Lands computes them.

**Data credit: 17Lands** public datasets, https://www.17lands.com/public_datasets, CC BY 4.0
(https://creativecommons.org/licenses/by/4.0/). Only the published files are downloaded, never the API.
They stay under `var/ml/17lands/` (J063's folder, whose `cards.csv` is reused) and are never committed or
collected. Only derived numbers are collected.

**Lab side.**
- `var/ml/matchup/nights-1-2/power.tsv`: J062's M0, the same file J096 allocates with. Its 8 AI-limited
  Vintage cards (D343) are left out.
- The Vintage meta that J075 regenerated, `var/cubelab/meta-regen/out/vintage-cube-180.meta.json`
  (`winRateShrunk`), when it is there. It is reported without a verdict.

**Disclosure.** The cloud session ran this code once on the public PremierDraft file and pc-results'
`results/J062/power.tsv`, after the rule was in the code and before this job was posted. Its numbers are
given below, so the PC run is a reproduction on the PC's own files, not a blind test. The rule was not
changed after that run.

That run's numbers:
- 266,117 games; 147 cards compared, 126 nonland;
- nonland Spearman(power, GIH WR) 0.29 [0.14, 0.44]: WEAK;
- ForgeCoach's shipped meta win rate against GIH WR: 0.50 [0.37, 0.63];
- human split-half ceiling 0.94;
- red z(lab) − z(human) −0.74 [−1.00, −0.46], so the lab rates red BELOW humans;
- cheap creatures −0.35 [−0.75, +0.05].

## Pilot
About 1 minute: the tests, the inputs, and the whole pipeline on a range read of the first 3 MB of the
PremierDraft file (about 29,500 games, measured), which `stats` must mark partial.
```bash
python3 -m unittest tools/ml/tests/test_cards17l.py
P=var/ml/cards17l/pilot; mkdir -p "$P"
python3 tools/ml/cards17l.py fetch --set powered-premier --dir "$P" --max-bytes 3000000
python3 tools/ml/cards17l.py stats "$P/game_data_public.Cube_-_Powered.PremierDraft.csv.gz" --out "$P/premier.json"
python3 tools/ml/cards17l.py compare --stats "$P/premier.json" --power var/ml/matchup/nights-1-2/power.tsv \
    --cube cubes/vintage-cube-180.md --cards "$P/cards.csv" --report "$P/report.json" | head -12
```
check: power_ok == 1
check: pst.written == 1 and pst.partial == 1 and pst.games >= 5000 and pst.cards >= 500
check: pc.written == 1 and pc.cube == 180 and pc.withPower >= 170 and pc.in17Lands >= 140 and pc.ruleChanged == 0

A range read is never the result: the pilot only proves that the download, the reader and the join work
on this machine. In the cloud run the range read compared 112 cards, against 147 for the whole file.

## Commands
```bash
D=var/ml/17lands; O=var/ml/cards17l; mkdir -p "$D" "$O"
python3 tools/ml/cards17l.py fetch --set powered-premier --dir "$D"
python3 tools/ml/cards17l.py fetch --set powered-trad --dir "$D"
python3 tools/ml/cards17l.py stats "$D/game_data_public.Cube_-_Powered.PremierDraft.csv.gz" --out "$O/premier.json"
python3 tools/ml/cards17l.py stats "$D/game_data_public.Cube_-_Powered.TradDraft.csv.gz" --out "$O/trad.json"
sha256sum "$D/game_data_public.Cube_-_Powered.PremierDraft.csv.gz" "$D/game_data_public.Cube_-_Powered.TradDraft.csv.gz" \
    "$D/cards.csv" var/ml/matchup/nights-1-2/power.tsv > "$O/inputs.sha256"
META=""
M=var/cubelab/meta-regen/out/vintage-cube-180.meta.json
if [ -s "$M" ]; then META="--meta $M"; sha256sum "$M" >> "$O/inputs.sha256"; fi
# the rule's reading: PremierDraft
python3 tools/ml/cards17l.py compare --stats "$O/premier.json" --power var/ml/matchup/nights-1-2/power.tsv \
    --cube cubes/vintage-cube-180.md --cards "$D/cards.csv" $META --report "$O/report-premier.json" | tee "$O/report-premier.txt"
# descriptive: PremierDraft and TradDraft pooled
python3 tools/ml/cards17l.py compare --stats "$O/premier.json" --stats "$O/trad.json" --power var/ml/matchup/nights-1-2/power.tsv \
    --cube cubes/vintage-cube-180.md --cards "$D/cards.csv" $META --report "$O/report-pooled.json" | tee "$O/report-pooled.txt"
```
check: st.written == 1 and st.partial == 0 and st.games >= 250000 and st.bad == 0
check: p.written == 1 and p.partial == 0 and p.ruleChanged == 0
check: p.compared >= 100 and p.nonland >= 80
check: pooled.written == 1

`p.reading` (2 AGREES, 1 WEAK, 0 NONE) and the group means are findings, not checks. A NONE is a result,
and the job ends `done` either way. `meta_ok` says whether the meta comparison is in the report.

## Abort if
abort: elapsed_s > 5400

## Report
collect: var/ml/cards17l/report-premier.txt
collect: var/ml/cards17l/report-premier.json
collect: var/ml/cards17l/report-pooled.txt
collect: var/ml/cards17l/inputs.sha256

summary.md, plainly, with the credit line "Human games: 17Lands public datasets, CC BY 4.0" at the top:
- the overlap: cube cards, with lab power, AI-limited left out, in 17Lands, compared (all and nonland),
  with meta;
- the reading line (AGREES / WEAK / NONE) with nonland Spearman(power, GIH WR) and its interval; the
  same for all cards, and against GP WR, OH WR and IWD;
- the meta win rate against GIH WR, and power against meta, with intervals (or "no meta file");
- the human split-half reliability (the ceiling) beside the lab's rho;
- the 15 cards the lab rates furthest above humans and the 15 furthest below (name, colour, power, GIH
  WR and games, both percentiles);
- the colour table: each group's n and mean z(lab) − z(human) with its interval; the verdicts for red and
  cheap creatures (the pre-registered groups); the rest without verdicts;
- the pooled PremierDraft + TradDraft reading in one line (descriptive);
- whether the PC's numbers match the cloud preview above (same power file, so they should match to the
  last digit, except the meta lines if the PC's meta differs from ForgeCoach's shipped one).
Caveats, one line each:
- 17Lands users are an engaged population (about 54.5% wins);
- their cube shares 152 of our 180 cards;
- GIH WR carries each colour's strength in that metagame;
- the interval resamples cards, not games.
