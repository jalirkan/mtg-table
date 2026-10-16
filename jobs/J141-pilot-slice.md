id: J141
title: The pilot slice -- search-v2 as the deck census's pilot: 2,000 of J140's games (500 a band, stratified by the two decks' colour counts, slice seed 1411) replayed with search-v2 on both sides (arm S, 2,000 games) and Forge against search-v2 with sides swapped (arm M, 4,000 games), census-play --replay, numbers only; five pre-registered reads (win rate by colour under each pilot, the card-flow coefficient under each, per-card ratings and their rank correlation, search's edge by deck profile, search's own counters), no verdict
public_title: Deck census pilot slice: Forge AI against search AI on the same games
public_est: ~7-8 h
public_decides: None by itself: Forge AI against search AI as the census pilot, for Justin
cpu: heavy
cores: 7
pilot_cores: 3
max_workers: 7
mem_per_worker_gb: 2
after: J140
repos: mtg-table@c69efe17 (the head of branch pc/deck-census, mtg-table PR #154, D447, after the #154 review's fixes: census-play's --replay and --policy-a/-b; RE-PIN to the commit on origin/main that merges #154 before posting, as J140: the pilot fails on merged == 1 until then)
decides: nothing by itself. It is exploration, asked by Justin: does Forge's AI, the census's pilot, undersell blue and card draw, and which cards move when search-v2 pilots the same decks in the same games. Any difference it shows is a candidate until it holds on a fresh slice (D447 point 9)
hypothesis: none to confirm, and none is tested. The Synergy v3 study (pc-results study/synergy-v3-design.md) found each of its 17 card-flow cards costs -2.9 points [-3.7, -2.1] of win share under Forge, colours held fixed, and that card flow accounts for all of blue's deficit there; the question is whether that is the cards or the pilot. Search-v2 is Forge's AI with a rollout search on top (it changed Forge's answer at 18% of searched decisions in J131), so it inherits Forge's play inside its rollouts and is not an independent pilot
rule: exploration; the method below (the slice, the arms, the five reads and their estimators) is pre-registered, written 2026-10-16 before any slice game. There is no outcome rule and no verdict. D447 point 9 applies: a difference reported here (a colour, a coefficient, a card) is a candidate until it holds on a fresh slice (a fresh slice seed over fresh census seeds), same method, read on the same interval
followup: morning-read
est: ~7.4 h on 7 workers (6.7-8.1 h). Sized from J131's measured search-v2: 772 ms a searched decision and 23 searched decisions a side a game on the ladder's decks; at the asked 25-30 a side, a search-vs-search game is ~2 x 27.5 x 0.772 s + ~3 s of engine = ~45 s and a Forge-vs-search game ~24 s; 2,000 x 45 + 4,000 x 24 = ~186,000 worker-seconds / 7 = 7.4 h. J131's own rate (1,200 search-vs-search games in ~2.7 h on 5 workers, ~40 worker-seconds a game) gives 6.7 h. Under 9 h, so the slice stays at 2,000 (the asked cut to 1,500 applies only over 9 h). At D447's smoke rate of 1.0-1.3 s a decision (9 JVMs on 8 cores, beside J136) it would be 9.4-11.8 h; J141 runs alone after J140. Plus ~15 min of pilot and ~1 min to read
resumable: yes
timeout: 12h
clean: var/lab-j141 var/cubelab/homes-J141
progress: lines var/lab-j141/games/ss/pauper/games.jsonl var/lab-j141/games/ps/pauper/games.jsonl var/lab-j141/games/sp/pauper/games.jsonl var/lab-j141/games/ss/peasant/games.jsonl var/lab-j141/games/ps/peasant/games.jsonl var/lab-j141/games/sp/peasant/games.jsonl var/lab-j141/games/ss/legacy/games.jsonl var/lab-j141/games/ps/legacy/games.jsonl var/lab-j141/games/sp/legacy/games.jsonl var/lab-j141/games/ss/powered/games.jsonl var/lab-j141/games/ps/powered/games.jsonl var/lab-j141/games/sp/powered/games.jsonl of 6000
metrics: qwriters = sh: pgrep -fc '[c]ubelab.* queue run' || true
metrics: played = lines var/lab-j141/games/ss/pauper/games.jsonl var/lab-j141/games/ps/pauper/games.jsonl var/lab-j141/games/sp/pauper/games.jsonl var/lab-j141/games/ss/peasant/games.jsonl var/lab-j141/games/ps/peasant/games.jsonl var/lab-j141/games/sp/peasant/games.jsonl var/lab-j141/games/ss/legacy/games.jsonl var/lab-j141/games/ps/legacy/games.jsonl var/lab-j141/games/sp/legacy/games.jsonl var/lab-j141/games/ss/powered/games.jsonl var/lab-j141/games/ps/powered/games.jsonl var/lab-j141/games/sp/powered/games.jsonl
metrics: engine_errors = count var/lab-j141/games/ss/pauper/games.jsonl var/lab-j141/games/ps/pauper/games.jsonl var/lab-j141/games/sp/pauper/games.jsonl var/lab-j141/games/ss/peasant/games.jsonl var/lab-j141/games/ps/peasant/games.jsonl var/lab-j141/games/sp/peasant/games.jsonl var/lab-j141/games/ss/legacy/games.jsonl var/lab-j141/games/ps/legacy/games.jsonl var/lab-j141/games/sp/legacy/games.jsonl var/lab-j141/games/ss/powered/games.jsonl var/lab-j141/games/ps/powered/games.jsonl var/lab-j141/games/sp/powered/games.jsonl "\"engineError\":\""
metrics: timeouts = count var/lab-j141/games/ss/pauper/games.jsonl var/lab-j141/games/ps/pauper/games.jsonl var/lab-j141/games/sp/pauper/games.jsonl var/lab-j141/games/ss/peasant/games.jsonl var/lab-j141/games/ps/peasant/games.jsonl var/lab-j141/games/sp/peasant/games.jsonl var/lab-j141/games/ss/legacy/games.jsonl var/lab-j141/games/ps/legacy/games.jsonl var/lab-j141/games/sp/legacy/games.jsonl var/lab-j141/games/ss/powered/games.jsonl var/lab-j141/games/ps/powered/games.jsonl var/lab-j141/games/sp/powered/games.jsonl "\"timeout\":true"
metrics: pj = sh: cat var/lab-j141/out/pilot.json 2>/dev/null || echo '{"games":0}'
metrics: strict = sh: python3 -c "import json,sys; json.load(open('var/lab-j141/out/pilot.json'), parse_constant=lambda c: sys.exit(1)); print(1)" 2>/dev/null || echo 0
metrics: cards = sh: test -s var/lab-j141/out/cards-by-pilot.tsv && echo $(($(wc -l < var/lab-j141/out/cards-by-pilot.tsv) - 1)) || echo 0
metrics: gzs = sh: test -s var/lab-j141/out/slice-games.jsonl.gz && gzip -dc var/lab-j141/out/slice-games.jsonl.gz | wc -l || echo 0
metrics: gzp = sh: test -s var/lab-j141/out/pilot-games.jsonl.gz && gzip -dc var/lab-j141/out/pilot-games.jsonl.gz | wc -l || echo 0
headline: played, engine_errors, pj.read1.byMainColour.U.diff.est, pj.read2.diff.beta, pj.read3.spearman.shrunk.rho, pj.read4.all.edge.est, pj.read5.ss.msPerDecision

**Why (Justin, 2026-10-16; `pc-results/HEARTBEAT.md`, "2026-10-17 04:10", the J141 line).** J140 plays the
census with Forge's Default AI on both sides, and Forge's AI is the census's lens: it plays aggro well and
control poorly, and in the Synergy v3 study every card-flow card cost about 2.9 points of win share. Justin
asked to see how search-v2 fares as the pilot: the same decks in the same games under search on both
sides, and Forge against search with the sides swapped, to learn whether Forge's AI undersells blue and
card draw, and which cards move. This is that look, on a slice, before anything is built on it.

**What it is not.** Search-v2 is not an independent player: it is Forge's AI with a rollout search over
priority, attack and block decisions, and its rollouts are played by Forge's AI. A card Forge plays badly
inside the rollouts is still played badly there. So a move between the pilots is a lower bound on how much
the pilot matters, not a measure of the cards' "true" value. The census's decks are random draws from a
band's pool (D447), weaker than built decks, so every rate here is "in a random deck of this makeup", as
J140's are.

**Inputs: J140's own files, in the lab's `var/`.** J140 collects `census-games.jsonl.gz` and
`census-decks.jsonl.gz` to `pc-results/results/J140/`, but not the `.dck` files that `census-play` plays
from, and jobs read their predecessors' outputs from `var/`, not from `pc-results`. The runner's lanes share one `var/` (a later `after:` job finds its
predecessor's outputs there), and J140 is resumable, so its `clean:` never runs once it is done. So J141
reads, from `var/lab-j140/`:
- `out/census-games.jsonl.gz`, the file J140 collects: all 80,000 game rows (the Forge-vs-Forge results);
- `decks/<band>/` (`decks.jsonl` and `decks/<id>.dck`), linked as `var/lab-j141/decks/<band>`.

If a band's deck folder is gone, the pilot draws it again with J140's own command (`cubelab.sh decks`, 2,500
decks, deck seed 1400 + k, `--cross-band 0.10`; deterministic, no engine). Either way the pilot requires
each band's `decks.jsonl` to be byte-identical to that band's lines in J140's `census-decks.jsonl.gz`, and
every slice deck's `.dck` to exist, or it stops (`inputs.json`).

## The method (pre-registered, 2026-10-16, before any slice game)

**The slice** (`slice.py` below; no engine):
- **Eligible:** a J140 game whose row has no engine error and no timeout. Draws stay eligible.
- **A deck's colour-count group,** from its realised profile (D447): L when it has 1 colour with 3+ spells
  (`coloursWith3` 0 or 1), M at 2-3, H at 4-5.
- **A game's stratum** is the unordered pair of its two decks' groups: LL, LM, LH, MM, MH, HH.
- **Quotas:** 500 games a band, split over the six strata in that order, 84, 84, 83, 83, 83, 83. A stratum
  with fewer eligible games gives what it has, and the shortfall goes one game at a time to the strata with
  games to spare, in the same order. J140's numbers make that unlikely: HH, the smallest, has about 400 games
  a band.
- **The draw:** within each stratum, the eligible games sorted by game number, then
  `random.Random('J141/slice/1411/<band>/<stratum>').sample(...)`. Python's string seeding is fixed across
  versions, so the slice is reproducible from J140's file alone.
- **The output** is the pairing list: each band's chosen J140 rows, byte for byte, in game order
  (`slice/<band>.jsonl`). `census-play --replay` reads its game numbers, seeds and deck ids, so each arm
  plays the same decks on the same sides with the same seed, which fixes the shuffles and the first player.
  The play diverges once a pilot decides differently.
- **The pilot's subset:** 5 slice games a band, `random.Random('J141/pilot/1411/<band>')`.

The stratification balances the deck-games over the three groups: about a third L, M and H, against
about 25% L, 55% M and 20% H in J140's decks. So mono and 4-5-colour decks are well represented. Every read is on the
slice as drawn, unweighted. All of them compare pilots on the same games, so the reweighting changes which
decks are compared, not the comparison.

**The arms,** each a `census-play --replay` of the whole slice, one folder per arm and band, all at
`--game-timeout 900` (a cap; a search-vs-search game is ~45 s):

| arm | side a | side b | games | the J140 row it is set against |
|---|---|---|---|---|
| FF (J140, not played again) | plain | plain | 2,000 | itself |
| S, `games/ss` | search | search | 2,000 | the same game |
| M1, `games/ps` | plain | search | 2,000 | the same game |
| M2, `games/sp` | search | plain | 2,000 | the same game |

`plain` is Forge's Default AI through `Bootstrap.createAiPlayer`, and `search` is the live search seat,
search-v2 at the 1.5 s budget (`SearchConfig.parseLive(null)`, D447 point 7). The runs go band by band,
S then M1 then M2 within each band, so the three arms of a band are played close in time, under the same
load. Nothing else heavy runs beside them (the job aborts if a queue night starts). The search's budget is
wall-clock time, so load changes how well it plays.

**The data.** A *deck-game* is one deck's side of one slice game: 4,000 of them. For deck D on side x of
slice game g, with opponent E, there are four results, each 1 for a win, 0 for a loss and missing when that
game was not decisive (a draw, a timeout or an engine error):
- `ff`: D wins in J140's game (Forge pilots both decks);
- `ss`: D wins in arm S (search pilots both);
- `ws`: D wins when search pilots D and Forge pilots E (M2 if x = a, M1 if x = b);
- `wf`: D wins when Forge pilots D and search pilots E (M1 if x = a, M2 if x = b).

**One bootstrap for every interval.** Every interval in reads 1-4 is a deck-clustered percentile bootstrap.
The slice's distinct decks are resampled with replacement, and each deck carries all its slice deck-games
in both pilots, so a difference between pilots is paired. There are 1,000 replicates. The weights are one
matrix, `numpy.random.default_rng(1411).multinomial(n_decks, uniform, 1000)`, shared by every estimator.
The interval is the 2.5% and 97.5% order statistics, as `census-read`'s. A mean over a mask is
Σ wᵢ vᵢ / Σ wᵢ, with a deck-game's weight its deck's count in the replicate. The two sides of one game are
not independent, and where both fall in the same bin their negative correlation makes deck clustering
conservative (too wide), never too narrow.

**Read 1 -- the blue question: win rate by colour under each pilot.** Each deck-game is binned by its
deck's realised profile on three axes:
- **main colour:** `profile.mainColour`, W/U/B/R/G, or none;
- **colours with 3+ spells:** `profile.coloursWith3`, 1-5;
- **has the colour:** `pipShare[c] > 0`, for each of WUBRG; a deck is in every colour it has.

Each bin reports three things:
- `ff` = mean of `ff` over the bin's deck-games where `ff` is defined (Forge's win rate);
- `ss` = the same for `ss` (search's win rate);
- `diff` = mean of `ss - ff` over the bin's deck-games where both are defined (paired).

Each has its interval, and each is also given per band for main colour. Within a band every decisive game
is one win and one loss under either pilot, so the overall rate is 0.5 in both and a bin is read against
it. The blue question is the `U` row's `diff`: blue's shift when search pilots both sides, with Forge's
rate beside it.

**Read 2 -- the card-flow coefficient under each pilot.**
- **Card flow** is the deck's `cardFlow`: since the #154 review (the cloud's answer 4), its count of
  card-flow cards by #153's oracle-text rule (`cardflow.ts`'s `isCardFlow`, D446 point 5, read off the card
  scripts: 40 library cards), which covers the Synergy v3 study's 17 (`CARD_FLOW_STUDY`, kept as D447's
  test of the rule). Read 3's `flow` group stays the study's 17 by name (`FLOW_STUDY` below).
- **Which bands enter.** J140's decks at c69efe17 put 1+ card-flow card in 64% of pauper's decks, 24% of
  peasant's, 11% of legacy's and 17% of powered's (mean 1.33 / 0.28 / 0.12 / 0.20 a deck). The
  coefficient comes from the bands where it varies: a band enters when 50 or more of its slice deck-games
  hold 1+ flow cards. With 1,000 slice deck-games a band, all four are likely to, and the read names the
  bands that entered. (The pilot's read lowers
  the 50 to 1 and the card floor of read 3 to 1, only to run every estimator once on 20 games.)
- **The model:** a linear probability model, fit by least squares on the decisive deck-games of the entered
  bands:

  `win ~ β · flow + Σ_band [ α_band + Σ_c γ_band,c · has_c(D) + Σ_c δ_band,c · has_c(E) ]`

  Here `has_c` is `pipShare[c] > 0` and c runs over WUBRG. These are "the deck's and its opponent's colours
  held fixed", as in the study. β × 100 is points of win rate per card-flow card.
- **Four estimates,** each a refit under the shared bootstrap weights (per-deck sufficient statistics,
  X'WX and X'Wy):
  - `ff`: β on the slice with `ff` as the outcome;
  - `ss`: the same with `ss`;
  - `diff`: `ss - ff` under the same replicate weights;
  - `censusFF`: the census-wide Forge reference, the same model on every decisive deck-game of J140 in the
    entered bands (40,000 for pauper), with its own deck bootstrap (`default_rng(1412)`).

  Also the win rate by flow bin (0, 1, 2, 3+) in the entered bands, under each pilot, with `diff`.
- **What the slice can resolve:** with about 1,000 pauper deck-games and a flow SD near 0.85, the slice's β
  has an SE of about 2 points, an interval near ±4 points. The slice can see a change in the flow
  coefficient only if it is larger than about 4 points a card. `censusFF` is about ±0.6. This is the
  slice's resolution, not a rule.

**Read 3 -- the cards.**
- **The ratings.** For each band and card (keyed by the deck's band as in `cards.tsv`; spells and fixers,
  basics left out), over the slice deck-games whose deck holds it, under each pilot P in {ff, ss}:
  `n_P` (decisive deck-games), `wins_P`, the rate `wins_P / n_P`, and the rating
  `(wins_P + 20 × 0.5) / (n_P + 20)`, census-read's shrinkage.
- **Included** when `min(n_ff, n_ss) >= 20`.
- **Spearman:** ρ between the two pilots' ratings over the included cards (average ranks for ties), on the
  ratings and on the raw rates. Its interval comes from the shared bootstrap, with every card's sums
  recomputed per replicate and the included set held fixed.
- **The swap reference:** the ρ two pilots that made no difference would give. Each slice game's `ff` and
  `ss` results are exchanged with probability ½ (`default_rng(1413)`) and ρ is recomputed, 200 times; the
  read reports the median and the 2.5%-97.5% range. A ρ well inside that range says the ratings move no
  more than the games' own noise; a ρ below it says the pilots order the cards differently.
- **The moves:** `move = rating_ss - rating_ff`. The read lists the 20 included cards with the largest
  move up and the 20 with the largest move down (ties by band, then name). Each has the paired difference
  of its raw rates, the mean of `ss - ff` over its deck-games decisive under both, with its interval.
- **By card colour:** the mean move by the card's colour identity (census.tsv: W, U, B, R, G, multicolour,
  colourless) and for the 17 flow cards, with intervals from the same replicates.
- **`cards-by-pilot.tsv`** has every band-and-card row: these columns, plus arm M's rate when search pilots
  the card's deck (`ws`) and when Forge does against search (`wf`), and `included`.

**Read 4 -- arm M, search's edge over Forge.**
- **The edge of a slice game:** `edge_g = (1[search wins M2] + 1[search wins M1]) / 2`, the search seat's
  score over the two swapped games. It is defined when both games are decisive.
- **A deck-game's edge** is `edge_g`. Its two deck-games carry the same value: within one pairing, which deck
  the search helped more cannot be told apart from the swap alone.
- **Two per-deck numbers beside it:**
  - `searchPilotWr`, the mean of `ws`: the search seat's win rate when it pilots this kind of deck against
    Forge;
  - `lift`, the mean of `ws - ff`: what changing this deck's pilot from Forge to search does, with Forge on
    the other side in both. This one is attributable to the deck.
- **Bins:** each of the three is given overall and binned by the deck's main colour, its colours with 3+
  spells, its card-flow count (0, 1, 2, 3+; all bands) and its band, each with its interval. `forgePilotWr`
  (the mean of `wf`) is in `pilot.json` too.

**Read 5 -- search's own counters,** per arm, summed over the search seats of the games with no engine
error, from the rows' raw `search.*` counts:
- per kind (p = priority, a = attacks, b = blocks, and any other kind present): decisions searched
  (`search.<k>.considered`), changed (`search.<k>.changed`), the changed share, and ms a decision
  (`search.<k>.us` / considered / 1000);
- the same summed over kinds;
- searched decisions per search seat a game (mean and median);
- every `search.fallback.*` count, and the budget fallbacks' share of searched decisions with Wilson's 95%
  interval (as J131);
- rollouts.

Each pilot's games are given too, FF included: decisive, mean turns, mean game seconds, the first player's
rate and side a's rate.

**Outputs** (`var/lab-j141/out/`): `pilot.json` (strict: no NaN or Infinity, null where a number does not
exist), `pilot.md` and `cards-by-pilot.tsv`, plus `slice-games.jsonl.gz` (the pairing list, J140's rows)
and `pilot-games.jsonl.gz` (the three arms' 6,000 rows). Beside them in `var/lab-j141/`: `slice.json`
(the draw: per band and stratum, available, quota and drawn, and the deck-games by group, colours, main
colour and card flow) and `inputs.json` (the deck check). Never `summary.md` or `metrics.json`: those
names are the runner's and the PC session's.

## Pilot
About 15 minutes. It checks the pin and that it holds `--replay` and the pilots, runs the census tests,
and checks J140's files. It then draws the slice and the pilot's subset, plays the 20-game subset under
each arm (S once, M both ways: 60 games), and reads them with the job's own read script.
cores: 1
```bash
mkdir -p var/lab-j141/decks var/lab-j141/bin
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/lab-j141/merged.txt || echo 0 > var/lab-j141/merged.txt
grep -q 'export function replayPlan' tools/cubelab/censusplay.ts && grep -q "policy('policy-a')" tools/cubelab/censusplay.ts && grep -q 'static void searchRow' tools/cubelab/CubeLab.java && echo 1 > var/lab-j141/has-tools.txt || echo 0 > var/lab-j141/has-tools.txt
cat var/lab-j141/merged.txt var/lab-j141/has-tools.txt
node --test web/test/cubelab-deck-census.test.ts
# J140's outputs: the game rows it collects, and its deck folders (drawn again, deterministically, only if gone)
test -s var/lab-j140/out/census-games.jsonl.gz
test -s var/lab-j140/out/census-decks.jsonl.gz
K=1
for B in pauper peasant legacy powered; do
  if [ ! -e "var/lab-j141/decks/$B" ]; then
    if [ -s "var/lab-j140/decks/$B/decks.jsonl" ]; then
      ln -s "../../lab-j140/decks/$B" "var/lab-j141/decks/$B"
    else
      tools/cubelab.sh decks --band "$B" --count 2500 --seed $((1400 + K)) --cross-band 0.10 --out "var/lab-j141/decks/$B"
    fi
  fi
  K=$((K + 1))
done
cat > var/lab-j141/bin/slice.py <<'PY'
import gzip, hashlib, json, os, random, sys
# J141's slice (jobs/J141-pilot-slice.md, "The slice"): verify J140's decks, then draw the
# pairing list.  No engine.  argv: <J140 out dir> <decks root> <out dir> <games a band> <seed> <pilot games a band>
src, decks_root, out, per_band, seed, pilot_n = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5]), int(sys.argv[6])
BANDS = ['pauper', 'peasant', 'legacy', 'powered']
STRATA = ['LL', 'LM', 'LH', 'MM', 'MH', 'HH']
GROUP_ORDER = 'LMH'


def sha(b):
    return hashlib.sha256(b).hexdigest()


def group(d):
    c = d['profile']['coloursWith3']
    return 'L' if c <= 1 else ('M' if c <= 3 else 'H')


# 1. the decks: each band's decks.jsonl must be byte-identical to its lines in J140's census-decks.jsonl.gz
census_lines = {b: [] for b in BANDS}
with gzip.open(os.path.join(src, 'census-decks.jsonl.gz'), 'rb') as f:
    for line in f:
        if line.strip():
            census_lines[json.loads(line)['band']].append(line)
inputs = {'v': 1, 'bands': {}, 'decksMatch': 0, 'dckMissing': 0}
decks = {}
for b in BANDS:
    p = os.path.join(decks_root, b, 'decks.jsonl')
    raw = open(p, 'rb').read() if os.path.exists(p) else b''
    want = b''.join(census_lines[b])
    ok = len(raw) > 0 and sha(raw) == sha(want)
    inputs['bands'][b] = {'source': 'j140' if os.path.islink(os.path.join(decks_root, b)) else 'regenerated',
                          'decks': raw.count(b'\n'), 'sha256': sha(raw)[:12], 'censusSha256': sha(want)[:12], 'match': 1 if ok else 0}
    inputs['decksMatch'] += 1 if ok else 0
    for line in raw.splitlines():
        if line.strip():
            d = json.loads(line)
            decks[d['id']] = d

# 2. J140's game rows
gz = os.path.join(src, 'census-games.jsonl.gz')
gz_bytes = open(gz, 'rb').read()
rows = {b: [] for b in BANDS}
for line in gzip.decompress(gz_bytes).decode('utf8').splitlines():
    if line.strip():
        r = json.loads(line)
        rows[r['a'].split('-')[0]].append((r, line))
inputs['j140Games'] = sum(len(v) for v in rows.values())
inputs['j140GamesSha256'] = sha(gz_bytes)[:12]

# 3. the draw: per band, eligible games by stratum, quotas, a seeded draw within each stratum
os.makedirs(os.path.join(out, 'slice'), exist_ok=True)
os.makedirs(os.path.join(out, 'pilot-slice'), exist_ok=True)
man = {'v': 1, 'seed': seed, 'perBand': per_band, 'pilotPerBand': pilot_n, 'source': {'file': gz, 'sha256': inputs['j140GamesSha256'], 'rows': inputs['j140Games']},
       'games': 0, 'pilotGames': 0, 'shortfall': 0, 'strataBelowQuota': 0, 'minStratumDrawn': None, 'bands': {}}
for b in BANDS:
    by = {s: [] for s in STRATA}
    eligible = 0
    for r, line in rows[b]:
        if r.get('engineError') or r.get('timeout') or r['a'] not in decks or r['b'] not in decks:
            continue
        eligible += 1
        s = ''.join(sorted(group(decks[r['a']]) + group(decks[r['b']]), key=GROUP_ORDER.index))
        by[s].append((r, line))
    quota = {s: per_band // len(STRATA) + (1 if i < per_band % len(STRATA) else 0) for i, s in enumerate(STRATA)}
    take = {s: min(quota[s], len(by[s])) for s in STRATA}
    short = per_band - sum(take.values())
    while short > 0 and any(take[s] < len(by[s]) for s in STRATA):
        for s in STRATA:
            if short > 0 and take[s] < len(by[s]):
                take[s] += 1
                short -= 1
    chosen = []
    for s in STRATA:
        cands = sorted(by[s], key=lambda x: x[0]['g'])
        chosen += random.Random(f'J141/slice/{seed}/{b}/{s}').sample(cands, take[s])
    chosen.sort(key=lambda x: x[0]['g'])
    body = ''.join(line + '\n' for _, line in chosen)
    open(os.path.join(out, 'slice', f'{b}.jsonl'), 'w').write(body)
    pilot = sorted(random.Random(f'J141/pilot/{seed}/{b}').sample(chosen, min(pilot_n, len(chosen))), key=lambda x: x[0]['g'])
    open(os.path.join(out, 'pilot-slice', f'{b}.jsonl'), 'w').write(''.join(line + '\n' for _, line in pilot))
    ids = [r[k] for r, _ in chosen for k in ('a', 'b')]
    cnt = lambda f: {k: sum(1 for i in ids if f(decks[i]) == k) for k in sorted({f(decks[i]) for i in ids}, key=str)}
    missing = sum(1 for i in set(ids) if not os.path.exists(os.path.join(decks_root, b, decks[i]['file'])))
    inputs['dckMissing'] += missing
    man['bands'][b] = {
        'rows': len(rows[b]), 'eligible': eligible, 'games': len(chosen), 'pilotGames': len(pilot), 'decks': len(set(ids)), 'deckGames': len(ids),
        'strata': {s: {'available': len(by[s]), 'quota': quota[s], 'drawn': take[s]} for s in STRATA},
        'groups': cnt(group),
        'coloursWith3': {f'c{k}': v for k, v in cnt(lambda d: d['profile']['coloursWith3']).items()},
        'mainColour': cnt(lambda d: d['profile']['mainColour'] or 'none'),
        'cardFlow': {f'f{k}': v for k, v in cnt(lambda d: min(d['cardFlow'], 3)).items()},
        'firstA': sum(1 for r, _ in chosen if r.get('first') == 'a'),
        'sha256': sha(body.encode())[:12], 'dckMissing': missing,
    }
    man['games'] += len(chosen)
    man['pilotGames'] += len(pilot)
    man['shortfall'] += per_band - len(chosen)
    man['strataBelowQuota'] += sum(1 for s in STRATA if take[s] < quota[s])
    drawn = min(take.values())
    man['minStratumDrawn'] = drawn if man['minStratumDrawn'] is None else min(man['minStratumDrawn'], drawn)
json.dump(inputs, open(os.path.join(out, 'inputs.json'), 'w'), indent=2)
json.dump(man, open(os.path.join(out, 'slice.json'), 'w'), indent=2)
print(json.dumps({'decksMatch': inputs['decksMatch'], 'dckMissing': inputs['dckMissing'], 'j140Games': inputs['j140Games'], 'slice': man['games'], 'pilot': man['pilotGames'],
                  'shortfall': man['shortfall'], 'strata': {b: {s: v['drawn'] for s, v in man['bands'][b]['strata'].items()} for b in BANDS}}))
if inputs['decksMatch'] != len(BANDS) or inputs['dckMissing']:
    sys.exit('J141: the decks are not J140\'s (see inputs.json)')
PY
cat > var/lab-j141/bin/read.py <<'PY'
import argparse, gzip, json, math, os
import numpy as np
# J141's read (jobs/J141-pilot-slice.md, "The reads"): numbers only, no verdict.  The estimators are
# written in the job file before any slice game; this script is them.
ap = argparse.ArgumentParser()
ap.add_argument('--slice', required=True)            # <dir>/<band>.jsonl: the J140 rows of the slice (the Forge-vs-Forge games)
ap.add_argument('--games', required=True)            # <dir>/{ss,ps,sp}/<band>/games.jsonl: census-play --replay's rows
ap.add_argument('--decks', required=True)            # <dir>/<band>/decks.jsonl
ap.add_argument('--census-games', required=True)     # J140's census-games.jsonl.gz: the census-wide Forge reference of read 2
ap.add_argument('--census-tsv', default='cubes/library/census.tsv')
ap.add_argument('--out', required=True)
ap.add_argument('--boot', type=int, default=1000)
ap.add_argument('--swaps', type=int, default=200)
ap.add_argument('--seed', type=int, default=1411)
ap.add_argument('--shrink', type=float, default=20)
ap.add_argument('--min-games', type=int, default=20)
ap.add_argument('--top', type=int, default=20)
ap.add_argument('--flow-min', type=int, default=50)       # read 2: a band enters with this many slice deck-games holding 1+ flow cards
a = ap.parse_args()

BANDS = ['pauper', 'peasant', 'legacy', 'powered']
COLOURS = 'WUBRG'
ARMS = {'ss': ('search', 'search'), 'ps': ('plain', 'search'), 'sp': ('search', 'plain')}
FLOW_STUDY = {'Opt', 'Consider', 'Brainstorm', 'Ponder', 'Thought Scour', 'Deep Analysis', 'Mulldrifter', 'Faithless Looting', 'Cathartic Reunion',
              'Unexpected Windfall', "Mishra's Bauble", 'Chromatic Star', 'Prophetic Prism', 'Ichor Wellspring', 'Candy Trail', 'Village Rites', 'Deadly Dispute'}


def r4(x):
    return None if x is None or not math.isfinite(float(x)) else round(float(x), 4)


def jsonl(p):
    if not os.path.exists(p):
        return []
    with open(p, encoding='utf8') as f:
        return [json.loads(l) for l in f if l.strip() and l.endswith('\n')]


def decisive(r):
    return r is not None and not r.get('engineError') and r.get('winner') in ('a', 'b')


def pct(reps):
    reps = np.sort(reps[np.isfinite(reps)])
    if len(reps) == 0:
        return None, None
    return r4(reps[int(math.floor(0.025 * (len(reps) - 1)))]), r4(reps[int(math.ceil(0.975 * (len(reps) - 1)))])


# ---- inputs
decks = {}
for b in BANDS:
    for d in jsonl(os.path.join(a.decks, b, 'decks.jsonl')):
        decks[d['id']] = d
card_info = {}
with open(a.census_tsv, encoding='utf8') as f:
    head = None
    for l in f:
        if l.startswith('#'):
            continue
        c = l.rstrip('\n').split('\t')
        if head is None:
            head = {k: i for i, k in enumerate(c)}
            continue
        ci = c[head['colour_identity']]
        card_info[c[head['name']]] = {'colour': 'C' if ci == '' else (ci if len(ci) == 1 else 'M'), 'identity': ci, 'type': c[head['type']]}
games = []
for b in BANDS:
    for r in jsonl(os.path.join(a.slice, f'{b}.jsonl')):
        games.append({'band': b, 'g': r['g'], 'seed': r['seed'], 'a': r['a'], 'b': r['b'], 'first': r.get('first'), 'ff': r})
key_of = {(x['band'], x['g']): i for i, x in enumerate(games)}
arm_rows = {arm: {} for arm in ARMS}
integrity = {}
for arm, (pa, pb) in ARMS.items():
    t = {'expected': len(games), 'rows': 0, 'missing': 0, 'extra': 0, 'duplicate': 0, 'idMismatch': 0, 'firstMismatch': 0, 'firstCompared': 0, 'policyMismatch': 0,
         'countersMissing': 0, 'countersUnexpected': 0, 'engineErrors': 0, 'timeouts': 0, 'draws': 0, 'decisive': 0}
    for b in BANDS:
        for r in jsonl(os.path.join(a.games, arm, b, 'games.jsonl')):
            t['rows'] += 1
            k = (b, r['g'])
            if k not in key_of:
                t['extra'] += 1
                continue
            if k in arm_rows[arm]:
                t['duplicate'] += 1
                continue
            arm_rows[arm][k] = r
            x = games[key_of[k]]
            if (r['seed'], r['a'], r['b']) != (x['seed'], x['a'], x['b']):
                t['idMismatch'] += 1
            if r.get('first') and x['first']:
                t['firstCompared'] += 1
                t['firstMismatch'] += 1 if r['first'] != x['first'] else 0
            if (r.get('policyA'), r.get('policyB')) != (pa, pb):
                t['policyMismatch'] += 1
            if r.get('engineError'):
                t['engineErrors'] += 1
            else:
                for side, pol in (('searchA', pa), ('searchB', pb)):
                    has = isinstance(r.get(side), dict)
                    t['countersMissing'] += 1 if pol == 'search' and not has else 0
                    t['countersUnexpected'] += 1 if pol == 'plain' and has else 0
            if r.get('timeout'):
                t['timeouts'] += 1
            if decisive(r):
                t['decisive'] += 1
            elif not r.get('engineError'):
                t['draws'] += 1
    t['missing'] = len(games) - len(arm_rows[arm])
    t['errorsTimeouts'] = t['engineErrors'] + t['timeouts']
    t['errorShare'] = r4(t['errorsTimeouts'] / t['rows']) if t['rows'] else None
    integrity[arm] = t
ff_t = {'games': len(games), 'decisive': sum(1 for x in games if decisive(x['ff'])), 'notPlain': sum(1 for x in games if (x['ff'].get('policyA'), x['ff'].get('policyB')) != ('plain', 'plain'))}
integrity['ff'] = ff_t

# ---- deck-games: one per slice game and side
def win(r, side):
    return (1.0 if r['winner'] == side else 0.0) if decisive(r) else np.nan

dg = []
for i, x in enumerate(games):
    k = (x['band'], x['g'])
    ss, ps, sp = arm_rows['ss'].get(k), arm_rows['ps'].get(k), arm_rows['sp'].get(k)
    sg = ((1.0 if sp['winner'] == 'a' else 0.0) + (1.0 if ps['winner'] == 'b' else 0.0)) / 2 if decisive(ps) and decisive(sp) else np.nan
    for side in ('a', 'b'):
        own_s, own_f = (sp, ps) if side == 'a' else (ps, sp)
        dg.append({'game': i, 'band': x['band'], 'deck': x[side], 'opp': x['b' if side == 'a' else 'a'],
                   'ff': win(x['ff'], side), 'ss': win(ss, side) if ss else np.nan,
                   'ws': win(own_s, side) if own_s else np.nan, 'wf': win(own_f, side) if own_f else np.nan, 'sg': sg})
N = len(dg)
deck_ids = sorted({r['deck'] for r in dg})
deck_ix = {d: j for j, d in enumerate(deck_ids)}
dgd = np.array([deck_ix[r['deck']] for r in dg], dtype=int)
V = {k: np.array([r[k] for r in dg], dtype=float) for k in ('ff', 'ss', 'ws', 'wf', 'sg')}
D = [decks[r['deck']] for r in dg]
OPP = [decks[r['opp']] for r in dg]
main = np.array([d['profile']['mainColour'] or 'none' for d in D])
cols3 = np.array([d['profile']['coloursWith3'] for d in D])
flow = np.array([d['cardFlow'] for d in D])
flowbin = np.array(['f3p' if f >= 3 else f'f{f}' for f in flow])
band = np.array([r['band'] for r in dg])
has = {c: np.array([1.0 if d['profile']['pipShare'][c] > 0 else 0.0 for d in D]) for c in COLOURS}
opp_has = {c: np.array([1.0 if d['profile']['pipShare'][c] > 0 else 0.0 for d in OPP]) for c in COLOURS}

rng = np.random.default_rng(a.seed)
W = rng.multinomial(len(deck_ids), np.full(len(deck_ids), 1 / len(deck_ids)), size=a.boot).astype(float) if deck_ids else np.zeros((a.boot, 0))
WDG = W[:, dgd] if N else np.zeros((a.boot, 0))


def ratio(vals, mask):
    """A mean over the masked deck-games, its deck-clustered percentile bootstrap (the same replicate weights everywhere)."""
    m = mask & np.isfinite(vals)
    n = int(m.sum())
    if n == 0:
        return {'n': 0, 'decks': 0, 'est': None, 'lo': None, 'hi': None}
    v = vals[m]
    w = WDG[:, m]
    den = w.sum(1)
    reps = np.where(den > 0, (w @ v) / np.where(den > 0, den, 1), np.nan)
    lo, hi = pct(reps)
    return {'n': n, 'decks': int(len(set(dgd[m].tolist()))), 'est': r4(v.mean()), 'lo': lo, 'hi': hi}


def cell(mask, arms=('ff', 'ss')):
    out = {}
    for k in arms:
        out[k] = ratio(V[k], mask)
    out['diff'] = ratio(V['ss'] - V['ff'], mask)
    return out


ALL = np.ones(N, dtype=bool)
doc = {'v': 1, 'job': 'J141', 'decision': 'D447', 'options': {'boot': a.boot, 'swaps': a.swaps, 'seed': a.seed, 'shrink': a.shrink, 'minGames': a.min_games, 'top': a.top},
       'games': len(games), 'deckGames': N, 'decks': len(deck_ids), 'integrity': integrity}

# ---- read 1: win rate by main colour, colour count and colour presence, Forge-vs-Forge against search-vs-search
r1 = {'all': cell(ALL), 'byMainColour': {}, 'byColours': {}, 'byHas': {}, 'byBandMainColour': {}}
for c in list(COLOURS) + ['none']:
    if (main == c).any():
        r1['byMainColour'][c] = cell(main == c)
for k in sorted(set(cols3.tolist())):
    r1['byColours'][str(k)] = cell(cols3 == k)
for c in COLOURS:
    r1['byHas'][c] = cell(has[c] > 0)
for b in BANDS:
    if (band == b).any():
        r1['byBandMainColour'][b] = {c: cell((band == b) & (main == c)) for c in list(COLOURS) + ['none'] if ((band == b) & (main == c)).any()}
doc['read1'] = r1


# ---- read 2: the card-flow coefficient (linear probability model, colours held fixed), per pilot
def design(rows_band, rows_flow, rows_has, rows_opp, bands_in):
    cols = [rows_flow.astype(float)]
    for b in bands_in:
        ib = (rows_band == b).astype(float)
        cols.append(ib)
        for c in COLOURS:
            cols.append(ib * rows_has[c])
        for c in COLOURS:
            cols.append(ib * rows_opp[c])
    return np.stack(cols, 1)


def fit(X, y, cluster, weights):
    """OLS coefficient on column 0 (x 100: points of win rate per card), and its deck-clustered bootstrap."""
    p = X.shape[1]
    S = np.zeros((weights.shape[1], p * p))
    T = np.zeros((S.shape[0], p))
    np.add.at(S, cluster, np.einsum('ni,nj->nij', X, X).reshape(len(X), p * p))
    np.add.at(T, cluster, X * y[:, None])
    def solve(xx, xy):
        return np.linalg.lstsq(xx.reshape(p, p), xy, rcond=None)[0][0] * 100
    est = solve(S.sum(0), T.sum(0))
    WS, WT = weights @ S, weights @ T
    reps = np.array([solve(WS[i], WT[i]) for i in range(len(weights))])
    return est, reps


enter = [b for b in BANDS if ((band == b) & (flow >= 1)).sum() >= a.flow_min]
r2 = {'bands': enter, 'rule': f'a band enters when {a.flow_min} or more of its slice deck-games hold 1+ card-flow cards', 'flowDeckGames': {b: int(((band == b) & (flow >= 1)).sum()) for b in BANDS}}
if enter:
    inb = np.isin(band, enter)
    X = design(band, flow, has, opp_has, enter)
    res = {}
    for k in ('ff', 'ss'):
        m = inb & np.isfinite(V[k])
        est, reps = fit(X[m], V[k][m], dgd[m], W)
        res[k] = (est, reps, int(m.sum()))
        lo, hi = pct(reps)
        r2[k] = {'n': int(m.sum()), 'beta': r4(est), 'lo': lo, 'hi': hi}
    lo, hi = pct(res['ss'][1] - res['ff'][1])
    r2['diff'] = {'beta': r4(res['ss'][0] - res['ff'][0]), 'lo': lo, 'hi': hi}
    # the census-wide Forge reference: every J140 game of the entered bands, the same model, its own deck bootstrap
    cg_b, cg_flow, cg_has, cg_opp, cg_y, cg_deck = [], [], {c: [] for c in COLOURS}, {c: [] for c in COLOURS}, [], []
    with gzip.open(a.census_games, 'rt', encoding='utf8') as f:
        for l in f:
            if not l.strip():
                continue
            r = json.loads(l)
            bb = r['a'].split('-')[0]
            if bb not in enter or not decisive(r) or r['a'] not in decks or r['b'] not in decks:
                continue
            for side, me, op in (('a', r['a'], r['b']), ('b', r['b'], r['a'])):
                d, o = decks[me], decks[op]
                cg_b.append(bb); cg_flow.append(d['cardFlow']); cg_y.append(1.0 if r['winner'] == side else 0.0); cg_deck.append(me)
                for c in COLOURS:
                    cg_has[c].append(1.0 if d['profile']['pipShare'][c] > 0 else 0.0)
                    cg_opp[c].append(1.0 if o['profile']['pipShare'][c] > 0 else 0.0)
    if cg_y:
        ids = sorted(set(cg_deck)); ix = {d: j for j, d in enumerate(ids)}
        cl = np.array([ix[d] for d in cg_deck])
        Wc = np.random.default_rng(a.seed + 1).multinomial(len(ids), np.full(len(ids), 1 / len(ids)), size=a.boot).astype(float)
        Xc = design(np.array(cg_b), np.array(cg_flow), {c: np.array(v) for c, v in cg_has.items()}, {c: np.array(v) for c, v in cg_opp.items()}, enter)
        est, reps = fit(Xc, np.array(cg_y), cl, Wc)
        lo, hi = pct(reps)
        r2['censusFF'] = {'n': len(cg_y), 'decks': len(ids), 'beta': r4(est), 'lo': lo, 'hi': hi}
    r2['byFlow'] = {fb: cell(inb & (flowbin == fb)) for fb in ('f0', 'f1', 'f2', 'f3p') if (inb & (flowbin == fb)).any()}
doc['read2'] = r2

# ---- read 3: per card, its win rate when in the deck under each pilot
card_keys = sorted({(r['band'], c) for r, d in zip(dg, D) for c in d['spells'] + d['fixers']})
cix = {k: j for j, k in enumerate(card_keys)}
C = np.zeros((N, len(card_keys)), dtype=np.float32)
for i, (r, d) in enumerate(zip(dg, D)):
    for c in set(d['spells'] + d['fixers']):
        C[i, cix[(r['band'], c)]] = 1.0
fin = {k: np.isfinite(V[k]).astype(np.float32) for k in V}
val = {k: np.nan_to_num(V[k]).astype(np.float32) for k in V}
n_ = {k: fin[k] @ C for k in ('ff', 'ss', 'ws', 'wf')}
w_ = {k: val[k] @ C for k in ('ff', 'ss', 'ws', 'wf')}
both = (fin['ff'] * fin['ss'])
n_both = both @ C
d_both = (both * (val['ss'] - val['ff'])) @ C
decks_with = np.array([len({dg[i]['deck'] for i in np.nonzero(C[:, j])[0]}) for j in range(len(card_keys))]) if card_keys else np.zeros(0)
dgames = C.sum(0)
shr = lambda w, n: (w + a.shrink * 0.5) / (n + a.shrink)
inc = (n_['ff'] >= a.min_games) & (n_['ss'] >= a.min_games)
J = np.nonzero(inc)[0]


def rankdata(x):
    o = np.argsort(x, kind='mergesort')
    r = np.empty(len(x)); r[o] = np.arange(len(x), dtype=float)
    xs = x[o]
    i = 0
    while i < len(xs):
        j = i
        while j + 1 < len(xs) and xs[j + 1] == xs[i]:
            j += 1
        r[o[i:j + 1]] = (i + j) / 2
        i = j + 1
    return r


def spearman(x, y):
    if len(x) < 3:
        return np.nan
    rx, ry = rankdata(np.asarray(x, float)), rankdata(np.asarray(y, float))
    sx, sy = rx.std(), ry.std()
    return float(((rx - rx.mean()) * (ry - ry.mean())).mean() / (sx * sy)) if sx > 0 and sy > 0 else np.nan


r3 = {'cards': len(card_keys), 'included': int(len(J)), 'rule': f'min(decisive slice deck-games under Forge, under search) >= {a.min_games}'}
sh_ff, sh_ss = shr(w_['ff'], n_['ff']), shr(w_['ss'], n_['ss'])
raw_ff = np.where(n_['ff'] > 0, w_['ff'] / np.maximum(n_['ff'], 1), np.nan)
raw_ss = np.where(n_['ss'] > 0, w_['ss'] / np.maximum(n_['ss'], 1), np.nan)
move = sh_ss - sh_ff
pair_lo = np.full(len(card_keys), np.nan); pair_hi = np.full(len(card_keys), np.nan)
group_rows = {}
if len(J):
    CJ = C[:, J]
    reps_rho, reps_rho_raw, reps_move = [], [], []
    for s in range(0, a.boot, 100):
        Wb = WDG[s:s + 100].astype(np.float32)
        nf, wf_, ns, ws_ = (Wb * fin['ff']) @ CJ, (Wb * val['ff']) @ CJ, (Wb * fin['ss']) @ CJ, (Wb * val['ss']) @ CJ
        nb, db = (Wb * both) @ CJ, (Wb * both * (val['ss'] - val['ff'])) @ CJ
        for i in range(len(Wb)):
            reps_rho.append(spearman(shr(wf_[i], nf[i]), shr(ws_[i], ns[i])))
            with np.errstate(invalid='ignore', divide='ignore'):
                reps_rho_raw.append(spearman(np.where(nf[i] > 0, wf_[i] / nf[i], 0.5), np.where(ns[i] > 0, ws_[i] / ns[i], 0.5)))
            reps_move.append(shr(ws_[i], ns[i]) - shr(wf_[i], nf[i]))
        with np.errstate(invalid='ignore', divide='ignore'):
            pdiff = np.where(nb > 0, db / nb, np.nan)
        if s == 0:
            pd_all = pdiff
        else:
            pd_all = np.vstack([pd_all, pdiff])
    for jj, j in enumerate(J):
        pair_lo[j], pair_hi[j] = pct(pd_all[:, jj])
    lo, hi = pct(np.array(reps_rho))
    lo2, hi2 = pct(np.array(reps_rho_raw))
    r3['spearman'] = {'shrunk': {'rho': r4(spearman(sh_ff[J], sh_ss[J])), 'lo': lo, 'hi': hi}, 'raw': {'rho': r4(spearman(raw_ff[J], raw_ss[J])), 'lo': lo2, 'hi': hi2}}
    # the swap reference: each slice game's Forge and search outcomes exchanged with probability 1/2
    srng = np.random.default_rng(a.seed + 2)
    gidx = np.array([r['game'] for r in dg])
    sw = []
    for _ in range(a.swaps):
        flip = srng.random(len(games)) < 0.5
        f = flip[gidx]
        vf, vs = np.where(f, V['ss'], V['ff']), np.where(f, V['ff'], V['ss'])
        nf, ns = np.isfinite(vf).astype(np.float32) @ CJ, np.isfinite(vs).astype(np.float32) @ CJ
        sw.append(spearman(shr(np.nan_to_num(vf).astype(np.float32) @ CJ, nf), shr(np.nan_to_num(vs).astype(np.float32) @ CJ, ns)))
    sw = np.array(sw)
    lo, hi = pct(sw)
    r3['spearman']['swapReference'] = {'median': r4(float(np.median(sw))) if len(sw) else None, 'lo': lo, 'hi': hi, 'swaps': a.swaps}
    RM = np.array(reps_move)
    for grp in ['W', 'U', 'B', 'R', 'G', 'M', 'C', 'flow']:
        sel = np.array([(card_keys[j][1] in FLOW_STUDY) if grp == 'flow' else (card_info.get(card_keys[j][1], {}).get('colour') == grp) for j in J])
        if sel.any():
            lo, hi = pct(RM[:, sel].mean(1))
            group_rows[grp] = {'cards': int(sel.sum()), 'meanMove': r4(float(move[J][sel].mean())), 'lo': lo, 'hi': hi}
r3['moveByCardColour'] = group_rows


def card_row(j):
    b, c = card_keys[j]
    info = card_info.get(c, {})
    return {'band': b, 'card': c, 'colour': info.get('identity'), 'type': info.get('type'), 'flow': 1 if c in FLOW_STUDY else 0, 'decks': int(decks_with[j]), 'deckGames': int(dgames[j]),
            'ffN': int(n_['ff'][j]), 'ffWr': r4(raw_ff[j]), 'ffShrunk': r4(sh_ff[j]), 'ssN': int(n_['ss'][j]), 'ssWr': r4(raw_ss[j]), 'ssShrunk': r4(sh_ss[j]),
            'move': r4(move[j]), 'pairedN': int(n_both[j]), 'pairedDiff': r4(d_both[j] / n_both[j]) if n_both[j] > 0 else None, 'pairedLo': r4(pair_lo[j]), 'pairedHi': r4(pair_hi[j])}


order = sorted(J.tolist(), key=lambda j: (-move[j], card_keys[j]))
r3['up'] = [card_row(j) for j in order[:a.top]]
r3['down'] = [card_row(j) for j in sorted(J.tolist(), key=lambda j: (move[j], card_keys[j]))[:a.top]]
doc['read3'] = r3

# ---- read 4: arm M, the search seat against Forge's, both ways round
def mcell(mask):
    return {'edge': ratio(V['sg'], mask), 'searchPilotWr': ratio(V['ws'], mask), 'forgePilotWr': ratio(V['wf'], mask), 'lift': ratio(V['ws'] - V['ff'], mask)}


r4_ = {'all': mcell(ALL), 'byMainColour': {}, 'byColours': {}, 'byFlow': {}, 'byBand': {}}
for c in list(COLOURS) + ['none']:
    if (main == c).any():
        r4_['byMainColour'][c] = mcell(main == c)
for k in sorted(set(cols3.tolist())):
    r4_['byColours'][str(k)] = mcell(cols3 == k)
for fb in ('f0', 'f1', 'f2', 'f3p'):
    if (flowbin == fb).any():
        r4_['byFlow'][fb] = mcell(flowbin == fb)
for b in BANDS:
    if (band == b).any():
        r4_['byBand'][b] = mcell(band == b)
doc['read4'] = r4_


# ---- read 5: search's own counters, and each pilot's games
def wilson(k, n):
    if n == 0:
        return None, None
    z = 1.959964; p = k / n; den = 1 + z * z / n
    c = (p + z * z / (2 * n)) / den; h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / den
    return r4(c - h), r4(c + h)


def game_stats(rows):
    rows = list(rows)
    ok = [r for r in rows if not r.get('engineError')]
    dec = [r for r in rows if decisive(r)]
    fw = [r for r in dec if r.get('first')]
    return {'games': len(rows), 'decisive': len(dec), 'meanTurns': r4(np.mean([r['turns'] for r in ok if r.get('turns') is not None])) if ok else None,
            'meanGameS': r4(np.mean([r['ms'] / 1000 for r in ok if r.get('ms') is not None])) if ok else None,
            'firstPlayerWr': r4(sum(1 for r in fw if r['winner'] == r['first']) / len(fw)) if fw else None, 'aWr': r4(sum(1 for r in dec if r['winner'] == 'a') / len(dec)) if dec else None}


r5 = {'ff': game_stats(x['ff'] for x in games)}
for arm, (pa, pb) in ARMS.items():
    rows = list(arm_rows[arm].values())
    st = game_stats(rows)
    tot, seats, searched = {}, 0, []
    for r in rows:
        if r.get('engineError'):
            continue
        for side, pol in (('searchA', pa), ('searchB', pb)):
            s = r.get(side)
            if pol == 'search' and isinstance(s, dict):
                seats += 1
                searched.append(s.get('searched', 0))
                for k2, v in (s.get('counts') or {}).items():
                    tot[k2] = tot.get(k2, 0) + v
    kinds = sorted({k2.split('.')[1] for k2 in tot if k2.endswith('.considered') and k2.count('.') == 2})
    cons = sum(tot.get(f'search.{k}.considered', 0) for k in kinds)
    us = sum(tot.get(f'search.{k}.us', 0) for k in kinds)
    st['searchSeats'] = seats
    st['searched'] = int(cons)
    st['changed'] = int(sum(tot.get(f'search.{k}.changed', 0) for k in kinds))
    st['changedShare'] = r4(st['changed'] / cons) if cons else None
    st['msPerDecision'] = r4(us / 1000 / cons) if cons else None
    st['searchedPerSeatGame'] = r4(float(np.mean(searched))) if searched else None
    st['searchedPerSeatGameMedian'] = r4(float(np.median(searched))) if searched else None
    st['byKind'] = {k: {'searched': int(tot.get(f'search.{k}.considered', 0)), 'changed': int(tot.get(f'search.{k}.changed', 0)),
                        'changedShare': r4(tot.get(f'search.{k}.changed', 0) / tot[f'search.{k}.considered']) if tot.get(f'search.{k}.considered') else None,
                        'msPerDecision': r4(tot.get(f'search.{k}.us', 0) / 1000 / tot[f'search.{k}.considered']) if tot.get(f'search.{k}.considered') else None} for k in kinds}
    st['fallbacks'] = {k2.split('.', 2)[2]: int(v) for k2, v in sorted(tot.items()) if k2.startswith('search.fallback.')}
    fb = st['fallbacks'].get('budget', 0)
    lo, hi = wilson(fb, cons) if cons else (None, None)
    st['budgetFallbackShare'] = {'n': int(fb), 'share': r4(fb / cons) if cons else None, 'lo': lo, 'hi': hi}
    st['rollouts'] = int(tot.get('search.rollouts', 0))
    r5[arm] = st
doc['read5'] = r5
doc['counters'] = {arm: {'seats': r5[arm]['searchSeats'], 'searched': r5[arm]['searched']} for arm in ARMS}


# ---- outputs: pilot.json (strict), cards-by-pilot.tsv, pilot.md
def clean(o):
    if isinstance(o, dict):
        return {k: clean(v) for k, v in o.items()}
    if isinstance(o, list):
        return [clean(v) for v in o]
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (np.floating, float)):
        return r4(o)
    return o


os.makedirs(a.out, exist_ok=True)
doc = clean(doc)
with open(os.path.join(a.out, 'pilot.json'), 'w') as f:
    f.write(json.dumps(doc, indent=2, allow_nan=False) + '\n')
cols = ['band', 'card', 'colour', 'type', 'flow', 'decks', 'deckGames', 'ffN', 'ffWr', 'ffShrunk', 'ssN', 'ssWr', 'ssShrunk', 'move', 'pairedN', 'pairedDiff', 'pairedLo', 'pairedHi']
mcols = ['mSearchN', 'mSearchWr', 'mForgeN', 'mForgeWr', 'included']
with open(os.path.join(a.out, 'cards-by-pilot.tsv'), 'w') as f:
    f.write('\t'.join(cols + mcols) + '\n')
    for j in range(len(card_keys)):
        row = card_row(j)
        row.update(mSearchN=int(n_['ws'][j]), mSearchWr=r4(w_['ws'][j] / n_['ws'][j]) if n_['ws'][j] > 0 else None,
                   mForgeN=int(n_['wf'][j]), mForgeWr=r4(w_['wf'][j] / n_['wf'][j]) if n_['wf'][j] > 0 else None, included=1 if inc[j] else 0)
        f.write('\t'.join('' if row[k] is None else str(row[k]) for k in cols + mcols) + '\n')

fmt = lambda x: '–' if x is None else f'{x:.3f}'
f2 = lambda x: '–' if x is None else f'{x:.2f}'
iv = lambda c: '–' if c.get('lo') is None else f"{fmt(c['lo'])}–{fmt(c['hi'])}"
L = ['# J141: the pilot slice -- Forge against search-v2 on the same census games', '',
     f"{doc['games']} slice games, {doc['deckGames']} deck-games, {doc['decks']} decks. Every interval is a deck-clustered percentile bootstrap ({a.boot} replicates, seed {a.seed}). "
     'No verdict: any difference is a candidate until it holds on a fresh slice (D447 point 9). The decks are random draws from a band pool, so every rate is "in a random deck of this makeup", not in a built deck.', '',
     '## Integrity', '', '| arm | rows | expected | missing | id mismatch | first mismatch / compared | policy mismatch | counters missing | engine errors | timeouts | draws |', '|---|---|---|---|---|---|---|---|---|---|---|']
for arm in ARMS:
    t = doc['integrity'][arm]
    L.append(f"| {arm} | {t['rows']} | {t['expected']} | {t['missing']} | {t['idMismatch']} | {t['firstMismatch']} / {t['firstCompared']} | {t['policyMismatch']} | {t['countersMissing']} | {t['engineErrors']} | {t['timeouts']} | {t['draws']} |")
L += ['', '## Read 1: win rate by colour, Forge vs Forge (J140) against search vs search (arm S)', '']
for ax, title in (('byMainColour', 'main colour'), ('byColours', 'colours with 3+ spells'), ('byHas', 'has the colour (any pip)')):
    L += [f'| {title} | deck-games | FF | 95% | SS | 95% | SS − FF (paired) | 95% |', '|---|---|---|---|---|---|---|---|']
    for k, c in doc['read1'][ax].items():
        L.append(f"| {k} | {c['ff']['n']} | {fmt(c['ff']['est'])} | {iv(c['ff'])} | {fmt(c['ss']['est'])} | {iv(c['ss'])} | {fmt(c['diff']['est'])} | {iv(c['diff'])} |")
    L.append('')
r2d = doc['read2']
L += ['## Read 2: the card-flow coefficient (points of win rate per card-flow card, colours held fixed)', '', f"Bands entered: {', '.join(r2d['bands']) or 'none'} ({r2d['rule']}).", '']
if r2d['bands']:
    L += ['| pilot | deck-games | β | 95% |', '|---|---|---|---|']
    for k, name in (('ff', 'Forge (slice)'), ('ss', 'search (slice)'), ('censusFF', 'Forge (all of J140)')):
        if k in r2d:
            L.append(f"| {name} | {r2d[k]['n']} | {f2(r2d[k]['beta'])} | {f2(r2d[k]['lo'])} – {f2(r2d[k]['hi'])} |")
    L.append(f"| search − Forge (slice, paired) | | {f2(r2d['diff']['beta'])} | {f2(r2d['diff']['lo'])} – {f2(r2d['diff']['hi'])} |")
    L.append('')
r3d = doc['read3']
L += ['## Read 3: cards', '', f"{r3d['cards']} band-and-card rows, {r3d['included']} with {r3d['rule']}."]
if 'spearman' in r3d:
    s = r3d['spearman']
    L += [f"Spearman, shrunk ratings: {fmt(s['shrunk']['rho'])} [{fmt(s['shrunk']['lo'])}, {fmt(s['shrunk']['hi'])}]; raw: {fmt(s['raw']['rho'])} [{fmt(s['raw']['lo'])}, {fmt(s['raw']['hi'])}]. "
          f"The swap reference (the pilots exchanged at random, {s['swapReference']['swaps']} times): median {fmt(s['swapReference']['median'])} [{fmt(s['swapReference']['lo'])}, {fmt(s['swapReference']['hi'])}].", '',
          '| card colour | cards | mean move (SS − FF, shrunk) | 95% |', '|---|---|---|---|']
    for k, g in r3d['moveByCardColour'].items():
        L.append(f"| {k} | {g['cards']} | {fmt(g['meanMove'])} | {iv(g)} |")
    for name, lst in (('rise most under search', r3d['up']), ('fall most under search', r3d['down'])):
        L += ['', f'**The {len(lst)} that {name}**', '', '| band | card | colour | FF n | FF shrunk | SS n | SS shrunk | move | paired diff | 95% |', '|---|---|---|---|---|---|---|---|---|---|']
        for c in lst:
            L.append(f"| {c['band']} | {c['card']} | {c['colour'] or 'C'} | {c['ffN']} | {fmt(c['ffShrunk'])} | {c['ssN']} | {fmt(c['ssShrunk'])} | {fmt(c['move'])} | {fmt(c['pairedDiff'])} | {fmt(c['pairedLo'])}–{fmt(c['pairedHi'])} |")
L += ['', '## Read 4: arm M, search against Forge with sides swapped', '']
for ax, title in (('byMainColour', 'main colour'), ('byColours', 'colours with 3+ spells'), ('byFlow', 'card-flow cards'), ('byBand', 'band')):
    L += [f'| {title} | deck-games | edge (search seat, both games) | 95% | search pilots it | 95% | lift over FF | 95% |', '|---|---|---|---|---|---|---|---|']
    rows = [('all', doc['read4']['all'])] + list(doc['read4'][ax].items())
    for k, c in rows:
        L.append(f"| {k} | {c['edge']['n']} | {fmt(c['edge']['est'])} | {iv(c['edge'])} | {fmt(c['searchPilotWr']['est'])} | {iv(c['searchPilotWr'])} | {fmt(c['lift']['est'])} | {iv(c['lift'])} |")
    L.append('')
L += ['## Read 5: search counters and games per pilot', '', '| arm | games | decisive | mean turns | mean game s | search seats | searched / seat-game | changed share | ms / decision | budget fallbacks [95%] |', '|---|---|---|---|---|---|---|---|---|---|']
for arm in ['ff'] + list(ARMS):
    s = doc['read5'][arm]
    bf = s.get('budgetFallbackShare') or {}
    L.append(f"| {arm} | {s['games']} | {s['decisive']} | {s['meanTurns']} | {s['meanGameS']} | {s.get('searchSeats', 0)} | {s.get('searchedPerSeatGame', '–')} | {fmt(s.get('changedShare'))} | {s.get('msPerDecision', '–')} | {bf.get('n', '–')} = {fmt(bf.get('share'))} [{fmt(bf.get('lo'))}, {fmt(bf.get('hi'))}] |")
with open(os.path.join(a.out, 'pilot.md'), 'w') as f:
    f.write('\n'.join(L) + '\n')
print(json.dumps({'games': doc['games'], 'integrity': {k: {kk: doc['integrity'][k].get(kk) for kk in ('rows', 'missing', 'idMismatch', 'firstMismatch', 'errorsTimeouts')} for k in ARMS},
                  'read2': {k: doc['read2'].get(k) for k in ('bands', 'ff', 'ss', 'diff', 'censusFF')}, 'spearman': doc['read3'].get('spearman'), 'counters': doc['counters']}))
PY
# the slice: 500 a band, stratified, seed 1411; the pilot's subset 5 a band (exits non-zero unless the decks are J140's)
python3 var/lab-j141/bin/slice.py var/lab-j140/out var/lab-j141/decks var/lab-j141 500 1411 5
```
metrics: merged = sh: cat var/lab-j141/merged.txt 2>/dev/null || echo 0
metrics: has_tools = sh: cat var/lab-j141/has-tools.txt 2>/dev/null || echo 0
metrics: inp = sh: cat var/lab-j141/inputs.json 2>/dev/null || echo '{"decksMatch":0}'
metrics: sl = sh: cat var/lab-j141/slice.json 2>/dev/null || echo '{"games":0}'
cores: 3
```bash
export CUBELAB_HOME_ROOT=var/cubelab/homes-J141
for B in pauper peasant legacy powered; do
  tools/cubelab.sh census-play --decks "var/lab-j141/decks/$B" --replay "var/lab-j141/pilot-slice/$B.jsonl" --policy-a search --policy-b search --game-timeout 900 --jobs {workers} --out "var/lab-j141/pilot/ss/$B"
  tools/cubelab.sh census-play --decks "var/lab-j141/decks/$B" --replay "var/lab-j141/pilot-slice/$B.jsonl" --policy-a plain --policy-b search --game-timeout 900 --jobs {workers} --out "var/lab-j141/pilot/ps/$B"
  tools/cubelab.sh census-play --decks "var/lab-j141/decks/$B" --replay "var/lab-j141/pilot-slice/$B.jsonl" --policy-a search --policy-b plain --game-timeout 900 --jobs {workers} --out "var/lab-j141/pilot/sp/$B"
done
```
cores: 1
```bash
python3 var/lab-j141/bin/read.py --slice var/lab-j141/pilot-slice --games var/lab-j141/pilot --decks var/lab-j141/decks \
    --census-games var/lab-j140/out/census-games.jsonl.gz --boot 200 --swaps 20 --min-games 1 --flow-min 1 --out var/lab-j141/pilot/out
head -40 var/lab-j141/pilot/out/pilot.md
```
metrics: ppj = sh: cat var/lab-j141/pilot/out/pilot.json 2>/dev/null || echo '{"games":0}'
metrics: pstrict = sh: python3 -c "import json,sys; json.load(open('var/lab-j141/pilot/out/pilot.json'), parse_constant=lambda c: sys.exit(1)); print(1)" 2>/dev/null || echo 0
metrics: proj_h = sh: python3 -c "import json; r=json.load(open('var/lab-j141/pilot/out/pilot.json'))['read5']; print(round((r['ss']['meanGameS'] * 2000 + (r['ps']['meanGameS'] + r['sp']['meanGameS']) * 2000) / 7 / 3600, 2))" 2>/dev/null || echo 99
check: merged == 1
check: has_tools == 1
check: qwriters == 0
check: inp.decksMatch == 4
check: inp.dckMissing == 0
check: inp.j140Games == 80000
check: sl.games == 2000
check: sl.bands.pauper.games == 500 and sl.bands.peasant.games == 500 and sl.bands.legacy.games == 500 and sl.bands.powered.games == 500
check: sl.shortfall == 0
check: sl.strataBelowQuota == 0
check: sl.pilotGames == 20
check: pstrict == 1
check: ppj.games == 20
check: ppj.integrity.ss.rows == 20 and ppj.integrity.ps.rows == 20 and ppj.integrity.sp.rows == 20
check: ppj.integrity.ss.missing + ppj.integrity.ps.missing + ppj.integrity.sp.missing == 0
check: ppj.integrity.ss.idMismatch + ppj.integrity.ps.idMismatch + ppj.integrity.sp.idMismatch == 0
check: ppj.integrity.ss.firstMismatch + ppj.integrity.ps.firstMismatch + ppj.integrity.sp.firstMismatch == 0
check: ppj.integrity.ss.firstCompared >= 19 and ppj.integrity.ps.firstCompared >= 19 and ppj.integrity.sp.firstCompared >= 19
check: ppj.integrity.ss.policyMismatch + ppj.integrity.ps.policyMismatch + ppj.integrity.sp.policyMismatch == 0
check: ppj.integrity.ss.countersMissing + ppj.integrity.ps.countersMissing + ppj.integrity.sp.countersMissing == 0
check: ppj.integrity.ss.countersUnexpected + ppj.integrity.ps.countersUnexpected + ppj.integrity.sp.countersUnexpected == 0
check: ppj.integrity.ff.notPlain == 0
check: ppj.integrity.ss.errorsTimeouts + ppj.integrity.ps.errorsTimeouts + ppj.integrity.sp.errorsTimeouts <= 1
check: ppj.counters.ss.seats >= 38 and ppj.counters.ps.seats >= 19 and ppj.counters.sp.seats >= 19
check: ppj.counters.ss.searched > 0 and ppj.counters.ps.searched > 0 and ppj.counters.sp.searched > 0
check: ppj.read5.ss.msPerDecision between 100 and 2000
check: proj_h <= 11

The pilot asks whether anything is broken:
- **The pin and the tools.** The pin is on origin/main and has `--replay`, `--policy-a/-b` and the search
  seat's counters. The census tests pass on it.
- **The inputs.** J140's 80,000 rows are there, and the four deck folders are J140's own, byte for byte.
  Every slice deck's `.dck` exists.
- **The slice.** 500 games a band, every stratum at its quota.
- **The replays.** 20 games under each of the three arm runs, each on the slice's game numbers, seeds,
  deck ids and first player, with the pilots asked for. Every search seat carries its counters and no plain
  seat does. At most one error or timeout in the 60 games.
- **The read** writes strict JSON.
- **The instrument.** ms a decision is between 100 and 2,000 (the budget is 1,500). The pilot's mean game
  times project the run at 11 h or less on 7 workers, which leaves room under the 12 h timeout. Pilot
  games run on 3 workers, so that projection is a floor, not an estimate.

No win rate is checked.

Dry run (2026-10-16): `tools/runner.sh dry-run --max-seconds 120 --workers 2 --no-build`, in the user and
mount namespace sandbox, against the PR worktree at bf88d0f1, beside the running J136. The J140 it read was
a synthetic one in the session's scratchpad:
- J140's own 10,000 decks, from its four `decks` commands, byte for byte;
- its first 10 games a band (`census-play --pairs 10 --jobs 1` on J140's seeds, so a true prefix of J140's
  pairing);
- J140's two gz files, made as its final block makes them.

What it showed:
- **pilot1** ok in 7 s. The 11 census tests pass, and the four linked deck folders match
  `census-decks.jsonl.gz` byte for byte. The slice took all 40 games, which gives `shortfall` 1,960 and 24
  strata under quota, as a 40-game J140 must. The pilot's subset is 20 games.
- **pilot2** was cut at 120 s with no error, after 4 of pauper's 5 search-vs-search games:
  - all 4 on the slice's seeds and deck ids, with J140's first player;
  - 8 search seats, 142 decisions searched (17.8 a seat a game), 1,063 ms a decision beside J136's 7 JVMs.
- **pilot3** ok in 1 s: strict JSON over the partial arms. It was read again offline with the final script
  (`--flow-min`), and read 2's fit and its census-wide reference ran on it.
- **Pilot checks.** Every check that depends on neither J140's size nor the cut passed: has_tools,
  qwriters, decksMatch, dckMissing, pilotGames, pstrict, the id, first-player, policy and counter checks,
  errors and ms a decision. These failed, as they must here:
  - merged, before #154 merges;
  - the J140-size checks: j140Games, the slice's games, shortfall, strata;
  - the cut replays' counts and proj_h.
- **run1** started arm S's pauper replay of the slice and was cut at 120 s. **run2** refused at once,
  because pauper's `games.jsonl` was under 500 lines.
- **The read at full size,** with no engine: a fabricated J140 (80,000 rows over J140's real decks) and
  fabricated arms, with effects planted. It recovered all three planted effects:
  - −3 points a flow card under Forge: census-wide −3.33 [−3.97, −2.67], slice −5.25 [−9.00, −1.28];
  - a blue shift under search: `U` diff +0.085 [0.035, 0.134];
  - the search seat's edge.

  It ran in 8 s on one thread, and a second run was byte-identical.
- **Sizing.** The dry run's 17.8 searched decisions a seat a game (pauper, 4 games) is below the 25-30 the
  sizing assumed. If that holds, the run is nearer 5 h than 7.4.
- **`tools/runner.sh check`:** lint clean with `--jobs-dir` naming J140's file. J140 is not on pc-jobs yet,
  so post it first, or `after-missing` fires.

## Commands
```bash
export CUBELAB_HOME_ROOT=var/cubelab/homes-J141
# band by band, the three arms of a band together; census-play resumes (it skips every game already in games.jsonl)
for B in pauper peasant legacy powered; do
  tools/cubelab.sh census-play --decks "var/lab-j141/decks/$B" --replay "var/lab-j141/slice/$B.jsonl" --policy-a search --policy-b search --game-timeout 900 --jobs {workers} --out "var/lab-j141/games/ss/$B"
  tools/cubelab.sh census-play --decks "var/lab-j141/decks/$B" --replay "var/lab-j141/slice/$B.jsonl" --policy-a plain --policy-b search --game-timeout 900 --jobs {workers} --out "var/lab-j141/games/ps/$B"
  tools/cubelab.sh census-play --decks "var/lab-j141/decks/$B" --replay "var/lab-j141/slice/$B.jsonl" --policy-a search --policy-b plain --game-timeout 900 --jobs {workers} --out "var/lab-j141/games/sp/$B"
done
```
cores: 1
```bash
for A in ss ps sp; do
  for B in pauper peasant legacy powered; do test "$(wc -l < "var/lab-j141/games/$A/$B/games.jsonl")" -eq 500; done
done
test -s var/lab-j141/bin/read.py
python3 var/lab-j141/bin/read.py --slice var/lab-j141/slice --games var/lab-j141/games --decks var/lab-j141/decks \
    --census-games var/lab-j140/out/census-games.jsonl.gz --boot 1000 --swaps 200 --seed 1411 --shrink 20 --min-games 20 --flow-min 50 --out var/lab-j141/out
for B in pauper peasant legacy powered; do cat "var/lab-j141/slice/$B.jsonl"; done | gzip -9 > var/lab-j141/out/slice-games.jsonl.gz
for A in ss ps sp; do
  for B in pauper peasant legacy powered; do cat "var/lab-j141/games/$A/$B/games.jsonl"; done
done | gzip -9 > var/lab-j141/out/pilot-games.jsonl.gz
head -80 var/lab-j141/out/pilot.md
```
check: played == 6000
check: gzs == 2000
check: gzp == 6000
check: strict == 1
check: pj.games == 2000
check: pj.deckGames == 4000
check: pj.integrity.ss.rows == 2000 and pj.integrity.ps.rows == 2000 and pj.integrity.sp.rows == 2000
check: pj.integrity.ss.missing + pj.integrity.ps.missing + pj.integrity.sp.missing == 0
check: pj.integrity.ss.extra + pj.integrity.ps.extra + pj.integrity.sp.extra + pj.integrity.ss.duplicate + pj.integrity.ps.duplicate + pj.integrity.sp.duplicate == 0
check: pj.integrity.ss.idMismatch + pj.integrity.ps.idMismatch + pj.integrity.sp.idMismatch == 0
check: pj.integrity.ss.firstMismatch + pj.integrity.ps.firstMismatch + pj.integrity.sp.firstMismatch == 0
check: pj.integrity.ss.firstCompared >= 1950 and pj.integrity.ps.firstCompared >= 1950 and pj.integrity.sp.firstCompared >= 1950
check: pj.integrity.ss.policyMismatch + pj.integrity.ps.policyMismatch + pj.integrity.sp.policyMismatch == 0
check: pj.integrity.ff.notPlain == 0
check: pj.integrity.ss.errorsTimeouts <= 40
check: pj.integrity.ps.errorsTimeouts <= 40
check: pj.integrity.sp.errorsTimeouts <= 40
check: pj.integrity.ss.countersMissing + pj.integrity.ps.countersMissing + pj.integrity.sp.countersMissing == 0
check: pj.integrity.ss.countersUnexpected + pj.integrity.ps.countersUnexpected + pj.integrity.sp.countersUnexpected == 0
check: pj.counters.ss.seats >= 3920 and pj.counters.ps.seats >= 1960 and pj.counters.sp.seats >= 1960
check: pj.counters.ss.searched > 0 and pj.counters.ps.searched > 0 and pj.counters.sp.searched > 0
check: pj.read5.ss.msPerDecision > 0 and pj.read5.ps.msPerDecision > 0 and pj.read5.sp.msPerDecision > 0
check: cards >= 1500

What the checks mean:
- **The slice is the pairing list.** All 6,000 games were played and are in the gzipped file. Every arm
  replayed exactly the 2,000 slice games, with no game missing, extra or doubled. Each was on the slice's
  seed and deck ids, with J140's first player wherever both rows name one (at least 1,950 of 2,000), and
  under the pilots asked for.
- **Both arms are complete.** Each arm run has at most 2% errors plus timeouts (40 of 2,000).
- **The counters are there.** Every search seat carries its counters and no plain seat does. Each arm has
  its search seats (two a game in S, one in M, less the errors), searched decisions and a time per
  decision.
- **The read** wrote strict JSON over 2,000 games and 4,000 deck-games, and `cards-by-pilot.tsv` has at
  least 1,500 band-and-card rows.

No check is on a win rate, a coefficient, a correlation or a card.

## Abort if
abort: qwriters > 0
abort: played >= 300 and engine_errors > 0.02 * played
abort: played >= 300 and timeouts > 0.05 * played
- Free disk under 5 GB (the rows are a few MB; the worker logs are the larger part).

**Not beside a queue night.** It aborts if a `queue run` starts: the search's budget is wall-clock time,
so a crowded machine changes how search plays. `census-play` resumes: run again, it skips every game in
`games.jsonl` and refuses other options. To stop cleanly: `tools/runner.sh stop J141`, and `resume`
carries on.

## Report
collect: var/lab-j141/out/pilot.json
collect: var/lab-j141/out/pilot.md
collect: var/lab-j141/out/cards-by-pilot.tsv
collect: var/lab-j141/out/slice-games.jsonl.gz
collect: var/lab-j141/out/pilot-games.jsonl.gz
collect: var/lab-j141/slice.json
collect: var/lab-j141/inputs.json

summary.md is the PC session's; the job's own outputs are the files above. It covers:
- **The pin and the slice.** The slice seed 1411. Per band: the eligible games, the strata's available,
  quota and drawn counts, the deck-games by colour-count group, main colour and card flow (`slice.json`),
  and the deck check (`inputs.json`).
- **The integrity.** Per arm: rows, missing, id and first-player mismatches, errors, timeouts and draws.
- **Read 1.** The main-colour table first, then colours with 3+ spells, then has-the-colour. For each:
  FF, SS and the paired difference, with their deck-bootstrap intervals and deck-games. The `U` row is the
  blue question; give it first in words, with its interval.
- **Read 2.** The bands that entered. Then β under Forge on the slice, under search on the slice, the
  paired difference, and the census-wide Forge β, each with its interval. Then the flow bins. Say what the
  slice can resolve (about ±4 points).
- **Read 3.** The included count, then Spearman (shrunk and raw) with its interval beside the swap
  reference. Then the mean move by card colour and for the flow cards, and the two lists of 20, each card
  with its n under each pilot, both ratings, the move and the paired difference with its interval.
- **Read 4.** The overall edge, then the edge, search-pilot win rate and lift by main colour, colours,
  card-flow bin and band.
- **Read 5.** Per arm, from `pilot.md`'s last table: searched and changed by kind, ms a decision, the
  budget fallbacks with their interval, and searched decisions a seat a game. Put them beside J131's 772 ms
  and 0.4-0.5% budget fallbacks.
- **No verdict.** Every difference is a candidate until it holds on a fresh slice (D447 point 9). Search-v2
  plays Forge's AI inside its rollouts, so a move is a lower bound on how much the pilot matters. The decks
  are random draws from a band's pool, so every rate is "in a random deck of this makeup". Name no colour or
  card as better or worse.
- **The run.** The wall time, the games an hour per arm from each folder's `census-play.json`, and the
  per-decision time against the sizing's 772 ms, so the next slice is sized on it.
