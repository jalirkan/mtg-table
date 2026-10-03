# The matchup model, bridge drafts and the queue — what was run (2026-10-03, D322–D324)

Branch `c/matchup-model`, off `main`'s `f8ea676`. The engine: the pinned Forge
2.0.14 fat jar (`FORGE_JAR=` a copy in the session scratchpad), OpenJDK 21,
Node 24, Python 3.11 with numpy 2.4 and torch 2.14 (CPU). The machine: a
4-core container shared with four other sessions (load 7 to 130 during these
runs), so the cloud ran smoke tests only (at most one engine JVM, 20 games or
fewer a run) and the real data is the owner's PC's (PLAN.md's *The matchup
model*).

## 1. Bridge drafts and the queue, smoke-run

```bash
tools/cubelab.sh run --bridge pauper,vintage --drafts 2 --games 1 --jobs 1 --seed 5 --out var/mm/bridge-smoke   # own ratings (before D322's even)
tools/cubelab.sh queue run --night 1 --drafts 12 --bridge-share 0.5 --min-drafts 2 --chunk 2 --jobs 1 --root var/mm/qsmoke
tools/cubelab.sh queue run --night 1 --jobs 1 --root var/mm/qsmoke            # again: 0 drafts played, ~1 s
tools/cubelab.sh run --bridge pauper,vintage --drafts 4 --games 1 --jobs 1 --seed 5 --out var/mm/bridge-even    # even ratings
```

- The queue: one engine lookup of all 722 cards (19.1 s), then twelve chunks
  (six cubes' own drafts, six bridge pairs; Omega's share fell under
  `--min-drafts` at 12 drafts), 31–177 s each, every draft a decisive game;
  run again, it re-read `night-1.json` and played nothing; `queue plan
  --night 2` continued every key's seeds from the ledger.
- A bridge pool: 90 + 90 cards, section-stratified, no card twice, every
  draft line tagged `bridge.from`; `report` reads the folder.
- **Composition, the review's worry.** Spells from Pauper in each played deck
  of a Pauper + Vintage draft, the same seeds 5 and 6: under each cube's own
  ratings 0.31, 0.30 and 0.50, 0.17; under `--bridge-ratings even` 0.52,
  0.44 and 0.56, 0.41 (seeds 7, 8: 0.50, 0.42 and 0.46, 0.44). The other
  pairs' decks (own ratings, `queue` smoke): 0.35–0.53 from the flatter cube.

## 2. The model, on every decisive game on disk

```bash
python3 tools/ml/matchup.py train var/mm/bridge-smoke var/mm/qsmoke var/cubelab/mm /home/user/mtg-table/var/cubelab/runs \
    --out var/mm/m5 --facts var/cubelab/facts /home/user/mtg-table/var/cubelab/facts --boot 20 --holdout-cubes all --embed 8
```

7 min 52 s. The data: the cube lab's earlier runs in the main checkout
(Synergy grid 40, Pauper grid 20, Vintage grid 20, Modern-Era Winston 20, best
of three), 28 Fair Fight drafts and 6 queue drafts from this lane's first,
stopped batch, and the smoke runs above. Its `report.md`, as written:


**Sample:** 285 decisive games (8 bridge) from 143 drafts in 20 run folder(s); 5 duplicate game(s) skipped. Split by draft: 201 train, 39 validation, 45 test games. 727 cards, 5 of them without engine facts.

**Prior widths by 5-fold cross-validation grouped by draft:** M0 tau = 0.002 logits per card copy (deck-difference prior SD 0.01), tauW = 0.003; M1 tauCube = 0.01; plain BT tau = 0.005. Play/draw: beta = +0.080 logits.

#### Held-out drafts, all games (test split)

45 games from 20 drafts.

| model | log-loss | Brier | accuracy | ECE | log-loss minus coin [95% CI, bootstrap over drafts] |
|---|---|---|---|---|---|
| (a) coin | 0.6722 | 0.2396 | 0.644 | 0.102 |  |
| (b) additive: Bradley-Terry on cards | 0.6813 | 0.2441 | 0.644 | 0.124 | +0.0091 [-0.0011, +0.0181] |
| (c) per-cube shrunk win rates (meta.json) | 0.5979 | 0.2082 | 0.667 | 0.117 | -0.0743 [-0.1839, +0.0091] |
| M0 pooled BT + feature prior | 0.6752 | 0.2411 | 0.600 | 0.073 | +0.0030 [-0.0142, +0.0185] |
| M1 = M0 + per-cube deviations | 0.6748 | 0.2409 | 0.622 | 0.095 | +0.0026 [-0.0147, +0.0182] |
| M2 = M0 + 8-dim embeddings | 0.7049 | 0.2559 | 0.489 | 0.085 | +0.0326 [-0.0163, +0.0832] |

#### Held-out drafts, in-cube games

45 games from 20 drafts.

| model | log-loss | Brier | accuracy | ECE | log-loss minus coin [95% CI, bootstrap over drafts] |
|---|---|---|---|---|---|
| (a) coin | 0.6722 | 0.2396 | 0.644 | 0.102 |  |
| (b) additive: Bradley-Terry on cards | 0.6813 | 0.2441 | 0.644 | 0.124 | +0.0091 [-0.0011, +0.0181] |
| (c) per-cube shrunk win rates (meta.json) | 0.5979 | 0.2082 | 0.667 | 0.117 | -0.0743 [-0.1839, +0.0091] |
| M0 pooled BT + feature prior | 0.6752 | 0.2411 | 0.600 | 0.073 | +0.0030 [-0.0142, +0.0185] |
| M1 = M0 + per-cube deviations | 0.6748 | 0.2409 | 0.622 | 0.095 | +0.0026 [-0.0147, +0.0182] |
| M2 = M0 + 8-dim embeddings | 0.7049 | 0.2559 | 0.489 | 0.085 | +0.0326 [-0.0163, +0.0832] |

#### Held-out drafts, bridge games

0 games from 0 drafts.

(none)

Calibration of M0 on the test split:

| bin | games | predicted | observed |
|---|---|---|---|
| 0.4-0.5 | 27 | 0.468 | 0.407 |
| 0.5-0.6 | 18 | 0.521 | 0.611 |

#### Out-of-fold, every game (5 folds by draft)

285 games from 143 drafts.

| model | log-loss | Brier | accuracy | ECE | log-loss minus coin [95% CI, bootstrap over drafts] |
|---|---|---|---|---|---|
| (a) coin | 0.6925 | 0.2497 | 0.540 | 0.013 |  |
| (b) additive: Bradley-Terry on cards | 0.6933 | 0.2501 | 0.519 | 0.033 | +0.0008 [-0.0064, +0.0083] |
| (c) per-cube shrunk win rates (meta.json) | 0.7782 | 0.2724 | 0.561 | 0.149 | +0.0858 [+0.0022, +0.1779] |
| M0 pooled BT + feature prior | 0.7040 | 0.2541 | 0.533 | 0.040 | +0.0116 [-0.0104, +0.0367] |
| M1 = M0 + per-cube deviations | 0.7060 | 0.2550 | 0.537 | 0.042 | +0.0135 [-0.0106, +0.0398] |
| M2 = M0 + 8-dim embeddings | 0.7719 | 0.2754 | 0.561 | 0.126 | +0.0795 [+0.0217, +0.1449] |

#### Out-of-fold, in-cube games

277 games from 135 drafts.

| model | log-loss | Brier | accuracy | ECE | log-loss minus coin [95% CI, bootstrap over drafts] |
|---|---|---|---|---|---|
| (a) coin | 0.6937 | 0.2503 | 0.531 | 0.004 |  |
| (b) additive: Bradley-Terry on cards | 0.6948 | 0.2508 | 0.509 | 0.044 | +0.0011 [-0.0063, +0.0088] |
| (c) per-cube shrunk win rates (meta.json) | 0.7867 | 0.2758 | 0.552 | 0.155 | +0.0930 [+0.0086, +0.1844] |
| M0 pooled BT + feature prior | 0.7063 | 0.2552 | 0.523 | 0.052 | +0.0126 [-0.0091, +0.0386] |
| M1 = M0 + per-cube deviations | 0.7084 | 0.2562 | 0.527 | 0.046 | +0.0147 [-0.0094, +0.0413] |
| M2 = M0 + 8-dim embeddings | 0.7759 | 0.2769 | 0.556 | 0.122 | +0.0822 [+0.0236, +0.1518] |

#### Out-of-fold, bridge games

8 games from 8 drafts.

| model | log-loss | Brier | accuracy | ECE | log-loss minus coin [95% CI, bootstrap over drafts] |
|---|---|---|---|---|---|
| (a) coin | 0.6513 | 0.2291 | 0.875 | 0.343 |  |
| (b) additive: Bradley-Terry on cards | 0.6407 | 0.2238 | 0.875 | 0.328 | -0.0106 [-0.0329, +0.0174] |
| (c) per-cube shrunk win rates (meta.json) | 0.4854 | 0.1527 | 0.875 | 0.250 | -0.1659 [-0.2752, -0.0580] |
| M0 pooled BT + feature prior | 0.6252 | 0.2161 | 0.875 | 0.374 | -0.0261 [-0.1147, +0.0812] |
| M1 = M0 + per-cube deviations | 0.6232 | 0.2151 | 0.875 | 0.289 | -0.0281 [-0.1166, +0.0787] |
| M2 = M0 + 8-dim embeddings | 0.6353 | 0.2221 | 0.750 | 0.328 | -0.0160 [-0.1082, +0.0690] |

### Cubes held out entirely

A fit with every game touching the cube removed (its drafts and its bridges), scored on all of the cube's in-cube games. Its cards are known only from other cubes' games and from their features. (c) cannot rate an unseen cube.

| cube | games | drafts | coin | additive | M0 | M1 | M0 minus coin [95% CI] |
|---|---|---|---|---|---|---|---|
| fair-fight | 32 | 32 | 0.6873 | 0.6840 | 0.6829 | 0.6831 | -0.0044 [-0.0267, +0.0205] |
| modern-era | 48 | 21 | 0.6951 | 0.7037 | 0.6933 | 0.6915 | -0.0018 [-0.0233, +0.0220] |
| omega | 0 | | | | | | too few games |
| pauper | 49 | 20 | 0.7099 | 0.7148 | 0.7070 | 0.7082 | -0.0029 [-0.0141, +0.0080] |
| peasant | 1 | | | | | | too few games |
| synergy | 96 | 41 | 0.6953 | 0.7588 | 0.7565 | 0.7564 | +0.0611 [+0.0223, +0.1031] |
| vintage | 51 | 20 | 0.6915 | 0.6923 | 0.6900 | 0.6896 | -0.0015 [-0.0253, +0.0216] |

### Balance: the predicted win-rate spread of the decks each cube produces

Every deck the cube produced in the data, against the cube's other decks, play and draw averaged. SD across decks in win-rate points; the range is the 2.5-97.5 percentiles over the bootstrap refits (by draft). The model shrinks toward even odds, so with few games this understates the true spread.

| cube | decks | SD (points) | bootstrap range | IQR | best deck | worst deck |
|---|---|---|---|---|---|---|
| fair-fight | 64 | 1.8 | 1.2-3.2 | 2.7 | 53.6% | 47.0% |
| modern-era | 42 | 2.0 | 1.4-3.7 | 2.5 | 54.8% | 46.4% |
| pauper | 40 | 1.4 | 1.2-3.0 | 1.1 | 53.4% | 47.4% |
| synergy | 82 | 1.6 | 1.0-2.7 | 2.6 | 53.7% | 47.0% |
| vintage | 40 | 1.7 | 1.5-3.0 | 2.4 | 54.1% | 47.5% |

### Bridge decks: how much of each deck came from each cube

`first` is the pair's lower-power cube (queue.ts orders pairs that way). A share near 0 means the drafters took the stronger cube's cards.

| pair | decks | mean share from first cube | decks >75% one side | distinct cards played per cube |
|---|---|---|---|---|
| fair-fight+modern-era | 2 | 0.531 | 0 | {'fair-fight': 26, 'modern-era': 23} |
| fair-fight+synergy | 2 | 0.425 | 0 | {'fair-fight': 20, 'synergy': 27} |
| pauper+modern-era | 2 | 0.5 | 0 | {'pauper': 23, 'modern-era': 23} |
| pauper+synergy | 2 | 0.347 | 0 | {'pauper': 18, 'synergy': 34} |
| pauper+vintage | 4 | 0.319 | 1 | {'pauper': 28, 'vintage': 58} |
| peasant+modern-era | 2 | 0.417 | 0 | {'peasant': 20, 'modern-era': 28} |
| peasant+synergy | 2 | 0.47 | 0 | {'peasant': 23, 'synergy': 26} |

### Overlap

```
{
 "cubes": 7,
 "cardSlots": 1260,
 "distinctCards": 722,
 "slotsPerCard": 1.745,
 "games": 285,
 "gamesWithASharedCard": 285,
 "cardGames": 14140,
 "sharedCardGames": 10188,
 "sharedShare": 0.7205,
 "cubeSlotsInformedPerCardGame": 2.832,
 "gamesNeededRatio": 0.573
}
```

### Strongest and weakest cards (M0 power; x25 for win-rate points)

| card | power | sd | prior | games | cubes |
|---|---|---|---|---|---|
| Anax, Hardened in the Forge | +0.024 | 0.008 | +0.024 | 5 | synergy |
| Fury | +0.017 | 0.007 | +0.017 | 30 | modern-era,omega,vintage |
| Hangarback Walker | +0.016 | 0.008 | +0.016 | 62 | fair-fight,omega,synergy |
| Adeline, Resplendent Cathar | +0.016 | 0.010 | +0.016 | 68 | omega,synergy,vintage |
| Omnath, Locus of Rage | +0.016 | 0.006 | +0.016 | 3 | synergy |
| The Wandering Emperor | +0.015 | 0.005 | +0.015 | 2 | omega,vintage |
| Yahenni, Undying Partisan | +0.015 | 0.006 | +0.015 | 1 | peasant |
| Wurmcoil Engine | +0.015 | 0.011 | +0.015 | 49 | modern-era,omega,vintage |
| Ajani Vengeant | +0.014 | 0.005 | +0.014 | 3 | modern-era |
| Karn, Scion of Urza | +0.014 | 0.006 | +0.014 | 71 | omega,synergy,vintage |
| Pia Nalaar | +0.014 | 0.006 | +0.014 | 18 | fair-fight,synergy |
| Myr Battlesphere | +0.014 | 0.007 | +0.014 | 41 | vintage |
| Archmage's Charm | -0.019 | 0.009 | -0.019 | 8 | modern-era |
| Exclude | -0.019 | 0.009 | -0.019 | 54 | fair-fight,pauper |
| Cryptic Command | -0.020 | 0.012 | -0.020 | 7 | modern-era,omega |
| Mystic Confluence | -0.020 | 0.012 | -0.020 | 26 | vintage |
| Remand | -0.022 | 0.009 | -0.022 | 73 | modern-era,synergy |
| The One Ring | -0.032 | 0.014 | -0.032 | 24 | modern-era |



## 3. The balance number beside ForgeCoach's flatness

ForgeCoach's `src/cube/flatness.ts` (`cubeSpread`, its shipped
`public/cubes/*.meta.json`, 47–95 games a cube), true SD in win-rate points
with its 95% interval:

| cube | games | cards | archetypes | matchup model: deck SD (bootstrap range) |
|---|---|---|---|---|
| modern-era | 47 | 3.3 [0.0, 7.9] unclear | 8.0 [0.0, 29.5] unreadable | 2.0 (1.4–3.7) |
| pauper | 49 | 7.0 [3.5, 10.4] uneven | 14.0 [0.0, 46.7] unreadable | 1.4 (1.2–3.0) |
| synergy | 95 | 6.6 [4.4, 9.0] uneven | 12.3 [0.0, 25.5] unclear | 1.6 (1.0–2.7) |
| vintage | 51 | 0.0 [0.0, 3.9] unclear | 0.0 [0.0, 8.2] unreadable | 1.7 (1.5–3.0) |

Not comparable yet, and neither is a verdict: flatness subtracts binomial
noise that clumped games understate (the review's M4), and the model's τ of
0.002 shrinks every deck to even odds, so its spread is a floor set by the
prior. Both say the same thing — these samples cannot tell the cubes apart.

## 4. The design prototype

```bash
python3 tools/ml/matchup.py design --model var/mm/m3 --target-cube synergy --iters 4000 --out var/mm/design/synergy-proposed.md
```

Unguarded, the first version swapped 144 of Synergy's 180 cards on powers
inside their own SDs, dropped the sacrifice theme and added Black Lotus;
with `--max-swaps 20`, candidates only from cubes at or below the target's
power tier, and a cost per swap, it made 20 in-class swaps (colour-pair
strength SD 0.037 → 0.025 logits). At this sample those swaps are noise; the
output says PROPOSED BY MODEL, UNVERIFIED and gives the lab's verification
command.

## 5. Tests

`python3 -m unittest tools/ml/tests/test_matchup.py`: 13 tests, 14–47 s
(the record, the overlap arithmetic, a planted strong card recovered with
its bootstrap SD, a shared feature carrying three strong cards, a tight prior
chosen when cards do not differ, antisymmetry, the split by draft, the
spread, dual and primal Newton agreeing). `node --test
web/test/cubelab-bridge.test.ts`: 9 tests (pool determinism, shares,
stratification, overlap, even ratings, the queue's pairs, seeds once across
nights, coverage).
