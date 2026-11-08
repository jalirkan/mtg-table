#!/usr/bin/env python3
# mtg-table — tools/ml: train, calibrate, compare and export the position evaluator.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""Train the position-value model -- P(the viewer wins) -- on a dataset.py
directory, compare it with D305's baselines, and export it for Java (D316).

    python3 tools/ml/train_eval.py DATA --out var/ml/models/eval.json
        [--hidden 64] [--dim 8] [--l2 1e-4] [--card-l2 1e-2] [--dropout 0.1]
        [--lr 2e-3] [--batch 256] [--epochs 200] [--patience 12] [--seed 0]
        [--backend auto|numpy|torch] [--threads N]
        [--grid] [--time-budget SECONDS] [--grid-log grid.jsonl]
        [--cv K] [--report report.json] [--dry-load]
        [--search sha [--configs N] [--eta 3] [--min-epochs 2] [--finalists 3] [--jobs J]]
        [--curve 0.25,0.5,1.0] [--train-fraction F] [--fast] [--load-subsample F]
        [--resume-model PATH]

D364 (all opt-in; without them every number is what it was): `--search sha`
is successive halving over GRID's space (eval_search.py's header), `--curve`
a learning curve over nested shares of the training pairs, `--train-fraction`
trains on one such share, `--fast` trains in float32 (evalnet.Fast32), and
`--jobs` trains configurations at once in forked workers.

D518 (opt-in): `--load-subsample F` holds only ceil(F x c) of every c-row
game's rows in the train and val splits, chosen when the shards are read --
before any array is allocated -- by a systematic draw from a start that is a
hash of the game's `game_key` and `--seed`, so the same game keeps the same
rows in every dataset that holds it (a merged one included) and every game is
still present.  Test is never sampled.  It is the memory fix for a dataset
too large to hold (five queue nights, ~45 M rows): `--subsample` draws each
epoch's share only after the whole split is in memory.  F = 1 is the default
path, bit for bit.

D520: a plain fit (or a search) saves the model to `--out` the moment the best
epoch's weights are chosen -- before the baselines, the scoring and the report,
which is where J196 was OOM-killed after 2.5 hours -- with a `partial` block
(`complete: false`, the fit's val log-loss, epochs run and seconds) and without
`training.metrics`, and writes a partial `--report` (`complete: false`, the fit
and the memory so far).  The end rewrites both through a temp file and a
rename: the model as it always was (no `partial`), the report with `complete:
true`.  `--resume-model PATH` loads such a model instead of fitting (refused
unless its recorded dataset, split, load share and
configuration are this run's; --seed at F = 1, --compact and --threads
pass) and runs only what follows the fit; it still loads the data.  The early
file is written before the auxiliary head's error is measured, so a run resumed
from it reports no `auxTurnsToEnd`.

The model is evalnet.py's (its header says what and why).  It trains on the
`train` split and stops early on the `val` split's log-loss (patience epochs
without a better one; the best epoch's weights are kept); `test` is only ever
scored.  The splits are dataset.py's, BY GAME (D305).

Every model is compared on val and test with the D305 baselines, fitted on the
same training rows: `prior` (the training win rate), `life` (a logistic
regression on the life difference) and `core` (the twelve-number logistic:
ten me-minus-opp differences, the turn and whose turn).  Metrics: log-loss,
Brier, accuracy on decided games, expected calibration error and a ten-bin
reliability table, overall and by turn bucket.

`--grid` searches hidden size, embedding size, the two L2s and dropout in a
fixed random order until `--time-budget` seconds have passed (an overnight run
on the owner's PC: `--time-budget 21600`), keeps the configuration with the
best validation log-loss and exports that one.  `--cv K` instead scores every
row out of fold (grouped K-fold over split groups, an inner validation split
of each fold's training groups for early stopping) -- the honest number while
the corpus is a few dozen games -- and exports nothing.

Memory: the rows stay in the shards' int16 (the card block sparse), a re-split
is made as the shards are read, the standardisation is computed in chunks and
only the few columns a baseline reads go to float64 -- about 0.7 KB a row held
at 24 card cells a row (5.5 GiB peak for 6.3 M rows, D354's amendment).  Every
run logs `memory: STAGE: rss X GB, peak Y GB` (GiB) after loading, fitting, the
baselines and scoring (also in the report); `--dry-load` makes every
allocation of a real run at full size without training and prints the peak,
for a job's pilot to check against its budget.

An r17 dataset (`dataset.py --schema r17`: the reduced end-of-half-turn rows of
the outside exam, r17.py, D359) trains the same way: the net pools two card
states instead of seventeen, and the baselines are `prior`, `life`, `board`
(the non-land permanent difference) and r17's reduced `core`.  An r17 model is
for outside_exam.py; Java refuses it (its schema id is not D305's).

Backends: numpy always works (float64, gradients by hand, checked against
finite differences in the tests); torch, when installed, trains the same
network in float32 (`--backend torch`, worth it on a GPU or a wide net; on the
CPU numpy measured faster here).  `auto` is numpy.
Either way the exported model is scored by numpy's forward pass, the one
eval_golden.py and the Java parity test hold Java to.
"""
from __future__ import annotations

import argparse
import hashlib
import itertools
import json
import math
import os
import random
import re
import sys
import time
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    import numpy as np
except ImportError:  # pragma: no cover
    np = None  # type: ignore

DEFAULTS = {"hidden": "64", "dim": 8, "l2": 1e-4, "card_l2": 1e-2, "dropout": 0.1, "lr": 2e-3,
            "batch": 1024, "epochs": 200, "patience": 12}

GRID = {"hidden": ["", "32", "64", "128", "128,32"], "dim": [4, 8, 16],
        "l2": [1e-5, 1e-4, 1e-3, 1e-2], "card_l2": [1e-3, 1e-2, 1e-1, 1.0], "dropout": [0.0, 0.1, 0.3],
        "lr": [1e-3, 3e-3]}

BUCKETS = [(1, 4), (5, 8), (9, 12), (13, 16), (17, 10_000)]
EPS = 1e-7


class Memory:
    """Peak resident memory after each stage, logged as `memory: STAGE: rss X GB, peak Y GB`
    (a job's pilot reads the peak; the report carries every line)."""

    def __init__(self):
        self.stages: list[dict[str, Any]] = []

    @staticmethod
    def now() -> tuple[float, float]:
        """(current, peak) resident set in GB; nan where the platform does not say."""
        cur = peak = float("nan")
        try:
            with open("/proc/self/status", encoding="ascii") as f:
                cur = next(int(ln.split()[1]) for ln in f if ln.startswith("VmRSS:")) / 2 ** 20
        except (OSError, StopIteration, ValueError):
            pass
        try:
            import resource
            ru = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
            peak = ru / (2 ** 30 if sys.platform == "darwin" else 2 ** 20)
        except (ImportError, OSError):
            pass
        return cur, peak

    def note(self, stage: str, log) -> None:
        cur, peak = self.now()
        self.stages.append({"stage": stage, "rssGB": round(cur, 3), "peakGB": round(peak, 3)})
        log(f"memory: {stage}: rss {cur:.2f} GB, peak {peak:.2f} GB")

    @property
    def peak(self) -> float:
        return max((s["peakGB"] for s in self.stages), default=float("nan"))


def parse_hidden(s: str) -> list[int]:
    return [int(x) for x in str(s).split(",") if x.strip()]


# ---------------------------------------------------------------- metrics

def logloss(p, t) -> float:
    p = np.clip(p, EPS, 1 - EPS)
    return float(-(t * np.log(p) + (1 - t) * np.log(1 - p)).mean()) if len(p) else float("nan")


def reliability(p, t, bins: int = 10) -> list[dict[str, Any]]:
    """Equal-width bins of the prediction: rows, mean prediction, observed rate."""
    out = []
    k = np.minimum((p * bins).astype(int), bins - 1)
    for b in range(bins):
        m = k == b
        n = int(m.sum())
        out.append({"bin": f"{b / bins:.1f}-{(b + 1) / bins:.1f}", "rows": n,
                    "predicted": float(p[m].mean()) if n else None, "observed": float(t[m].mean()) if n else None})
    return out


def ece(p, t, bins: int = 10) -> float:
    if not len(p):
        return float("nan")
    k = np.minimum((p * bins).astype(int), bins - 1)
    tot = 0.0
    for b in range(bins):
        m = k == b
        if m.any():
            tot += m.sum() * abs(p[m].mean() - t[m].mean())
    return float(tot / len(p))


def metrics(p, y, turn) -> dict[str, Any]:
    t = (y.astype(np.float64) + 1.0) / 2.0
    decided = y != 0

    def one(mask):
        n = int(mask.sum())
        if n == 0:
            return {"rows": 0}
        dm = mask & decided
        acc = float(((p[dm] > 0.5) == (y[dm] > 0)).mean()) if dm.any() else float("nan")
        return {"rows": n, "acc": acc, "logloss": logloss(p[mask], t[mask]),
                "brier": float(((p[mask] - t[mask]) ** 2).mean()), "ece": ece(p[mask], t[mask])}

    out = {"all": one(np.ones(len(y), bool))}
    for lo, hi in BUCKETS:
        out[f"turn {lo}-{hi}" if hi < 10_000 else f"turn {lo}+"] = one((turn >= lo) & (turn <= hi))
    out["reliability"] = reliability(p, t) if len(p) else []
    return out


# ---------------------------------------------------------------- baselines

def fit_baselines(tr, va, names, epochs: int = 400) -> dict[str, Any]:
    """D305's three baselines fitted on `tr` (early stopping on `va`); returns
    name -> predict(rows).  On an r17 dataset (D359) `core` is r17's reduced
    core and a fourth, `board` (the non-land permanent difference), joins them."""
    import baseline_eval as B
    import r17 as R17
    li_me, li_opp = names.index("me.life"), names.index("opp.life")

    # Only the columns a baseline reads go to float64, never the whole board
    # (5 M training rows x 243 columns are 10 GB as float64).  Every feature is
    # an integer, so the values are the ones a float board gave.
    def life(r):
        return np.subtract(r.board[:, li_me], r.board[:, li_opp], dtype=np.float64)[:, None]

    reduced = R17.is_r17(names)

    def core(r):
        return R17.core_matrix(r.board, names) if reduced else B.core_matrix(r.board, names)

    def board(r):
        return R17.board_count_matrix(r.board, names)

    prior = float(tr.t.mean()) if len(tr) else 0.5
    models: dict[str, Any] = {"prior": lambda r: np.full(len(r), prior)}
    rules = (("life", life), ("board", board), ("core", core)) if reduced else (("life", life), ("core", core))
    for name, fx in rules:
        Xtr = fx(tr)
        st = B.Standardiser(Xtr)
        Xtr -= st.mean          # == st(Xtr), in place: one (n, 12) matrix, not two
        Xtr /= st.sd
        has_va = len(va) > 0
        w, b, _ep = B.fit_logistic(Xtr, tr.t, st(fx(va)) if has_va else None, va.t if has_va else None,
                                   epochs, 0.05, 1e-3, 0)
        del Xtr
        models[name] = (lambda st, w, b, fx: (lambda r: B.sigmoid(st(fx(r)) @ w + b)))(st, w, b, fx)
    return models


# ---------------------------------------------------------------- training

def opts_of(a) -> dict[str, Any]:
    """D364's training options from the command line (all off by default)."""
    return {"fast": bool(getattr(a, "fast", False)), "weight_by": getattr(a, "weight_by", None) or None,
            "subsample": float(getattr(a, "subsample", 1.0) or 1.0), "aux": float(getattr(a, "aux_turns", 0.0) or 0.0)}


def make_net(tr, names, hp, vocab_size, seed, aux: float = 0.0):
    import evalnet as N
    excluded_unsafe = [i for i, n in enumerate(names) if n in N.LIVE_UNSAFE]
    mean, sd = tr.moments()   # chunked, cached across a grid's fits; == board.astype(float64).mean/std
    constant = [i for i in range(len(names)) if not sd[i] > 1e-9]
    cols = [i for i in range(len(names)) if i not in set(excluded_unsafe) | set(constant)]
    net = N.EvalNet(cols, mean[cols], sd[cols], vocab_size, int(hp["dim"]), parse_hidden(hp["hidden"]), seed,
                    n_states=tr.n_states)
    excluded = {"liveUnsafe": [names[i] for i in excluded_unsafe],
                "constantInTraining": [names[i] for i in constant if i not in excluded_unsafe]}
    if aux > 0:
        if tr.tte is None:
            raise SystemExit("train_eval: --aux-turns needs the rows' turns_to_end (load_data(..., turns_to_end=True))")
        tte = tr.tte.astype(np.float64)
        net.add_aux_head(aux, float(tte.mean()) if len(tte) else 0.0, float(tte.std()) if len(tte) else 1.0, seed)
    return net, excluded


def _adam_step(params, grads, state, lr, t):
    b1, b2 = 0.9, 0.999
    for i, (p, g) in enumerate(zip(params, grads)):
        m, v = state.setdefault(i, (np.zeros_like(p), np.zeros_like(p)))
        m *= b1
        m += (1 - b1) * g
        v *= b2
        v += (1 - b2) * g * g
        p -= lr * (m / (1 - b1 ** t)) / (np.sqrt(v / (1 - b2 ** t)) + 1e-8)


class EpochTrainer:
    """The numpy training loop, one epoch at a time, so that a search can stop a
    configuration after a few epochs and resume it later (successive halving,
    D364).  Run to its end it IS the old train_numpy: the same generator draws
    (each epoch's permutation, then each batch's dropout) in the same order, the
    same Adam steps, early stopping on the validation log-loss after `patience`
    epochs without a better one, and the best epoch's weights kept.

    `fast` trains in float32 (evalnet.Fast32; train_eval.py --fast); the
    default is float64, bit for bit what it always was.  `weight_by="game"`
    (--weight-by game) gives every game the same total weight in the loss and
    in the validation log-loss early stopping reads (D364).  A trainer pickles
    without its rows (a search hands it between worker processes)."""

    def __init__(self, net, tr, hp, seed, fast: bool = False, weight_by: str | None = None, subsample: float = 1.0):
        import evalnet as N
        self.net, self.tr, self.hp, self.fast, self.weight_by = net, tr, hp, fast, weight_by
        self.subsample = subsample
        self._w = None
        self.arith = N.Fast32(net) if fast else net
        self.rng = np.random.default_rng(seed)
        self.state: dict[int, Any] = {}
        self.step = 0
        self.epoch = 0
        self.best = (math.inf, self.arith.copy_params(), 0)
        self.bad = 0
        self.history: list[dict[str, Any]] = []
        self.done = False         # early stopping fired, or the epoch cap
        self.seconds = 0.0

    def __getstate__(self):
        d = dict(self.__dict__)
        d["tr"] = None
        d["_w"] = None
        return d

    def weights(self):
        """Each training row's weight (None: unweighted), 1 / its game's rows, mean 1."""
        if self.weight_by != "game":
            return None
        if self._w is None:
            self._w = game_weights(self.tr.game)
        return self._w

    def run_epoch(self, limit: int | None = None) -> float:
        """One pass over the training rows (or its first `limit` batches); the mean training cross-entropy."""
        hp, tr = self.hp, self.tr
        n, bs = len(tr), int(hp["batch"])
        if self.subsample < 1.0:
            perm = self.epoch_rows()
            n = len(perm)
        else:
            perm = self.rng.permutation(n)
        tot = 0.0
        w = self.weights()
        for k, i in enumerate(range(0, n, bs)):
            if limit is not None and k >= limit:
                break
            b = tr.take(perm[i:i + bs])
            if w is None:
                _loss, ce, grads = self.arith.loss_grad(b, hp["l2"], hp["card_l2"], self.rng, hp["dropout"])
            else:
                _loss, ce, grads = self.arith.loss_grad(b, hp["l2"], hp["card_l2"], self.rng, hp["dropout"],
                                                        w[perm[i:i + bs]])
            self.step += 1
            _adam_step(self.arith.params(), grads, self.state, hp["lr"], self.step)
            tot += ce * len(b)
        return tot / max(n, 1)

    def epoch_rows(self):
        """--subsample s: this epoch's rows, ceil(s x a game's rows) from every game, drawn afresh each epoch,
        in random order (D364): an epoch costs s of a full pass and still sees every game.  The draw is
        systematic within a game: its m = ceil(s x c) rows are c/m apart from a random start, so every
        stretch of the game is seen; memory is a few arrays the size of the draw, not of the split (a
        split's rows hold each game together, as load_splits and RowView give them; otherwise they are
        put in game order first)."""
        game = self.tr.game
        n = len(game)
        if not n:
            return np.zeros(0, np.int64)
        order = None
        if np.any(game[1:] < game[:-1]):
            order = np.argsort(game, kind="stable")
            game = game[order]
        starts = np.r_[0, np.flatnonzero(game[1:] != game[:-1]) + 1].astype(np.int64)
        counts = np.diff(np.r_[starts, n])
        m = np.ceil(counts * self.subsample).astype(np.int64)
        u = self.rng.random(len(starts))
        gi = np.repeat(np.arange(len(starts)), m)
        j = np.arange(len(gi)) - np.repeat(np.cumsum(m) - m, m)
        chosen = starts[gi] + np.minimum(np.floor((u[gi] + j) * counts[gi] / m[gi]).astype(np.int64), counts[gi] - 1)
        del gi, j
        if order is not None:
            chosen = order[chosen]
        return chosen[self.rng.permutation(len(chosen))]

    def val_logloss(self, va) -> float:
        if self.weight_by == "game":
            return logloss_weighted(self.arith.predict(va), va.t, game_weights(va.game))
        return logloss(self.arith.predict(va), va.t)

    def epoch_and_score(self, va, log=None) -> None:
        """One epoch, its validation log-loss, and the early-stopping bookkeeping."""
        t0 = time.time()
        self.epoch += 1
        ce = self.run_epoch()
        vl = self.val_logloss(va) if len(va) else ce
        self.history.append({"epoch": self.epoch, "train_ce": ce, "val_logloss": vl})
        if log:
            log(f"  epoch {self.epoch:3d}  train ce {ce:.4f}  val logloss {vl:.4f}")
        if vl < self.best[0] - 1e-5:
            self.best, self.bad = (vl, self.arith.copy_params(), self.epoch), 0
        else:
            self.bad += 1
            if self.bad >= int(self.hp["patience"]):
                self.done = True
        if self.epoch >= int(self.hp["epochs"]):
            self.done = True
        self.seconds += time.time() - t0

    def train(self, va, until: int | None = None, log=None, deadline=None) -> None:
        """Epochs until early stopping, the epoch cap, epoch `until`, or the deadline (checked after an epoch)."""
        while not self.done and (until is None or self.epoch < until):
            self.epoch_and_score(va, log)
            if deadline and time.time() > deadline:
                break

    def finish(self):
        """The best epoch's weights into the net (float64); (best epoch, its val log-loss, history)."""
        if self.fast:
            self.arith.to_net(self.best[1])
        else:
            self.net.set_params(self.best[1])
        return self.best[2], self.best[0], self.history


def game_weights(game):
    """1 / (the rows of the row's game), scaled to mean 1: every game the same total weight (D364)."""
    counts = np.bincount(game)
    w = 1.0 / counts[game]
    return w * (len(w) / w.sum()) if len(w) else w


def logloss_weighted(p, t, w) -> float:
    p = np.clip(p, EPS, 1 - EPS)
    return float((w * -(t * np.log(p) + (1 - t) * np.log(1 - p))).sum() / w.sum()) if len(p) else float("nan")


def train_numpy(net, tr, va, hp, seed, log=None, deadline=None, fast: bool = False, weight_by: str | None = None,
                subsample: float = 1.0):
    tt = EpochTrainer(net, tr, hp, seed, fast, weight_by, subsample)
    tt.train(va, log=log, deadline=deadline)
    return tt.finish()


def train_torch(net, tr, va, hp, seed, log=None, deadline=None):
    import torch
    import evalnet as N
    torch.manual_seed(seed)
    rng = np.random.default_rng(seed)
    S = net.n_states
    dev = "cuda" if torch.cuda.is_available() else "cpu"
    E = torch.tensor(net.E, dtype=torch.float32, device=dev, requires_grad=True)
    Ws = [torch.tensor(w, dtype=torch.float32, device=dev, requires_grad=True) for w in net.W]
    bs = [torch.tensor(b, dtype=torch.float32, device=dev, requires_grad=True) for b in net.b]
    params = [E] + Ws + bs
    opt = torch.optim.Adam(params, lr=hp["lr"])
    mean = torch.tensor(net.mean, dtype=torch.float32, device=dev)
    sd = torch.tensor(net.sd, dtype=torch.float32, device=dev)
    cols = torch.tensor(net.cols, device=dev)

    def forward(r, train):
        n = len(r)
        xb = (torch.from_numpy(r.board.astype(np.float32)).to(dev)[:, cols] - mean) / sd
        flat = torch.from_numpy(r.row_of_nnz() * S + r.state.astype(np.int64)).to(dev)
        slot = torch.from_numpy(r.slot.astype(np.int64)).to(dev)
        cnt = torch.from_numpy(r.count.astype(np.float32)).to(dev)
        P = torch.zeros(n * S, net.dim, device=dev).index_add_(0, flat, cnt[:, None] * E[slot])
        h = torch.cat([xb, P.reshape(n, S * net.dim)], dim=1)
        for i in range(len(Ws) - 1):
            h = torch.relu(h @ Ws[i] + bs[i])
            if train and hp["dropout"] > 0:
                h = torch.nn.functional.dropout(h, hp["dropout"], True)
        return (h @ Ws[-1] + bs[-1])[:, 0]

    def sync():
        net.set_params([E.detach().double().cpu().numpy().copy()]
                       + [w.detach().double().cpu().numpy().copy() for w in Ws]
                       + [b.detach().double().cpu().numpy().copy() for b in bs])

    bce = torch.nn.BCEWithLogitsLoss()
    best = (math.inf, net.copy_params(), 0)
    bad = 0
    history = []
    n = len(tr)
    for ep in range(1, int(hp["epochs"]) + 1):
        perm = rng.permutation(n)
        tot = 0.0
        for i in range(0, n, int(hp["batch"])):
            b = tr.take(perm[i:i + int(hp["batch"])])
            z = forward(b, True)
            ce = bce(z, torch.from_numpy(b.t.astype(np.float32)).to(dev))
            loss = ce + 0.5 * hp["l2"] * sum((w * w).sum() for w in Ws) + 0.5 * hp["card_l2"] * (E * E).sum()
            opt.zero_grad()
            loss.backward()
            opt.step()
            tot += float(ce.detach()) * len(b)
        sync()
        vl = logloss(net.predict(va), va.t) if len(va) else tot / max(n, 1)
        history.append({"epoch": ep, "train_ce": tot / max(n, 1), "val_logloss": vl})
        if log:
            log(f"  epoch {ep:3d}  train ce {tot / max(n, 1):.4f}  val logloss {vl:.4f}")
        if vl < best[0] - 1e-5:
            best, bad = (vl, net.copy_params(), ep), 0
        else:
            bad += 1
            if bad >= int(hp["patience"]):
                break
        if deadline and time.time() > deadline:
            break
    net.set_params(best[1])
    return best[2], best[0], history


def pick_backend(name: str) -> str:
    """auto is numpy: measured faster than CPU torch for this sparse, narrow
    network (D316); torch is there for a GPU or a much wider net."""
    if name == "torch":
        try:
            import torch  # noqa: F401
            return "torch"
        except ImportError:
            raise SystemExit("--backend torch: torch is not installed")
    return "numpy"


def fit(tr, va, names, hp, vocab_size, backend, seed=0, log=None, deadline=None, fast: bool = False,
        weight_by: str | None = None, subsample: float = 1.0, aux: float = 0.0):
    net, excluded = make_net(tr, names, hp, vocab_size, seed, aux)
    t0 = time.time()
    if backend == "torch":
        if weight_by or fast or subsample < 1.0 or aux > 0:
            raise SystemExit("train_eval: D364's training options train with numpy (--backend numpy)")
        ep, vl, hist = train_torch(net, tr, va, hp, seed, log, deadline)
    else:
        ep, vl, hist = train_numpy(net, tr, va, hp, seed, log, deadline, fast, weight_by, subsample)
    return net, {"bestEpoch": ep, "valLogloss": vl, "epochsRun": len(hist), "seconds": round(time.time() - t0, 1),
                 "excluded": excluded, "history": hist}


# ---------------------------------------------------------------- the runs

def load_data(data: str, split_by: str = "dataset", train_fraction: float = 1.0, rows_to_end: bool = False,
              turns_to_end: bool = False, compact: bool = False, load_subsample: float = 1.0, seed: int = 0):
    """The schema, the board names and the three splits.  A re-split (pair,
    game, holdout:) sends each row to its split as the shards are read
    (evalnet.load_splits): no copy of the whole corpus is ever concatenated
    and taken apart, and the rows of a split are in the order they always were
    (dataset.py's train, val, test shards, in turn).  `train_fraction` < 1
    keeps only the training pairs `in_fraction` keeps (D364); the dropped
    games are never loaded, and val and test are untouched.  `load_subsample`
    < 1 holds only `load_keep`'s rows of each train and val game (D518); test
    is untouched."""
    import evalnet as N
    schema = N.read_schema(data)
    reserved_warning(data)
    off = N.card_offset_of(schema)
    names = N.board_names(schema)
    if train_fraction < 1.0:
        games = read_games(data)
        base = [g["split"] for g in games] if split_by == "dataset" else game_splits(games, split_by)
        sog = fraction_splits(games, base, train_fraction)
    else:
        sog = None if split_by == "dataset" else game_splits(read_games(data), split_by)
    keep = load_keep(read_games(data), load_subsample, seed) if load_subsample < 1.0 else None
    splits = N.load_splits(data, off, sog, n_states=N.n_states_of(schema), rows_to_end=rows_to_end,
                           turns_to_end=turns_to_end, compact=compact, keep=keep)
    return schema, names, {s: splits[s] for s in ("train", "val", "test")}


# ---------------------------------------------------------------- a share of each game's rows, at load (D518)

LOAD_SUBSAMPLE_SALT = "load-v1"
LOAD_SUBSAMPLE_SPLITS = ("train", "val")   # test is never sampled
_R = 1 << 20                               # the start's resolution: an integer in [0, 2^20)


def load_start(game_key: str, seed: int) -> int:
    """A game's systematic-draw start, in units of 2^-20 of a step: a hash of its game_key and the seed alone,
    so it does not depend on the game's index or on the other games of the dataset."""
    return int(hashlib.sha256(f"{LOAD_SUBSAMPLE_SALT}|{seed}|{game_key}".encode()).hexdigest()[:5], 16)


def load_keep(games: list[dict[str, Any]], f: float, seed: int = 0, chunk: int = 20_000) -> dict[str, Any]:
    """--load-subsample f (D518): which rows of every game a load holds.  A game of c rows keeps m = ceil(f x c)
    of them, positions floor((u + j) c / m) for j < m, u = load_start / 2^20 -- the systematic draw of
    EpochTrainer.epoch_rows, from a fixed start instead of a fresh one, in integers so it is exact.  Returns
    `offset` (each game's first row in `mask`), `rows` (games.jsonl's), `mask` (one bool a row) and the splits it
    applies to, for evalnet.load_splits."""
    rows = np.array([int(g["rows"]) for g in games], np.int64)
    offset = np.zeros(len(games), np.int64)
    if len(games):
        np.cumsum(rows[:-1], out=offset[1:])
    mask = np.zeros(int(rows.sum()), bool)
    m_all = np.ceil(rows * f).astype(np.int64)
    for a in range(0, len(games), chunk):          # a chunk of games at a time: the index arrays stay small
        b = min(len(games), a + chunk)
        c, m = rows[a:b], m_all[a:b]
        u = np.array([load_start(g["game_key"], seed) for g in games[a:b]], np.int64)
        gi = np.repeat(np.arange(b - a), m)
        j = np.arange(len(gi), dtype=np.int64) - np.repeat(np.cumsum(m) - m, m)
        pos = ((u[gi] + j * _R) * c[gi]) // (m[gi] * _R)
        mask[offset[a:b][gi] + pos] = True
    return {"offset": offset, "rows": rows, "mask": mask, "splits": LOAD_SUBSAMPLE_SPLITS,
            "share": f, "seed": seed}


# ---------------------------------------------------------------- soft labels (D364)

def read_soft_labels(path: str, n_games: int) -> dict[str, Any]:
    """A soft-label file: an .npz of equal-length `game` (games.jsonl index), `rows_to_end` (the row's
    key within its game, as the shards carry it) and `p` (the label in [0, 1]: the mean outcome of K
    rollouts from that position, for the viewing seat), optionally `k` (rollouts per row).  Refused when
    a p is outside [0, 1] or not finite, a game index is out of range, or a key repeats."""
    with np.load(path) as z:
        game = np.asarray(z["game"], np.int64)
        rte = np.asarray(z["rows_to_end"], np.int64)
        p = np.asarray(z["p"], np.float64)
        k = np.asarray(z["k"], np.int64) if "k" in z.files else None
    if not (len(game) == len(rte) == len(p)):
        raise SystemExit(f"train_eval: {path}: game, rows_to_end and p differ in length")
    if len(p) and (not np.all(np.isfinite(p)) or p.min() < 0 or p.max() > 1):
        raise SystemExit(f"train_eval: {path}: a soft label is outside [0, 1]")
    if len(game) and (game.min() < 0 or game.max() >= n_games or rte.min() < 0):
        raise SystemExit(f"train_eval: {path}: a game index or rows_to_end is out of range")
    key = game * 65536 + rte
    if len(np.unique(key)) != len(key):
        raise SystemExit(f"train_eval: {path}: a (game, rows_to_end) key repeats")
    return {"key": key, "p": p, "k": k}


def apply_soft_labels(splits: dict[str, Any], soft: dict[str, Any], alpha: float) -> dict[str, Any]:
    """The TRAINING split's targets become (1 - alpha) * outcome + alpha * soft label where a row has one;
    validation and test keep the outcome (they are scored against what happened).  Needs the rows'
    `rte` (load_data(..., rows_to_end=True))."""
    order = np.argsort(soft["key"])
    sk, sp = soft["key"][order], soft["p"][order]
    out: dict[str, Any] = {"labels": int(len(sk)), "alpha": alpha}
    for s, r in splits.items():
        key = r.game.astype(np.int64) * 65536 + r.rte.astype(np.int64)
        i = np.minimum(np.searchsorted(sk, key), max(len(sk) - 1, 0))
        hit = (sk[i] == key) if len(sk) else np.zeros(len(key), bool)
        out[f"{s}Rows"] = int(hit.sum())
        if s == "train" and hit.any():
            t = r.t.copy()
            t[hit] = (1 - alpha) * t[hit] + alpha * sp[i[hit]]
            r.t = t
    out["unmatched"] = int(len(sk) - sum(out[f"{s}Rows"] for s in splits))
    return out


# ---------------------------------------------------------------- what a held-out number is worth (D364)

def icc(resid, group) -> dict[str, float]:
    """The one-way ANOVA intraclass correlation of `resid` within `group` (unbalanced groups), clipped
    to [0, 1]; the design effect 1 + (m - 1) rho, m the row-weighted mean group size; and the effective
    sample size rows / design effect."""
    _u, g = np.unique(group, return_inverse=True)
    g = g.ravel()
    N, k = len(resid), int(g.max()) + 1 if len(g) else 0
    if k < 2 or N <= k:
        return {"groups": k, "rho": float("nan"), "designEffect": float("nan"), "nEff": float("nan")}
    n = np.bincount(g, minlength=k).astype(np.float64)
    mean = np.bincount(g, weights=resid, minlength=k) / n
    grand = resid.mean()
    msb = float((n * (mean - grand) ** 2).sum() / (k - 1))
    msw = float(((resid - mean[g]) ** 2).sum() / (N - k))
    n0 = (N - (n * n).sum() / N) / (k - 1)
    rho = (msb - msw) / (msb + (n0 - 1) * msw) if msb + (n0 - 1) * msw > 0 else 0.0
    rho = min(1.0, max(0.0, rho))
    m = float((n * n).sum() / N)
    deff = 1.0 + (m - 1.0) * rho
    return {"groups": k, "meanRows": round(m, 2), "rho": round(rho, 4), "designEffect": round(deff, 2),
            "nEff": round(N / deff, 1)}


def aux_report(net, splits, lam: float) -> dict[str, Any]:
    """The auxiliary head's held-out mean absolute error in turns, beside a constant (the training mean)."""
    out: dict[str, Any] = {"weight": lam, "mean": net.aux["mean"], "sd": net.aux["sd"]}
    for s in ("val", "test"):
        r = splits[s]
        if not len(r):
            continue
        tte = r.tte.astype(np.float64)
        out[f"{s}MAE"] = float(np.abs(net.predict_aux(r) - tte).mean())
        out[f"{s}MAEConstant"] = float(np.abs(net.aux["mean"] - tte).mean())
    return out


def held_out_detail(models: dict[str, Any], splits: dict[str, Any], games: list[dict[str, Any]],
                    boots: int = 2000, seed: int = 20261004) -> dict[str, Any]:
    """D364's honest sample sizes and splits of the test numbers, added to every train report:
    rows, games and deck pairs per split; on test, the eval model's residuals' correlation within a game
    and within a pair, the design effect and the effective sample size; every model's test log-loss with
    a 95% interval over deck pairs, row-weighted (as the tables) and game-weighted (every game equal);
    and exploring (D358) and plain test games apart."""
    import eval_search as S
    out: dict[str, Any] = {"splits": {}}
    for s, r in splits.items():
        gi = np.unique(r.game)
        out["splits"][s] = {"rows": len(r), "games": int(len(gi)),
                            "pairs": len({pair_key(games[g]) for g in gi.tolist()})}
    te = splits["test"]
    if not len(te):
        return out
    t = te.t
    pk = np.array([pair_key(games[g]) for g in te.game.tolist()], dtype=object).astype(str)
    preds = {m: np.clip(f(te), EPS, 1 - EPS) for m, f in models.items()}
    resid = t - preds["eval"] if "eval" in preds else t - t.mean()
    out["test"] = {"byGame": icc(resid, te.game), "byPair": icc(resid, pk)}
    names = list(preds)
    ll = np.stack([-(t * np.log(preds[m]) + (1 - t) * np.log(1 - preds[m])) for m in names], axis=1)
    _u, gidx = np.unique(pk, return_inverse=True)
    gidx = gidx.ravel()
    w = game_weights(te.game)

    def table(mask):
        if not mask.any():
            return {"rows": 0}
        k = int(gidx.max()) + 1
        cnt = np.bincount(gidx[mask], minlength=k).astype(np.float64)
        keep = cnt > 0
        sums = np.stack([np.bincount(gidx[mask], weights=ll[mask, j], minlength=k) for j in range(len(names))], 1)
        wsums = np.stack([np.bincount(gidx[mask], weights=(w * ll[:, j])[mask], minlength=k)
                          for j in range(len(names))], 1)
        wcnt = np.bincount(gidx[mask], weights=w[mask], minlength=k)
        a = S.pair_bootstrap(sums[keep], cnt[keep], boots, seed)
        b = S.pair_bootstrap(wsums[keep], wcnt[keep], boots, seed)
        return {"rows": int(mask.sum()), "games": int(len(np.unique(te.game[mask]))), "pairs": int(keep.sum()),
                **{m: {"logloss": float(a["estimate"][j]), "lo": float(a["lo"][j]), "hi": float(a["hi"][j]),
                       "loglossByGame": float(b["estimate"][j]), "loByGame": float(b["lo"][j]),
                       "hiByGame": float(b["hi"][j])} for j, m in enumerate(names)}}
    out["test"]["all"] = table(np.ones(len(te), bool))
    explore = np.array([bool(games[g].get("explore")) for g in te.game.tolist()], bool)
    if explore.any():
        out["test"]["plain"] = table(~explore)
        out["test"]["exploring"] = table(explore)
    return out


def format_detail(d: dict[str, Any]) -> str:
    sp = d["splits"]
    lines = ["held out (D364): " + "; ".join(f"{s} {v['rows']} rows / {v['games']} games / {v['pairs']} pairs"
                                             for s, v in sp.items())]
    tt = d.get("test")
    if not tt:
        return lines[0]
    g, p = tt["byGame"], tt["byPair"]
    lines.append(f"  test residuals: within-game correlation {g['rho']:.3f} (design effect {g['designEffect']:.1f}, "
                 f"effective n {g['nEff']:.0f} of {sp['test']['rows']} rows); within-pair {p['rho']:.3f} "
                 f"(design effect {p['designEffect']:.1f}, effective n {p['nEff']:.0f})")
    for sub in ("all", "plain", "exploring"):
        x = tt.get(sub)
        if not x or not x.get("rows"):
            continue
        ms = [m for m in x if isinstance(x[m], dict)]
        lines.append(f"  test {sub} ({x['rows']} rows, {x['games']} games, {x['pairs']} pairs; 95% over pairs): "
                     + "; ".join(f"{m} {x[m]['logloss']:.4f} [{x[m]['lo']:.4f}, {x[m]['hi']:.4f}] by game "
                                 f"{x[m]['loglossByGame']:.4f}" for m in ms))
    return "\n".join(lines)


# ---------------------------------------------------------------- training on a share of the pairs (D364)

FRACTION_SALT = "frac-v1"


def in_fraction(key: str, f: float) -> bool:
    """Whether a training pair is in the share `f` of the training pairs: a hash
    of the pair, so it is deterministic, independent of every other pair (it
    does not move as the corpus grows) and NESTED -- the pairs kept at 0.25 are
    among those kept at 0.5."""
    if f >= 1.0:
        return True
    return int(hashlib.sha256(f"{FRACTION_SALT}|{key}".encode()).hexdigest()[:13], 16) < f * 16 ** 13


def fraction_splits(games: list[dict[str, Any]], split_of_game: list[str], f: float) -> list[str]:
    """`split_of_game` with every training game whose deck pair is outside the
    share `f` marked "" (not loaded).  The unit is the PAIR (pair_key), as the
    split's, so a pair is wholly in or wholly out."""
    return [s if s != "train" or in_fraction(pair_key(g), f) else "" for g, s in zip(games, split_of_game)]


def reserved_warning(data: str) -> None:
    """D340: say so when a dataset was built without dropping the AI ladder's deck-set decks (before D340, or --keep-reserved)."""
    f = os.path.join(data, "stats.json")
    try:
        with open(f, encoding="utf-8") as fh:
            st = json.load(fh)
    except (OSError, json.JSONDecodeError):
        return
    if not st.get("reservedChecked"):
        print(f"WARNING: {data} was built without the reserved-deck filter (D340): games with an AI-ladder dev/confirm "
              "deck may be in it -- rebuild with dataset.py before using this evaluator in a search graded on those decks")


def read_games(data: str) -> list[dict[str, Any]]:
    with open(os.path.join(data, "games.jsonl"), encoding="utf-8") as f:
        return [json.loads(line) for line in f]


def pair_key(g: dict[str, Any]) -> str:
    """A game's deck pair (D316): the match block's two deck names, or -- for a
    log without one -- its own game group."""
    return g.get("match") or g.get("game_group") or g["split_group"]


def _h(s: str) -> int:
    return int(hashlib.sha256(s.encode()).hexdigest()[:12], 16)


def assign_pairs(keys: list[str], weights=(80, 10, 10)) -> dict[str, str]:
    """Pair -> split.  With 20 pairs or more a hash threshold (stable as the
    corpus grows); with fewer, the pairs in hash order with at least one each in
    val and test when there are three or more, so a small corpus still has a
    held-out pair to score."""
    keys = sorted(set(keys), key=lambda k: _h("pair|" + k))
    tot = sum(weights)
    if len(keys) >= 20:
        out = {}
        for k in keys:
            x = _h("pair|" + k) % tot
            out[k] = "train" if x < weights[0] else ("val" if x < weights[0] + weights[1] else "test")
        return out
    n = len(keys)
    n_test = max(1, round(n * weights[2] / tot)) if n >= 3 and weights[2] else 0
    n_val = max(1, round(n * weights[1] / tot)) if n >= 3 and weights[1] else 0
    return {k: ("test" if i < n_test else "val" if i < n_test + n_val else "train") for i, k in enumerate(keys)}


def game_splits(games: list[dict[str, Any]], how: str) -> list[str]:
    """Each game's split under a re-split by deck pair (`pair`), or holding out
    the games whose decks match a pattern -- a deck name or the log's path -- as
    the test split (`holdout:REGEX`, e.g. a whole cube's `holdout:^modern-`);
    the rest go to train/val by pair.  No pair is ever in two splits, so the
    test split is decks the model never saw."""
    import re
    keys = [pair_key(g) for g in games]
    if how == "game":   # D305's by-game split, for comparison: it flatters (a pair's other games train)
        gk = [g.get("game_group") or g["split_group"] for g in games]
        where = assign_pairs(gk)
        split_of_game = [where[k] for k in gk]
    elif how == "pair":
        where = assign_pairs(keys)
        split_of_game = [where[k] for k in keys]
    elif how.startswith("holdout:"):
        rx = re.compile(how.split(":", 1)[1])
        held = [bool(rx.search(g.get("file", ""))) or any(rx.search(d) for d in (g.get("match") or "").split("|") if d)
                for g in games]
        if not any(held):
            raise SystemExit(f"train_eval: no game's decks match {how}")
        where = assign_pairs([k for k, hd in zip(keys, held) if not hd], (80, 20, 0))
        split_of_game = ["test" if hd else where[k] for k, hd in zip(keys, held)]
    else:
        raise SystemExit(f"train_eval: --split-by {how}: pair, game, dataset or holdout:REGEX")
    return split_of_game


LAB_DECK_NAME = re.compile(r"^cubelab \d+ [AB]$")


def group_kind(keys) -> str:
    """What a split group is.  The lab names every deck `cubelab <seed> A|B`
    (tools/cubelab/run.ts), and the queue numbers seeds per cube folder, so a
    lab log's "deck pair" is a SEED NUMBER, the same one in every cube: `seed`
    when every group is one of those, else `deck-name` (named decks, or a mix)."""
    ks = [k for k in keys if k]
    if ks and all(len(k.split("|")) == 2 and all(LAB_DECK_NAME.match(d) for d in k.split("|")) for k in ks):
        return "seed"
    return "deck-name"


def deck_keys_of(g: dict[str, Any]) -> list[str]:
    """A game's decks by CARD MULTISET (reserved.deck_key): games.jsonl's `deckKeys`
    (dataset.py writes it), else read again from the recording's run folder
    (a dataset built before the field); [] when no deck can be known."""
    if isinstance(g.get("deckKeys"), list):
        return [str(k) for k in g["deckKeys"]]
    import reserved as R
    f = g.get("file")
    if not f:
        return []
    decks, _ver = R.game_decks(f, None)
    return sorted(R.deck_key(d) for d in decks)


def split_summary(data: str, splits: dict[str, Any]) -> dict[str, Any]:
    """Per split: rows, games, split groups and decks -- and how many test rows come
    from a deck the training split also holds, keyed on the decks' CARD MULTISETS
    (reserved.deck_key).  The deck-name check this replaced could never fire on lab
    logs, whose names are `cubelab <seed> A|B` (methods review, 2026-10-04); its
    count stays in the report as `testRowsWithATrainingDeckName`, beside the content one."""
    games = read_games(data)
    out: dict[str, Any] = {}
    names: dict[str, set] = {}
    contents: dict[str, set] = {}
    keys_of: dict[int, list[str]] = {}
    for s, r in splits.items():
        gi = sorted(set(r.game.tolist()))
        ns, cs = set(), set()
        for i in gi:
            ns |= set(d for d in (games[i].get("match") or "").split("|") if d)
            keys_of[i] = deck_keys_of(games[i])
            cs |= set(keys_of[i])
        names[s], contents[s] = ns, cs
        out[s] = {"rows": len(r), "games": len(gi), "pairs": len({pair_key(games[i]) for i in gi}),
                  "decks": len(cs) if cs else len(ns), "deckNames": len(ns), "decksByContent": len(cs)}
    te = splits["test"].game.tolist()
    out["groupKind"] = group_kind({pair_key(games[i]) for s in splits for i in set(splits[s].game.tolist())})
    out["testRowsWithATrainingDeck"] = sum(1 for i in te if set(keys_of[i]) & contents["train"])
    out["testRowsWithATrainingDeckName"] = sum(
        1 for i in te if set((games[i].get("match") or "").split("|")) & names["train"] - {""})
    out["testRowsDeckUnknown"] = sum(1 for i in te if not keys_of[i])
    out["deckCheck"] = "card multiset (reserved.deck_key)"
    return out


def summary_line(split_by: str, summary: dict[str, Any]) -> str:
    """The log's split line: groups named for what they are, the deck check by content."""
    kind = "seed groups (lab deck names are `cubelab <seed> A|B`: one seed number across cubes)" \
        if summary.get("groupKind") == "seed" else "deck-name groups"
    unknown = summary.get("testRowsDeckUnknown", 0)
    return (f"split by {split_by}: " + "; ".join(
        f"{s} {summary[s]['rows']} rows / {summary[s]['games']} games / {summary[s]['pairs']} groups"
        for s in ("train", "val", "test")) + f"; groups are {kind}"
        + f"; test rows from a deck seen in training, by card multiset: {summary['testRowsWithATrainingDeck']}"
        + (f" ({unknown} test rows' decks unknown: not checked)" if unknown else ""))


def score_all(models: dict[str, Any], splits: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for m, pred in models.items():
        out[m] = {}
        for s in ("val", "test"):
            r = splits[s]
            out[m][s] = metrics(pred(r), r.y.astype(np.int64), r.turn.astype(np.int64)) if len(r) else {"all": {"rows": 0}}
    return out


def run_train(a, hp, log) -> dict[str, Any]:
    import evalnet as N
    mem = Memory()
    frac = getattr(a, "train_fraction", 1.0)
    soft_path = getattr(a, "soft_labels", None)
    opts = opts_of(a)
    weight_by = opts["weight_by"]
    lsub = float(getattr(a, "load_subsample", 1.0) or 1.0)
    schema, names, splits = load_data(a.data, a.split_by, frac, rows_to_end=bool(soft_path),
                                      turns_to_end=opts["aux"] > 0, compact=bool(getattr(a, "compact", False)),
                                      load_subsample=lsub, seed=a.seed)
    lsub_info = load_subsample_info(a.data, splits, lsub, a.seed) if lsub < 1.0 else None
    if lsub_info:
        log(f"load share (D518): {lsub:g} of each game's rows held in train and val, seed {a.seed}; rows held / in the "
            f"dataset: train {lsub_info['rowsHeld']['train']}/{lsub_info['rowsInData']['train']}, val "
            f"{lsub_info['rowsHeld']['val']}/{lsub_info['rowsInData']['val']}; test whole")
    soft_info = None
    if soft_path:
        soft_info = apply_soft_labels(splits, read_soft_labels(soft_path, len(read_games(a.data))),
                                      float(getattr(a, "soft_weight", 1.0)))
        log(f"soft labels (D364): {soft_info['trainRows']} training rows of {soft_info['labels']} labels, "
            f"weight {soft_info['alpha']:g}; {soft_info['valRows'] + soft_info['testRows']} on val/test rows "
            f"(ignored: those score against the outcome); {soft_info['unmatched']} unmatched")
    mem.note("load", log)
    tr, va, te = splits["train"], splits["val"], splits["test"]
    if not len(tr):
        raise SystemExit("train_eval: no training rows")
    search = getattr(a, "search", None) or ("grid" if a.grid else None)
    fast = bool(getattr(a, "fast", False))
    backend = pick_backend(a.backend)
    summary = split_summary(a.data, splits)
    if a.dry_load:
        out = dry_load(a, schema, names, splits, summary, mem, log)
        if lsub_info:
            out["loadSubsample"] = lsub_info
        return out
    log(summary_line(a.split_by, summary))
    log(f"train_eval: schema {schema['schemaId']}, {schema['nFeatures']} features, vocab {len(schema['vocab']['cards'])}; "
        f"rows train/val/test {len(tr)}/{len(va)}/{len(te)}; games "
        f"{len(np.unique(tr.game))}/{len(np.unique(va.game))}/{len(np.unique(te.game))}; backend {backend}"
        + (f"; float32 (--fast)" if fast else "")
        + (f"; training on {frac:g} of the training pairs (--train-fraction)" if frac < 1.0 else "")
        + (f"; every game weighted equally (--weight-by game)" if weight_by else ""))
    grid_results = []
    search_summary = None
    rows = {s: len(r) for s, r in splits.items()}
    games = {s: int(len(np.unique(r.game))) for s, r in splits.items()}
    resume = getattr(a, "resume_model", None)
    saved: dict[str, Any] = {}

    def training(best_epoch, aux_info, date, metrics=None):
        return training_block(a, backend, hp, rows, games, best_epoch, search_summary, fast, frac, weight_by, opts,
                              lsub_info, aux_info, soft_info, date, metrics)

    if resume:   # D520: the fit is the saved model's; only the steps after it run
        net, info, saved = resume_fit(resume, schema, training(None, None, None), opts["aux"], log)
    elif search == "sha":
        if backend == "torch":
            raise SystemExit("train_eval: --search sha trains with numpy")
        import eval_search as S
        net, info, hp, grid_results, search_summary = S.successive_halving(
            tr, va, names, hp, len(schema["vocab"]["cards"]), a, log, read_games(a.data))
    elif search == "grid":
        net, info, hp, grid_results = grid_search(tr, va, names, hp, len(schema["vocab"]["cards"]), backend, a, log)
    else:
        net, info = fit(tr, va, names, hp, len(schema["vocab"]["cards"]), backend, a.seed,
                        log if a.verbose else None, fast=fast, weight_by=weight_by, subsample=opts["subsample"],
                        aux=opts["aux"])
    log(f"model: hidden {net.hidden or 'none (logistic)'}, card dim {net.dim}, {net.n_params()} parameters, "
        f"{len(net.cols)} board columns; best epoch {info['bestEpoch']} of {info.get('epochsRun')} "
        f"({info.get('seconds')} s), val logloss {fmt4(info.get('valLogloss'))}"
        + (f" (resumed from {resume})" if resume else ""))
    mem.note("resume" if resume else "grid" if search == "grid" else "search" if search else "fit", log)
    fit_info = {k: v for k, v in info.items() if k != "history"}
    date = saved["date"] if resume else N.now()
    # D520: the model and a partial report on disk the moment the fit is chosen, before the baselines, the
    # scoring and the report -- a kill after the fit no longer loses it (--resume-model then runs only the rest).
    # Nothing is computed between the fit and this write; the auxiliary head's error is measured after it.
    if a.out:
        partial = {"complete": False, "fit": {k: fit_info[k] for k in PARTIAL_FIT if k in fit_info}}
        if opts["aux"] > 0:
            partial["auxTurnsWeight"] = opts["aux"]
        N.save_model(a.out, net.to_json(schema, names, {
            "excluded": info["excluded"], "training": training(info["bestEpoch"], None, date), "partial": partial}))
        log(f"saved {a.out} after the fit, before the baselines and scoring ({os.path.getsize(a.out)} bytes; "
            f"rewritten with its metrics at the end)")
    if a.report:
        part = {"complete": False, "schemaId": schema["schemaId"], "data": os.path.abspath(a.data),
                "backend": backend, "splitBy": a.split_by, "splitSummary": summary, "rows": rows, "games": games,
                "hyper": hp, "fit": fit_info}
        if resume:
            part["resumedFrom"] = resume
        part["memory"] = list(mem.stages)
        write_json(a.report, part)
    # the auxiliary head is never exported: a run that fitted it measures it here; a resumed run has it only if
    # its model is a finished one (an early file was written before it was measured), and otherwise reports none
    aux_info = None
    if opts["aux"] > 0:
        aux_info = saved.get("auxTurnsToEnd") if resume else aux_report(net, splits, opts["aux"])
        if aux_info is None:
            log("auxiliary turns_to_end head: not in the resumed model (written before it was measured; the head is "
                "never exported), so not reported")
    models = fit_baselines(tr, va, names)
    mem.note("baselines", log)
    models["eval"] = net.predict
    report = {"schemaId": schema["schemaId"], "data": os.path.abspath(a.data), "backend": backend,
              "splitBy": a.split_by, "splitSummary": summary,
              "rows": rows, "games": games,
              "hyper": hp, "fit": fit_info,
              "models": score_all(models, splits), "grid": grid_results}
    # D364: only when used, so a default run's report is what it was
    if search_summary:
        report["search"] = search_summary
    if fast:
        report["fast"] = True
    if frac < 1.0:
        report["trainFraction"] = frac
    if weight_by:
        report["weightBy"] = weight_by
    if soft_info:
        report["softLabels"] = soft_info
    if opts["subsample"] < 1.0:
        report["subsample"] = opts["subsample"]
    if lsub_info:
        report["loadSubsample"] = lsub_info
    if aux_info is not None:
        report["auxTurnsToEnd"] = aux_info
        log(f"auxiliary turns_to_end head (weight {opts['aux']:g}): test MAE {report['auxTurnsToEnd']['testMAE']:.2f} "
            f"turns against {report['auxTurnsToEnd']['testMAEConstant']:.2f} for the training mean")
    # D364: rows, games, pairs, the effective sample size, intervals over pairs, plain vs exploring --
    # a report-only block (the models and every number above are unchanged)
    report["heldOut"] = held_out_detail(models, splits, read_games(a.data))
    mem.note("score", log)
    report["memory"] = mem.stages
    log(format_report(report))
    log(format_detail(report["heldOut"]))
    log(verdict(report))
    if getattr(a, "eval_human", False):
        report["human"] = eval_human(a.data, schema, models, log)
    if resume:
        report["resumedFrom"] = resume
    if a.out:
        model = net.to_json(schema, names, {
            "excluded": info["excluded"],
            "training": training(info["bestEpoch"], aux_info, date,
                                 {m: {s: report["models"][m][s].get("all") for s in ("val", "test")}
                                  for m in report["models"]})})
        N.save_model(a.out, model)
        log(f"saved {a.out} ({os.path.getsize(a.out)} bytes)")
    report["complete"] = True   # D520: the partial report written after the fit says false
    return report


# ---------------------------------------------------------------- the model on disk before the baselines (D520)

PARTIAL_FIT = ("valLogloss", "epochsRun", "seconds")   # the fit's facts the model's training block does not hold
RESUME_CHECKED = ("data", "backend", "splitBy", "hyper", "rows", "games", "fast", "trainFraction", "weightBy",
                  "subsample", "loadSubsample", "softLabels")


def fmt4(x) -> str:
    return "unknown" if x is None else f"{x:.4f}"


def write_json(path: str, obj: Any) -> None:
    """The report, as json.dump(indent=1) always wrote it, through a temp file and a rename: a kill mid-write
    leaves the file that was there (D520)."""
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=1)
    os.replace(tmp, path)


def training_block(a, backend, hp, rows, games, best_epoch, search_summary, fast, frac, weight_by, opts, lsub_info,
                   aux_info, soft_info, date, metrics=None) -> dict[str, Any]:
    """The exported model's `training` block, in the order it has always had.  The model written after the fit
    lacks `metrics` (the scores) and, under --aux-turns, `auxTurnsToEnd` (measured after that write) (D520)."""
    return {"date": date, "data": os.path.relpath(os.path.abspath(a.data)), "backend": backend,
            "splitBy": a.split_by,
            "hyper": hp, "rows": rows, "games": games,
            "bestEpoch": best_epoch,
            **({"search": {k: v for k, v in search_summary.items() if k != "rungs"}}
               if search_summary else {}),
            **({"fast": True} if fast else {}),
            **({"trainFraction": frac} if frac < 1.0 else {}),
            **({"weightBy": weight_by} if weight_by else {}),
            **({"subsample": opts["subsample"]} if opts["subsample"] < 1.0 else {}),
            **({"loadSubsample": lsub_info} if lsub_info else {}),
            **({"auxTurnsToEnd": aux_info} if aux_info is not None else {}),
            **({"softLabels": soft_info} if soft_info else {}),
            **({"metrics": metrics} if metrics is not None else {})}


def resume_fit(path: str, schema: dict[str, Any], want: dict[str, Any], aux: float, log):
    """--resume-model (D520): the net, the fit's facts and the saved date (and a finished model's auxiliary
    error) from a saved model, refused unless its recorded dataset, split, load share and configuration are this
    run's (every field of `RESUME_CHECKED`, and the auxiliary weight, equal to what this run would write).  What
    those fields do not record passes: `--seed` at a load share of 1 (it seeds only the fit), `--compact` (the
    same numbers), `--threads`, `--verbose`.  A model written after the fit carries `partial.fit` (the val
    log-loss, epochs run, seconds); a finished one does not, and those stay null."""
    import evalnet as N
    try:
        m, net = N.load_model(path)
    except (OSError, ValueError, KeyError) as e:
        raise SystemExit(f"train_eval: --resume-model {path}: {e}")
    if m.get("schemaId") != schema["schemaId"] or m.get("vocab") != schema["vocab"]["cards"]:
        raise SystemExit(f"train_eval: --resume-model {path}: schema {m.get('schemaId')} is not this dataset's "
                         f"{schema['schemaId']}")
    t = m.get("training") or {}
    if "search" in t:
        raise SystemExit(f"train_eval: --resume-model {path}: a searched model; --resume-model resumes a plain fit")
    want = json.loads(json.dumps(want))
    diff = [k for k in RESUME_CHECKED if t.get(k) != want.get(k)]
    partial = m.get("partial") or {}
    aux_weight = (t.get("auxTurnsToEnd") or {}).get("weight", partial.get("auxTurnsWeight"))
    if aux_weight != (aux if aux > 0 else None):
        diff.append("auxTurnsToEnd")
    if diff:
        raise SystemExit(f"train_eval: --resume-model {path} was not trained on this dataset, split, load share and "
                         f"configuration: {', '.join(diff)} differ")
    # from_json's W is a transposed view; the trained net's is C-ordered, and the same layout gives the same
    # products bit for bit
    net.W = [np.ascontiguousarray(w) for w in net.W]
    fit = partial.get("fit") or {}
    info = {"bestEpoch": t.get("bestEpoch"), **{k: fit.get(k) for k in PARTIAL_FIT}, "excluded": m.get("excluded", [])}
    log(f"resume (D520): {path}, trained {t.get('date')}; the fit is skipped, the baselines and scoring run")
    return net, info, {"date": t.get("date"), "auxTurnsToEnd": t.get("auxTurnsToEnd")}


def load_subsample_info(data: str, splits: dict[str, Any], f: float, seed: int) -> dict[str, Any]:
    """The report's `loadSubsample` block (D518): the share, the seed, and per split the rows the dataset holds and
    the rows loaded, with the games present (every game of a sampled split keeps at least one row)."""
    games = read_games(data)
    in_data = {s: 0 for s in ("train", "val", "test")}
    present = {s: set(np.unique(r.game).tolist()) for s, r in splits.items()}
    for i, g in enumerate(games):
        for s in in_data:
            if i in present[s]:
                in_data[s] += int(g["rows"])
    return {"share": f, "seed": seed, "splits": list(LOAD_SUBSAMPLE_SPLITS), "salt": LOAD_SUBSAMPLE_SALT,
            "rowsInData": in_data, "rowsHeld": {s: len(r) for s, r in splits.items()},
            "games": {s: len(present[s]) for s in in_data}}


def dry_load(a, schema, names, splits, summary, mem, log) -> dict[str, Any]:
    """--dry-load: every allocation a real run makes, at the real size, and no
    training -- the standardisation over the whole training split, one training
    batch forward and back, the baselines' feature matrices (one epoch), and
    every model scored on val and test -- then the peak, for a job's pilot."""
    tr, va = splits["train"], splits["val"]
    hp = {"hidden": a.hidden, "dim": a.dim, "dropout": a.dropout, "l2": a.l2, "card_l2": a.card_l2}
    net, _excluded = make_net(tr, names, hp, len(schema["vocab"]["cards"]), a.seed)
    mem.note("standardise", log)
    rng = np.random.default_rng(a.seed)
    net.loss_grad(tr.take(rng.permutation(len(tr))[:a.batch]), a.l2, a.card_l2, rng, a.dropout)
    mem.note("one batch", log)
    models = fit_baselines(tr, va, names, epochs=1)
    mem.note("baselines (1 epoch)", log)
    models["eval"] = net.predict
    score_all(models, splits)
    mem.note("score", log)
    log(f"dry-load: {sum(len(r) for r in splits.values())} rows (train/val/test "
        f"{'/'.join(str(summary[s]['rows']) for s in ('train', 'val', 'test'))}); peak RSS {mem.peak:.2f} GB")
    out = {"dryLoad": True, "data": os.path.abspath(a.data), "splitBy": a.split_by, "splitSummary": summary,
           "rows": {s: len(r) for s, r in splits.items()}, "memory": mem.stages, "peakGB": mem.peak}
    jobs = int(getattr(a, "jobs", 1) or 1)
    if jobs > 1:   # D364: the forked workers of --search sha / --curve, each one batch and a validation slice
        import eval_search as S
        hp = dict(hp, lr=a.lr, batch=a.batch, epochs=1, patience=1)
        priv = S.dry_workers(tr, va, names, hp, len(schema["vocab"]["cards"]), a.seed, opts_of(a), jobs)
        out["workersPrivateGB"] = [round(x, 3) for x in priv]
        out["peakWithWorkersGB"] = round(mem.peak + sum(priv), 3)
        log(f"dry-load: {jobs} workers, private memory {', '.join(f'{x:.2f}' for x in priv)} GB; "
            f"peak with workers {out['peakWithWorkersGB']:.2f} GB")
    return out


def eval_human(data: str, schema: dict[str, Any], models: dict[str, Any], log) -> dict[str, Any]:
    """D347: score every model on the owner's own games (the `human` split, never trained on) and say it apart."""
    import evalnet as N
    files = [f for f in os.listdir(data) if f.startswith("human-") and f.endswith(".npz")]
    if not files:
        log("human games: none in this dataset (put them under var/ml/human/ or pass dataset.py --human DIR)")
        return {"rows": 0}
    r = N.load_rows(data, "human", N.card_offset_of(schema), N.n_states_of(schema))
    out: dict[str, Any] = {"rows": len(r), "games": int(len(np.unique(r.game)))}
    for m, pred in models.items():
        out[m] = metrics(pred(r), r.y.astype(np.int64), r.turn.astype(np.int64))
    log(f"human games ({out['games']} games, {out['rows']} rows; held out of training): " + "; ".join(
        f"{m} logloss {out[m]['all']['logloss']:.4f} acc {out[m]['all']['acc']:.3f}" for m in models))
    return out


def grid_configs(seed: int):
    keys = list(GRID)
    combos = [dict(zip(keys, v)) for v in itertools.product(*(GRID[k] for k in keys))]
    random.Random(seed).shuffle(combos)
    return combos


def grid_search(tr, va, names, base_hp, vocab_size, backend, a, log):
    deadline = time.time() + a.time_budget if a.time_budget else None
    configs = [dict(base_hp)] + [dict(base_hp, **c) for c in grid_configs(a.seed)]
    best = None
    results = []
    logf = open(a.grid_log, "a", encoding="utf-8") if a.grid_log else None
    try:
        for i, hp in enumerate(configs):
            if deadline and time.time() > deadline:
                log(f"grid: time budget reached after {i} configuration(s)")
                break
            o = opts_of(a)
            net, info = fit(tr, va, names, hp, vocab_size, backend, a.seed, None, deadline,
                            fast=o["fast"], weight_by=o["weight_by"], subsample=o["subsample"], aux=o["aux"])
            rec = {"i": i, "hyper": hp, "valLogloss": info["valLogloss"], "bestEpoch": info["bestEpoch"],
                   "seconds": info["seconds"]}
            results.append(rec)
            if logf:
                logf.write(json.dumps(rec) + "\n")
                logf.flush()
            log(f"grid {i:3d}: val {info['valLogloss']:.4f}  epoch {info['bestEpoch']:3d}  {info['seconds']:6.1f}s  "
                f"{json.dumps({k: hp[k] for k in GRID})}")
            if best is None or info["valLogloss"] < best[1]["valLogloss"]:
                best = (net, info, hp)
    finally:
        if logf:
            logf.close()
    if best is None:
        raise SystemExit("grid: no configuration finished")
    log(f"grid: best val logloss {best[1]['valLogloss']:.4f} with {json.dumps({k: best[2][k] for k in GRID})}")
    return best[0], best[1], best[2], results


def run_cv(a, hp, log) -> dict[str, Any]:
    import evalnet as N
    mem = Memory()
    schema = N.read_schema(a.data)
    reserved_warning(a.data)
    names = N.board_names(schema)
    games = read_games(a.data)
    allr = N.load_splits(a.data, N.card_offset_of(schema), ["all"] * len(games), n_states=N.n_states_of(schema))["all"]
    mem.note("load", log)
    group = [g["split_group"] if a.split_by == "dataset" else
             (g.get("game_group") or g["split_group"]) if a.split_by == "game" else pair_key(g) for g in games]
    h = lambda s: int(hashlib.sha256(s.encode()).hexdigest()[:8], 16)  # noqa: E731
    distinct = sorted(set(group), key=lambda k: h(f"cv|{k}"))
    if len(distinct) <= a.cv:   # few groups: leave one group out
        rank = {k: i for i, k in enumerate(distinct)}
        fold = np.array([rank[g] for g in group])[allr.game]
    else:
        fold = np.array([h(f"cv|{g}") % a.cv for g in group])[allr.game]
    # the inner validation split (early stopping) is by GAME inside the training
    # folds: with a handful of pairs a by-pair inner split would leave none
    inner = np.array([h(f"inner|{g.get('game_group') or g['split_group']}") % 5 == 0 for g in games])[allr.game]
    backend = pick_backend(a.backend)
    import r17 as R17
    base = ("prior", "life", "board", "core") if R17.is_r17(names) else ("prior", "life", "core")
    oof = {m: np.full(len(allr), np.nan) for m in base + ("eval",)}
    for k in range(a.cv):
        te_idx = np.nonzero(fold == k)[0]
        tr_mask = fold != k
        if not len(te_idx) or not tr_mask.any():
            continue
        tr = allr.take(np.nonzero(tr_mask & ~inner)[0])
        va = allr.take(np.nonzero(tr_mask & inner)[0])
        te = allr.take(te_idx)
        net, info = fit(tr, va, names, hp, len(schema["vocab"]["cards"]), backend, a.seed)
        models = fit_baselines(tr, va, names)
        models["eval"] = net.predict
        for m, pred in models.items():
            oof[m][te_idx] = pred(te)
        log(f"fold {k}: {len(tr)} train / {len(va)} inner-val / {len(te)} held-out rows; "
            f"eval best epoch {info['bestEpoch']}")
    mem.note("folds", log)
    ok = ~np.isnan(oof["prior"])
    rep = {"schemaId": schema["schemaId"], "folds": a.cv, "splitBy": a.split_by, "rows": int(ok.sum()), "games": len(games),
           "groups": len(set(group)), "backend": backend, "hyper": hp,
           "models": {m: {"cv": metrics(p[ok], allr.y[ok].astype(np.int64), allr.turn[ok].astype(np.int64))}
                      for m, p in oof.items()}, "memory": mem.stages}
    log(format_report(rep))
    log(verdict(rep))
    return rep


def verdict(r: dict[str, Any]) -> str:
    """One line: does the model beat D305's baselines on the held-out split?
    A model that does not should not replace a hand-written leaf (D316)."""
    split = "cv" if "folds" in r else "test"
    ll = {m: r["models"][m].get(split, {}).get("all", {}).get("logloss") for m in r["models"]}
    if ll.get("eval") is None:
        return "verdict: no held-out rows"
    best = min((m for m in ll if m != "eval" and ll[m] is not None), key=lambda m: ll[m])
    ok = ll["eval"] < ll[best]
    return (f"verdict ({split}): eval log-loss {ll['eval']:.4f} vs best baseline {best} {ll[best]:.4f} -- "
            + ("the evaluator wins" if ok else "the evaluator LOSES to a baseline: more games (more pairs), "
               "not a bigger model; do not use it at the search's leaves yet"))


def format_report(r: dict[str, Any]) -> str:
    head = f"rows {r['rows']}; games {r['games']}"
    if "folds" in r:
        head += f"; {r['folds']}-fold grouped CV over {r['groups']} groups"
    out = [head]
    for split in (("cv",) if "folds" in r else ("val", "test")):
        out.append(f"\n{split}:")
        out.append(f"  {'model':6s} {'bucket':11s} {'rows':>6s} {'acc':>6s} {'logloss':>8s} {'brier':>6s} {'ece':>6s}")
        for m, res in r["models"].items():
            for bucket, mt in res.get(split, {}).items():
                if bucket == "reliability" or not mt.get("rows"):
                    continue
                out.append(f"  {m:6s} {bucket:11s} {mt['rows']:6d} {mt['acc']:6.3f} {mt['logloss']:8.4f} "
                           f"{mt['brier']:6.3f} {mt['ece']:6.3f}")
        rel = r["models"].get("eval", {}).get(split, {}).get("reliability")
        if rel:
            out.append(f"  reliability (eval, {split}): bin rows predicted observed")
            for b in rel:
                if b["rows"]:
                    out.append(f"    {b['bin']}  {b['rows']:6d}  {b['predicted']:.3f}  {b['observed']:.3f}")
    return "\n".join(out)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("data")
    ap.add_argument("--out", help="export the model here (JSON)")
    ap.add_argument("--report", help="write the report here (JSON)")
    ap.add_argument("--hidden", default=DEFAULTS["hidden"], help="hidden layer sizes, e.g. 64 or 128,32; '' = logistic")
    ap.add_argument("--dim", type=int, default=DEFAULTS["dim"], help="card embedding size")
    ap.add_argument("--l2", type=float, default=DEFAULTS["l2"])
    ap.add_argument("--card-l2", type=float, default=DEFAULTS["card_l2"])
    ap.add_argument("--dropout", type=float, default=DEFAULTS["dropout"])
    ap.add_argument("--lr", type=float, default=DEFAULTS["lr"])
    ap.add_argument("--batch", type=int, default=DEFAULTS["batch"])
    ap.add_argument("--epochs", type=int, default=DEFAULTS["epochs"])
    ap.add_argument("--patience", type=int, default=DEFAULTS["patience"])
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--backend", default="auto", choices=("auto", "numpy", "torch"))
    ap.add_argument("--threads", type=int, default=0, help="torch threads (0: torch's default)")
    ap.add_argument("--grid", action="store_true", help="search hyperparameters (see GRID) until --time-budget")
    ap.add_argument("--time-budget", type=float, default=0,
                    help="seconds for --grid (0: the whole grid) or --search sha (plans --configs from it)")
    ap.add_argument("--grid-log", help="append one JSON line per grid configuration (per configuration and rung "
                                       "under --search sha)")
    ap.add_argument("--search", choices=("grid", "sha"),
                    help="grid: --grid; sha: successive halving over GRID's space (eval_search.py, D364): "
                         "--configs N (or planned from --time-budget), every rung's configurations trained the "
                         "same epochs, the survivors resumed, the finalists to early stopping")
    ap.add_argument("--configs", type=int, default=0, help="--search sha: configurations (0: plan from --time-budget)")
    ap.add_argument("--eta", type=int, default=3, help="--search sha: keep 1/eta of a rung (default 3)")
    ap.add_argument("--min-epochs", type=int, default=2, help="--search sha: rung 0's epochs (default 2)")
    ap.add_argument("--finalists", type=int, default=0,
                    help="--search sha: configurations trained to early stopping (default eta)")
    ap.add_argument("--final-epochs", type=int, default=40,
                    help="--search sha: the epochs a finalist is planned to take, for planning --configs (40)")
    ap.add_argument("--jobs", type=int, default=1,
                    help="--search sha / --curve: configurations trained at once, in forked workers sharing the "
                         "rows (results do not depend on it)")
    ap.add_argument("--fast", action="store_true",
                    help="train in float32 (evalnet.Fast32: about twice as fast; not bit for bit the default "
                         "float64; the export and scoring are unchanged) (D364)")
    ap.add_argument("--train-fraction", type=float, default=1.0,
                    help="train on this share of the training deck pairs, chosen by a hash of the pair (nested "
                         "across shares); validation and test unchanged (D364)")
    ap.add_argument("--weight-by", choices=("game",),
                    help="game: every game the same total weight in the training loss and the validation "
                         "log-loss (a long game's many correlated rows do not dominate) (D364)")
    ap.add_argument("--curve-weights", default="",
                    help="--curve: also train each share game-weighted and compare on the same test pairs "
                         "(none,game)")
    ap.add_argument("--soft-labels", help="an .npz of soft labels for some training rows (game, rows_to_end, p in "
                                          "[0, 1], optional k): the training target there is (1 - w) outcome + w p "
                                          "(D364)")
    ap.add_argument("--soft-weight", type=float, default=1.0, help="--soft-labels: w (default 1)")
    ap.add_argument("--compact", action="store_true",
                    help="hold the rows in about 0.35 KB instead of 0.62 (board columns that fit in int8 as int8, "
                         "int8 counts, int32 row pointers); the same numbers (D364)")
    ap.add_argument("--load-subsample", type=float, default=1.0, metavar="F",
                    help="hold only ceil(F x a game's rows) of every train and val game, chosen at load by a hash of "
                         "the game and --seed (the same rows in any dataset holding the game); test is never sampled; "
                         "1 (default) is the full load (D518)")
    ap.add_argument("--subsample", type=float, default=1.0,
                    help="each epoch trains on ceil(s x a game's rows) of every game, drawn afresh (e.g. 0.125): "
                         "an epoch costs s of a pass, so a search fits more configurations (D364)")
    ap.add_argument("--aux-turns", type=float, default=0.0,
                    help="an auxiliary head predicting turns_to_end, its squared error (standardised) times this "
                         "weight in the loss; never exported, the win head stays the model (D364)")
    ap.add_argument("--curve", help="a learning curve: train the configuration on these shares of the training "
                                    "pairs (e.g. 0.25,0.5,1.0) and report test log-loss with intervals; exports nothing")
    ap.add_argument("--cv", type=int, default=0, metavar="K", help="grouped K-fold out-of-fold scores; no export "
                    "(folds by deck pair unless --split-by dataset; K = the number of pairs is leave-one-pair-out)")
    ap.add_argument("--split-by", default="pair",
                    help="pair (default): every deck pair in one split, so test is decks never seen in training; "
                         "holdout:REGEX: the games whose deck names match are the test split (a whole cube: "
                         "holdout:^modern-); game: D305's by-game split (flatters: shown for comparison); "
                         "dataset: dataset.py's own split")
    ap.add_argument("--verbose", action="store_true", help="print every epoch")
    ap.add_argument("--dry-load", action="store_true",
                    help="load and split the data, standardise, run one training batch, build the baselines' "
                         "matrices and score once -- every allocation of a real run, no training -- then print "
                         "the peak resident memory and exit (a job's pilot; --report gets the numbers)")
    ap.add_argument("--eval-human", action="store_true",
                    help="also score every model on the dataset's `human` split -- the owner's own games, never "
                         "trained on (dataset.py --human; D347)")
    ap.add_argument("--resume-model", metavar="PATH",
                    help="skip the fit: score a saved model (the one --out writes after the fit, before the "
                         "baselines) -- the baselines, scoring, report and the final --out run as after a fit; "
                         "refused unless its recorded dataset, split, load share and configuration are this run's "
                         "(D520)")
    a = ap.parse_args(argv)
    if np is None:
        print("train_eval: needs numpy (pip install numpy; see tools/ml/README.md)", file=sys.stderr)
        return 2
    if a.threads:
        try:
            import torch
            torch.set_num_threads(a.threads)
        except ImportError:
            pass
    hp = {"hidden": a.hidden, "dim": a.dim, "l2": a.l2, "card_l2": a.card_l2, "dropout": a.dropout, "lr": a.lr,
          "batch": a.batch, "epochs": a.epochs, "patience": a.patience}
    log = lambda s: print(s, flush=True)  # noqa: E731
    if a.dry_load and a.cv:
        raise SystemExit("train_eval: --dry-load measures a train run; drop --cv")
    if not 0 < a.subsample <= 1:
        raise SystemExit("train_eval: --subsample is a share in (0, 1]")
    if a.aux_turns < 0 or not 0 <= a.soft_weight <= 1:
        raise SystemExit("train_eval: --aux-turns is >= 0 and --soft-weight in [0, 1]")
    if a.compact and a.backend == "torch":
        raise SystemExit("train_eval: --compact trains with numpy")
    if a.cv and (a.weight_by or a.subsample < 1 or a.aux_turns or a.soft_labels or a.fast or a.compact):
        raise SystemExit("train_eval: --cv takes none of D364's training options")
    if not 0 < a.train_fraction <= 1:
        raise SystemExit("train_eval: --train-fraction is a share in (0, 1]")
    if not 0 < a.load_subsample <= 1:
        raise SystemExit("train_eval: --load-subsample is a share in (0, 1]")
    if a.load_subsample < 1 and (a.cv or a.curve):
        raise SystemExit("train_eval: --load-subsample is for a plain fit, --search or --dry-load; drop --cv and --curve")
    if a.curve and (a.cv or a.grid or a.search or a.train_fraction < 1 or a.out):
        raise SystemExit("train_eval: --curve trains one configuration on its own shares; drop --cv, --grid, "
                         "--search, --train-fraction and --out")
    if a.cv and (a.search or a.train_fraction < 1):
        raise SystemExit("train_eval: --cv takes neither --search nor --train-fraction")
    if a.resume_model and (a.cv or a.curve or a.grid or a.search or a.dry_load):
        raise SystemExit("train_eval: --resume-model resumes a plain fit; drop --cv, --curve, --grid, --search "
                         "and --dry-load")
    if a.curve and not a.dry_load:
        import eval_search as S
        rep = S.learning_curve(a, hp, log)
    else:
        rep = run_cv(a, hp, log) if a.cv else run_train(a, hp, log)
    if a.report:
        write_json(a.report, rep)
    return 0


if __name__ == "__main__":
    sys.exit(main())
