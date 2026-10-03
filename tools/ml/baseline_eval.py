#!/usr/bin/env python3
# mtg-table — tools/ml: a non-neural baseline position evaluator.
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""Logistic regression on the dataset's features, numpy only (D305).

    python3 tools/ml/baseline_eval.py var/ml/data/synergy [--epochs 400] [--l2 1e-3]
        [--lr 0.05] [--model out.json] [--json report.json] [--cv K]

It proves the features carry signal before anything bigger is trained: the
model ("who's winning from this board?") is compared on val and test against

  * prior    -- the training split's win rate, the same for every row;
  * life     -- a logistic regression on the life difference alone;
  * core     -- on twelve numbers: ten me-minus-opp differences (life, hand,
                library, graveyard, lands, mana available, creatures, power,
                toughness, untapped power), the turn and whose turn it is;
  * global   -- logistic regression on every block but the per-card counts;
  * full     -- logistic regression on every feature.

The target is P(viewer wins): label +1 -> 1, -1 -> 0, a draw 0.5.  Features are
standardised with the training split's mean and deviation.  Training is
full-batch Adam with L2, the epoch kept being the one with the lowest
validation log-loss (the last one when there is no validation split).
Accuracy counts decided games only (a draw has no right side); log-loss and
Brier count every row.  `--cv K` scores grouped K-fold out-of-fold
predictions over every row instead (a game in one fold only) -- the honest
number while the corpus is a few dozen games.  Every metric is also given per turn bucket, since an
evaluator is worth more late than early -- and is easier late.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dataset as D  # noqa: E402

try:
    import numpy as np
except ImportError:  # pragma: no cover
    np = None  # type: ignore

# The "core" model: ten me-minus-opp differences and two plain features -- a
# dozen numbers a player would name first, few enough to fit from a few games.
CORE_DIFFS = ["life", "hand", "library", "graveyard", "lands", "mana_available", "board.creatures",
              "board.power", "board.toughness", "board.untapped_power"]
CORE_PLAIN = ["turn", "my_turn"]


def core_matrix(X, names):
    cols = [X[:, names.index(f"me.{f}")] - X[:, names.index(f"opp.{f}")] for f in CORE_DIFFS]
    cols += [X[:, names.index(f)] for f in CORE_PLAIN]
    return np.stack(cols, axis=1).astype(np.float64)


BUCKETS = [(1, 4), (5, 8), (9, 12), (13, 16), (17, 10_000)]
EPS = 1e-7


def target(y):
    return (y.astype(np.float64) + 1.0) / 2.0


def sigmoid(z):
    return 1.0 / (1.0 + np.exp(-np.clip(z, -30, 30)))


class Standardiser:
    def __init__(self, X):
        self.mean = X.mean(axis=0) if len(X) else np.zeros(X.shape[1])
        sd = X.std(axis=0) if len(X) else np.ones(X.shape[1])
        self.sd = np.where(sd > 1e-9, sd, 1.0)

    def __call__(self, X):
        return (X - self.mean) / self.sd


def fit_logistic(Xtr, ttr, Xva=None, tva=None, epochs=400, lr=0.05, l2=1e-3, seed=0):
    """Full-batch Adam on mean cross-entropy + l2/2 |w|^2.  Returns (w, b, best_epoch)."""
    rng = np.random.default_rng(seed)
    n, d = Xtr.shape
    w = rng.normal(0, 0.01, d)
    b = 0.0
    m_w = np.zeros(d); v_w = np.zeros(d); m_b = 0.0; v_b = 0.0
    b1, b2 = 0.9, 0.999
    best = (np.inf, w.copy(), b, 0)
    for t in range(1, epochs + 1):
        p = sigmoid(Xtr @ w + b)
        g = p - ttr
        gw = Xtr.T @ g / n + l2 * w
        gb = g.mean()
        m_w = b1 * m_w + (1 - b1) * gw; v_w = b2 * v_w + (1 - b2) * gw * gw
        m_b = b1 * m_b + (1 - b1) * gb; v_b = b2 * v_b + (1 - b2) * gb * gb
        w -= lr * (m_w / (1 - b1 ** t)) / (np.sqrt(v_w / (1 - b2 ** t)) + 1e-8)
        b -= lr * (m_b / (1 - b1 ** t)) / (np.sqrt(v_b / (1 - b2 ** t)) + 1e-8)
        if Xva is not None and len(Xva):
            ll = logloss(sigmoid(Xva @ w + b), tva)
            if ll < best[0]:
                best = (ll, w.copy(), b, t)
    if Xva is None or not len(Xva):
        return w, b, epochs
    return best[1], best[2], best[3]


def logloss(p, t):
    p = np.clip(p, EPS, 1 - EPS)
    return float(-(t * np.log(p) + (1 - t) * np.log(1 - p)).mean()) if len(p) else float("nan")


def metrics(p, y, turn) -> dict[str, Any]:
    t = target(y)
    decided = y != 0

    def one(mask):
        n = int(mask.sum())
        if n == 0:
            return {"rows": 0}
        dm = mask & decided
        acc = float(((p[dm] > 0.5) == (y[dm] > 0)).mean()) if dm.any() else float("nan")
        return {"rows": n, "acc": acc, "logloss": logloss(p[mask], t[mask]),
                "brier": float(((p[mask] - t[mask]) ** 2).mean())}

    out = {"all": one(np.ones(len(y), bool))}
    for lo, hi in BUCKETS:
        out[f"turn {lo}-{hi}" if hi < 10_000 else f"turn {lo}+"] = one((turn >= lo) & (turn <= hi))
    return out


def run(data: str, epochs=400, lr=0.05, l2=1e-3, seed=0) -> dict[str, Any]:
    if np is None:
        raise SystemExit("baseline_eval.py needs numpy")
    with open(os.path.join(data, "features.json"), encoding="utf-8") as f:
        schema = json.load(f)
    names = []
    for b in schema["blocks"]:
        if b["name"] == "cards":
            names.extend([None] * b["length"])
        else:
            names.extend(x["name"] for x in b["features"])
    card_block = next(b for b in schema["blocks"] if b["name"] == "cards")
    glob_cols = np.array([i for i in range(schema["nFeatures"])
                          if not (card_block["offset"] <= i < card_block["offset"] + card_block["length"])])
    li_me, li_opp = names.index("me.life"), names.index("opp.life")

    tr, va, te = (D.load(data, s) for s in D.SPLITS)
    if len(tr["y"]) == 0:
        raise SystemExit("no training rows")
    ttr = target(tr["y"])
    report: dict[str, Any] = {"schemaId": schema["schemaId"], "rows": {s: int(len(d["y"])) for s, d in
                                                                        zip(D.SPLITS, (tr, va, te))},
                              "games": {s: int(len(np.unique(d["game"]))) for s, d in
                                        zip(D.SPLITS, (tr, va, te))},
                              "models": {}}
    prior = float(ttr.mean())

    def life(d):
        return (d["X"][:, li_me] - d["X"][:, li_opp])[:, None].astype(np.float64)

    feature_sets = {"life": life,
                    "core": lambda d: core_matrix(d["X"], names),
                    "global": lambda d: d["X"][:, glob_cols].astype(np.float64),
                    "full": lambda d: d["X"].astype(np.float64)}
    report["models"]["prior"] = {"params": {"p": prior},
                                 **{s: metrics(np.full(len(d["y"]), prior), d["y"], d["turn"])
                                    for s, d in (("train", tr), ("val", va), ("test", te))}}
    fitted = {}
    for name, fx in feature_sets.items():
        Xtr = fx(tr)
        st = Standardiser(Xtr)
        Xva = st(fx(va)) if len(va["y"]) else None
        w, b, ep = fit_logistic(st(Xtr), ttr, Xva, target(va["y"]) if len(va["y"]) else None,
                                epochs, lr, l2, seed)
        fitted[name] = (st, w, b)
        res = {"params": {"epoch": ep, "l2": l2, "lr": lr, "nFeatures": int(Xtr.shape[1])}}
        for s, d in (("train", tr), ("val", va), ("test", te)):
            res[s] = metrics(sigmoid(st(fx(d)) @ w + b), d["y"], d["turn"]) if len(d["y"]) else {"all": {"rows": 0}}
        report["models"][name] = res
    st, w, b = fitted["full"]
    order = np.argsort(-np.abs(w))[:25]
    full_names = [n if n is not None else f"cards[{i - card_block['offset']}]" for i, n in enumerate(names)]
    card_states = schema["cardStates"]
    vocab = schema["vocab"]["cards"]
    for i in range(card_block["offset"], card_block["offset"] + card_block["length"]):
        k = i - card_block["offset"]
        full_names[i] = f"card[{vocab[k // len(card_states)]}].{card_states[k % len(card_states)]}"
    report["topWeights"] = [{"feature": full_names[i], "w": round(float(w[i]), 4)} for i in order]
    report["_model"] = {"mean": st.mean.tolist(), "sd": st.sd.tolist(), "w": w.tolist(), "b": float(b)}
    return report


def run_cv(data: str, folds: int = 5, epochs=300, lr=0.05, l2=1e-2, seed=0) -> dict[str, Any]:
    """Grouped K-fold cross-validation over EVERY split's rows: a game's split
    group is in exactly one fold, each fold is predicted by models fitted on
    the others (fixed epochs, no early stopping), and the out-of-fold
    predictions are scored together.  For a small corpus, where one test split
    of a few games says little."""
    import hashlib
    if np is None:
        raise SystemExit("baseline_eval.py needs numpy")
    with open(os.path.join(data, "features.json"), encoding="utf-8") as f:
        schema = json.load(f)
    with open(os.path.join(data, "games.jsonl"), encoding="utf-8") as f:
        games = [json.loads(line) for line in f]
    parts = [D.load(data, s) for s in D.SPLITS]
    d = {k: np.concatenate([p[k] for p in parts]) for k in parts[0]}
    fold_of_game = np.array([int(hashlib.sha256(f"cv|{g['split_group']}".encode()).hexdigest()[:8], 16) % folds
                             for g in games])
    fold = fold_of_game[d["game"]]
    names = []
    for b in schema["blocks"]:
        names.extend([None] * b["length"] if b["name"] == "cards" else [x["name"] for x in b["features"]])
    cb = next(b for b in schema["blocks"] if b["name"] == "cards")
    glob_cols = np.array([i for i in range(schema["nFeatures"]) if not (cb["offset"] <= i < cb["offset"] + cb["length"])])
    li_me, li_opp = names.index("me.life"), names.index("opp.life")
    X = d["X"].astype(np.float64)
    sets = {"life": (X[:, li_me] - X[:, li_opp])[:, None], "core": core_matrix(X, names),
            "global": X[:, glob_cols], "full": X}
    t = target(d["y"])
    oof = {m: np.zeros(len(t)) for m in ("prior", *sets)}
    for k in range(folds):
        te, tr = fold == k, fold != k
        if not te.any() or not tr.any():
            continue
        oof["prior"][te] = t[tr].mean()
        for m, Xm in sets.items():
            st = Standardiser(Xm[tr])
            w, b, _ = fit_logistic(st(Xm[tr]), t[tr], None, None, epochs, lr, l2, seed)
            oof[m][te] = sigmoid(st(Xm[te]) @ w + b)
    return {"schemaId": schema["schemaId"], "folds": folds, "rows": int(len(t)),
            "games": len(games), "groups": len({g["split_group"] for g in games}),
            "models": {m: {"cv": metrics(p, d["y"], d["turn"])} for m, p in oof.items()}}


def format_report(r: dict[str, Any]) -> str:
    out = [f"baseline: schema {r['schemaId']}; rows {r['rows']}; games {r['games']}"
           + (f"; {r['folds']}-fold grouped CV over {r['groups']} groups" if "folds" in r else "")]
    for split in (("cv",) if "folds" in r else ("val", "test")):
        out.append(f"\n{split}:")
        out.append(f"  {'model':7s} {'bucket':11s} {'rows':>6s} {'acc':>6s} {'logloss':>8s} {'brier':>6s}")
        for m, res in r["models"].items():
            for bucket, mt in res.get(split, {}).items():
                if not mt.get("rows"):
                    continue
                out.append(f"  {m:7s} {bucket:11s} {mt['rows']:6d} {mt['acc']:6.3f} {mt['logloss']:8.4f} "
                           f"{mt['brier']:6.3f}")
    if "topWeights" in r:
        out.append("\nlargest |w| (full model, standardised features):")
    for tw in r.get("topWeights", [])[:12]:
        out.append(f"  {tw['w']:+.3f}  {tw['feature']}")
    return "\n".join(out)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("data")
    ap.add_argument("--epochs", type=int, default=400)
    ap.add_argument("--lr", type=float, default=0.05)
    ap.add_argument("--l2", type=float, default=1e-3)
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--model", help="write the full model (mean, sd, w, b) as JSON")
    ap.add_argument("--json", help="write the report as JSON")
    ap.add_argument("--cv", type=int, default=0, metavar="K",
                    help="grouped K-fold cross-validation over every row instead of train/val/test")
    a = ap.parse_args(argv)
    if a.cv:
        r = run_cv(a.data, a.cv, a.epochs, a.lr, a.l2, a.seed)
        if a.json:
            with open(a.json, "w", encoding="utf-8") as f:
                json.dump(r, f, indent=1)
        print(format_report(r))
        return 0
    r = run(a.data, a.epochs, a.lr, a.l2, a.seed)
    model = r.pop("_model")
    if a.model:
        with open(a.model, "w", encoding="utf-8") as f:
            json.dump({"schemaId": r["schemaId"], **model}, f)
    if a.json:
        with open(a.json, "w", encoding="utf-8") as f:
            json.dump(r, f, indent=1)
    print(format_report(r))
    return 0


if __name__ == "__main__":
    sys.exit(main())
