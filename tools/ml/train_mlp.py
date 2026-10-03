#!/usr/bin/env python3
# mtg-table — tools/ml: a small MLP position evaluator (torch, optional).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""Train a small MLP "who's winning from this board?" on a dataset (D305).

    python3 tools/ml/train_mlp.py var/ml/data/synergy [--hidden 256,64] [--epochs 60]
        [--batch 512] [--lr 1e-3] [--wd 1e-4] [--dropout 0.2] [--device auto]
        [--out var/ml/models/mlp.pt]

Torch is OPTIONAL for this repo: without it this script says so and exits 0,
so nothing that runs it (a test, a smoke run) fails on a machine without it.
The two heads: P(viewer wins) (cross-entropy on (label+1)/2, a draw 0.5) and,
as an auxiliary, turns-to-end (smooth L1, weight 0.1) -- a cheap second signal
that makes the trunk learn tempo and not only the final result.

Inputs are standardised with the training split's mean and deviation (saved
with the model).  Per epoch it prints train/val log-loss and accuracy; the
checkpoint kept is the epoch with the lowest validation log-loss.  The
report's per-turn-bucket table is baseline_eval.py's, so the two compare.
"""
from __future__ import annotations

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("data")
    ap.add_argument("--hidden", default="256,64")
    ap.add_argument("--epochs", type=int, default=60)
    ap.add_argument("--batch", type=int, default=512)
    ap.add_argument("--lr", type=float, default=1e-3)
    ap.add_argument("--wd", type=float, default=1e-4)
    ap.add_argument("--dropout", type=float, default=0.2)
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--device", default="auto", help="auto, cpu, cuda")
    ap.add_argument("--out", help="save the best checkpoint here (.pt)")
    a = ap.parse_args(argv)
    try:
        import torch
        from torch import nn
    except ImportError:
        print("train_mlp: torch is not installed -- skipping (pip install torch; see tools/ml/README.md)")
        return 0
    import numpy as np

    import baseline_eval as B
    import dataset as D

    torch.manual_seed(a.seed)
    np.random.seed(a.seed)
    dev = ("cuda" if torch.cuda.is_available() else "cpu") if a.device == "auto" else a.device
    tr, va, te = (D.load(a.data, s) for s in D.SPLITS)
    if len(tr["y"]) == 0:
        print("train_mlp: no training rows")
        return 1
    st = B.Standardiser(tr["X"].astype(np.float64))

    def tensors(d):
        X = torch.tensor(st(d["X"].astype(np.float64)), dtype=torch.float32)
        t = torch.tensor(B.target(d["y"]), dtype=torch.float32)
        tte = torch.tensor(d["turns_to_end"].astype(np.float32))
        return X, t, tte

    Xtr, ttr, etr = tensors(tr)
    sizes = [Xtr.shape[1]] + [int(h) for h in a.hidden.split(",") if h]
    layers: list[nn.Module] = []
    for i in range(len(sizes) - 1):
        layers += [nn.Linear(sizes[i], sizes[i + 1]), nn.ReLU(), nn.Dropout(a.dropout)]
    trunk = nn.Sequential(*layers)
    win = nn.Linear(sizes[-1], 1)
    tempo = nn.Linear(sizes[-1], 1)
    model = nn.ModuleDict({"trunk": trunk, "win": win, "tempo": tempo}).to(dev)
    opt = torch.optim.AdamW(model.parameters(), lr=a.lr, weight_decay=a.wd)
    bce = nn.BCEWithLogitsLoss()
    sl1 = nn.SmoothL1Loss()

    def predict(d):
        if not len(d["y"]):
            return np.zeros(0)
        X, _, _ = tensors(d)
        model.eval()
        with torch.no_grad():
            out = []
            for i in range(0, len(X), 4096):
                out.append(torch.sigmoid(model["win"](model["trunk"](X[i:i + 4096].to(dev)))).squeeze(1).cpu())
        return torch.cat(out).numpy().astype(np.float64)

    best = (float("inf"), None, 0)
    n = len(Xtr)
    for ep in range(1, a.epochs + 1):
        model.train()
        perm = torch.randperm(n)
        for i in range(0, n, a.batch):
            idx = perm[i:i + a.batch]
            x = Xtr[idx].to(dev)
            h = model["trunk"](x)
            loss = bce(model["win"](h).squeeze(1), ttr[idx].to(dev)) \
                + 0.1 * sl1(model["tempo"](h).squeeze(1), etr[idx].to(dev))
            opt.zero_grad()
            loss.backward()
            opt.step()
        ptr, pva = predict(tr), predict(va)
        ltr = B.logloss(ptr, B.target(tr["y"]))
        lva = B.logloss(pva, B.target(va["y"])) if len(pva) else float("nan")
        print(f"epoch {ep:3d}  train logloss {ltr:.4f}  val logloss {lva:.4f}")
        key = lva if len(pva) else ltr
        if key < best[0]:
            best = (key, {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}, ep)
    model.load_state_dict(best[1])
    print(f"\nbest epoch {best[2]}")
    for split, d in (("val", va), ("test", te)):
        if not len(d["y"]):
            continue
        m = B.metrics(predict(d), d["y"], d["turn"])
        print(f"{split}:")
        for bucket, mt in m.items():
            if mt.get("rows"):
                print(f"  {bucket:11s} {mt['rows']:6d} acc {mt['acc']:.3f} logloss {mt['logloss']:.4f} "
                      f"brier {mt['brier']:.3f}")
    if a.out:
        os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
        with open(os.path.join(a.data, "features.json"), encoding="utf-8") as f:
            schema_id = json.load(f)["schemaId"]
        torch.save({"state_dict": best[1], "sizes": sizes, "mean": st.mean, "sd": st.sd,
                    "schemaId": schema_id, "epoch": best[2]}, a.out)
        print(f"saved {a.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
