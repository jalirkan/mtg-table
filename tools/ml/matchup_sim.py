#!/usr/bin/env python3
# mtg-table — tools/ml: a simulated world for checking the matchup model's uncertainty and balance numbers.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""Synthetic cube-lab games with KNOWN card powers, fitted by matchup.py's own code (D342).

    python3 tools/ml/matchup_sim.py [--sigma 0.06] [--games 1000,4000,12000] [--cards 300] [--seed 7] [--boot 8]

The methodology review's simulation (review 2, sim_matchup.py) in the model's
own classes: V cards with true powers b ~ N(0, sigma^2), several overlapping
cubes, 23-card decks drafted with a preference for stronger cards (a drafter's
rating correlated 0.5 with the truth), one game per draft, logit P(A) = sum
(n_A - n_B) b + beta s.  Each size is fitted by `Linear.select` (tau by
grouped cross-validation, as `train` does) and reports:

  - COVERAGE of 95% intervals for card power (est +- 1.96 sd, centred as
    power.tsv centres) with sd = the Laplace posterior SD (sdPost, D342) and
    with sd = the bootstrap of the MAP (sdBoot, the old `sd`), over all seen
    cards and the least-seen fifth;
  - BALANCE of cube 0: the true SD of its decks' win rates against each other
    (from the true powers), the old number (the MAP's spread) and the
    de-biased one (balance_posterior), with its interval.

`--tau-by cv` fits as D324 did (grouped cross-validation); the default is
`evidence`, what `train --tau-by auto` uses with one game per draft.

Seeded; the defaults finish in well under a minute.  tests/test_matchup.py runs
a smaller world on every gate.
"""
from __future__ import annotations

import argparse
import os
import sys

# One BLAS thread: the fits are small, and on a shared machine threads only contend (it was 50x slower here).
for _k in ("OPENBLAS_NUM_THREADS", "OMP_NUM_THREADS", "MKL_NUM_THREADS"):
    os.environ.setdefault(_k, "1")
from typing import Any, Dict, List

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import matchup as M  # noqa: E402

DECK = 23


def world(V: int, sigma: float, cubes: int, cube_n: int, rng: np.random.Generator):
    b = rng.normal(0, sigma, V)
    pop = rng.gamma(1.0, 1.0, V)
    lists = [rng.choice(V, cube_n, replace=False, p=pop / pop.sum()) for _ in range(cubes)]
    rating = 0.5 * b / sigma + np.sqrt(0.75) * rng.normal(0, 1, V)
    return b, lists, rating


def games(n: int, b, lists, rating, beta: float, rng: np.random.Generator) -> List[Dict[str, Any]]:
    out = []
    for g in range(n):
        k = int(rng.integers(len(lists)))
        cube = lists[k]
        w = np.exp(rating[cube])
        w /= w.sum()
        pick = rng.choice(cube, 2 * DECK, replace=False, p=w)
        a, bb = pick[:DECK], pick[DECK:]
        s = 1.0 if rng.random() < 0.5 else -1.0
        z = b[a].sum() - b[bb].sum() + beta * s
        win = rng.random() < 1 / (1 + np.exp(-z))
        out.append({"v": 1, "id": f"c{k}#{g}#g1", "draft": f"c{k}#{g}", "pool": f"c{k}", "kind": "normal", "cubes": [f"c{k}"],
                    "seed": g, "game": 1, "deckA": {f"card{i}": 1 for i in a}, "deckB": {f"card{i}": 1 for i in bb},
                    "onPlay": "A" if s > 0 else "B", "winner": "A" if win else "B"})
    return out


def run(V=300, sigma=0.06, sizes=(1000, 4000, 12000), seed=7, boot=8, cubes=4, cube_n=120, beta=0.08,
        taus=(0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.085, 0.1), draws=100, by="evidence", say=print) -> List[Dict[str, Any]]:
    rng = np.random.default_rng(seed)
    b, lists, rating = world(V, sigma, cubes, cube_n, rng)
    allg = games(max(sizes), b, lists, rating, beta, rng)
    vocab = [f"card{i}" for i in range(V)]
    X = np.random.default_rng(seed + 1).normal(size=(V, 3))  # uninformative features: M0's path, w ~ 0
    res = []
    for n in sizes:
        data = M.Data(allg[:n], vocab)
        idx = np.arange(n)
        m = M.Linear(X, data, False)
        m.select(idx, list(taus), [0.01], [1.0], by=by)
        centre = np.ones(V, dtype=bool)
        est = m.power() - m.power().mean()
        tru = b - b.mean()
        sd_post = m.power_sd_post(centre)
        bs = M.bootstrap_power(m, idx, boot, seed)
        sd_boot = (bs - bs.mean(1, keepdims=True)).std(0, ddof=1)
        expo = ((data.CA > 0) | (data.CB > 0)).sum(0)
        seen = expo > 0
        lo = seen & (expo <= np.percentile(expo[seen], 20))
        err = est - tru
        cov = lambda sd, mask: float(np.mean(np.abs(err[mask]) <= 1.96 * sd[mask]))  # noqa: E731
        Q = M.cube_decks(m, data, "c0")
        S_true = Q[:, m.F:m.F + V] @ b
        true_sd = M.spread(S_true, beta)["sd"]
        bal = M.balance_posterior(m, Q, m.posterior_cov(), draws, seed)
        r = {"games": n, "tau": m.taus[0], "trueTau": sigma,
             "coverPost": cov(sd_post, seen), "coverBoot": cov(sd_boot, seen),
             "coverPostLow": cov(sd_post, lo), "coverBootLow": cov(sd_boot, lo),
             "rmsLow": float(np.sqrt(np.mean(err[lo] ** 2))), "sdPostLow": float(np.median(sd_post[lo])), "sdBootLow": float(np.median(sd_boot[lo])),
             "balanceTrue": true_sd, "balanceShrunk": bal["sdShrunk"], "balance": bal["sd"], "balanceLo": bal["sdLo"], "balanceHi": bal["sdHi"],
             "reliability": bal["reliability"], "decks": bal["decks"]}
        res.append(r)
        say(f"n={n:6d}  tau by {by} {r['tau']} (true {sigma})  95% coverage: sdPost {r['coverPost']:.2f} (least-seen fifth {r['coverPostLow']:.2f}), "
            f"sdBoot {r['coverBoot']:.2f} ({r['coverBootLow']:.2f}); least-seen: RMS error {r['rmsLow']:.4f}, median sdPost {r['sdPostLow']:.4f}, sdBoot {r['sdBootLow']:.4f}\n"
            f"           balance (cube 0, {r['decks']} decks): true {true_sd * 100:.1f} pts | shrunk {r['balanceShrunk'] * 100:.1f} | "
            f"de-biased {r['balance'] * 100:.1f} [{r['balanceLo'] * 100:.1f}, {r['balanceHi'] * 100:.1f}]  reliability {r['reliability']:.2f}")
    return res


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--sigma", type=float, default=0.06)
    ap.add_argument("--games", default="1000,4000,12000")
    ap.add_argument("--cards", type=int, default=300)
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--boot", type=int, default=8)
    ap.add_argument("--tau-by", choices=("cv", "evidence"), default="evidence")
    a = ap.parse_args(argv)
    run(V=a.cards, sigma=a.sigma, sizes=tuple(int(x) for x in a.games.split(",")), seed=a.seed, boot=a.boot, by=a.tau_by)
    return 0


if __name__ == "__main__":
    sys.exit(main())
