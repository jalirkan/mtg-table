id: J140
title: The deck census, night 1 -- per power band (pauper, peasant, legacy, powered) 2,500 40-card decks drawn straight from the band's pool at random colour makeups (cubelab.sh decks, D447: k colours uniform on 1-5, flat Dirichlet shares, cards uniform within the shares, one land formula, every spell castable, a 10% cross-band slice inside each deck; deck seeds 1401-1404), each deck in exactly 16 Bo1 games against random decks of its band (census-play, 20,000 games a band, 80,000 in all; game seeds S x 1,000,000 + g), Default vs Default, numbers only; the win rate across the colour spectrum and per-card rows reported, no verdict
public_title: Library deck census night 1: random decks across the colour spectrum
public_est: ~7-9 h
public_decides: None by itself: the first deck census data, for Justin to read
cpu: heavy
cores: 7
pilot_cores: 3
max_workers: 7
mem_per_worker_gb: 2
after: J136
repos: mtg-table@bf88d0f1 (the head of branch pc/deck-census, mtg-table PR #154, D447; RE-PIN to the commit on origin/main that merges #154 before posting: the pilot fails on merged == 1 until then)
decides: nothing by itself. It is the census's first data: how win rate moves across the colour spectrum in each band, and each card's rate in context, for Justin to read and for Phase 3's model to learn from. Any surprise is a candidate until it holds on fresh seeds (D447 point 9)
hypothesis: none to confirm, and none is tested. Read the Forge pilot's known bias first: it plays aggro well and control poorly. Uniform draws with no curve rule give clunky decks, more so in legacy, whose pool's mean mana value is high (most legacy decks land on 18 lands), so the band rates are rates of random decks as Forge plays them, not of built decks. Within a band every decisive game is one win and one loss, so the band's own rate is 0.5 by construction and the bins are read against it
rule: D447, written 2026-10-16 before any census game. The prior, the draw, the land formula, castability, the bands, the pairing and the read are the decision's points 1-8. There is no verdict rule and no label beyond the bins. Point 9 is the confirmation rule: any difference reported (a bin, a card, a combination) is a candidate until it holds on a fresh deck seed and a fresh game seed under the same method, read on the same interval
followup: morning-read
est: ~7 h at the engine smoke's CPU cost (2.2 CPU-seconds a game: about 11,400 games an hour on 7 cores), ~9.2 h at its loaded rate (2,472 games an hour on 2 workers beside J136's 7, so 1,236 a worker); plus ~10 min of pilot and ~2 min to read. 80,000 games is sized to that: one night
resumable: yes
timeout: 11h
clean: var/lab-j140 var/cubelab/homes-J140
progress: lines var/lab-j140/games/pauper/games.jsonl var/lab-j140/games/peasant/games.jsonl var/lab-j140/games/legacy/games.jsonl var/lab-j140/games/powered/games.jsonl of 80000
metrics: qwriters = sh: pgrep -fc '[c]ubelab.* queue run' || true
metrics: played = lines var/lab-j140/games/pauper/games.jsonl var/lab-j140/games/peasant/games.jsonl var/lab-j140/games/legacy/games.jsonl var/lab-j140/games/powered/games.jsonl
metrics: engine_errors = count var/lab-j140/games/pauper/games.jsonl var/lab-j140/games/peasant/games.jsonl var/lab-j140/games/legacy/games.jsonl var/lab-j140/games/powered/games.jsonl "\"engineError\":\""
metrics: timeouts = count var/lab-j140/games/pauper/games.jsonl var/lab-j140/games/peasant/games.jsonl var/lab-j140/games/legacy/games.jsonl var/lab-j140/games/powered/games.jsonl "\"timeout\":true"
metrics: gpa = sh: cat var/lab-j140/games/pauper/census-play.json 2>/dev/null || echo '{"games":0}'
metrics: gpe = sh: cat var/lab-j140/games/peasant/census-play.json 2>/dev/null || echo '{"games":0}'
metrics: gle = sh: cat var/lab-j140/games/legacy/census-play.json 2>/dev/null || echo '{"games":0}'
metrics: gpo = sh: cat var/lab-j140/games/powered/census-play.json 2>/dev/null || echo '{"games":0}'
metrics: sp = sh: cat var/lab-j140/out/spectrum.json 2>/dev/null || echo '{"games":0}'
metrics: strict = sh: python3 -c "import json,sys; json.load(open('var/lab-j140/out/spectrum.json'), parse_constant=lambda c: sys.exit(1)); print(1)" 2>/dev/null || echo 0
metrics: cards = sh: test -s var/lab-j140/out/cards.tsv && echo $(($(wc -l < var/lab-j140/out/cards.tsv) - 1)) || echo 0
metrics: gz = sh: test -s var/lab-j140/out/census-games.jsonl.gz && gzip -dc var/lab-j140/out/census-games.jsonl.gz | wc -l || echo 0
headline: played, engine_errors, sp.bands.pauper.byColours.1.wr, sp.bands.peasant.byColours.1.wr, sp.bands.legacy.byColours.1.wr, sp.bands.powered.byColours.1.wr, cards

**Why (Justin, 2026-10-17 01:30, `pc-results/HEARTBEAT.md`).** The census is there to learn how the cards
play with each other, so that better decks and cubes can be built. Hand-written shapes, lean rules and land
tables are biases with no truth about the game in them. The drafter is a middleman that decides which decks
exist before a game is played (J133: 100% two-main-colour decks). He asked why the lab was not simply
building data. So the old J140 (drafted shapes, D446, PR #153) is withdrawn unposted, and this job is the
deck census instead. Decks come straight from each band's pool at random colour makeups over the whole
spectrum. "Mono", "two-colour" and "mostly red with a little white" are read off the realised profiles
afterwards, never enforced.

**The method** (D447, `docs/decisions/D447-deck-census.md`, written before any census game):

| | rule |
|---|---|
| prior | k colours uniform on 1-5; a uniform k-subset of WUBRG; shares a flat Dirichlet(1, ..., 1), so a two-colour makeup's main share is uniform on [0.5, 1] |
| draw | 25 spells without replacement. A card is eligible when every printed colour is a makeup colour and every cost symbol can be paid. A draw is colourless at the band pool's own colourless share (pauper 8.4%, peasant 10.3%, legacy 11.4%, powered with legacy 12.9%), else a colour by the shares and a uniform eligible card of it. 10% of draws are cross-band, from the neighbouring bands. No rating, no curve |
| lands | L = clamp(17 + round(2 x (m - 3)), 15, 18), m the mean mana value of the first 23 spells drawn; the deck keeps the first 40 - L spells. F = min(supply, round(L x (1 - s_max))) fixers making 2+ of the pip colours, uniform, band then FILL. The rest are basics: each colour first gets the sources its most demanding spell needs, then the rest go by pip share |
| castability | every spell castable from the deck's own lands, or the deck is redrawn and the rejection counted |
| bands | census.tsv's (D445), exclusive; powered (37 eligible cards) is one pool with legacy (about 1.5 powered cards a deck), its cross slice from peasant |
| pairing | within a band; consecutive pairs of seeded permutations, so with 2,500 decks and 20,000 games each deck plays exactly 16; game g's seed is S x 1,000,000 + g and fixes the first player |
| games | Bo1, Forge's Default AI on both sides (`plain`), numbers only, no recordings |

**Sizes.** Per band, 2,500 decks x 16 games / 2 = 20,000 games; 80,000 in all. The 10% cross-band slice
sits inside each deck (about 2.2 of its spells, from the neighbouring bands), so it costs no games. A card
of a band is in roughly 23 / (its colour list) of the decks whose makeup admits it: a few hundred decks,
thousands of deck-games each. The engine smoke (D447) played 200 legacy games on 2 workers beside J136 at
2,472 games an hour, with no engine error. Its CPU cost, about 2.2 s a game, gives about 11,400 games an
hour on 7 cores, so ~7 h; the loaded rate gives ~9.2 h.

**Outputs** (`var/lab-j140/out/`):
- `census-games.jsonl.gz`: every game row of the four bands. Each row holds both deck ids, the seed, the
  pilots, the winner, the first player, turns, ms, timeout and errors.
- `census-decks.jsonl.gz`: the four bands' `decks.jsonl`, with every deck's 40 cards and realised profile.
  The game rows name decks by id, so this is the other half of the data.
- `spectrum.json` and `spectrum.md`: per band, the win rate by colours with 3+ spells, by the prior's k and
  by main-colour pip share, with deck-clustered bootstrap intervals.
- `cards.tsv`: one row per band and card, with its rate when in the deck, shrunk, and the deck-profile
  context.
- `counts.json`: the four decks.json manifests and the four census-play tallies.

Never `summary.md` or `metrics.json`: those names are the runner's and the PC session's.

**Not beside a queue night.** It aborts if a `queue run` starts. `census-play` resumes: run again, it skips
every game in `games.jsonl` and refuses other options. `decks` is deterministic, so a stop costs only the
games in flight. To stop it cleanly: `tools/runner.sh stop J140` (and `resume` carries on).

## Pilot
About 10 minutes. It checks that the pin is merged and holds the deck census, then runs its tests and the
census tests on this pin. It then draws the four bands' 2,500 decks (the run's own decks: no engine,
deterministic) and checks their counts. Finally it plays 12 games a band on the pilot's own game seeds
(1491-1494, into `var/lab-j140/pilot/`) and reads them.
```bash
mkdir -p var/lab-j140
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/lab-j140/merged.txt || echo 0 > var/lab-j140/merged.txt
grep -q "case 'census-play'" tools/cubelab/cli.ts && grep -q 'export function pairingOf' tools/cubelab/censusplay.ts && grep -q 'export function landPlan' tools/cubelab/deckcensus.ts && echo 1 > var/lab-j140/has-census.txt || echo 0 > var/lab-j140/has-census.txt
cat var/lab-j140/merged.txt var/lab-j140/has-census.txt
node --test web/test/cubelab-deck-census.test.ts web/test/cubelab-census.test.ts
# the run's decks: 2,500 a band, deck seeds 1401-1404, the 10% cross-band slice (deterministic: the commands block reuses them)
K=1
for B in pauper peasant legacy powered; do
  tools/cubelab.sh decks --band "$B" --count 2500 --seed $((1400 + K)) --cross-band 0.10 --out "var/lab-j140/decks/$B"
  K=$((K + 1))
done
```
metrics: merged = sh: cat var/lab-j140/merged.txt 2>/dev/null || echo 0
metrics: has_census = sh: cat var/lab-j140/has-census.txt 2>/dev/null || echo 0
metrics: dpa = sh: cat var/lab-j140/decks/pauper/decks.json 2>/dev/null || echo '{"count":0}'
metrics: dpe = sh: cat var/lab-j140/decks/peasant/decks.json 2>/dev/null || echo '{"count":0}'
metrics: dle = sh: cat var/lab-j140/decks/legacy/decks.json 2>/dev/null || echo '{"count":0}'
metrics: dpo = sh: cat var/lab-j140/decks/powered/decks.json 2>/dev/null || echo '{"count":0}'
cores: 3
```bash
export CUBELAB_HOME_ROOT=var/cubelab/homes-J140
K=1
for B in pauper peasant legacy powered; do
  tools/cubelab.sh census-play --decks "var/lab-j140/decks/$B" --pairs 12 --seed $((1490 + K)) --jobs {workers} --out "var/lab-j140/pilot/$B"
  K=$((K + 1))
done
tools/cubelab.sh census-read --games var/lab-j140/pilot/pauper --games var/lab-j140/pilot/peasant --games var/lab-j140/pilot/legacy --games var/lab-j140/pilot/powered \
    --decks var/lab-j140/decks/pauper --decks var/lab-j140/decks/peasant --decks var/lab-j140/decks/legacy --decks var/lab-j140/decks/powered \
    --boot 200 --out var/lab-j140/pilot/out
head -30 var/lab-j140/pilot/out/spectrum.md
```
metrics: ppa = sh: cat var/lab-j140/pilot/pauper/census-play.json 2>/dev/null || echo '{"games":0}'
metrics: ppe = sh: cat var/lab-j140/pilot/peasant/census-play.json 2>/dev/null || echo '{"games":0}'
metrics: ple = sh: cat var/lab-j140/pilot/legacy/census-play.json 2>/dev/null || echo '{"games":0}'
metrics: ppo = sh: cat var/lab-j140/pilot/powered/census-play.json 2>/dev/null || echo '{"games":0}'
metrics: psp = sh: cat var/lab-j140/pilot/out/spectrum.json 2>/dev/null || echo '{"games":0}'
metrics: pstrict = sh: python3 -c "import json,sys; json.load(open('var/lab-j140/pilot/out/spectrum.json'), parse_constant=lambda c: sys.exit(1)); print(1)" 2>/dev/null || echo 0
check: merged == 1
check: has_census == 1
check: qwriters == 0
check: dpa.count == 2500
check: dpe.count == 2500
check: dle.count == 2500
check: dpo.count == 2500
check: dpa.decksOf40 == 2500
check: dpe.decksOf40 == 2500
check: dle.decksOf40 == 2500
check: dpo.decksOf40 == 2500
check: dpa.decksAllCastable == 2500
check: dpe.decksAllCastable == 2500
check: dle.decksAllCastable == 2500
check: dpo.decksAllCastable == 2500
check: dpa.makeupK.k1 >= 425 and dpa.makeupK.k1 <= 575 and dpa.makeupK.k5 >= 425 and dpa.makeupK.k5 <= 575
check: dpe.makeupK.k1 >= 425 and dpe.makeupK.k1 <= 575 and dpe.makeupK.k5 >= 425 and dpe.makeupK.k5 <= 575
check: dle.makeupK.k1 >= 425 and dle.makeupK.k1 <= 575 and dle.makeupK.k5 >= 425 and dle.makeupK.k5 <= 575
check: dpo.makeupK.k1 >= 425 and dpo.makeupK.k1 <= 575 and dpo.makeupK.k5 >= 425 and dpo.makeupK.k5 <= 575
check: dpa.makeupK.k2 >= 425 and dpa.makeupK.k3 >= 425 and dpa.makeupK.k4 >= 425
check: dpe.makeupK.k2 >= 425 and dpe.makeupK.k3 >= 425 and dpe.makeupK.k4 >= 425
check: dle.makeupK.k2 >= 425 and dle.makeupK.k3 >= 425 and dle.makeupK.k4 >= 425
check: dpo.makeupK.k2 >= 425 and dpo.makeupK.k3 >= 425 and dpo.makeupK.k4 >= 425
check: dpa.mainShare.lt40 >= 25 and dpa.mainShare.s90_100 >= 25 and dpa.mainShare.eq100 >= 250
check: dpe.mainShare.lt40 >= 25 and dpe.mainShare.s90_100 >= 25 and dpe.mainShare.eq100 >= 250
check: dle.mainShare.lt40 >= 25 and dle.mainShare.s90_100 >= 25 and dle.mainShare.eq100 >= 250
check: dpo.mainShare.lt40 >= 25 and dpo.mainShare.s90_100 >= 25 and dpo.mainShare.eq100 >= 250
check: dpa.coloursWith3.c5 >= 25 and dpe.coloursWith3.c5 >= 25 and dle.coloursWith3.c5 >= 25 and dpo.coloursWith3.c5 >= 25
check: dpa.meanCross >= 1.8 and dpa.meanCross <= 2.8 and dle.meanCross >= 1.8 and dle.meanCross <= 2.8
check: ppa.games == 12
check: ppe.games == 12
check: ple.games == 12
check: ppo.games == 12
check: ppa.engineErrors + ppe.engineErrors + ple.engineErrors + ppo.engineErrors <= 1
check: pstrict == 1
check: psp.games == 48
check: psp.decks == 10000

The pilot asks whether anything is broken:
- **The pin and the tests.** The pin is on origin/main and holds the deck census, and the tests pass on it.
- **The decks.** All 10,000 are 40 cards with every spell castable. The prior's coverage holds in every
  band:
  - every k is near a fifth (425-575 of 2,500);
  - the main-share extremes (< 0.4, 0.9-< 1.0) are reached and about a fifth of the decks are mono;
  - five-colour decks with 3+ spells in each colour exist;
  - the cross-band slice is near 10% of the spells.
- **The games.** 12 games a band played with at most one engine error, and `census-read` wrote strict JSON
  over all 10,000 decks.

No win rate is checked: the job is the measurement.

Dry run (2026-10-16): `tools/runner.sh dry-run --max-seconds 120 --workers 2 --no-build` in the user and
mount namespace sandbox, against the PR worktree at bf88d0f1, beside the running J136.
- pilot1 ok in 24 s: the tests pass, and the 10,000 decks are 40 cards and castable. k is 466-559 a band;
  mono decks are 493-567 a band, < 0.4 main share 321-426, five colours with 3+ spells each 56-142; the
  cross-band slice is 2.2-2.4 spells a deck.
- pilot2 ok in 101 s: 12 games a band, no engine error, strict JSON over 48 games and 10,000 decks.
- Every pilot check passed except `merged == 1`, which cannot pass before #154 merges.
- run1 was cut at 120 s with no error and had played 84 pauper games on 2 workers. run2 refused at once
  (pauper's `games.jsonl` held fewer than 20,000 lines), as a cut-short dry run must.
- `tools/runner.sh check`: lint clean, machine-checked.

## Commands
```bash
export CUBELAB_HOME_ROOT=var/cubelab/homes-J140
mkdir -p var/lab-j140/out
K=1
for B in pauper peasant legacy powered; do
  # the same decks as the pilot's (deterministic); census-play refuses decks whose sha256 moved
  test -s "var/lab-j140/decks/$B/decks.json" || tools/cubelab.sh decks --band "$B" --count 2500 --seed $((1400 + K)) --cross-band 0.10 --out "var/lab-j140/decks/$B"
  tools/cubelab.sh census-play --decks "var/lab-j140/decks/$B" --pairs 20000 --seed $((1400 + K)) --jobs {workers} --out "var/lab-j140/games/$B"
  K=$((K + 1))
done
```
cores: 1
```bash
for B in pauper peasant legacy powered; do test "$(wc -l < "var/lab-j140/games/$B/games.jsonl")" -eq 20000; done
tools/cubelab.sh census-read --games var/lab-j140/games/pauper --games var/lab-j140/games/peasant --games var/lab-j140/games/legacy --games var/lab-j140/games/powered \
    --decks var/lab-j140/decks/pauper --decks var/lab-j140/decks/peasant --decks var/lab-j140/decks/legacy --decks var/lab-j140/decks/powered \
    --boot 1000 --boot-seed 1 --out var/lab-j140/out
for B in pauper peasant legacy powered; do cat "var/lab-j140/games/$B/games.jsonl"; done | gzip -9 > var/lab-j140/out/census-games.jsonl.gz
for B in pauper peasant legacy powered; do cat "var/lab-j140/decks/$B/decks.jsonl"; done | gzip -9 > var/lab-j140/out/census-decks.jsonl.gz
python3 - <<'PY'
import json
doc = {}
for b in ['pauper', 'peasant', 'legacy', 'powered']:
    d = json.load(open(f'var/lab-j140/decks/{b}/decks.json'))
    d.pop('rules', None)
    doc[b] = {'decks': d, 'games': json.load(open(f'var/lab-j140/games/{b}/census-play.json'))}
json.dump(doc, open('var/lab-j140/out/counts.json', 'w'), indent=2)
print(json.dumps({b: {'decks': doc[b]['decks']['count'], 'rejections': doc[b]['decks']['rejections'], 'games': doc[b]['games']['games'], 'engineErrors': doc[b]['games']['engineErrors']} for b in doc}))
PY
head -80 var/lab-j140/out/spectrum.md
```
check: played == 80000
check: gz == 80000
check: strict == 1
check: sp.games == 80000
check: sp.decks == 10000
check: sp.bands.pauper.games == 20000
check: sp.bands.peasant.games == 20000
check: sp.bands.legacy.games == 20000
check: sp.bands.powered.games == 20000
check: sp.bands.pauper.decks == 2500
check: sp.bands.peasant.decks == 2500
check: sp.bands.legacy.decks == 2500
check: sp.bands.powered.decks == 2500
check: sp.bands.pauper.deckGamesMin >= 14
check: sp.bands.peasant.deckGamesMin >= 14
check: sp.bands.legacy.deckGamesMin >= 14
check: sp.bands.powered.deckGamesMin >= 14
check: gpa.engineErrorRate <= 0.01
check: gpe.engineErrorRate <= 0.01
check: gle.engineErrorRate <= 0.01
check: gpo.engineErrorRate <= 0.01
check: timeouts <= 0.02 * played
check: gpa.searchSeats + gpe.searchSeats + gle.searchSeats + gpo.searchSeats == 0
check: cards >= 1500

What the checks mean:
- Every planned game was played and is in the gzipped file.
- `census-read` wrote strict JSON over 80,000 games and 10,000 decks, 20,000 games and 2,500 decks a band.
- Every deck kept at least 14 of its 16 deck-games. Only an engine error removes one.
- Each band's engine error rate is at most 1%, and timeouts are at most 2% of games.
- No seat searched.
- At least 1,500 band-and-card rows were written. Rows are keyed by the deck's band, and powered's decks
  draw from powered and legacy together, so the four bands' pools come to over 2,000 rows before their
  cross-band appearances.

No check is on a win rate.

## Abort if
abort: qwriters > 0
abort: played >= 1000 and engine_errors > 0.02 * played
abort: played >= 1000 and timeouts > 0.05 * played
- Free disk under 10 GB (the games are about 25 MB uncompressed; the logs are the larger part).

## Report
collect: var/lab-j140/out/census-games.jsonl.gz
collect: var/lab-j140/out/census-decks.jsonl.gz
collect: var/lab-j140/out/spectrum.json
collect: var/lab-j140/out/spectrum.md
collect: var/lab-j140/out/cards.tsv
collect: var/lab-j140/out/counts.json

summary.md is the PC session's; the job's own outputs are the files above. It covers:
- **The pin, and the decks.** The deck seeds 1401-1404. Per band: the rejections and new makeups, the
  counts by k, by colours with 3+ spells and by main-share bin (`counts.json`), the mean cross-band spells a
  deck, the land counts.
- **The spectrum, per band.** The three tables from `spectrum.md`, in this order: colours with 3+ spells,
  main-colour share of pips, the prior's k. Give each cell's win rate with its deck-bootstrap interval
  (the interval to read; Wilson's is unclustered and too narrow) and its decks and deck-games. Also give
  the first player's rate.
- **No verdict.** Say plainly that within a band the rate is 0.5 by construction and a bin is read against
  it. Every rate is "as Forge's AI plays it", on uniformly drawn decks with no curve rule. Any difference
  is a candidate until it holds on fresh seeds (D447 point 9). Name no shape as better or worse.
- **The cards** (`cards.tsv`). Per band: the number of rows, the median deck-games a card, and how many
  rows have 500+ and 1,000+ deck-games. Do not list top or bottom cards: this is report-only data for the
  model, and J141's rule is written before they are read.
- **The run.** Engine errors, timeouts, the wall time, and the games an hour per band from
  `census-play.json`'s sessions. Compare that rate with the smoke's 2,472 on 2 workers and the ~11,400
  projected for 7, so the next night is sized on it.
