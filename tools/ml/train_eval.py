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
        [--cv K] [--report report.json]

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

def fit_baselines(tr, va, names) -> dict[str, Any]:
    """D305's three baselines fitted on `tr` (early stopping on `va`); returns
    name -> predict(rows)."""
    import baseline_eval as B
    li_me, li_opp = names.index("me.life"), names.index("opp.life")

    def life(r):
        return (r.board[:, li_me] - r.board[:, li_opp])[:, None].astype(np.float64)

    def core(r):
        return B.core_matrix(r.board.astype(np.float64), names)

    prior = float(tr.t.mean()) if len(tr) else 0.5
    models: dict[str, Any] = {"prior": lambda r: np.full(len(r), prior)}
    for name, fx in (("life", life), ("core", core)):
        Xtr = fx(tr)
        st = B.Standardiser(Xtr)
        has_va = len(va) > 0
        w, b, _ep = B.fit_logistic(st(Xtr), tr.t, st(fx(va)) if has_va else None, va.t if has_va else None,
                                   400, 0.05, 1e-3, 0)
        models[name] = (lambda st, w, b, fx: (lambda r: B.sigmoid(st(fx(r)) @ w + b)))(st, w, b, fx)
    return models


# ---------------------------------------------------------------- training

def make_net(tr, names, hp, vocab_size, seed):
    import evalnet as N
    excluded_unsafe = [i for i, n in enumerate(names) if n in N.LIVE_UNSAFE]
    X = tr.board.astype(np.float64)
    mean = X.mean(axis=0) if len(X) else np.zeros(len(names))
    sd = X.std(axis=0) if len(X) else np.zeros(len(names))
    constant = [i for i in range(len(names)) if not sd[i] > 1e-9]
    cols = [i for i in range(len(names)) if i not in set(excluded_unsafe) | set(constant)]
    net = N.EvalNet(cols, mean[cols], sd[cols], vocab_size, int(hp["dim"]), parse_hidden(hp["hidden"]), seed)
    excluded = {"liveUnsafe": [names[i] for i in excluded_unsafe],
                "constantInTraining": [names[i] for i in constant if i not in excluded_unsafe]}
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


def train_numpy(net, tr, va, hp, seed, log=None, deadline=None):
    rng = np.random.default_rng(seed)
    state: dict[int, Any] = {}
    step = 0
    best = (math.inf, net.copy_params(), 0)
    bad = 0
    history = []
    n = len(tr)
    for ep in range(1, int(hp["epochs"]) + 1):
        perm = rng.permutation(n)
        tot = 0.0
        for i in range(0, n, int(hp["batch"])):
            b = tr.take(perm[i:i + int(hp["batch"])])
            _loss, ce, grads = net.loss_grad(b, hp["l2"], hp["card_l2"], rng, hp["dropout"])
            step += 1
            _adam_step(net.params(), grads, state, hp["lr"], step)
            tot += ce * len(b)
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


def train_torch(net, tr, va, hp, seed, log=None, deadline=None):
    import torch
    import evalnet as N
    torch.manual_seed(seed)
    rng = np.random.default_rng(seed)
    S = N.N_STATES
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
        xb = (torch.from_numpy(r.board).to(dev)[:, cols] - mean) / sd
        flat = torch.from_numpy(r.row_of_nnz() * S + r.state.astype(np.int64)).to(dev)
        slot = torch.from_numpy(r.slot.astype(np.int64)).to(dev)
        cnt = torch.from_numpy(r.count).to(dev)
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


def fit(tr, va, names, hp, vocab_size, backend, seed=0, log=None, deadline=None):
    net, excluded = make_net(tr, names, hp, vocab_size, seed)
    trainer = train_torch if backend == "torch" else train_numpy
    t0 = time.time()
    ep, vl, hist = trainer(net, tr, va, hp, seed, log, deadline)
    return net, {"bestEpoch": ep, "valLogloss": vl, "epochsRun": len(hist), "seconds": round(time.time() - t0, 1),
                 "excluded": excluded, "history": hist}


# ---------------------------------------------------------------- the runs

def load_data(data: str, split_by: str = "dataset"):
    import evalnet as N
    schema = N.read_schema(data)
    off = N.card_offset_of(schema)
    names = N.board_names(schema)
    splits = {s: N.load_rows(data, s, off) for s in ("train", "val", "test")}
    if split_by != "dataset":
        splits = resplit(data, splits, split_by)
    return schema, names, splits


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


def resplit(data: str, splits: dict[str, Any], how: str) -> dict[str, Any]:
    """Re-split every row by deck pair (`pair`) or hold out the games whose decks
    match a pattern -- a deck name or the log's path -- as the test split
    (`holdout:REGEX`, e.g. a whole cube's `holdout:^modern-`); the rest go to train/val by pair.  No pair is ever in two
    splits, so the test split is decks the model never saw."""
    import re
    import evalnet as N
    games = read_games(data)
    allr = N.Rows.concat([splits[s] for s in ("train", "val", "test") if len(splits[s])])
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
    sg = np.array(split_of_game)[allr.game] if len(allr) else np.array([], dtype=str)
    return {s: allr.take(np.nonzero(sg == s)[0]) for s in ("train", "val", "test")}


def split_summary(data: str, splits: dict[str, Any]) -> dict[str, Any]:
    """Per split: games, deck pairs and decks -- and how many test rows come from
    a deck the training split also holds (0 under pair and holdout splits)."""
    games = read_games(data)
    out: dict[str, Any] = {}
    decks: dict[str, set] = {}
    for s, r in splits.items():
        gi = sorted(set(r.game.tolist()))
        ds = set()
        for i in gi:
            ds |= set(d for d in (games[i].get("match") or "").split("|") if d)
        decks[s] = ds
        out[s] = {"rows": len(r), "games": len(gi), "pairs": len({pair_key(games[i]) for i in gi}),
                  "decks": len(ds)}
    te = splits["test"]
    seen = sum(1 for i in te.game.tolist()
               if set((games[i].get("match") or "").split("|")) & decks["train"] - {""})
    out["testRowsWithATrainingDeck"] = seen
    return out


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
    schema, names, splits = load_data(a.data, a.split_by)
    tr, va, te = splits["train"], splits["val"], splits["test"]
    if not len(tr):
        raise SystemExit("train_eval: no training rows")
    backend = pick_backend(a.backend)
    summary = split_summary(a.data, splits)
    log(f"split by {a.split_by}: " + "; ".join(
        f"{s} {summary[s]['rows']} rows / {summary[s]['games']} games / {summary[s]['pairs']} pairs"
        for s in ("train", "val", "test")) + f"; test rows from a deck seen in training: "
        f"{summary['testRowsWithATrainingDeck']}")
    log(f"train_eval: schema {schema['schemaId']}, {schema['nFeatures']} features, vocab {len(schema['vocab']['cards'])}; "
        f"rows train/val/test {len(tr)}/{len(va)}/{len(te)}; games "
        f"{len(np.unique(tr.game))}/{len(np.unique(va.game))}/{len(np.unique(te.game))}; backend {backend}")
    grid_results = []
    if a.grid:
        net, info, hp, grid_results = grid_search(tr, va, names, hp, len(schema["vocab"]["cards"]), backend, a, log)
    else:
        net, info = fit(tr, va, names, hp, len(schema["vocab"]["cards"]), backend, a.seed,
                        log if a.verbose else None)
    log(f"model: hidden {net.hidden or 'none (logistic)'}, card dim {net.dim}, {net.n_params()} parameters, "
        f"{len(net.cols)} board columns; best epoch {info['bestEpoch']} of {info['epochsRun']} "
        f"({info['seconds']} s), val logloss {info['valLogloss']:.4f}")
    models = fit_baselines(tr, va, names)
    models["eval"] = net.predict
    report = {"schemaId": schema["schemaId"], "data": os.path.abspath(a.data), "backend": backend,
              "splitBy": a.split_by, "splitSummary": summary,
              "rows": {s: len(r) for s, r in splits.items()},
              "games": {s: int(len(np.unique(r.game))) for s, r in splits.items()},
              "hyper": hp, "fit": {k: v for k, v in info.items() if k != "history"},
              "models": score_all(models, splits), "grid": grid_results}
    log(format_report(report))
    if a.out:
        model = net.to_json(schema, names, {
            "excluded": info["excluded"],
            "training": {"date": N.now(), "data": os.path.relpath(os.path.abspath(a.data)), "backend": backend,
                         "splitBy": a.split_by,
                         "hyper": hp, "rows": report["rows"], "games": report["games"],
                         "bestEpoch": info["bestEpoch"],
                         "metrics": {m: {s: report["models"][m][s].get("all") for s in ("val", "test")}
                                     for m in report["models"]}}})
        N.save_model(a.out, model)
        log(f"saved {a.out} ({os.path.getsize(a.out)} bytes)")
    return report


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
            net, info = fit(tr, va, names, hp, vocab_size, backend, a.seed, None, deadline)
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
    schema, names, splits = load_data(a.data)
    games = read_games(a.data)
    allr = N.Rows.concat([splits[s] for s in ("train", "val", "test") if len(splits[s])])
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
    oof = {m: np.full(len(allr), np.nan) for m in ("prior", "life", "core", "eval")}
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
    ok = ~np.isnan(oof["prior"])
    rep = {"schemaId": schema["schemaId"], "folds": a.cv, "splitBy": a.split_by, "rows": int(ok.sum()), "games": len(games),
           "groups": len(set(group)), "backend": backend, "hyper": hp,
           "models": {m: {"cv": metrics(p[ok], allr.y[ok].astype(np.int64), allr.turn[ok].astype(np.int64))}
                      for m, p in oof.items()}}
    log(format_report(rep))
    return rep


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
    ap.add_argument("--time-budget", type=float, default=0, help="seconds for --grid (0: the whole grid)")
    ap.add_argument("--grid-log", help="append one JSON line per grid configuration")
    ap.add_argument("--cv", type=int, default=0, metavar="K", help="grouped K-fold out-of-fold scores; no export "
                    "(folds by deck pair unless --split-by dataset; K = the number of pairs is leave-one-pair-out)")
    ap.add_argument("--split-by", default="pair",
                    help="pair (default): every deck pair in one split, so test is decks never seen in training; "
                         "holdout:REGEX: the games whose deck names match are the test split (a whole cube: "
                         "holdout:^modern-); game: D305's by-game split (flatters: shown for comparison); "
                         "dataset: dataset.py's own split")
    ap.add_argument("--verbose", action="store_true", help="print every epoch")
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
    rep = run_cv(a, hp, log) if a.cv else run_train(a, hp, log)
    if a.report:
        with open(a.report, "w", encoding="utf-8") as f:
            json.dump(rep, f, indent=1)
    return 0


if __name__ == "__main__":
    sys.exit(main())
