id: J133
title: Cube populations compared for balance (D439): Synergy v2 (current), Synergy v1, Omega, Fair Fight and Synergy v2 with 17 lands forced in the lab builder, 600 grid drafts each on the SAME seed block (833,000,001-833,000,600), best of three, Default vs Default, unrecorded; tools/cubelab.sh compare's pre-registered measures with paired draft-clustered bootstrap intervals, no verdict rule
public_title: Cube balance: five cube populations compared
public_est: ~2-3 h
public_decides: Which cube population drafts the more balanced AI decks (a measurement)
cpu: heavy
cores: 7
pilot_cores: 3
max_workers: 7
mem_per_worker_gb: 2
repos: mtg-table@ac8e2e73 (the head of branch pc/cubelab-compare, mtg-table PR #147 (D439): `tools/cubelab.sh compare`, tools/cubelab/compare.ts and flatness.ts; the pilot's first check is that this commit is on origin/main -- re-pin to the merge commit if the PR is squashed)
decides: which cube population tends towards the more balanced AI deck builds (Justin, 2026-10-15): a measurement for the owner and the cloud to read, not a switch
hypothesis: none to confirm. Synergy v1 and v2 differ by three cards (Skullclamp, Ledger Shredder, Man-o'-War out; Yawgmoth, Reanimate, Murderous Redcap in), so their differences should be small and mostly not shown; the 17-land variant draws the same deals as v2 and changes only the builder's 16-land choice (about a quarter to a third of Synergy decks), so its deck-health rows move and its balance rows probably do not; Omega (powered) and Fair Fight (flat by design) are the cubes most likely to differ from Synergy
rule: D439, written 2026-10-15 before any J133 draft: the measures are compare's eleven (flatness, pair_spread, pair_within5, draw_rate, timeout_rate, game_turns, lands, colours, two_colour, splash, first_pick_top10), each with a 95% paired draft-clustered bootstrap interval (1,000 replicates, boot seed 1, colour pairs with 30+ decisive games); NO verdict rule is given. The report ranks the populations on each measure with their intervals and lists the pairwise differences whose interval excludes 0; it calls no population better or more balanced
followup: morning-read
est: ~2-2.5 h on 7 workers, pilot included. 3,000 drafts at best of three. J120 (Synergy, best of three, 7 workers) played 1,693 drafts in 1 h 14 m: 2.6 s a draft wall-clock, 6.1 s a game mean, 2.2 s median; the three Synergy populations (1,800 drafts) take ~80 min. Omega and Fair Fight games were shorter in this PC's smoke (Omega 2.6 s of game-thread CPU a game against Synergy's 19 s, the mean of six held up by one 95 s game), so their 1,200 drafts take ~30-50 min. The populations run one after another, each ending on its slowest games. Pilot ~10-15 min; the analysis under a minute
resumable: yes
timeout: 8h
progress: cubelab var/lab-j133/compare/runs of 3000
metrics: qwriters = sh: pgrep -fc '[c]ubelab.* queue run' || true
metrics: ev = cubelab var/lab-j133/compare/runs
metrics: strict = sh: python3 -c "import json,sys; json.load(open('var/lab-j133/compare/compare.json'), parse_constant=lambda c: sys.exit(1)); print(1)" 2>/dev/null || echo 0
metrics: cmp = sh: cat var/lab-j133/compare/compare.json 2>/dev/null || echo '{"written":0}'
headline: cmp.pop.synergy.m.flatness.est, cmp.pop.synergy_v1.m.flatness.est, cmp.pop.omega.m.flatness.est, cmp.pop.fair_fight.m.flatness.est, cmp.pop.synergy_17.m.flatness.est, cmp.drafts, cmp.same_seeds

**Why (Justin, 2026-10-15).** "Do some testing with different cube populations to see which one tends towards a
more balanced deck build by the AIs." mtg-table's D439 (`tools/cubelab.sh compare`) plays several cube populations
through the lab's own `run` on one seed block and measures each the same way, with intervals; `docs/guides/cube-lab.md`'s
*Comparing cube populations* is the manual. This job is its first use: five populations, a measurement only.

**The populations** (each an ordinary cube-lab run under `var/lab-j133/compare/runs/<name>/`, grid, best of three,
Default vs Default, the lab builder, unrecorded, no exploration, no profile mix):
- `synergy`: `cubes/synergy-cube-180.md` as it is on main (v2, 2026-10-10), its ratings file beside it.
- `synergy_v1`: the same document at `4b424a25` (v1, the parent of the v2 commit `8227c88d`), with that commit's
  ratings file, copied by `git show` into `var/lab-j133/cubes/synergy-v1-cube-180.md` and `.ratings.tsv` beside it.
- `omega`: `cubes/omega-cube-180.md`, on Forge's ranks (it has no default ratings file; the raised file is not the
  default, D360).
- `fair_fight`: `cubes/fair-fight-cube-180.md`, its ratings file beside it.
- `synergy_17`: `synergy` with the lab weight `sixteenLandsAt=0`: the builder's first pass plays 16 lands only when
  its spells average mana value 0 or less, so never; every first-pass deck is 17 lands and 23 spells (a thin pool's
  second pass may still build 18, D298). The lab supports it as a weight, so the variant runs. Same seeds, so the
  same deals and picks as `synergy`: only the decks and games differ.

**Seeds.** 833,000,001-833,000,600 for every population (D340's verification range; no job in `jobs/` uses 833M),
and 833,900,001-833,900,006 for the pilot. compare refuses unless every population holds exactly the same seeds.

**The measures** (D439, pre-registered; per population, each with its 95% interval): card-rate flatness (ForgeCoach's
`flatness.ts` true SD, cards with 10+ decisive games), colour-pair spread (max - min over pairs with 30+ decisive
games) and the share of those pairs within 5 points of 50%, draw and timeout rates and mean turns a game, the played
decks' mean lands and colours and their two-colour and splash shares, and first-pick concentration (the share of
first-line cards held by the 10 most frequent). Intervals: 1,000 replicates of a draft-clustered bootstrap that
resamples the seeds jointly across populations, so each pairwise difference is paired.

**No verdict.** No `--rule` is passed. `compare.md` ranks the populations on each measure (1 = lowest) with their
intervals and lists every pairwise difference with its interval and whether it excludes 0. "Balanced" is not one
number: the summary reports, measure by measure, which differences are shown, and leaves the reading to the owner.

**Tests (on the PC, 2026-10-16; no cloud run).** `runner.sh check`: lint clean, machine-checked. `dry-run --max-seconds
90 --workers 2` (sandboxed, at the pin): every block starts, the tests pass, Synergy v1 is copied and checks 180 of
180 in Forge 2.0.14's DB, and the runs begin. `dry-run --pilot-only --max-seconds 1800 --workers 3`: the pilot in 327 s
on a loaded machine, every pilot check PASS but `merged == 1` (the PR was not merged yet): five populations, the same
six seeds, 30 drafts, 0 engine errors, 0 timeouts, compare.json strict, the 17-land variant at 17.0 lands. The code's
own smoke (two cubes and the 17-land variant, 6 drafts, 1 game, 2 workers) is in the PR.

**Not beside a queue night.** It aborts if a `queue run` starts. Justin at the table holds it as usual; every run
resumes (`run` skips the seeds it has), and compare's analysis is a pure function of the run folders. To stop it
cleanly: `tools/runner.sh stop J133` (and `resume` carries on).

## Pilot
About 10-15 minutes: the pin is merged; the compare tests on this pin; Synergy v1 copied out of git and checked
against Forge 2.0.14; then the whole command at 6 drafts a population (seeds 833,900,001+, the pilot's own folder),
best of three. At 6 drafts no card has 10 games, so the pilot's flatness rows are empty by design; the checks ask
only that every population ran on the same seeds and that compare.json is strict and complete.
```bash
git merge-base --is-ancestor HEAD origin/main && echo 1 > var/j133-merged.txt || echo 0 > var/j133-merged.txt
cat var/j133-merged.txt
node --test web/test/cubelab-compare.test.ts
mkdir -p var/lab-j133/cubes
git show 4b424a25:cubes/synergy-cube-180.md > var/lab-j133/cubes/synergy-v1-cube-180.md
git show 4b424a25:cubes/synergy-cube-180.ratings.tsv > var/lab-j133/cubes/synergy-v1-cube-180.ratings.tsv
head -1 var/lab-j133/cubes/synergy-v1-cube-180.md
export CUBELAB_HOME_ROOT=var/cubelab/homes-J133
tools/cubelab.sh check var/lab-j133/cubes/synergy-v1-cube-180.md > var/lab-j133/v1-check.txt || true
cat var/lab-j133/v1-check.txt | head -20
grep -c "version 1" var/lab-j133/cubes/synergy-v1-cube-180.md > var/lab-j133/v1-is-v1.txt || echo 0 > var/lab-j133/v1-is-v1.txt
rm -rf var/lab-j133/pilot
tools/cubelab.sh compare cubes/synergy-cube-180.md cubes/omega-cube-180.md cubes/fair-fight-cube-180.md \
    --variant synergy_v1=var/lab-j133/cubes/synergy-v1-cube-180.md \
    --variant synergy_17=cubes/synergy-cube-180.md,weight.sixteenLandsAt=0 \
    --drafts 6 --games 3 --jobs {workers} --seed 833900001 --out var/lab-j133/pilot
cat var/lab-j133/pilot/compare.md | head -40
```
metrics: merged = sh: cat var/j133-merged.txt 2>/dev/null || echo 0
metrics: v1db = sh: awk '/^in Forge.s DB/{print $4; f=1} END{if(!f) print 0}' var/lab-j133/v1-check.txt 2>/dev/null || echo 0
metrics: v1miss = sh: grep -c "^  MISSING" var/lab-j133/v1-check.txt 2>/dev/null || true
metrics: v1is = sh: cat var/lab-j133/v1-is-v1.txt 2>/dev/null || echo 0
metrics: pstrict = sh: python3 -c "import json,sys; json.load(open('var/lab-j133/pilot/compare.json'), parse_constant=lambda c: sys.exit(1)); print(1)" 2>/dev/null || echo 0
metrics: pc = sh: cat var/lab-j133/pilot/compare.json 2>/dev/null || echo '{"written":0}'
metrics: pe = cubelab var/lab-j133/pilot/runs
check: merged == 1
check: qwriters == 0
check: v1is >= 1
check: v1db == 180
check: v1miss == 0
check: pstrict == 1
check: pc.same_seeds == 1
check: pc.populations == 5
check: pc.drafts == 6
check: pc.seed_first == 833900001
check: pc.seed_last == 833900006
check: pc.pop.synergy.drafts == 6
check: pc.pop.synergy_v1.drafts == 6
check: pc.pop.omega.drafts == 6
check: pc.pop.fair_fight.drafts == 6
check: pc.pop.synergy_17.drafts == 6
check: pc.pop.synergy_17.m.lands.est >= 17
check: pc.boot.replicates == 1000
check: pe.drafts == 30
check: pe.engine_errors == 0
check: pe.timeouts <= 2
check: pe.recorded_games == 0

The pilot asks whether anything is broken: the pin is merged; the compare tests pass on it (ForgeCoach's flatness
golden among them); Synergy v1 is v1 and all 180 of its cards are in Forge 2.0.14; the five 6-draft runs finished
with no engine error; compare.json parses as strict JSON (Python's parser refusing NaN and infinities) and says the
five populations hold the same six seeds; the 17-land variant's decks average 17 lands or more. No balance number is
checked: the job is the measurement.

## Commands
```bash
export CUBELAB_HOME_ROOT=var/cubelab/homes-J133
test -s var/lab-j133/cubes/synergy-v1-cube-180.md
test -s var/lab-j133/cubes/synergy-v1-cube-180.ratings.tsv
tools/cubelab.sh compare cubes/synergy-cube-180.md cubes/omega-cube-180.md cubes/fair-fight-cube-180.md \
    --variant synergy_v1=var/lab-j133/cubes/synergy-v1-cube-180.md \
    --variant synergy_17=cubes/synergy-cube-180.md,weight.sixteenLandsAt=0 \
    --drafts 600 --games 3 --jobs {workers} --seed 833000001 --out var/lab-j133/compare
cat var/lab-j133/compare/compare.md
```
check: strict == 1
check: cmp.same_seeds == 1
check: cmp.populations == 5
check: cmp.drafts == 600
check: cmp.seed_first == 833000001
check: cmp.seed_last == 833000600
check: cmp.boot.replicates == 1000
check: cmp.pop.synergy.flatness_detail.readable == 1
check: cmp.pop.synergy_v1.flatness_detail.readable == 1
check: cmp.pop.omega.flatness_detail.readable == 1
check: cmp.pop.fair_fight.flatness_detail.readable == 1
check: cmp.pop.synergy_17.flatness_detail.readable == 1
check: ev.drafts == 3000
check: ev.engine_error_rate <= 2%
check: ev.recorded_games == 0

## Abort if
abort: qwriters > 0
abort: ev.drafts >= 500 and ev.engine_errors > 0.02 * ev.drafts
abort: ev.games >= 500 and ev.timeouts > 0.05 * ev.games

## Report
collect: var/lab-j133/compare/compare.json
collect: var/lab-j133/compare/compare.md
The summary (written by the PC session as `summary.md`; the job's own outputs are `compare.json` and `compare.md`)
says, per measure, the five estimates with their intervals in rank order, and every pairwise difference whose
interval excludes 0, with the size of that difference. It names no population "more balanced" overall and draws no
verdict: no rule was registered. It notes the run's engine errors and timeouts, the drafts' wall-clock, and how many
colour pairs each population had with 30+ decisive games (compare.md's line under pair_spread).
