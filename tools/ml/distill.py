#!/usr/bin/env python3
# mtg-table — tools/ml: distilling search-v2 into a fast policy (J126, B1).
# Copyright (C) 2026 mtg-table contributors.
# SPDX-License-Identifier: GPL-3.0-or-later
"""Train, register and judge the distilled policy (J126, B1): a small model that
picks among search-v2's own candidates what search-v2 would play, with no
rollout.

    # 1. rows: lab games with search-v2 in both seats and the exporter on
    MTGTABLE_DISTILL_ROWS=$PWD/var/ml/distill/rows/vintage tools/cubelab.sh run ... \\
        --profiles 'Default+outlets+search:anytime=1,Default+outlets+search:anytime=1'
    # 2. the model and its held-out report
    python3 tools/ml/distill.py train var/ml/distill/rows --out var/ml/distill/model.json \\
        --metrics var/ml/distill/metrics.json
    # 3. the ladder player (copies the model to var/ml/models/distill-<sha12>.json; prints the name)
    python3 tools/ml/distill.py register --model var/ml/distill/model.json --registry var/ml/distill/players.json
    tools/ai-ladder.sh match <name> search-v1-anytime --games 1200 --registry var/ml/distill/players.json ...
    # 4. the pre-registered reading
    python3 tools/ml/distill.py verdict --metrics M.json --match-search S.json --match-forge F.json --out V.json

THE ROWS (`mtgtable.ai.DistillRows`, written by the searching seat).  Each
`rows-<pid>.jsonl` starts with a `header` line (the layout: feature version,
state schema id, state and candidate feature names), then one `row` per
decision the seat searched (kind p, a or b: the state's non-zero features, each
candidate's vector -- Forge's answer first -- the index the seat PLAYED, any
fallback, the decision's wall time in ms) and an `end` line per game.  A game's
rows are kept only when an `end` line with `ok: true` follows them in the same
file: a game a killed worker left half-written is replayed by the next worker
from its seed, under the same key, into another file.

THE SPLIT (pre-registered in J126): by GAME -- both seats of a game, and every
decision of it, in one split -- `sha256("J126|<game key>")` mod 100: 0-79
train, 80-89 val, 90-99 test (dataset.py's split_of with salt "J126").  A row
whose search fell back to Forge's answer (budget, copy error, unmappable,
rollout errors, an invalid declaration) is not search-v2's judgement: it is
left out of training and of the agreement, and counted.

THE MODEL (one per kind; `mtgtable.ai.DistillModel` is the Java forward pass).
For candidate i of a decision, x_i = [state, c_i, c_i - c_0], standardised with
the training split's mean and deviation (a constant column's deviation is 1);
score_i = w2 . relu(W1 x_i + b1) + u . x_i; softmax over the decision's
candidates, cross-entropy on the played index, L2 on the weights, Adam,
early stopping on the validation split's loss.  The seat plays the arg max, the
lowest index on a tie.  A kind with fewer than --min-train training decisions
gets no head: the seat keeps Forge's answer there.

THE REPORT (metrics.json): per kind and over p+a+b on the TEST split -- top-1
agreement with what search-v2 played, with a 95% interval clustered by game;
the "always Forge's answer" baseline on the same rows; agreement on the rows
where search-v2 overrode Forge (recall) and on the rows where the model
overrides (precision); search-v2's mean decision time on those rows; and this
script's own mean forward-pass time per decision (numpy, for reference: the
seat's real per-decision time is measured in Java, in the matches).

numpy only (no torch); the gradients are by hand and checked against finite
differences in tests/test_distill.py.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import shutil
import sys
import time
from typing import Any, Iterable

try:
    import numpy as np
except ImportError:  # pragma: no cover - the CLI says so
    np = None  # type: ignore

FORMAT = "mtgtable-distill"
FORMAT_VERSION = 1
KINDS = ("p", "a", "b")
SALT = "J126"
SPLIT = (80, 10, 10)
PLAYER_BASE = "search-v1-anytime"   # search-v2's ladder name (D412)
MODELS_DIR = os.path.join("var", "ml", "models")
# The pre-registered SHIP rule (J126): the distilled player is not shown worse than search-v2 by more than
# MARGIN in score (the lower end of the 95% interval on its score against search-v2 is at least 0.5 - MARGIN),
# its match is complete, and it is at least SPEEDUP times faster per decision.
MARGIN = 0.03
SPEEDUP = 10.0


def split_of(group: str, weights: tuple[int, int, int] = SPLIT, salt: str = SALT) -> str:
    """dataset.py's split_of: sha256(salt|group) mod the weights' sum."""
    h = int(hashlib.sha256(f"{salt}|{group}".encode()).hexdigest()[:12], 16)
    x = h % sum(weights)
    if x < weights[0]:
        return "train"
    if x < weights[0] + weights[1]:
        return "val"
    return "test"


# ---------------------------------------------------------------- reading the rows

def row_files(paths: Iterable[str]) -> list[str]:
    out: list[str] = []
    for p in paths:
        if os.path.isfile(p):
            out.append(p)
            continue
        for root, _dirs, files in os.walk(p):
            out.extend(os.path.join(root, f) for f in files if f.startswith("rows-") and f.endswith(".jsonl"))
    return sorted(out)


def read_rows(paths: Iterable[str]) -> dict[str, Any]:
    """Every kept row, by kind, plus the layout and what was dropped and why."""
    header: dict[str, Any] | None = None
    kept: dict[str, list[dict[str, Any]]] = {k: [] for k in KINDS}
    notes = {"files": 0, "tornLines": 0, "gamesEnded": 0, "gamesNotOk": 0, "gamesUnended": 0,
             "gamesDuplicate": 0, "rowsUnended": 0, "rowsOtherKind": 0}
    seen_games: set[str] = set()
    for f in row_files(paths):
        notes["files"] += 1
        pending: dict[str, list[dict[str, Any]]] = {}
        with open(f, encoding="utf-8") as fh:
            lines = fh.read().split("\n")
        for i, line in enumerate(lines):
            if not line.strip():
                continue
            try:
                o = json.loads(line)
            except json.JSONDecodeError:
                if i >= len(lines) - 2:     # a torn last line: a worker killed mid-write
                    notes["tornLines"] += 1
                    continue
                raise SystemExit(f"distill: {f}:{i + 1} is not JSON")
            t = o.get("type")
            if t == "header":
                h = {k: o[k] for k in ("featureVersion", "stateSchemaId", "stateSize", "stateNames", "cand")}
                if header is None:
                    header = h
                elif header != h:
                    raise SystemExit(f"distill: {f} was written with another layout ({h['featureVersion']}, "
                                     f"{h['stateSchemaId']}) than the first file ({header['featureVersion']}, "
                                     f"{header['stateSchemaId']})")
            elif t == "row":
                if o.get("kind") not in KINDS:
                    notes["rowsOtherKind"] += 1
                    continue
                pending.setdefault(o["game"], []).append(o)
            elif t == "end":
                g = o.get("game")
                rows = pending.pop(g, [])
                if not o.get("ok", False):
                    notes["gamesNotOk"] += 1
                    continue
                if g in seen_games:
                    notes["gamesDuplicate"] += 1
                    continue
                seen_games.add(g)
                notes["gamesEnded"] += 1
                for r in rows:
                    kept[r["kind"]].append(r)
        notes["gamesUnended"] += len(pending)
        notes["rowsUnended"] += sum(len(v) for v in pending.values())
    if header is None:
        raise SystemExit("distill: no rows file with a header under " + ", ".join(paths))
    return {"header": header, "rows": kept, "notes": notes}


class KindData:
    """One kind's decisions as arrays: S (decisions x state), C (candidate rows x cand), offsets, labels."""

    def __init__(self, rows: list[dict[str, Any]], state_size: int, n_cand: int) -> None:
        n = len(rows)
        self.n = n
        self.S = np.zeros((n, state_size), dtype=np.float32)
        lens = np.array([len(r["c"]) for r in rows], dtype=np.int64)
        self.lens = lens
        self.off = np.zeros(n + 1, dtype=np.int64)
        np.cumsum(lens, out=self.off[1:])
        self.C = np.zeros((int(self.off[-1]), n_cand), dtype=np.float32)
        self.y = np.array([int(r["chosen"]) for r in rows], dtype=np.int64)
        self.ms = np.array([float(r.get("ms") or 0.0) for r in rows], dtype=np.float64)
        self.games = [r["game"] for r in rows]
        for i, r in enumerate(rows):
            for j, x in r["s"]:
                self.S[i, int(j)] = x
            c = np.asarray(r["c"], dtype=np.float32)
            if c.shape[1] != n_cand:
                raise SystemExit(f"distill: a {r['kind']} row has {c.shape[1]} candidate features, the header {n_cand}")
            self.C[self.off[i]:self.off[i + 1]] = c
            if not 0 <= self.y[i] < lens[i]:
                raise SystemExit(f"distill: a row's chosen index {self.y[i]} is outside its {lens[i]} candidates")
        # each candidate row's decision, and its difference to the decision's candidate 0 (Forge's answer)
        self.g = np.repeat(np.arange(n), lens)
        self.D = self.C - self.C[self.off[:-1]][self.g]

    def subset(self, idx: "np.ndarray") -> "KindData":
        k = KindData.__new__(KindData)
        idx = np.asarray(idx, dtype=np.int64)
        k.n = len(idx)
        k.S = self.S[idx]
        k.lens = self.lens[idx]
        k.off = np.zeros(k.n + 1, dtype=np.int64)
        np.cumsum(k.lens, out=k.off[1:])
        rows = gather_rows(self.off, self.lens, idx)
        k.C = self.C[rows]
        k.D = self.D[rows]
        k.y = self.y[idx]
        k.ms = self.ms[idx]
        k.games = [self.games[i] for i in idx]
        k.g = np.repeat(np.arange(k.n), k.lens)
        return k


def gather_rows(off: "np.ndarray", lens: "np.ndarray", idx: "np.ndarray") -> "np.ndarray":
    """The candidate rows of decisions idx, in order (contiguous per decision)."""
    ln = lens[idx]
    total = int(ln.sum())
    if total == 0:
        return np.zeros(0, dtype=np.int64)
    starts = off[idx]
    first = np.zeros(len(idx), dtype=np.int64)
    np.cumsum(ln[:-1], out=first[1:])
    return np.repeat(starts - first, ln) + np.arange(total)


# ---------------------------------------------------------------- the model

class Head:
    """One kind's scorer, in the factored form training uses (W1 = [Ws; Wc; Wd], u = [0; uc; ud])."""

    def __init__(self, s: int, c: int, h: int, rng: "np.random.Generator") -> None:
        d = s + 2 * c
        sc = math.sqrt(2.0 / d)
        self.p = {
            "Ws": rng.normal(0, sc, (s, h)), "Wc": rng.normal(0, sc, (c, h)), "Wd": rng.normal(0, sc, (c, h)),
            "b1": np.zeros(h), "w2": rng.normal(0, 0.1, h), "uc": np.zeros(c), "ud": np.zeros(c),
        }

    def scores(self, Sz, Cz, Dz, g, cache: dict | None = None):
        p = self.p
        A = Sz @ p["Ws"]
        pre = A[g] + Cz @ p["Wc"] + Dz @ p["Wd"] + p["b1"]
        hid = np.maximum(pre, 0)
        s = hid @ p["w2"] + Cz @ p["uc"] + Dz @ p["ud"]
        if cache is not None:
            cache.update(pre=pre, hid=hid)
        return s


def seg_softmax(s, off):
    """Softmax within each decision's contiguous candidate rows."""
    m = np.maximum.reduceat(s, off[:-1])
    lens = np.diff(off)
    e = np.exp(s - np.repeat(m, lens))
    z = np.add.reduceat(e, off[:-1])
    return e / np.repeat(z, lens), np.log(z) + m


def loss_grad(head: Head, Sz, Cz, Dz, off, g, y, l2: float):
    """Mean cross-entropy over the decisions (+ L2), and its gradient for every parameter."""
    cache: dict = {}
    s = head.scores(Sz, Cz, Dz, g, cache)
    prob, lse = seg_softmax(s, off)
    n = len(y)
    chosen = off[:-1] + y
    loss = float(np.mean(lse - s[chosen]))
    ds = prob.copy()
    ds[chosen] -= 1.0
    ds /= n
    p = head.p
    grads: dict[str, Any] = {}
    grads["w2"] = cache["hid"].T @ ds
    grads["uc"] = Cz.T @ ds
    grads["ud"] = Dz.T @ ds
    dpre = np.outer(ds, p["w2"]) * (cache["pre"] > 0)
    grads["b1"] = dpre.sum(axis=0)
    grads["Wc"] = Cz.T @ dpre
    grads["Wd"] = Dz.T @ dpre
    dA = np.add.reduceat(dpre, off[:-1], axis=0)
    grads["Ws"] = Sz.T @ dA
    for k in ("Ws", "Wc", "Wd", "w2", "uc", "ud"):
        loss += 0.5 * l2 * float(np.sum(p[k] * p[k]))
        grads[k] = grads[k] + l2 * p[k]
    return loss, grads


def seg_argmax(s, off):
    """Each decision's arg max (local index), the lowest index on a tie -- the Java seat's rule."""
    lens = np.diff(off)
    m = np.repeat(np.maximum.reduceat(s, off[:-1]), lens)
    local = np.arange(len(s)) - np.repeat(off[:-1], lens)
    cand = np.where(s >= m, local, np.iinfo(np.int64).max)
    return np.minimum.reduceat(cand, off[:-1])


class Std:
    def __init__(self, X) -> None:
        self.mean = X.mean(axis=0).astype(np.float64) if len(X) else np.zeros(X.shape[1])
        sd = X.std(axis=0).astype(np.float64) if len(X) else np.ones(X.shape[1])
        self.sd = np.where(sd > 0, sd, 1.0)

    def __call__(self, X):
        return (np.asarray(X, dtype=np.float64) - self.mean) / self.sd


def train_head(tr: KindData, va: KindData, o: argparse.Namespace, rng) -> tuple[Head, dict, dict[str, Any]]:
    ss, cs, dsd = Std(tr.S), Std(tr.C), Std(tr.D)
    head = Head(tr.S.shape[1], tr.C.shape[1], o.hidden, rng)
    adam = {k: (np.zeros_like(v), np.zeros_like(v)) for k, v in head.p.items()}
    b1, b2, eps = 0.9, 0.999, 1e-8
    vSz, vCz, vDz = ss(va.S), cs(va.C), dsd(va.D)
    best = (math.inf, None, -1)
    log = []
    step = 0
    bad = 0
    for ep in range(o.epochs):
        order = rng.permutation(tr.n)
        for b0 in range(0, tr.n, o.batch):
            idx = order[b0:b0 + o.batch]
            rows = gather_rows(tr.off, tr.lens, idx)
            ln = tr.lens[idx]
            off = np.zeros(len(idx) + 1, dtype=np.int64)
            np.cumsum(ln, out=off[1:])
            g = np.repeat(np.arange(len(idx)), ln)
            _, grads = loss_grad(head, ss(tr.S[idx]), cs(tr.C[rows]), dsd(tr.D[rows]), off, g, tr.y[idx], o.l2)
            step += 1
            for k, gr in grads.items():
                m, v = adam[k]
                m *= b1
                m += (1 - b1) * gr
                v *= b2
                v += (1 - b2) * gr * gr
                head.p[k] -= o.lr * (m / (1 - b1 ** step)) / (np.sqrt(v / (1 - b2 ** step)) + eps)
        vl = loss_grad(head, vSz, vCz, vDz, va.off, va.g, va.y, 0.0)[0] if va.n else math.nan
        log.append({"epoch": ep + 1, "valLoss": round(vl, 6)})
        if va.n == 0 or vl < best[0] - 1e-6:
            best = (vl, {k: v.copy() for k, v in head.p.items()}, ep + 1)
            bad = 0
        else:
            bad += 1
            if bad >= o.patience:
                break
    if best[1] is not None:
        head.p = best[1]
    return head, {"state": ss, "cand": cs, "diff": dsd}, {"epochs": len(log), "bestEpoch": best[2],
                                                           "valLoss": None if math.isnan(best[0]) else round(best[0], 6),
                                                           "log": log}


def predict(head: Head, std: dict, k: KindData):
    s = head.scores(std["state"](k.S), std["cand"](k.C), std["diff"](k.D), k.g)
    return seg_argmax(s, k.off), s


def export_head(head: Head, std: dict, names: list[str]) -> dict[str, Any]:
    p = head.p
    W1 = np.concatenate([p["Ws"], p["Wc"], p["Wd"]], axis=0)       # d x h
    u = np.concatenate([np.zeros(p["Ws"].shape[0]), p["uc"], p["ud"]])
    mean = np.concatenate([std["state"].mean, std["cand"].mean, std["diff"].mean])
    sd = np.concatenate([std["state"].sd, std["cand"].sd, std["diff"].sd])
    return {"candNames": list(names), "hidden": int(W1.shape[1]), "mean": mean.tolist(), "sd": sd.tolist(),
            "W1": W1.T.tolist(), "b1": p["b1"].tolist(), "w2": p["w2"].tolist(), "u": u.tolist()}


def forward_exported(h: dict[str, Any], state, cands):
    """The exported head's forward pass for one decision, as DistillModel.java computes it (golden, tests)."""
    state = np.asarray(state, dtype=np.float64)
    cands = np.asarray(cands, dtype=np.float64)
    W1 = np.asarray(h["W1"])
    out = []
    for c in cands:
        x = np.concatenate([state, c, c - cands[0]])
        z = (x - np.asarray(h["mean"])) / np.asarray(h["sd"])
        a = W1 @ z + np.asarray(h["b1"])
        out.append(float(np.asarray(h["w2"]) @ np.maximum(a, 0) + np.asarray(h["u"]) @ z))
    return out


# ---------------------------------------------------------------- metrics

def clustered(hit, games: list[str], z: float = 1.96) -> dict[str, Any]:
    """A rate with a 95% interval clustered by game (match.ts's ratio estimator, one game = one cluster)."""
    hit = np.asarray(hit, dtype=np.float64)
    n = len(hit)
    if n == 0:
        return {"n": 0, "rate": None, "lo": None, "hi": None, "games": 0}
    r = float(hit.mean())
    by: dict[str, list[float]] = {}
    for h, g in zip(hit, games):
        by.setdefault(g, []).append(h)
    m = len(by)
    if m < 2:
        return {"n": n, "rate": round(r, 6), "lo": None, "hi": None, "games": m}
    var = sum((sum(v) - r * len(v)) ** 2 for v in by.values()) / (n * n) * (m / (m - 1))
    se = math.sqrt(var)
    return {"n": n, "rate": round(r, 6), "lo": round(max(0.0, r - z * se), 6), "hi": round(min(1.0, r + z * se), 6),
            "games": m}


def kind_report(k: KindData, pred) -> dict[str, Any]:
    agree = pred == k.y
    over = k.y > 0
    mover = pred > 0
    return {
        "decisions": int(k.n), "games": len(set(k.games)), "meanCandidates": round(float(k.lens.mean()), 3) if k.n else None,
        "agreement": clustered(agree, k.games),
        "forgeBaseline": clustered(k.y == 0, k.games),
        "searchOverrode": round(float(over.mean()), 6) if k.n else None,
        "recallOnOverrides": clustered(agree[over], [g for g, x in zip(k.games, over) if x]),
        "modelOverrides": round(float(mover.mean()), 6) if k.n else None,
        "precisionOnModelOverrides": clustered(agree[mover], [g for g, x in zip(k.games, mover) if x]),
        "searchMsMean": round(float(k.ms.mean()), 3) if k.n else None,
    }


# ---------------------------------------------------------------- commands

def cmd_train(o: argparse.Namespace) -> int:
    if np is None:
        print("distill: numpy is needed to train (pip install numpy)", file=sys.stderr)
        return 2
    t_start = time.time()
    data = read_rows(o.rows)
    hd = data["header"]
    S = int(hd["stateSize"])
    rng = np.random.default_rng(o.seed)
    model: dict[str, Any] = {"format": FORMAT, "formatVersion": FORMAT_VERSION, "featureVersion": hd["featureVersion"],
                             "stateSchemaId": hd["stateSchemaId"], "stateSize": S, "kinds": {}}
    metrics: dict[str, Any] = {"rule": {"split": "by game, sha256('J126|<game>') mod 100: 0-79 train, 80-89 val, 90-99 test",
                                        "excluded": "rows whose search fell back to Forge's answer"},
                               "notes": data["notes"], "kinds": {}, "hyper": {k: getattr(o, k) for k in
                                                                              ("hidden", "epochs", "patience", "lr", "l2", "batch", "seed", "min_train")}}
    pooled_hits: list[Any] = []
    pooled_forge: list[Any] = []
    pooled_games: list[str] = []
    pooled_ms: list[float] = []
    infer_ns = 0
    infer_n = 0
    for kind in KINDS:
        rows = data["rows"][kind]
        names = hd["cand"][kind]
        fb = [r for r in rows if r.get("fallback")]
        use = [r for r in rows if not r.get("fallback")]
        split = [split_of(r["game"]) for r in use]
        kd = KindData(use, S, len(names)) if use else None
        rep: dict[str, Any] = {"rows": len(rows), "fallbackExcluded": len(fb),
                               "split": {s: sum(1 for x in split if x == s) for s in ("train", "val", "test")}}
        if kd is None or rep["split"]["train"] < o.min_train:
            rep["covered"] = False
            rep["why"] = f"{rep['split']['train']} training decisions, under --min-train {o.min_train}: Forge's answer here"
            metrics["kinds"][kind] = rep
            continue
        sp = np.array(split)
        tr, va, te = (kd.subset(np.nonzero(sp == s)[0]) for s in ("train", "val", "test"))
        head, std, fit = train_head(tr, va, o, rng)
        model["kinds"][kind] = export_head(head, std, names)
        rep["covered"] = True
        rep["fit"] = fit
        rep["train"] = kind_report(tr, predict(head, std, tr)[0])
        rep["val"] = kind_report(va, predict(head, std, va)[0]) if va.n else None
        if te.n:
            t0 = time.perf_counter_ns()
            pred, _ = predict(head, std, te)
            infer_ns += time.perf_counter_ns() - t0
            infer_n += te.n
            rep["test"] = kind_report(te, pred)
            pooled_hits.extend((pred == te.y).tolist())
            pooled_forge.extend((te.y == 0).tolist())
            pooled_games.extend(te.games)
            pooled_ms.extend(te.ms.tolist())
        else:
            rep["test"] = None
        metrics["kinds"][kind] = rep
    metrics["test"] = {
        "decisions": len(pooled_hits),
        "agreement": clustered(pooled_hits, pooled_games),
        "forgeBaseline": clustered(pooled_forge, pooled_games),
        "searchMsMean": round(float(np.mean(pooled_ms)), 3) if pooled_ms else None,
        "pythonInferMsPerDecision": round(infer_ns / 1e6 / infer_n, 6) if infer_n else None,
    }
    metrics["covered"] = sorted(model["kinds"])
    metrics["seconds"] = round(time.time() - t_start, 1)
    model["training"] = {"rows": [os.path.relpath(p) if not os.path.isabs(p) else p for p in o.rows],
                         "notes": data["notes"], "hyper": metrics["hyper"],
                         "test": {k: (metrics["kinds"][k].get("test") or {}).get("agreement") for k in model["kinds"]}}
    os.makedirs(os.path.dirname(os.path.abspath(o.out)), exist_ok=True)
    with open(o.out, "w", encoding="utf-8") as f:
        json.dump(model, f, separators=(",", ":"))
        f.write("\n")
    if o.metrics:
        os.makedirs(os.path.dirname(os.path.abspath(o.metrics)), exist_ok=True)
        with open(o.metrics, "w", encoding="utf-8") as f:
            json.dump(metrics, f, indent=1)
            f.write("\n")
    for kind in KINDS:
        r = metrics["kinds"].get(kind, {})
        if not r.get("covered"):
            print(f"{kind}: not covered ({r.get('why', 'no rows')})")
            continue
        t = r["test"] or {}
        if not t:
            print(f"{kind}: no test decisions (val {r['split']['val']}, train {r['split']['train']}); best epoch {r['fit']['bestEpoch']}")
            continue
        a = (t.get("agreement") or {})
        fbl = (t.get("forgeBaseline") or {})
        print(f"{kind}: test {t.get('decisions')} decisions in {t.get('games')} games, agreement {a.get('rate')} "
              f"[{a.get('lo')}, {a.get('hi')}], always-Forge {fbl.get('rate')}; best epoch {r['fit']['bestEpoch']}")
    print(f"p+a+b: agreement {metrics['test']['agreement']}, search-v2 {metrics['test']['searchMsMean']} ms a decision")
    return 0


def _write_registry(path: str, reg: dict[str, Any]) -> None:
    """tools/ai-ladder/registry.ts's writeRegistry: one player per line."""
    lines = [f"    {json.dumps(p, separators=(',', ':'), ensure_ascii=False)}" for p in reg["players"]]
    head = '{\n  "version": 1,\n' + (f'  "comment": {json.dumps(reg["comment"], ensure_ascii=False)},\n'
                                     if reg.get("comment") else "") + '  "players": [\n'
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(head + ",\n".join(lines) + "\n  ]\n}\n")


def cmd_register(o: argparse.Namespace) -> int:
    with open(o.model, "rb") as f:
        body = f.read()
    m = json.loads(body)
    if m.get("format") != FORMAT or m.get("formatVersion") != FORMAT_VERSION:
        raise SystemExit(f"distill register: {o.model} is not a {FORMAT} v{FORMAT_VERSION} model")
    sha12 = hashlib.sha256(body).hexdigest()[:12]
    dst = os.path.join(o.models_dir, f"distill-{sha12}.json")
    os.makedirs(o.models_dir, exist_ok=True)
    if not os.path.exists(dst):
        shutil.copyfile(o.model, dst)
    with open(o.base_registry, encoding="utf-8") as f:
        reg = json.load(f)
    base = next((p for p in reg["players"] if p["name"] == o.base), None)
    if base is None or base.get("kind") != "search":
        raise SystemExit(f"distill register: the registry has no search player {o.base}")
    name = f"search-v2-distill-{sha12}"
    player = {"name": name, "kind": "search-distill", "params": dict(base["params"], model=sha12),
              "note": f"J126 (B1): {o.base}'s candidates scored by the distilled model "
                      f"var/ml/models/distill-{sha12}.json (covers {', '.join(sorted(m.get('kinds', {}))) or 'nothing'}), no rollout."}
    reg["players"] = [p for p in reg["players"] if p["name"] != name] + [player]
    _write_registry(o.registry, reg)
    print(name)
    return 0


def _ms_live(side: dict[str, Any] | None) -> float | None:
    if not side:
        return None
    v = side.get("msPerDecision")
    return float(v) if isinstance(v, (int, float)) else None


def verdict(metrics: dict[str, Any], ms: dict[str, Any], mf: dict[str, Any]) -> dict[str, Any]:
    """The pre-registered reading (J126): SHIP, or NOT SHOWN, with every number it rests on."""
    held = (metrics.get("test") or {}).get("searchMsMean")
    dist = _ms_live(ms.get("aSearch"))
    srch = _ms_live(ms.get("bSearch"))
    speed = held / dist if held and dist else None
    live = srch / dist if srch and dist else None
    lo = ms.get("lo")
    complete = bool(ms.get("complete")) and ms.get("played") == ms.get("planned") and ms.get("planned", 0) > 0
    not_worse = isinstance(lo, (int, float)) and lo >= 0.5 - MARGIN
    fast = speed is not None and speed >= SPEEDUP
    agree = ((metrics.get("test") or {}).get("agreement") or {})
    out = {
        "ship": 1 if complete and not_worse and fast else 0,
        "complete": 1 if complete else 0, "notWorse": 1 if not_worse else 0, "fast": 1 if fast else 0,
        "margin": MARGIN, "speedupBar": SPEEDUP,
        "vsSearch": {k: ms.get(k) for k in ("played", "planned", "pairs", "score", "lo", "hi", "elo", "eloLo", "eloHi",
                                            "draws", "errors", "timeouts")},
        "vsForge": {k: mf.get(k) for k in ("played", "planned", "complete", "pairs", "score", "lo", "hi", "elo", "eloLo",
                                           "eloHi", "draws", "errors", "timeouts")},
        "heldOutSearchMs": held, "distillMsLive": dist, "searchMsLive": srch,
        "speedup": round(speed, 2) if speed else None, "speedupLive": round(live, 2) if live else None,
        "agreement": agree.get("rate"), "agreementLo": agree.get("lo"), "agreementHi": agree.get("hi"),
        "forgeBaseline": ((metrics.get("test") or {}).get("forgeBaseline") or {}).get("rate"),
        "covered": metrics.get("covered"),
        "byKind": {k: (((metrics.get("kinds") or {}).get(k) or {}).get("test") or {}).get("agreement", {}).get("rate")
                   for k in KINDS},
    }
    out["reading"] = ("SHIP as a lab policy" if out["ship"] else
                      "NOT SHOWN: " + ", ".join(w for w, ok in (("the match is incomplete", complete),
                                                                 (f"the score's lower end {lo} is under {0.5 - MARGIN}", not_worse),
                                                                 (f"the speed-up {out['speedup']} is under {SPEEDUP}", fast)) if not ok))
    return out


def cmd_verdict(o: argparse.Namespace) -> int:
    def load(p: str | None) -> dict[str, Any]:
        if p and os.path.exists(p):
            with open(p, encoding="utf-8") as f:
                return json.load(f)
        return {}
    v = verdict(load(o.metrics), load(o.match_search), load(o.match_forge))
    text = json.dumps(v, indent=1)
    if o.out:
        os.makedirs(os.path.dirname(os.path.abspath(o.out)), exist_ok=True)
        with open(o.out, "w", encoding="utf-8") as f:
            f.write(text + "\n")
    print(text)
    return 0


def stats(paths: Iterable[str], names_file: str | None = None) -> dict[str, Any]:
    """Counts over rows files, streamed (standard library): ended games, rows by kind, fallbacks, the layout, and
    whether the layout is names.json's (the one DistillSelfTest holds the Java side to)."""
    out: dict[str, Any] = {"files": 0, "games": 0, "gamesNotOk": 0, "unended": 0, "p": 0, "a": 0, "b": 0,
                           "fallback": 0, "overrode": 0, "msSum": 0.0, "layouts": 0, "layoutOk": 0, "duplicate": 0}
    layouts = set()
    seen: set[str] = set()
    for f in row_files(paths):
        out["files"] += 1
        pending: dict[str, list[tuple[str, bool, bool, float]]] = {}
        with open(f, encoding="utf-8") as fh:
            for line in fh:
                if not line.strip():
                    continue
                try:
                    o = json.loads(line)
                except json.JSONDecodeError:
                    continue
                t = o.get("type")
                if t == "header":
                    layouts.add((o.get("featureVersion"), o.get("stateSchemaId"), o.get("stateSize"),
                                 json.dumps(o.get("cand"), sort_keys=True)))
                elif t == "row" and o.get("kind") in KINDS:
                    pending.setdefault(o["game"], []).append((o["kind"], bool(o.get("fallback")), int(o.get("chosen", 0)) > 0,
                                                             float(o.get("ms") or 0.0)))
                elif t == "end":
                    rows = pending.pop(o.get("game"), [])
                    if not o.get("ok"):
                        out["gamesNotOk"] += 1
                        continue
                    if o.get("game") in seen:
                        out["duplicate"] += 1
                        continue
                    seen.add(o.get("game"))
                    out["games"] += 1
                    for k, fb, ov, ms in rows:
                        out[k] += 1
                        out["fallback"] += fb
                        out["overrode"] += ov
                        out["msSum"] += ms
        out["unended"] += len(pending)
    out["layouts"] = len(layouts)
    n = out["p"] + out["a"] + out["b"]
    out["rows"] = n
    out["msMean"] = round(out.pop("msSum") / n, 3) if n else None
    out["overrodeRate"] = round(out["overrode"] / n, 6) if n else None
    if names_file and len(layouts) == 1:
        with open(names_file, encoding="utf-8") as f:
            nm = json.load(f)
        (fv, sid, size, cand), = layouts
        out["layoutOk"] = 1 if (fv, sid, size, cand) == (nm["featureVersion"], nm["stateSchemaId"], nm["stateSize"],
                                                          json.dumps(nm["cand"], sort_keys=True)) else 0
    return out


def cmd_stats(o: argparse.Namespace) -> int:
    print(json.dumps(stats(o.rows, o.names)))
    return 0


def cmd_golden(o: argparse.Namespace) -> int:
    """fixtures/distill/: a small seeded model over names.json's layout and numpy's scores for a few decisions,
    for DistillSelfTest's parity check.  Kind b is left out on purpose (the Java side's 'not covered')."""
    with open(os.path.join(o.out, "names.json"), encoding="utf-8") as f:
        names = json.load(f)
    S = int(names["stateSize"])
    rng = np.random.default_rng(1260)
    model: dict[str, Any] = {"format": FORMAT, "formatVersion": FORMAT_VERSION, "featureVersion": names["featureVersion"],
                             "stateSchemaId": names["stateSchemaId"], "stateSize": S, "kinds": {},
                             "training": {"note": "a seeded random model for DistillSelfTest (tools/ml/distill.py golden)"}}
    cases = []
    for kind in ("p", "a"):
        cn = names["cand"][kind]
        C = len(cn)
        d = S + 2 * C
        h = 4
        model["kinds"][kind] = {
            "candNames": cn, "hidden": h,
            "mean": np.round(rng.normal(0, 0.5, d), 4).tolist(),
            "sd": np.round(rng.uniform(0.5, 2.0, d), 4).tolist(),
            "W1": np.round(rng.normal(0, 0.2, (h, d)), 4).tolist(),
            "b1": np.round(rng.normal(0, 0.1, h), 4).tolist(),
            "w2": np.round(rng.normal(0, 1.0, h), 4).tolist(),
            "u": np.concatenate([np.zeros(S), np.round(rng.normal(0, 0.3, 2 * C), 4)]).tolist(),
        }
        for _ in range(3):
            n = int(rng.integers(2, 6))
            state = rng.integers(0, 6, S).astype(float)
            state[rng.random(S) < 0.7] = 0
            cands = rng.integers(0, 4, (n, C)).astype(float)
            cands[:, 0] = 0
            cands[0, 0] = 1
            sc = forward_exported(model["kinds"][kind], state, cands)
            cases.append({"kind": kind, "state": state.tolist(), "cands": cands.tolist(), "scores": sc,
                          "argmax": int(np.argmax(sc))})
    with open(os.path.join(o.out, "model.json"), "w", encoding="utf-8") as f:
        json.dump(model, f, separators=(",", ":"))
        f.write("\n")
    with open(os.path.join(o.out, "golden.json"), "w", encoding="utf-8") as f:
        json.dump({"cases": cases}, f, separators=(",", ":"))
        f.write("\n")
    print(f"distill golden: {len(cases)} decisions over kinds p, a; {os.path.join(o.out, 'model.json')}")
    return 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    t = sub.add_parser("train", help="rows -> model.json and metrics.json")
    t.add_argument("rows", nargs="+", help="rows-*.jsonl files or folders holding them")
    t.add_argument("--out", required=True)
    t.add_argument("--metrics")
    t.add_argument("--hidden", type=int, default=32)
    t.add_argument("--epochs", type=int, default=40)
    t.add_argument("--patience", type=int, default=4)
    t.add_argument("--lr", type=float, default=3e-3)
    t.add_argument("--l2", type=float, default=1e-4)
    t.add_argument("--batch", type=int, default=512)
    t.add_argument("--seed", type=int, default=126)
    t.add_argument("--min-train", dest="min_train", type=int, default=200)
    r = sub.add_parser("register", help="copy the model to var/ml/models/distill-<sha12>.json and write a registry with its player")
    r.add_argument("--model", required=True)
    r.add_argument("--registry", required=True)
    r.add_argument("--base-registry", dest="base_registry", default="tools/ai-ladder/players.json")
    r.add_argument("--base", default=PLAYER_BASE)
    r.add_argument("--models-dir", dest="models_dir", default=MODELS_DIR)
    v = sub.add_parser("verdict", help="the pre-registered SHIP rule over the metrics and the two matches")
    v.add_argument("--metrics", required=True)
    v.add_argument("--match-search", dest="match_search", required=True)
    v.add_argument("--match-forge", dest="match_forge", required=True)
    v.add_argument("--out")
    st = sub.add_parser("stats", help="counts over rows files as one JSON line (streamed; standard library)")
    st.add_argument("rows", nargs="+")
    st.add_argument("--names", default=os.path.join("fixtures", "distill", "names.json"),
                    help="the layout the rows must carry (layoutOk)")
    g = sub.add_parser("golden", help="fixtures/distill/model.json and golden.json from names.json (DistillSelfTest)")
    g.add_argument("--out", default="fixtures/distill")
    a = ap.parse_args(argv)
    return {"train": cmd_train, "register": cmd_register, "verdict": cmd_verdict, "stats": cmd_stats,
            "golden": cmd_golden}[a.cmd](a)


if __name__ == "__main__":
    sys.exit(main())
